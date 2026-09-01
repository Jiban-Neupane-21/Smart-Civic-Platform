import { z } from "zod";

export const createComplaint4StepSchema = z.object({
  location: z.object({
    source: z.enum(["registered_address", "gps", "manual"]).optional(),
    municipality_id: z.string().uuid("Invalid municipality_id format").optional(),
    ward_id: z.string().uuid("Invalid ward_id format").optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
  category: z.object({
    primary_category_id: z.string().uuid("Primary category ID is required"),
    secondary_category_id: z.string().uuid().optional().nullable(),
  }),
  details: z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    severity_level: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
    ticket_type: z.enum(["complaint", "request", "inquiry"]).optional().default("complaint"),
  }),
  submission_step_completed: z.number().int().min(1).max(4).optional().default(4),
});

export const reopenComplaintSchema = z.object({
  reopen_reason: z.string().min(5, "Reason for reopening must be at least 5 characters"),
});

export const complaintNoteSchema = z.object({
  note: z.string().min(1, "Note content cannot be empty"),
  is_internal: z.boolean().optional().default(false),
});

export const collaborationRequestSchema = z.object({
  supporting_department_id: z.string().uuid("Invalid supporting department ID"),
  inspection_note: z.string().optional(),
});

export const signOffSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().optional(),
});
