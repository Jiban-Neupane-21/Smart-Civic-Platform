import { z } from "zod";

export const createTeamSchema = z.object({
  team_name: z.string().min(2, "Team name must be at least 2 characters"),
  description: z.string().optional(),
  start_date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start_date format"),
  end_date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end_date format"),
  member_staff_ids: z.array(z.string().uuid()).optional(),
  leader_staff_id: z.string().uuid().optional(),
  is_emergency_override: z.boolean().optional().default(false),
  override_reason: z.string().optional(),
});

export const updateTeamSchema = z.object({
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const assignComplaintToTeamSchema = z.object({
  complaint_id: z.string().uuid("Invalid complaint_id format"),
  notes: z.string().optional(),
});
