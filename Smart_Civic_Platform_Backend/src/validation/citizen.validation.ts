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
