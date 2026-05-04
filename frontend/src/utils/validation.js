export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const commonPasswords = [
  "password",
  "123456",
  "12345678",
  "qwerty",
  "111111",
  "123123",
  "abc123",
  "password1",
  "iloveyou",
  "admin",
];

const disposableDomains = [
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "yopmail.com",
  "dispostable.com",
  "trashmail.com",
  "maildrop.cc",
];

export const passwordIssues = (value) => {
  const issues = [];
  if (!value || value.length < 8) issues.push("At least 8 characters");
  if (!/[A-Z]/.test(value)) issues.push("One uppercase letter");
  if (!/[a-z]/.test(value)) issues.push("One lowercase letter");
  if (!/\d/.test(value)) issues.push("One number");
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) issues.push("One special character");
  return issues;
};

export const validateRequired = (value) => value.trim().length > 0;

export const isCommonPassword = (value) =>
  commonPasswords.includes((value || "").toLowerCase());

export const isDisposableEmail = (value) => {
  const domain = (value || "").split("@")[1]?.toLowerCase();
  return !!domain && disposableDomains.includes(domain);
};

export const isDriverLicenseValid = (value) =>
  /^[A-Z0-9]{6,15}$/i.test((value || "").trim());

export const passwordStrengthScore = (value) => {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) score += 1;
  if (value.length >= 12) score += 1;
  return Math.min(score, 5);
};

export const passwordStrengthLabel = (score) => {
  if (score <= 1) return "Weak";
  if (score === 2) return "Fair";
  if (score === 3) return "Good";
  if (score === 4) return "Strong";
  return "Very strong";
};

export const isPhoneNumber = (value) => /^\+?\d{10,15}$/.test((value || "").trim());
