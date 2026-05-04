import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client'; //prisma/client
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import twilio from 'twilio';
import multer from 'multer';

const app = express();
const prisma = new PrismaClient();

const JWT_SECRET = "my_jwt_secret"; 

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@carpool.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';

app.use(cors());  
app.use(express.json());  

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

const otpStore = new Map();
const otpRateLimit = new Map();
const registerRateLimit = new Map();

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const normalizePhone = (phone) => {
  if (!phone) return null;
  const raw = String(phone).trim().replace(/[\s-]/g, '');

  if (/^\+\d{10,15}$/.test(raw)) return raw;
  if (/^92\d{10}$/.test(raw)) return `+${raw}`; // Pakistan without +
  if (/^\+92\d{10}$/.test(raw)) return raw; // Pakistan E.164
  if (/^0?3\d{9}$/.test(raw)) {
    const local = raw.startsWith('0') ? raw.slice(1) : raw;
    return `+92${local}`; // Pakistan local 03xxxxxxxxx
  }
  if (/^\d{10,15}$/.test(raw)) return `+${raw}`;
  return null;
};
const isValidPhone = (phone) => !!normalizePhone(phone);
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const driverLicensePatterns = {
  US: /^[A-Z0-9]{6,12}$/i,
  UK: /^[A-Z0-9]{5,16}$/i,
  PK: /^[A-Z0-9-]{6,18}$/i,
  IN: /^[A-Z0-9]{6,16}$/i,
  CA: /^[A-Z0-9]{6,15}$/i,
  AU: /^[A-Z0-9]{6,12}$/i,
  OTHER: /^[A-Z0-9-]{6,18}$/i,
};

const passwordIssues = (value) => {
  const issues = [];
  if (!value || value.length < 8) issues.push("length");
  if (!/[A-Z]/.test(value)) issues.push("upper");
  if (!/[a-z]/.test(value)) issues.push("lower");
  if (!/\d/.test(value)) issues.push("number");
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) issues.push("special");
  return issues;
};

const LOG_DIR = path.join(process.cwd(), 'logs');
const ADMIN_LOG = path.join(LOG_DIR, 'admin.log');

const logAdmin = async (event, meta = {}) => {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      meta,
    };
    await fs.appendFile(ADMIN_LOG, `${JSON.stringify(entry)}\n`);
  } catch (error) {
    console.error('Admin log error:', error);
  }
};

const checkRateLimit = (store, key, limit, windowMs) => {
  const now = Date.now();
  const entry = store.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count += 1;
  store.set(key, entry);
  return {
    allowed: entry.count <= limit,
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
  };
};

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const sendSms = async (to, body) => {
  if (!twilioClient || !process.env.TWILIO_FROM_NUMBER) {
    await logAdmin('sms_skipped', { to, reason: 'twilio_not_configured' });
    return { sent: false, reason: 'twilio_not_configured' };
  }
  await twilioClient.messages.create({
    from: process.env.TWILIO_FROM_NUMBER,
    to,
    body,
  });
  await logAdmin('sms_sent', { to });
  return { sent: true };
};

const cleanupExpiredOtps = async () => {
  const now = new Date();
  await prisma.otpCode.deleteMany({
    where: { expiresAt: { lt: now } },
  });
  for (const [phone, record] of otpStore.entries()) {
    if (record.expiresAt < Date.now()) {
      otpStore.delete(phone);
    }
  }
};

setInterval(() => {
  cleanupExpiredOtps().catch((error) => console.error('OTP cleanup error:', error));
}, 5 * 60 * 1000);

const checkPasswordBreached = async (password) => {
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const text = await response.text();
  const lines = text.split('\n');

  for (const line of lines) {
    const [hashSuffix, count] = line.trim().split(':');
    if (hashSuffix === suffix) {
      return { breached: true, count: parseInt(count, 10) };
    }
  }

  return { breached: false, count: 0 };
};

const MAX_UPLOAD_MB = 5;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

const documentTypes = new Set([
  'DRIVER_LICENSE_FRONT',
  'DRIVER_LICENSE_BACK',
  'CNIC_FRONT',
  'CNIC_BACK',
  'VEHICLE_REGISTRATION',
  'PROFILE_PICTURE',
  'PROOF_OF_ADDRESS',
]);

const safeExtForMime = (mimeType) => {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'bin';
};

