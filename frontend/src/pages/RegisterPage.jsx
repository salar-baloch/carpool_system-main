import { useEffect, useState } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import signupImage from "../assets/signup.jpeg"
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import {
    isEmail,
    passwordIssues,
    validateRequired,
    isCommonPassword,
    isDisposableEmail,
    isDriverLicenseValid,
    passwordStrengthScore,
    passwordStrengthLabel,
} from "../utils/validation";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

const MAX_UPLOAD_MB = 5;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

const documentFields = [
    { key: "DRIVER_LICENSE_FRONT", label: "Driver License (Front)", required: true },
    { key: "DRIVER_LICENSE_BACK", label: "Driver License (Back)", required: true },
    { key: "CNIC_FRONT", label: "CNIC / ID Card (Front)", required: true },
    { key: "CNIC_BACK", label: "CNIC / ID Card (Back)", required: true },
    { key: "VEHICLE_REGISTRATION", label: "Vehicle Registration", required: true },
    { key: "PROFILE_PICTURE", label: "Profile Picture", required: true },
    { key: "PROOF_OF_ADDRESS", label: "Proof of Address", required: true },
];

const validateFile = (file) => {
    if (!file) return "File is required";
    if (file.size > MAX_UPLOAD_BYTES) return `Max ${MAX_UPLOAD_MB}MB`;
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) return "Only JPG/PNG/PDF allowed";
    return "";
};

const driverLicensePatterns = {
    US: /^[A-Z0-9]{6,12}$/i,
    UK: /^[A-Z0-9]{5,16}$/i,
    PK: /^[A-Z0-9-]{6,18}$/i,
    IN: /^[A-Z0-9]{6,16}$/i,
    CA: /^[A-Z0-9]{6,15}$/i,
    AU: /^[A-Z0-9]{6,12}$/i,
    OTHER: /^[A-Z0-9-]{6,18}$/i,
};

