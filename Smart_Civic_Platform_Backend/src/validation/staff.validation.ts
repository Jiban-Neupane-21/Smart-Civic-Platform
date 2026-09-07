import { z } from "zod";
import {
  zodLegalName,
  zodNepalPhone,
  zodAgeAtLeast18,
  validateIdentityNumber,
} from "./common.validation";

export const createStaffSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["staff", "department_head"]).optional(),
  department_id: z.string().uuid("Invalid department_id format").optional(),
  phone: z.string().optional(),
  expertise: z.string().optional(),
});

export const updateStaffSchema = z.object({
  full_name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  expertise: z.string().optional(),
  contact_number: z.string().optional(),
  employee_status: z.enum(["active", "inactive", "suspended", "terminated"]).optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  date_of_birth: z.string().optional(),
  personal_address: z.string().optional(),
});

export const updateStaffStatusSchema = z.object({
  status: z.enum(["active", "inactive", "suspended"]),
});

export const staffKycSchema = z
  .object({
    full_name: zodLegalName,
    contact_number: zodNepalPhone,
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"], {
      message: "Please select a valid gender option.",
    }),
    date_of_birth: zodAgeAtLeast18,
    personal_address: z.string().trim().min(5, "Personal address must be at least 5 characters"),
    emergency_contact_name: zodLegalName,
    emergency_contact_phone: zodNepalPhone,
    employee_id: z.string().trim().min(2, "Employee ID must be at least 2 characters").optional(),
    designation: z.string().trim().min(2, "Designation must be at least 2 characters"),
    expertise: z.string().trim().min(2, "Expertise must be at least 2 characters").optional(),
    identity_type: z.enum(["citizenship", "national_id", "passport", "driving_license"], {
      message: "Please select a valid identity document type.",
    }),
    identity_number: z.string().trim().min(3, "Identity document number must be at least 3 characters"),
    identity_front_url: z.string().min(1, "Identity document front image is required"),
    identity_back_url: z.string().optional(),
    appointment_letter_url: z.string().optional(),
    photo_url: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Validate identity number format
    if (!validateIdentityNumber(data.identity_type, data.identity_number)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid format for ${data.identity_type.replace('_', ' ')} number.`,
        path: ["identity_number"],
      });
    }

    // 2. Emergency phone must not match own contact number
    const cleanPersonal = data.contact_number.replace(/\D/g, "").slice(-10);
    const cleanEmergency = data.emergency_contact_phone.replace(/\D/g, "").slice(-10);
    if (cleanPersonal && cleanEmergency && cleanPersonal === cleanEmergency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Emergency contact phone cannot be identical to your personal contact number.",
        path: ["emergency_contact_phone"],
      });
    }

    // 3. For citizenship, national_id, driving_license: back image is required
    if (["citizenship", "national_id", "driving_license"].includes(data.identity_type) && !data.identity_back_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Back image is required for this identity document type.",
        path: ["identity_back_url"],
      });
    }
  });
