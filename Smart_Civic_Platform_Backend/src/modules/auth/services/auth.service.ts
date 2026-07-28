import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin, createAuthClient, supabase } from "../../../config/supabase";
import type { UserRole } from "../../../types/database.type";
import { TOKEN_CONFIG } from "../../../app";
import { env } from "../../../config/env";

// Derived millisecond value — computed once at module load
const REFRESH_TOKEN_TTL_MS =
  TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export const registerService = async (body: {
  email: string;
  password: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  phone?: string;
  full_address?: string;
  current_address?: string;
  gender?: string;
  role?: "citizen";
  municipality_id?: string;
  department_id?: string;
}) => {
  const fullName = body.middle_name?.trim()
    ? `${body.first_name.trim()} ${body.middle_name.trim()} ${body.last_name.trim()}`
    : `${body.first_name.trim()} ${body.last_name.trim()}`;

  const sanitizedGender = body.gender && ['male', 'female', 'other', 'prefer_not_to_say'].includes(body.gender.toLowerCase())
    ? body.gender.toLowerCase()
    : null;

  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const municipalityId = body.municipality_id && uuidRegex.test(body.municipality_id) ? body.municipality_id : null;
  const departmentId = body.department_id && uuidRegex.test(body.department_id) ? body.department_id : null;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      first_name: body.first_name.trim(),
      middle_name: body.middle_name?.trim() || null,
      last_name: body.last_name.trim(),
      role: body.role ?? "citizen",
      municipality_id: municipalityId,
      department_id: departmentId,
      phone: body.phone?.trim() || null,
      full_address: body.full_address?.trim() || null,
      current_address: body.current_address?.trim() || null,
      gender: sanitizedGender
    },
  });

  if (error) {
    console.error('[registerService] Supabase createUser error:', error);
    throw new Error(error.message);
  }

  return { id: data.user.id, email: data.user.email };
};

export const loginService = async (email: string, password: string) => {
  const authClient = createAuthClient();

  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    console.error("[loginService] signInWithPassword error:", error.message);
    throw new Error(error.message || "Invalid email or password");
  }

  let { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, email, role, municipality_id, department_id, account_status, force_password_reset",
    )
    .eq("id", data.user.id)
    .maybeSingle();

  // Auto-healing fallback: If user authenticated successfully in auth.users,
  // but their profiles row is missing (e.g. past DB trigger failure), auto-create it now.
  if (!profile) {
    console.warn(`[loginService] Profile missing for user ${data.user.id}. Attempting auto-heal from user_metadata.`);
    const meta = data.user.user_metadata || {};
    const userRole = (meta.role as UserRole) || "citizen";
    const fullName = meta.full_name || data.user.email || "Unknown User";

    const { error: insertProfileErr } = await supabaseAdmin.from("profiles").upsert({
      id: data.user.id,
      email: data.user.email!,
      full_name: fullName,
      phone: meta.phone || null,
      role: userRole,
      municipality_id: meta.municipality_id || null,
      department_id: meta.department_id || null,
      account_status: "active",
    });

    if (insertProfileErr) {
      console.error("[loginService] Auto-heal profile creation failed:", insertProfileErr);
      throw new Error("User profile not found. Please contact administrator.");
    }

    if (userRole === "citizen") {
      const citizenData: any = {
        first_name: meta.first_name || null,
        middle_name: meta.middle_name || null,
        last_name: meta.last_name || null,
        current_address: meta.current_address || null,
        permanent_address: meta.full_address || meta.permanent_address || null,
        gender: meta.gender || null,
      };

      const { error: citErr } = await supabaseAdmin.from("citizens").upsert({
        id: data.user.id,
        ...citizenData,
      });

      if (citErr) {
        await supabaseAdmin.from("citizens").upsert({
          profile_id: data.user.id,
          ...citizenData,
        });
      }
    }

    const { data: healedProfile, error: healedProfileErr } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, email, role, municipality_id, department_id, account_status, force_password_reset",
      )
      .eq("id", data.user.id)
      .single();

    if (healedProfileErr || !healedProfile) {
      throw new Error("User profile not found. Please contact administrator.");
    }

    profile = healedProfile;
  }

  if (profile.account_status === "suspended") {
    throw new Error("Account is suspended");
  }

  await supabaseAdmin
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);

  const tokenHash = crypto
    .createHash("sha256")
    .update(data.session.refresh_token)
    .digest("hex");
  await supabaseAdmin.from("refresh_tokens").insert({
    profile_id: data.user.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(), // 7 days
  });

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    profile,
  };
};

