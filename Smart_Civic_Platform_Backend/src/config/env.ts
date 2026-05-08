// ===============================
// 🌍 ENV CONFIG (Validated)
// ===============================

import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file
dotenv.config();

// ===============================
// 🧪 VALIDATION SCHEMA
// ===============================

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // JWT (if you use custom tokens later)
  JWT_SECRET: z.string().min(10),

  // Email (optional but recommended for invites)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Frontend URL (for invite links, reset links)
  CLIENT_URL: z.string().url().optional(),
});

// ===============================
// 🔍 PARSE & VALIDATE
// ===============================

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:');
  console.error(parsedEnv.error.format());
  process.exit(1); // stop app immediately
}

// ===============================
// 📦 EXPORT CLEAN ENV OBJECT
// ===============================

export const env = {
  NODE_ENV: parsedEnv.data.NODE_ENV,
  PORT: Number(parsedEnv.data.PORT),

  SUPABASE_URL: parsedEnv.data.SUPABASE_URL,
  SUPABASE_ANON_KEY: parsedEnv.data.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: parsedEnv.data.SUPABASE_SERVICE_ROLE_KEY,

  JWT_SECRET: parsedEnv.data.JWT_SECRET,

  SMTP: {
    HOST: parsedEnv.data.SMTP_HOST,
    PORT: parsedEnv.data.SMTP_PORT
      ? Number(parsedEnv.data.SMTP_PORT)
      : undefined,
    USER: parsedEnv.data.SMTP_USER,
    PASS: parsedEnv.data.SMTP_PASS,
  },

  CLIENT_URL: parsedEnv.data.CLIENT_URL,
};