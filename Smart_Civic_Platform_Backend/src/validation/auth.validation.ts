import { z } from "zod";

export const registerSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  full_address: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const inviteSchema = z.object({
  target_email: z.string().email(),
  target_role: z.enum(["municipality_head", "department_head", "staff"]),
  department_id: z.string().uuid().optional(),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  full_name: z.string().min(1),
  password: z.string().min(8),
  phone: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});