export const refreshTokenService = async (refreshToken: string) => {
  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");
  const { data: stored, error: lookupErr } = await supabaseAdmin
    .from("refresh_tokens")
    .select("is_revoked, expires_at, profile_id")
    .eq("token_hash", tokenHash)
    .single();

  if (lookupErr || !stored) throw new Error("Refresh token not found");
  if (stored.is_revoked) throw new Error("Refresh token has been revoked");
  if (new Date(stored.expires_at) < new Date()) {
    throw new Error("Refresh token expired");
  }

  const authClient = createAuthClient();
  const { data, error } = await authClient.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error || !data.session) throw new Error("Could not refresh session");

  await supabaseAdmin
    .from("refresh_tokens")
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);

  const newHash = crypto
    .createHash("sha256")
    .update(data.session.refresh_token)
    .digest("hex");
  await supabaseAdmin.from("refresh_tokens").insert({
    profile_id: stored.profile_id,
    token_hash: newHash,
    expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(), // 7 days
  });

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
  };
};

export const logoutService = async (refreshToken: string, userId: string) => {
  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");
  await supabaseAdmin
    .from("refresh_tokens")
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .eq("profile_id", userId);
};

// ──────────────────────────────────────────────────────────────────────────────
// Direct User Creation (replaces the old invite flow)
// ──────────────────────────────────────────────────────────────────────────────

export const createUserService = async (body: {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  municipality_id: string;
  department_id?: string;
  phone?: string;
  created_by: string;
}) => {
  // 1. Check if email is already taken
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", body.email)
    .maybeSingle();
  if (existing) throw new Error("A user with this email already exists");

  // 2. Create the auth user via Supabase Admin API
  //    The handle_new_user DB trigger will auto-create the profiles row
  const { data: authData, error: authErr } =
    await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name,
        role: body.role,
        municipality_id: body.municipality_id,
        department_id: body.department_id ?? null,
        phone: body.phone ?? null,
      },
    });
  if (authErr) throw new Error(authErr.message);

  const uid = authData.user.id;

  // 3. Update profile with additional fields not handled by the trigger
  await supabaseAdmin
    .from("profiles")
    .update({
      full_name: body.full_name,
      force_password_reset: true,
    })
    .eq("id", uid);

  // 4. For staff-level roles, update the staff table with onboarding timestamp
  if (["staff", "department_head"].includes(body.role)) {
    await supabaseAdmin
      .from("staff")
      .update({
        onboarded_at: new Date().toISOString(),
      })
      .eq("profile_id", uid);
  }

  // 5. Return the created profile
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, email, full_name, role, municipality_id, department_id, force_password_reset",
    )
    .eq("id", uid)
    .single();

  if (profileErr) throw new Error("User created but failed to fetch profile");

  return profile;
};

export const forgotPasswordService = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.CLIENT_URL}/reset-password`,
  });
  if (error) throw new Error(error.message);
  return { message: "Password reset email sent if the account exists." };
};

export const changePasswordService = async (
  userId: string,
  body: { current_password: string; new_password: string },
) => {
  const authClient = createAuthClient();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (!profile) throw new Error("User not found");

  const { error: loginErr } = await authClient.auth.signInWithPassword({
    email: profile.email,
    password: body.current_password,
  });
  if (loginErr) throw new Error("Current password is incorrect");

  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { password: body.new_password },
  );
  if (updateErr) throw new Error(updateErr.message);

  return { message: "Password changed successfully" };
};

export const loginWithMobileService = async (phone: string, otpCode: string) => {
  const sanitizedPhone = phone.trim().replace(/^\+977/, "");

  const { OTPService } = require("../../../service/otp.service");
  const otpService = new OTPService(supabaseAdmin);
  const isValid = await otpService.verifyOTP(sanitizedPhone, otpCode, "login");
  if (!isValid) throw new Error("Invalid or expired OTP code.");

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, role, municipality_id, department_id, account_status, force_password_reset")
    .eq("phone", sanitizedPhone)
    .maybeSingle();

  if (error || !profile) {
    throw new Error("No citizen account found associated with this mobile number.");
  }

  if (profile.account_status === "suspended") {
    throw new Error("Account is suspended");
  }

  // Generate magic link token from Supabase admin
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
  });

  if (linkErr || !linkData.properties?.hashed_token) {
    throw new Error("Failed to generate session for mobile user.");
  }

  // Exchange hashed token for active session
  const authClient = createAuthClient();
  const { data: sessionData, error: sessionErr } = await authClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (sessionErr || !sessionData.session) {
    throw new Error("Failed to authenticate session: " + sessionErr?.message);
  }

  await supabaseAdmin
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", profile.id);

  const tokenHash = crypto
    .createHash("sha256")
    .update(sessionData.session.refresh_token)
    .digest("hex");
  await supabaseAdmin.from("refresh_tokens").insert({
    profile_id: profile.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(),
  });

  return {
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    expires_in: sessionData.session.expires_in,
    profile,
  };
};
