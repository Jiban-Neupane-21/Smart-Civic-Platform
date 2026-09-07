import { z } from "zod";
import {
  zodLegalName,
  zodNepalPhone,
  validateIdentityNumber,
} from "./common.validation";

export const departmentKycSchema = z
  .object({
    official_email: z.string().email("Invalid official email format").optional(),
    head_name: zodLegalName.optional(),
    head_email: z.string().email("Invalid department head email format").optional(),
    head_contact_no: zodNepalPhone.optional(),
    head_identity_type: z
      .enum(["citizenship", "national_id", "passport", "driving_license"], {
        message: "Please select a valid identity document type.",
      })
      .optional(),
    head_identity_number: z
      .string()
      .trim()
      .min(3, "Identity number must be at least 3 characters")
      .optional(),
    department_logo_base64: z.string().optional(),
    department_logo: z.string().optional(),
    head_identity_front_base64: z.string().optional(),
    head_identity_front_url: z.string().optional(),
    head_identity_back_base64: z.string().optional(),
    head_identity_back_url: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // If identity type and number are provided, validate format
    if (data.head_identity_type && data.head_identity_number) {
      if (!validateIdentityNumber(data.head_identity_type, data.head_identity_number)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid format for ${data.head_identity_type.replace('_', ' ')} number.`,
          path: ["head_identity_number"],
        });
      }
    }

    // If submitting KYC with front document, ensure identity type and number are also present
    const hasFront = data.head_identity_front_base64 || data.head_identity_front_url;
    if (hasFront) {
      if (!data.head_identity_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Identity document type is required when uploading documents.",
          path: ["head_identity_type"],
        });
      }
      if (!data.head_identity_number) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Identity document number is required when uploading documents.",
          path: ["head_identity_number"],
        });
      }
    }
  });
