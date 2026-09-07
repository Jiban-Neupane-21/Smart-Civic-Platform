import { z } from "zod";

/**
 * Validates that a date of birth string represents an age of at least 18 years
 * and not older than 120 years.
 */
export const calculateAge = (dobString: string): number => {
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

export const zodAgeAtLeast18 = z
  .string()
  .refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date format. Expected YYYY-MM-DD.",
  })
  .refine(
    (val) => {
      const age = calculateAge(val);
      return age >= 18;
    },
    {
      message: "You must be at least 18 years old.",
    }
  )
  .refine(
    (val) => {
      const age = calculateAge(val);
      return age <= 120;
    },
    {
      message: "Date of birth cannot be older than 120 years.",
    }
  );

/**
 * Validates Nepal phone numbers:
 * - Mobile: 98XXXXXXXX or 97XXXXXXXX (10 digits)
 * - Optional +977 or 977 prefix
 * - Landline formats e.g. 01XXXXXXX
 */
export const NEPAL_PHONE_REGEX = /^(?:\+977[- ]?)?(?:9[78]\d{8}|0\d{1,2}[- ]?\d{6,7})$/;

export const zodNepalPhone = z
  .string()
  .trim()
  .regex(NEPAL_PHONE_REGEX, "Invalid Nepal phone number. Expected 10 digits (e.g. 98XXXXXXXX or 97XXXXXXXX).");

/**
 * Validates full legal name (letters, spaces, dots, hyphens)
 */
export const NAME_REGEX = /^[a-zA-Z\s.'-]+$/;

export const zodLegalName = z
  .string()
  .trim()
  .min(3, "Name must be at least 3 characters")
  .max(100, "Name must be at most 100 characters")
  .regex(NAME_REGEX, "Name can only contain letters, spaces, dots, and hyphens.");

/**
 * Validates identity document numbers based on document type
 */
export const validateIdentityNumber = (type: string, number: string): boolean => {
  const trimmed = number.trim();
  switch (type) {
    case "citizenship":
      // Nepali citizenship formats: e.g. 12-01-75-12345, 1234/567, etc.
      return /^[0-9\-\/]{3,30}$/.test(trimmed);
    case "national_id":
      // National Identity card: numeric 10 to 16 digits
      return /^\d{10,16}$/.test(trimmed);
    case "passport":
      // Nepali passport: e.g. 1 alphanumeric letter + 7 digits or 7-9 alphanumeric
      return /^[A-Za-z0-9]{7,9}$/.test(trimmed);
    case "driving_license":
      // Driving license: digits and hyphens
      return /^[0-9\-\/]{6,25}$/.test(trimmed);
    case "voter_id":
      return /^[A-Za-z0-9\-\/]{6,30}$/.test(trimmed);
    default:
      return trimmed.length >= 3 && trimmed.length <= 30;
  }
};
