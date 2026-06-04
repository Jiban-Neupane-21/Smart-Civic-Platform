/**
 * supabase.ts
 *
 * Exports two fully-typed Supabase clients:
 *
 *   supabase       — anon key client. Respects Row Level Security.
 *                    Use for user-context reads or operations that
 *                    should go through RLS policies.
 *
 *   supabaseAdmin  — service role key client. Bypasses ALL RLS.
 *                    Use ONLY server-side for admin operations:
 *                    creating users, patching roles, reading any record.
 *                    ⚠️  NEVER expose this key or client to the frontend.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.type";
import { env } from "./env";

// ─── Validate env vars at module load time ────────────────────────────────────

const SUPABASE_URL: string = env.SUPABASE_URL;
const SUPABASE_ANON_KEY: string = env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY: string = env.SUPABASE_SERVICE_ROLE_KEY;

// ─── Shared client options ────────────────────────────────────────────────────

/**
 * Options shared by both clients.
 * autoRefreshToken and persistSession are disabled because this is a server —
 * there is no browser localStorage and we manage tokens manually per-request.
 */
const sharedOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
} as const;

// ─── Public client (respects RLS) ─────────────────────────────────────────────

/**
 * Use this client when you want RLS to enforce access control.
 * To make requests on behalf of a specific user, call:
 *
 *   const userClient = supabase.auth.setSession({ access_token, refresh_token })
 *
 * Or pass the user's JWT in Supabase's Authorization header by constructing
 * a per-request client using createClient with the user's token.
 */
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  sharedOptions,
) as SupabaseClient<Database>;

// ─── Admin client (bypasses RLS) ──────────────────────────────────────────────

/**
 * Use this client ONLY in server-side code.
 * It bypasses all Row Level Security policies.
 *
 * Legitimate uses:
 *   - Creating a new auth.users record (admin.createUser)
 *   - Patching a user's role or metadata after invite acceptance
 *   - Reading records across municipality boundaries (superadmin ops)
 *   - Deleting or suspending any account
 *
 * Never use this client in a route handler that receives arbitrary user input
 * without validating the caller's role and scope first in middleware.
 */
/** Untyped client avoids strict generic inference issues with hand-maintained Database types */
export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  sharedOptions,
);

// ─── Per-request user client factory ─────────────────────────────────────────

/**
 * Creates a one-off Supabase client authenticated as a specific user.
 * Use this when you want RLS to apply using the caller's own JWT
 * rather than the service role key.
 *
 * Example:
 *   const userClient = createUserClient(req.token);
 *   const { data } = await userClient.from('complaints').select('*');
 *   // RLS will automatically filter to complaints owned by this user
 *
 * @param accessToken  The Bearer JWT from the Authorization header
 */
export function createUserClient(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...sharedOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
