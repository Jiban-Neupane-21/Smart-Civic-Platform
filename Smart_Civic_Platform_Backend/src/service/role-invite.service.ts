import { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

export class RoleInviteService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Create and store a role invitation token (expires in 24 hours)
   */
  async createInvite(payload: {
    invited_by: string;
    email: string;
    phone?: string;
    role: string;
    municipality_id?: string;
    department_id?: string;
    staff_role?: string;
    additional_data?: Record<string, any>;
  }) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: invite, error } = await this.supabaseAdmin
      .from("role_invites")
      .insert({
        email: payload.email,
        phone: payload.phone || null,
        token,
        role: payload.role as any,
        municipality_id: payload.municipality_id || null,
        department_id: payload.department_id || null,
        staff_role: payload.staff_role || null,
        additional_data: payload.additional_data || null,
        invited_by: payload.invited_by,
        expires_at: expiresAt,
        is_used: false,
        is_revoked: false,
      })
      .select()
      .single();

    if (error) throw error;
    return invite;
  }

  /**
   * Validate an invite token
   */
  async validateInvite(token: string) {
    const { data: invite, error } = await this.supabaseAdmin
      .from("role_invites")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !invite) {
      throw new Error("Invalid or expired invitation link.");
    }

    if (invite.is_used) {
      throw new Error("This invitation link has already been used.");
    }

    if (invite.is_revoked) {
      throw new Error("This invitation has been revoked.");
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      throw new Error("This invitation link has expired.");
    }

    return invite;
  }

  /**
   * Mark invite as consumed
   */
  async consumeInvite(token: string) {
    const nowIso = new Date().toISOString();
    const { data, error } = await this.supabaseAdmin
      .from("role_invites")
      .update({
        is_used: true,
        used_at: nowIso,
      })
      .eq("token", token)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Revoke invitation
   */
  async revokeInvite(inviteId: string, revokedBy: string) {
    const nowIso = new Date().toISOString();
    const { data, error } = await this.supabaseAdmin
      .from("role_invites")
      .update({
        is_revoked: true,
        revoked_at: nowIso,
      })
      .eq("id", inviteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
