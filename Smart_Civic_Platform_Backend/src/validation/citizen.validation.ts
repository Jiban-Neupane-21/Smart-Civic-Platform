import { z } from "zod";

export const submitComplaintSchema = z.object({
  municipality_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  category_id: z.string().uuid().optional(),
});

export const submitFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  is_anonymous: z.boolean().optional(),
});

export const updateProfileSchema = z.object({
  first_name: z.string().min(1, "First name is required").optional(),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required").optional(),
  phone: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  date_of_birth: z.string().optional(),
  current_address: z.string().optional(),
  permanent_address: z.string().optional(),
  notification_pref: z.enum(["email", "sms", "both", "none"]).optional(),
});

const addressSectionSchema = z.object({
  province_id: z.string().uuid().optional(),
  district_id: z.string().uuid().optional(),
  municipality_id: z.string().uuid().optional(),
  ward_id: z.string().uuid().optional(),
  tole: z.string().optional(),
});

export const addressSchema = z.object({
  permanent: addressSectionSchema.optional(),
  current: addressSectionSchema.optional(),
});

export const identityUploadSchema = z.object({
  identity_type: z.enum(["citizenship", "national_id", "passport", "driving_license", "voter_id"]),
  identity_number: z.string().min(3, "Identity number must be at least 3 characters"),
  front_image: z.string().optional(),
  back_image: z.string().optional(),
});
