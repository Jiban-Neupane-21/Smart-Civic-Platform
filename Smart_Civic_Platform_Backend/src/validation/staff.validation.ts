import { z } from "zod";

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
