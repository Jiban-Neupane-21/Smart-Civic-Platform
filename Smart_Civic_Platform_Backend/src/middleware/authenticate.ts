import { Request, Response, NextFunction } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserClient, supabaseAdmin } from "../config/supabase.js";
import type { Database } from "../types/database.type";
import { sendError } from "../utils/response.js";

export interface AuthUser {
  id: string;
  userId: string;
  email: string;
  phone: string | null;
  role: string;
  municipality_id: string | null;
  municipalityId: string | null;
  department_id: string | null;
  departmentId: string | null;
  full_name: string;
  force_password_reset: boolean;
  created_at: string;
  identity_type?: string | null;
  identity_number?: string | null;
  identity_document_url?: string | null;
  identity_verified_at?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      accessToken?: string;
      userClient?: SupabaseClient;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return sendError(res, "Missing or invalid authorization header", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const client = createUserClient(token);
    const {
      data: { user },
      error,
    } = await client.auth.getUser();

    if (error || !user) return sendError(res, "Invalid or expired token", 401);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, email, phone, role, municipality_id, department_id, full_name, account_status, force_password_reset, created_at, identity_type, identity_number, identity_document_url, identity_verified_at",
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile)
      return sendError(res, "Profile not found", 401);
    if (profile.account_status === "suspended")
      return sendError(res, "Account suspended", 403);

    req.user = {
      ...profile,
      userId: profile.id,
      municipalityId: profile.municipality_id,
      departmentId: profile.department_id,
    } as AuthUser;
    req.accessToken = token;
    req.userClient = client;
    next();
  } catch {
    return sendError(res, "Authentication failed", 401);
  }
};
