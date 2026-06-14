import { z } from "zod";

export const submitComplaintSchema = z.object({
  municipality_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  category_id: z.string().uuid().optional(),
  attachment_url: z.string().url().optional(),
});

export const submitFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  is_anonymous: z.boolean().optional(),
});
