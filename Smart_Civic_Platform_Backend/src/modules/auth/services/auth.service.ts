import crypto from "crypto";
import { supabaseAdmin } from "../../../config/supabase";
import type { UserRole } from "../../../types/database.type";
import { TOKEN_CONFIG } from "../../../app";

// Derived millisecond value — computed once at module load
const REFRESH_TOKEN_TTL_MS =
  TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export const registerService = async (body: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  full_address?: string;
  role?: "citizen";
  municipality_id?: string;
  department_id?: string;
}) => {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      full_name: `${body.first_name} ${body.last_name}`,
      first_name: body.first_name,
      last_name: body.last_name,
      role: body.role ?? "citizen",
      municipality_id: body.municipality_id || null,
      department_id: body.department_id || null,
    },
  });

  if (error) throw new Error(error.message);

  if (body.phone || body.full_address) {
    if (body.phone) {
      await supabaseAdmin
        .from("profiles")
        .update({ phone: body.phone })
        .eq("id", data.user.id);
    }
    if (body.full_address) {
      await supabaseAdmin
        .from("citizens")
        .update({ home_address: body.full_address })
        .eq("id", data.user.id);
    }
  }

  return { id: data.user.id, email: data.user.email };
};

export const loginService = async (email: string, password: string) => {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error("Invalid email or password");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, email, role, municipality_id, department_id, account_status, force_password_reset",
    )
    .eq("id", data.user.id)
    .single();

  if (profile?.account_status === "suspended") {
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

  const { data, error } = await supabaseAdmin.auth.refreshSession({
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
      },
    });
  if (authErr) throw new Error(authErr.message);

  const uid = authData.user.id;

  // 3. Update profile with additional fields not handled by the trigger
  await supabaseAdmin
    .from("profiles")
    .update({
      full_name: body.full_name,
      phone: body.phone ?? null,
      force_password_reset: true,
      created_by: body.created_by,
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
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.CLIENT_URL}/reset-password`,
  });
  if (error) throw new Error(error.message);
  return { message: "Password reset email sent if the account exists." };
};
