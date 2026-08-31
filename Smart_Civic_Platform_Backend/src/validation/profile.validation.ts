import { z } from "zod";

export const identityUploadSchema = z.object({
  identity_type: z.enum([
    "citizenship",
    "national_id",
    "passport",
    "driving_license",
    "voter_id",
  ]),
  identity_number: z.string().min(3, "Identity number must be at least 3 characters"),
  identity_document: z.string().min(1, "Identity document is required"), // Base64 string
});

export const profilePictureSchema = z.object({
  profile_picture: z.string().min(1, "Profile picture base64 string is required"),
});
