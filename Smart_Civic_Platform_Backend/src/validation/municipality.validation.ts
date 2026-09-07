import { z } from "zod";
import {
  zodLegalName,
  zodNepalPhone,
  validateIdentityNumber,
} from "./common.validation";

export const municipalityKycSchema = z
  .object({
    official_name: z.string().trim().min(3, "Municipality name must be at least 3 characters").optional(),
    official_email: z.string().email("Invalid official email format").optional(),
    official_contact_no: zodNepalPhone.optional(),
    local_level_type: z
      .enum(["metropolitan", "sub_metropolitan", "municipality", "rural_municipality"])
      .optional(),
    total_wards: z
      .number()
      .int("Total wards must be a whole number")
      .min(1, "Total wards must be at least 1")
      .max(50, "Total wards cannot exceed 50")
      .optional(),
    about_description: z.string().trim().min(10, "About description must be at least 10 characters").optional(),
    mayor_chairperson_name: zodLegalName.optional(),
    deputy_mayor_vice_chairperson_name: zodLegalName.optional(),
    head_name: zodLegalName.optional(),
    head_email: z.string().email("Invalid administrative head email format").optional(),
    head_contact_no: zodNepalPhone.optional(),
    head_identity_type: z
      .enum(["citizenship", "national_id", "passport", "driving_license"], {
        message: "Please select a valid identity document type.",
      })
      .optional(),
    head_identity_number: z.string().trim().min(3, "Identity document number must be at least 3 characters").optional(),
    official_logo_base64: z.string().optional(),
    official_logo: z.string().optional(),
    head_identity_front_base64: z.string().optional(),
    head_identity_front_url: z.string().optional(),
    head_identity_back_base64: z.string().optional(),
    head_identity_back_url: z.string().optional(),
    registration_document_base64: z.string().optional(),
    registration_document_url: z.string().optional(),
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

    // If front document is attached, ensure identity type and number are present
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
