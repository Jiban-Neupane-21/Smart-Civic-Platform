/**
 * Helper to calculate age from a YYYY-MM-DD date string
 */
export const calculateAge = (dobString: string): number => {
  if (!dobString) return -1;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return -1;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

/**
 * Checks if a date of birth represents someone who is at least 18 years old
 */
export const isAtLeast18 = (dobString: string): boolean => {
  const age = calculateAge(dobString);
  return age >= 18 && age <= 120;
};

/**
 * Returns the maximum date string (YYYY-MM-DD) allowed for an 18-year-old
 * Useful for `<input type="date" max={getMaxDobFor18()} />`
 */
export const getMaxDobFor18 = (): string => {
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return maxDate.toISOString().split("T")[0];
};

/**
 * Returns the minimum date string (YYYY-MM-DD) for max 120 years old
 */
export const getMinDob = (): string => {
  const today = new Date();
  const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
  return minDate.toISOString().split("T")[0];
};

/**
 * Nepal phone regex: mobile 98XXXXXXXX / 97XXXXXXXX, landlines, optional +977
 */
export const NEPAL_PHONE_REGEX = /^(?:\+977[- ]?)?(?:9[78]\d{8}|0\d{1,2}[- ]?\d{6,7})$/;

export const isValidNepalPhone = (phone: string): boolean => {
  if (!phone) return false;
  return NEPAL_PHONE_REGEX.test(phone.trim());
};

/**
 * Legal Name regex: letters, spaces, dots, hyphens
 */
export const NAME_REGEX = /^[a-zA-Z\s.'-]+$/;

export const isValidName = (name: string): boolean => {
  if (!name) return false;
  const trimmed = name.trim();
  return trimmed.length >= 3 && trimmed.length <= 100 && NAME_REGEX.test(trimmed);
};

/**
 * Validates identity document numbers based on document type
 */
export const isValidIdentityNumber = (type: string, number: string): boolean => {
  if (!number) return false;
  const trimmed = number.trim();
  switch (type) {
    case "citizenship":
      return /^[0-9\-\/]{3,30}$/.test(trimmed);
    case "national_id":
      return /^\d{10,16}$/.test(trimmed);
    case "passport":
      return /^[A-Za-z0-9]{7,9}$/.test(trimmed);
    case "driving_license":
      return /^[0-9\-\/]{6,25}$/.test(trimmed);
    case "voter_id":
      return /^[A-Za-z0-9\-\/]{6,30}$/.test(trimmed);
    default:
      return trimmed.length >= 3 && trimmed.length <= 30;
  }
};

/**
 * Basic email format validation
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  return EMAIL_REGEX.test(email.trim());
};

