import { z } from "zod";

export const submitComplaintSchema = z.object({
  municipality_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  category_id: z.string().uuid().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  address_hint: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  is_anonymous: z.boolean().optional(),
});

export const submitFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  is_anonymous: z.boolean().optional(),
});