const ensureUploadDir = async () => {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureUploadDir();
      cb(null, UPLOAD_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const ext = safeExtForMime(file.mimetype);
    const random = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}_${random}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Unsupported file type'));
    }
    cb(null, true);
  },
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access Denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid Token' });
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const REQUIRED_DOC_TYPES = [
  'DRIVER_LICENSE_FRONT',
  'DRIVER_LICENSE_BACK',
  'CNIC_FRONT',
  'CNIC_BACK',
  'VEHICLE_REGISTRATION',
  'PROFILE_PICTURE',
  'PROOF_OF_ADDRESS',
];

const refreshUserVerifiedFlag = async (userId) => {
  const approved = await prisma.document.findMany({
    where: {
      userId,
      status: 'APPROVED',
      type: { in: REQUIRED_DOC_TYPES },
    },
    select: { type: true },
  });
  const approvedTypes = new Set(approved.map((d) => d.type));
  const isVerified = REQUIRED_DOC_TYPES.every((t) => approvedTypes.has(t));
  await prisma.user.update({
    where: { id: userId },
    data: { isVerified },
  });
  return isVerified;
};

// Document upload during/after registration (requires JWT)
app.post('/users/me/documents', authenticateToken, upload.single('file'), async (req, res) => {
  const { type } = req.body;
  if (!type || !documentTypes.has(type)) {
    return res.status(400).json({ message: 'Invalid document type' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'File is required' });
  }
  if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
    return res.status(400).json({ message: 'Unsupported file type' });
  }
  if (req.file.size > MAX_UPLOAD_BYTES) {
    return res.status(400).json({ message: `File too large. Max ${MAX_UPLOAD_MB}MB` });
  }

  try {
    const userId = Number(req.user?.id);
    if (!userId) return res.status(401).json({ message: 'Invalid token' });

    const doc = await prisma.document.upsert({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
      update: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storagePath: `/uploads/${req.file.filename}`,
      },
      create: {
        userId,
        type,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storagePath: `/uploads/${req.file.filename}`,
      },
    });

    await logAdmin('document_uploaded', { userId, type, size: req.file.size, mimeType: req.file.mimetype });
    // Auto-mark the user as verified when they upload any document.
    // Admins can still review/approve and the admin decision endpoint will
    // recompute the verified flag based on approved documents.
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isVerified: true },
      });
      await logAdmin('user_auto_verified', { userId, reason: 'uploaded_document', type });
    } catch (err) {
      console.error('Auto-verify update failed:', err);
      await logAdmin('user_auto_verify_error', { userId, error: err.message });
    }

    return res.status(201).json({ message: 'Uploaded', document: doc, userVerified: true });
  } catch (error) {
    console.error('Document upload error:', error);
    await logAdmin('document_upload_error', { error: error.message });
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/users/me/documents', authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const documents = await prisma.document.findMany({ where: { userId } });
    return res.status(200).json({ documents });
  } catch (error) {
    console.error('List documents error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Multer error handling (size/type)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: `File too large. Max ${MAX_UPLOAD_MB}MB` });
    }
    return res.status(400).json({ message: 'Upload failed', detail: err.message });
  }
  return next(err);
});

// Register Route
app.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, driverLicenseId, gender, phone, country, dateOfBirth } = req.body;

    try {
    const rateKey = req.ip || 'unknown';
    const rate = checkRateLimit(registerRateLimit, rateKey, 5, 15 * 60 * 1000);
    if (!rate.allowed) {
      await logAdmin('register_rate_limited', { ip: rateKey });
      return res.status(429).json({ message: 'Too many registration attempts. Try again later.' });
    }
    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'First and last name are required' });
    }
    if (!email || !isEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }
    if (passwordIssues(password).length > 0) {
      return res.status(400).json({ message: 'Password does not meet requirements' });
    }
    if (!driverLicenseId) {
      return res.status(400).json({ message: 'Driver license is required' });
    }
    if (country) {
      const pattern = driverLicensePatterns[country] || driverLicensePatterns.OTHER;
      if (!pattern.test(driverLicenseId)) {
        return res.status(400).json({ message: 'Driver license format invalid for country' });
      }
    }
    const normalizedPhone = phone ? normalizePhone(phone) : null;
    if (phone && !normalizedPhone) {
      return res.status(400).json({ message: 'Invalid phone number' });
    }
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (Number.isNaN(dob.getTime())) {
        return res.status(400).json({ message: 'Invalid date of birth' });
      }
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
      if (age < 18) {
        return res.status(400).json({ message: 'You must be at least 18 years old' });
      }
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        driverLicense: driverLicenseId,
        gender,
  phone: normalizedPhone || null,
        country: country || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
    });

    await logAdmin('user_registered', { userId: newUser.id, email });
    res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (error) {
        console.error('Error:', error);
    await logAdmin('register_error', { error: error.message });
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Email existence check (real-time validation)
app.post('/auth/check-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    res.status(200).json({ exists: !!existingUser });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// OTP request (demo implementation)
app.post('/auth/request-otp', async (req, res) => {
  const { phone } = req.body;
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ message: 'Invalid phone number' });
  }

  const now = Date.now();
  const rateKey = `${req.ip}:${normalizedPhone}`;
  const rate = otpRateLimit.get(rateKey) || { count: 0, resetAt: now + 10 * 60 * 1000 };
  if (now > rate.resetAt) {
    rate.count = 0;
    rate.resetAt = now + 10 * 60 * 1000;
  }
  if (rate.count >= 3) {
    await logAdmin('otp_rate_limited', { phone, ip: req.ip });
    return res.status(429).json({ message: 'Too many OTP requests. Try again later.' });
  }

  const otp = generateOtp();
  const codeHash = await bcrypt.hash(otp, 10);
  await prisma.otpCode.create({
    data: {
      phone: normalizedPhone,
      codeHash,
      expiresAt: new Date(now + 5 * 60 * 1000),
    },
  });

  rate.count += 1;
  otpRateLimit.set(rateKey, rate);

  otpStore.set(normalizedPhone, { otp, expiresAt: now + 5 * 60 * 1000 });
  try {
    await sendSms(normalizedPhone, `Your CarPOOL OTP code is ${otp}`);
  } catch (error) {
    await logAdmin('sms_failed', { phone: normalizedPhone, error: error.message });
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ message: 'Unable to send OTP' });
    }
  }

  res.status(200).json({
    message: 'OTP sent successfully',
    ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
  });
});

