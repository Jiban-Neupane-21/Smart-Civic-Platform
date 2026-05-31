import { z } from "zod";

export const registerSchema = z.object({
  first_name:   z.string().min(1, "First name is required"),
  last_name:    z.string().min(1, "Last name is required"),
  email:        z.string().email("Invalid email address"),
  password:     z.string().min(8, "Password must be at least 8 characters"),
  phone:        z.string().optional(),
  full_address: z.string().optional(),
  // role is intentionally NOT accepted — /register is citizen-only.
  // Staff accounts are created exclusively through the invite flow.
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});




export const inviteSchema = z
  .object({
    target_email: z.string().email("Invalid email address"),
    target_role:  z.enum(["municipality_head", "department_head", "staff"]),
    department_id: z.string().uuid("department_id must be a valid UUID").optional(),
  })
  .superRefine((data, ctx) => {
    // department_head and staff must be scoped to a specific department
    if (["department_head", "staff"].includes(data.target_role) && !data.department_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "department_id is required when inviting department_head or staff",
        path: ["department_id"],
      });
    }
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
