import { z } from "zod";

export const registerSchema = z.object({
  full_name:        z.string().min(1, "Full name is required"),
  email:            z.string().email("Invalid email address"),
  password:         z.string().min(8, "Password must be at least 8 characters"),
  phone:            z.string().optional().transform(val => val?.trim() || undefined),
  date_of_birth:    z.string().optional().transform(val => val?.trim() || undefined),
  full_address:     z.string().optional().transform(val => val?.trim() || undefined),
  current_address:  z.string().optional().transform(val => val?.trim() || undefined),
  gender:           z.preprocess(
                      (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
                      z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional()
                    ),
  // Staff/admin accounts are created directly via role-specific API endpoints.
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createUserSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    full_name: z.string().min(1, "Full name is required"),
    role: z.enum(["municipality_head", "department_head", "staff"]),
    department_id: z.string().uuid("department_id must be a valid UUID").optional(),
    phone: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // department_head and staff must be scoped to a specific department
    if (["department_head", "staff"].includes(data.role) && !data.department_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "department_id is required when creating department_head or staff",
        path: ["department_id"],
      });
    }
  });

export const createStaffSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});

export const sendOtpSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  purpose: z.enum(["registration", "login", "reset_password"]).optional(),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  otp_code: z.string().length(6, "OTP code must be exactly 6 digits"),
  purpose: z.enum(["registration", "login", "reset_password"]).optional(),
});

export const loginMobileSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  otp_code: z.string().length(6, "OTP code must be exactly 6 digits"),
});