// OTP verification (demo implementation)
app.post('/auth/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP are required' });

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return res.status(400).json({ message: 'Invalid phone number' });

  const latestOtp = await prisma.otpCode.findFirst({
    where: { phone: normalizedPhone },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestOtp) return res.status(400).json({ message: 'OTP not found' });
  if (latestOtp.expiresAt < new Date()) {
    return res.status(400).json({ message: 'OTP expired' });
  }

  const isMatch = await bcrypt.compare(otp, latestOtp.codeHash);
  if (!isMatch) return res.status(400).json({ message: 'Invalid OTP' });

  await prisma.otpCode.update({
    where: { id: latestOtp.id },
    data: { verifiedAt: new Date() },
  });

  await logAdmin('otp_verified', { phone: normalizedPhone });

  otpStore.delete(normalizedPhone);
  res.status(200).json({ message: 'OTP verified' });
});

// Password breach check using HIBP k-anonymity API
app.post('/auth/password-breach-check', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: 'Password is required' });

  try {
    const result = await checkPasswordBreached(password);
    res.status(200).json(result);
  } catch (error) {
    console.error('HIBP error:', error);
    res.status(200).json({ breached: null, count: null, message: 'Unable to check breach status' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Predefined admin credentials
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = jwt.sign({ role: 'admin', email }, JWT_SECRET, { expiresIn: '2h' });
      await logAdmin('admin_login', { email });
      return res.status(200).json({ message: 'Admin login successful', token, role: 'admin' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ message: 'Invalid email or password' });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(400).json({ message: 'Invalid email or password' });

  const token = jwt.sign({ id: user.id, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
    await logAdmin('user_login', { userId: user.id, email: user.email });
    res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Error:', error);
    await logAdmin('login_error', { error: error.message });
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Current user profile (for showing Verified tag)
app.get('/users/me', authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) return res.status(401).json({ message: 'Invalid token' });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isVerified: true,
      },
    });
    return res.status(200).json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Admin: list documents pending review
app.get('/admin/documents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'PENDING' } = req.query;
    const documents = await prisma.document.findMany({
      where: {
        status: status === 'ALL' ? undefined : status,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, isVerified: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ documents });
  } catch (error) {
    console.error('Admin list documents error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Admin: approve/reject a document
app.post('/admin/documents/:id/decision', authenticateToken, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { decision, reason } = req.body;
  if (!id) return res.status(400).json({ message: 'Invalid document id' });
  if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ message: 'Invalid decision' });
  }

  try {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const updated = await prisma.document.update({
      where: { id },
      data: {
        status: decision,
        verifiedAt: new Date(),
        verifiedBy: req.user.email,
        rejectReason: decision === 'REJECTED' ? (reason || 'Rejected') : null,
      },
    });

    const isVerified = await refreshUserVerifiedFlag(updated.userId);
    await logAdmin('document_decision', {
      admin: req.user.email,
      documentId: id,
      userId: updated.userId,
      type: updated.type,
      decision,
      isVerified,
    });

    return res.status(200).json({ message: 'Updated', document: updated, userVerified: isVerified });
  } catch (error) {
    console.error('Admin decision error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Protected Routes
app.get('/protected/share', authenticateToken, (req, res) => {
    res.status(200).json({ message: 'You can access this route!' });
});

//store trips data
app.post('/create-trip', authenticateToken, async (req, res) => {
  const { from, to, departureDate, departureTime, spots, message, contactNumber, price } = req.body;

    try {
        const trip = await prisma.share.create({
            data: {
                driverId: req.user.id, 
                origin: from,
                destination: to,
                departureTime: new Date(`${departureDate}T${departureTime}`),
                spots: parseInt(spots),
        message: message || null,
        contactNumber: contactNumber || null,
        price: price !== undefined && price !== null && price !== '' ? Number(price) : null,
            },
        });

        res.status(201).json({ message: 'Trip created successfully', trip });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Search Rides Route
app.get('/search-rides', authenticateToken, async (req, res) => {
  const { from, to, date } = req.query;

  const originQuery = String(from || '').trim();
  const destinationQuery = String(to || '').trim();
  const dateQuery = String(date || '').trim();

  if (!originQuery || !destinationQuery || !dateQuery) {
    return res.status(400).json({ message: 'from, to, and date are required' });
  }

  const startDate = new Date(dateQuery);
  if (Number.isNaN(startDate.getTime())) {
    return res.status(400).json({ message: 'Invalid date format' });
  }
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(23, 59, 59, 999);

    try {
        const rides = await prisma.share.findMany({
            where: {
                origin: { contains: originQuery },
                destination: { contains: destinationQuery },
                departureTime: {
          gte: startDate, // Match rides on or after the given date
          lte: endDate, // Match rides on the same day
                },
                spots: { gt: 0 }, // Ensure there are available spots
            },
            include: {
                driver: {
          select: { firstName: true, lastName: true, isVerified: true }, // Include driver's name
                },
            },
        });

        res.status(200).json(rides);
    } catch (error) {
        console.error('Error fetching rides:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Request Ride Route
app.post('/request-ride', authenticateToken, async (req, res) => {
    const { shareId, message } = req.body;

    try {
        // Check if spots are available
        const ride = await prisma.share.findUnique({ where: { id: shareId } });
        if (!ride || ride.spots <= 0) {
            return res.status(400).json({ message: 'No spots available for this ride' });
        }

        // Create a new request
        const newRequest = await prisma.request.create({
            data: {
                shareId,
                userId: req.user.id, // User ID from the JWT
                message: message || null,
            },
        });

    await prisma.notification.create({
      data: {
        userId: ride.driverId,
        title: 'New ride request',
        message: `You have a new ride request for ${ride.origin} to ${ride.destination}.`,
      },
    });

        res.status(201).json({ message: 'Request raised successfully', request: newRequest });
    } catch (error) {
        console.error('Error raising ride request:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//for trips 
app.get('/trips/driving', authenticateToken, async (req, res) => {
    try {
      const trips = await prisma.share.findMany({
        where: { driverId: req.user.id },
        include: {
          requests: {
            include: {
              user: {
                select: { firstName: true, lastName: true, isVerified: true }, // Fetch only necessary fields
              },
            },
          },
        },
      });
  
      if (!trips.length) {
        return res.status(200).json([]); // Return an empty array if no trips found
      }
  
      res.status(200).json(trips);
    } catch (error) {
      console.error('Error fetching driving trips:', error.message);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  
  

  app.get('/trips/ride-requests', authenticateToken, async (req, res) => {
    try {
      const requests = await prisma.request.findMany({
        where: {
          share: { driverId: req.user.id },
        },
        include: {
          share: true, // Include trip details
          user: {
            select: { firstName: true, lastName: true, isVerified: true }, // Include rider details
          },
        },
      });
  
      if (!requests.length) {
        return res.status(200).json([]); // Return empty array if no requests
      }
  
      res.status(200).json(requests);
    } catch (error) {
      console.error('Error fetching ride requests:', error.message);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  

  app.get('/trips/riding', authenticateToken, async (req, res) => {
    try {
      const ridingRequests = await prisma.request.findMany({
        where: { userId: req.user.id },
        include: {
          share: {
            select: { origin: true, destination: true, departureTime: true, contactNumber: true, price: true },
          },
        },
      });
  
      if (!ridingRequests.length) {
        return res.status(200).json([]); // Return empty array if no riding requests
      }
  
      res.status(200).json(ridingRequests);
    } catch (error) {
      console.error('Error fetching riding requests:', error.message);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

app.delete('/trips/:id', authenticateToken, async (req, res) => {
  const tripId = parseInt(req.params.id);
  if (!tripId) return res.status(400).json({ message: 'Invalid trip id' });

  try {
    const share = await prisma.share.findUnique({
      where: { id: tripId },
      include: { requests: true },
    });
    if (!share) return res.status(404).json({ message: 'Trip not found' });
    if (share.driverId !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed to delete this trip' });
    }

    const requestIds = share.requests.map((reqItem) => reqItem.id);
    const approvedRequests = share.requests.filter((reqItem) => reqItem.status === 'APPROVED');
    const departureText = share.departureTime ? new Date(share.departureTime).toISOString() : 'scheduled time';

    await prisma.$transaction(async (tx) => {
      if (approvedRequests.length > 0) {
        await tx.notification.createMany({
          data: approvedRequests.map((reqItem) => ({
            userId: reqItem.userId,
            title: 'Ride cancelled',
            message: `Your approved ride from ${share.origin} to ${share.destination} on ${departureText} was deleted by the owner.`,
          })),
        });
      }

      if (requestIds.length > 0) {
        await tx.message.deleteMany({ where: { requestId: { in: requestIds } } });
        await tx.rating.deleteMany({ where: { requestId: { in: requestIds } } });
        await tx.request.deleteMany({ where: { id: { in: requestIds } } });
      }

      await tx.share.delete({ where: { id: tripId } });
    });

    return res.status(200).json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid notification id' });

  try {
    const notification = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    res.status(200).json({ notification });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.patch('/requests/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
  
    // Validate status
    if (!['PENDING', 'APPROVED', 'DECLINED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
  
    try {
      const requestId = parseInt(id);
      const request = await prisma.request.update({
        where: { id: requestId },
        data: { status },
        include: { share: true },
      });
  
      if (!request) {
        return res.status(404).json({ message: 'Request not found' });
      }
  
      if (status === 'APPROVED' || status === 'DECLINED') {
        await prisma.notification.create({
          data: {
            userId: request.userId,
            title: status === 'APPROVED' ? 'Ride request approved' : 'Ride request rejected',
            message: `Your request for ${request.share.origin} to ${request.share.destination} was ${status.toLowerCase()}.`,
          },
        });
      }

      res.status(200).json({ message: 'Request status updated successfully', request });
    } catch (error) {
      console.error('Error updating request status:', error.message);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });


// ---- Messaging and Rating Endpoints ---- //

app.post('/requests/:id/messages', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    try {
        const requestId = parseInt(id);
        const reqInfo = await prisma.request.findUnique({
            where: { id: requestId },
            include: { share: true }
        });
        if (!reqInfo) return res.status(404).json({ message: 'Request not found' });

        // Ensure user is either driver or rider
        if (reqInfo.userId !== req.user.id && reqInfo.share.driverId !== req.user.id) {
            return res.status(403).json({ message: 'Not allowed to message in this trip' });
        }

        const message = await prisma.message.create({
            data: {
                requestId,
                senderId: req.user.id,
                text
            }
        });
        res.status(201).json(message);
    } catch (error) {
        console.error('Message error:', error);
        res.status(500).json({ message: 'Error sending message' });
    }
});

app.get('/requests/:id/messages', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const requestId = parseInt(id);
        const messages = await prisma.message.findMany({
            where: { requestId },
            include: { sender: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'asc' }
        });
        res.status(200).json(messages);
    } catch (error) {
        console.error('Fetch message error:', error);
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

app.post('/requests/:id/rate', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { score, comment } = req.body;
    try {
        const requestId = parseInt(id);
        const reqInfo = await prisma.request.findUnique({
            where: { id: requestId },
            include: { share: true }
        });
        if (!reqInfo || reqInfo.status !== 'APPROVED') {
             return res.status(400).json({ message: 'Cannot rate unless ride is approved' });
        }

        let rateeId;
        if (reqInfo.userId === req.user.id) {
            rateeId = reqInfo.share.driverId; // Rider rates driver
        } else if (reqInfo.share.driverId === req.user.id) {
            rateeId = reqInfo.userId; // Driver rates rider
        } else {
            return res.status(403).json({ message: 'Not part of this trip' });
        }

        const newRating = await prisma.rating.create({
            data: {
                requestId,
                raterId: req.user.id,
                rateeId,
                score,
                comment
            }
        });
        res.status(201).json({ message: 'Rated successfully', rating: newRating });
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ message: 'You already rated this user for this trip' });
        console.error('Rating error:', error);
        res.status(500).json({ message: 'Error submitting rating' });
    }
});

// --------------------------------------- //

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));