const phonePatterns = {
    US: /^\+1\d{10}$/,
    UK: /^\+44\d{10}$/,
    PK: /^(\+92|92|0)?3\d{9}$/,
    IN: /^\+91\d{10}$/,
    CA: /^\+1\d{10}$/,
    AU: /^\+61\d{9}$/,
    OTHER: /^\+?\d{10,15}$/,
};
const RegisterPage = () => {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        repeatPassword: "",
        driverLicenseId: "",
        dateOfBirth: "",
        phone: "",
        country: "US",
        gender: ""
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emailStatus, setEmailStatus] = useState("idle");

    const [documents, setDocuments] = useState(() => {
        const initial = {};
        for (const f of documentFields) initial[f.key] = null;
        return initial;
    });
    const [docErrors, setDocErrors] = useState({});
    const [uploadProgress, setUploadProgress] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({ ...prevData, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const normalizePhone = (country, value) => {
        const raw = String(value || "").trim().replace(/[\s-]/g, "");
        if (!raw) return "";
        if (raw.startsWith("+")) return raw;
        if (country === "PK") {
            if (/^92\d{10}$/.test(raw)) return `+${raw}`;
            if (/^0?3\d{9}$/.test(raw)) {
                const local = raw.startsWith("0") ? raw.slice(1) : raw;
                return `+92${local}`;
            }
        }
        if (/^\d{10,15}$/.test(raw)) return `+${raw}`;
        return raw;
    };

    const handleDocumentChange = (docType, file) => {
        setDocuments((prev) => ({ ...prev, [docType]: file }));
        const msg = validateFile(file);
        setDocErrors((prev) => ({ ...prev, [docType]: msg }));
        setErrors((prev) => ({ ...prev, documents: "" }));
    };

    useEffect(() => {
        if (!formData.email) {
            setEmailStatus("idle");
            return;
        }
        if (!isEmail(formData.email)) {
            setEmailStatus("invalid");
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            setEmailStatus("checking");
            try {
                const response = await fetch(`${API_BASE}/auth/check-email`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: formData.email }),
                    signal: controller.signal,
                });
                const data = await response.json();
                if (response.ok) {
                    setEmailStatus(data.exists ? "exists" : "available");
                } else {
                    setEmailStatus("error");
                }
            } catch (error) {
                if (error.name !== "AbortError") {
                    setEmailStatus("error");
                }
            }
        }, 600);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [formData.email]);

    const validateForm = () => {
        const nextErrors = {};
        if (!validateRequired(formData.firstName)) nextErrors.firstName = "First name is required";
        if (!validateRequired(formData.lastName)) nextErrors.lastName = "Last name is required";
        if (!validateRequired(formData.email)) {
            nextErrors.email = "Email is required";
        } else if (!isEmail(formData.email)) {
            nextErrors.email = "Enter a valid email";
        } else if (isDisposableEmail(formData.email)) {
            nextErrors.email = "Disposable email domains are not allowed";
        } else if (emailStatus === "exists") {
            nextErrors.email = "Email is already registered";
        }

        const passwordProblems = passwordIssues(formData.password);
        if (passwordProblems.length > 0) {
            nextErrors.password = `Password must include: ${passwordProblems.join(", ")}`;
        } else if (isCommonPassword(formData.password)) {
            nextErrors.password = "Password is too common. Choose a stronger one.";
        }

        if (!validateRequired(formData.repeatPassword)) {
            nextErrors.repeatPassword = "Please confirm your password";
        } else if (formData.password !== formData.repeatPassword) {
            nextErrors.repeatPassword = "Passwords do not match";
        }

        if (!validateRequired(formData.driverLicenseId)) {
            nextErrors.driverLicenseId = "Driver license is required";
        } else if (!isDriverLicenseValid(formData.driverLicenseId)) {
            nextErrors.driverLicenseId = "Use 6-15 letters/numbers only";
        } else {
            const pattern = driverLicensePatterns[formData.country] || driverLicensePatterns.OTHER;
            if (!pattern.test(formData.driverLicenseId)) {
                nextErrors.driverLicenseId = "License format doesn't match selected country";
            }
        }

        if (!validateRequired(formData.dateOfBirth)) {
            nextErrors.dateOfBirth = "Date of birth is required";
        } else {
            const dob = new Date(formData.dateOfBirth);
            const now = new Date();
            const age = now.getFullYear() - dob.getFullYear();
            const m = now.getMonth() - dob.getMonth();
            const adjustedAge = m < 0 || (m === 0 && now.getDate() < dob.getDate()) ? age - 1 : age;
            if (Number.isNaN(dob.getTime())) {
                nextErrors.dateOfBirth = "Enter a valid date";
            } else if (adjustedAge < 18) {
                nextErrors.dateOfBirth = "You must be at least 18 years old";
            }
        }

        if (!validateRequired(formData.phone)) {
            nextErrors.phone = "Phone number is required";
        } else {
            const phonePattern = phonePatterns[formData.country] || phonePatterns.OTHER;
            if (!phonePattern.test(formData.phone)) {
                nextErrors.phone = "Enter a valid phone number for selected country";
            }
        }

        if (!validateRequired(formData.gender)) nextErrors.gender = "Select a gender";
        if (emailStatus === "checking") nextErrors.email = "Checking email availability...";

        const nextDocErrors = {};
        for (const f of documentFields) {
            const file = documents[f.key];
            if (!file) continue;
            const msg = validateFile(file);
            if (msg) nextDocErrors[f.key] = msg;
        }
        setDocErrors(nextDocErrors);

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const uploadOneDocument = async (token, type, file) => {
        const form = new FormData();
        form.append("type", type);
        form.append("file", file);

        return await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", `${API_BASE}/users/me/documents`);
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable) return;
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress((prev) => ({ ...prev, [type]: percent }));
            };
            xhr.onload = () => {
                try {
                    const json = xhr.responseText ? JSON.parse(xhr.responseText) : null;
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(json);
                    } else {
                        reject(new Error(json?.message || `Upload failed (${xhr.status})`));
                    }
                } catch {
                    reject(new Error(`Upload failed (${xhr.status})`));
                }
            };
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.send(form);
        });
    };

    const uploadAllDocuments = async (token) => {
        setUploadProgress({});
        for (const f of documentFields) {
            const file = documents[f.key];
            if (!file) continue;
            setUploadProgress((prev) => ({ ...prev, [f.key]: 0 }));
            await uploadOneDocument(token, f.key, file);
            setUploadProgress((prev) => ({ ...prev, [f.key]: 100 }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Please fix the highlighted fields.");
            return;
        }

        try {
            setIsSubmitting(true);
            const normalizedPhone = formData.phone
                ? normalizePhone(formData.country, formData.phone)
                : "";
            const payload = { ...formData, phone: normalizedPhone || formData.phone };
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (response.ok) {
                // immediately login to get JWT for upload
                const loginResp = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: formData.email, password: formData.password }),
                });
                const loginData = await loginResp.json();
                const token = loginData?.token;
                if (!loginResp.ok || !token) {
                    toast.success("User registered successfully! Please login to upload documents.");
                } else {
                    const hasDocs = documentFields.some((f) => !!documents[f.key]);
                    if (hasDocs) {
                        toast.info("Uploading documents...");
                        await uploadAllDocuments(token);
                        toast.success("User registered + documents uploaded successfully!");
                    } else {
                        toast.success("User registered successfully! You can upload documents later to get verified.");
                    }
                }

                setFormData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    password: "",
                    repeatPassword: "",
                    driverLicenseId: "",
                    dateOfBirth: "",
                    phone: "",
                    country: "US",
                    gender: "",
                });
                setDocuments(() => {
                    const initial = {};
                    for (const f of documentFields) initial[f.key] = null;
                    return initial;
                });
                setDocErrors({});
                setUploadProgress({});
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("An error occurred during registration. Please try again.");
            console.error('Error during registration:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            repeatPassword: "",
            driverLicenseId: "",
            dateOfBirth: "",
            phone: "",
            country: "US",
            gender: ""
        });
        setDocuments(() => {
            const initial = {};
            for (const f of documentFields) initial[f.key] = null;
            return initial;
        });
        setDocErrors({});
        setUploadProgress({});
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-4 py-12">
            <div className="max-w-6xl w-full grid md:grid-cols-2 bg-white shadow-2xl rounded-3xl overflow-hidden">
                <div
                    className="hidden md:block bg-cover bg-center"
                    style={{ backgroundImage: `url(${signupImage})` }}
                />

                <div className="p-10 md:p-12">
                    <ToastContainer />
                    <h2 className="text-3xl font-bold text-slate-900">Create your account</h2>
                    <p className="text-slate-500 mt-2">Join CarPool System and start sharing rides today.</p>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700" htmlFor="firstName">
                                First Name
                            </label>
                            <Input
                                type="text"
                                id="firstName"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className={`mt-2 ${errors.firstName ? "border-rose-300 focus:ring-rose-500" : ""}`}
                                required
                            />
                            {errors.firstName && (
                                <p className="mt-2 text-sm text-rose-600">{errors.firstName}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700" htmlFor="lastName">
                                Last Name
                            </label>
                            <Input
                                type="text"
                                id="lastName"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className={`mt-2 ${errors.lastName ? "border-rose-300 focus:ring-rose-500" : ""}`}
                                required
                            />
                            {errors.lastName && (
                                <p className="mt-2 text-sm text-rose-600">{errors.lastName}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700" htmlFor="email">
                                Email Address
                            </label>
                            <Input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`mt-2 ${errors.email ? "border-rose-300 focus:ring-rose-500" : ""}`}
                                required
                            />
                            {emailStatus === "checking" && (
                                <p className="mt-2 text-sm text-slate-500">Checking availability...</p>
                            )}
                            {emailStatus === "available" && !errors.email && (
                                <p className="mt-2 text-sm text-emerald-600">Email is available</p>
                            )}
                            {emailStatus === "exists" && (
                                <p className="mt-2 text-sm text-rose-600">Email already registered</p>
                            )}
                            {errors.email && (
                                <p className="mt-2 text-sm text-rose-600">{errors.email}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
                                Password
                            </label>
                            <Input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={`mt-2 ${errors.password ? "border-rose-300 focus:ring-rose-500" : ""}`}
                                required
                            />
                            {errors.password && (
                                <p className="mt-2 text-sm text-rose-600">{errors.password}</p>
                            )}
                            <div className="mt-2">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>Password strength</span>
                                    <span>{passwordStrengthLabel(passwordStrengthScore(formData.password))}</span>
                                </div>
                                <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                                    <div
                                        className="h-2 rounded-full bg-emerald-500 transition-all"
                                        style={{ width: `${(passwordStrengthScore(formData.password) / 5) * 100}%` }}
                                    />
                                </div>
                                <ul className="mt-2 grid gap-1 text-xs text-slate-500">
                                    {passwordIssues(formData.password).length === 0 ? (
                                        <li className="text-emerald-600">All password requirements met</li>
                                    ) : (
                                        passwordIssues(formData.password).map((issue) => (
                                            <li key={issue}>• {issue}</li>
                                        ))
                                    )}
                                </ul>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700" htmlFor="repeatPassword">
                                Repeat Password
                            </label>
                            <Input
                                type="password"
                                id="repeatPassword"
                                name="repeatPassword"
                                value={formData.repeatPassword}
                                onChange={handleChange}
                                className={`mt-2 ${errors.repeatPassword ? "border-rose-300 focus:ring-rose-500" : ""}`}
                                required
                            />
                            {errors.repeatPassword && (
                                <p className="mt-2 text-sm text-rose-600">{errors.repeatPassword}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700" htmlFor="dateOfBirth">
                                Date of Birth
                            </label>
                            <Input
                                type="date"
                                id="dateOfBirth"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                                className={`mt-2 ${errors.dateOfBirth ? "border-rose-300 focus:ring-rose-500" : ""}`}
                                required
                            />
                            {errors.dateOfBirth && (
                                <p className="mt-2 text-sm text-rose-600">{errors.dateOfBirth}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700" htmlFor="phone">
                                Phone Number
                            </label>
                            <Input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className={`mt-2 ${errors.phone ? "border-rose-300 focus:ring-rose-500" : ""}`}
                                placeholder="+12345678901"
                                required
                            />
                            {errors.phone && (
                                <p className="mt-2 text-sm text-rose-600">{errors.phone}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700" htmlFor="driverLicenseId">
                                Driver&apos;s License ID
                            </label>
                            <div className="mt-2 grid gap-3 md:grid-cols-2">
                                <select
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                >
                                    <option value="US">United States</option>
                                    <option value="UK">United Kingdom</option>
                                    <option value="PK">Pakistan</option>
                                    <option value="IN">India</option>
                                    <option value="CA">Canada</option>
                                    <option value="AU">Australia</option>
                                    <option value="OTHER">Other</option>
                                </select>
                                <Input
                                    type="text"
                                    id="driverLicenseId"
                                    name="driverLicenseId"
                                    value={formData.driverLicenseId}
                                    onChange={handleChange}
                                    className={`mt-2 ${errors.driverLicenseId ? "border-rose-300 focus:ring-rose-500" : ""}`}
                                    required
                                />
                            </div>
                            {errors.driverLicenseId && (
                                <p className="mt-2 text-sm text-rose-600">{errors.driverLicenseId}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700">Gender</label>
                            <div className="mt-2 flex gap-4 text-sm text-slate-600">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="male"
                                        checked={formData.gender === 'male'}
                                        onChange={handleChange}
                                        className="h-4 w-4"
                                    />
                                    Male
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="female"
                                        checked={formData.gender === 'female'}
                                        onChange={handleChange}
                                        className="h-4 w-4"
                                    />
                                    Female
                                </label>
                            </div>
                            {errors.gender && (
                                <p className="mt-2 text-sm text-rose-600">{errors.gender}</p>
                            )}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900">Documents (optional)</h3>
                                    <p className="mt-1 text-xs text-slate-500">Upload now or later to get verified. Max {MAX_UPLOAD_MB}MB each. Allowed: JPG, PNG, PDF.</p>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                {documentFields.map((f) => (
                                    <div key={f.key} className="rounded-xl border border-slate-200 bg-white p-3">
                                        <label className="block text-sm font-semibold text-slate-700">
                                            {f.label}
                                        </label>
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white hover:file:bg-slate-800"
                                            onChange={(e) => handleDocumentChange(f.key, e.target.files?.[0] || null)}
                                        />
                                        {documents[f.key] && (
                                            <p className="mt-2 text-xs text-slate-500">
                                                Selected: {documents[f.key].name} ({Math.ceil(documents[f.key].size / 1024)} KB)
                                            </p>
                                        )}
                                        {docErrors?.[f.key] && (
                                            <p className="mt-2 text-sm text-rose-600">{docErrors[f.key]}</p>
                                        )}
                                        {typeof uploadProgress?.[f.key] === "number" && (
                                            <div className="mt-2">
                                                <div className="h-2 w-full rounded-full bg-slate-200">
                                                    <div
                                                        className="h-2 rounded-full bg-emerald-600 transition-all"
                                                        style={{ width: `${uploadProgress[f.key]}%` }}
                                                    />
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500">Upload: {uploadProgress[f.key]}%</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Submitting..." : "Submit"}
                            </Button>
                            <Button type="button" variant="secondary" className="w-full" onClick={handleCancel}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
