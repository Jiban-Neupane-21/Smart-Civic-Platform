import { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccountStatus,
  UserRole,
} from "../../../types/database.type";

export class SuperadminRepository {
  constructor(private supabaseAdmin: SupabaseClient) {}

  // Section 22: Fetches pre-aggregated metrics from the v_superadmin_analytics view
  async getMacroAnalytics() {
    const { data, error } = await this.supabaseAdmin
      .from("v_superadmin_analytics")
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  // Section 6: Provisions a new municipality record
  async createMunicipality(muniData: Record<string, any>) {
    const { data, error } = await this.supabaseAdmin
      .from("municipalities")
      .insert([muniData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update municipality's head_profile_id after user creation
  async updateMunicipalityHead(m_uid: string, profile_id: string) {
    const { data, error } = await this.supabaseAdmin
      .from("municipalities")
      .update({ head_profile_id: profile_id })
      .eq("m_uid", m_uid)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Check if an email is already taken
  async checkEmailExists(email: string): Promise<boolean> {
    const { data, error } = await this.supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  }

  // Get profile ID by email
  async getProfileIdByEmail(email: string): Promise<string | null> {
    const { data, error } = await this.supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;
    return data ? data.id : null;
  }

  // Section 4 & 9: Elevates or alters user roles via the secure admin RPC wrapper
  async updateUserRole(targetUserId: string, newRole: UserRole) {
    const { data, error } = await this.supabaseAdmin.rpc(
      "admin_set_user_role",
      {
        p_target_user_id: targetUserId,
        p_new_role: newRole,
      },
    );

    if (error) throw error;
    return data;
  }

  // Section 4: Manages access by updating account status flags directly
  async updateAccountStatus(targetUserId: string, status: AccountStatus) {
    const { data, error } = await this.supabaseAdmin
      .from("profiles")
      .update({ account_status: status })
      .eq("id", targetUserId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Section 20: Reads the immutable database audit trail
  async getAuditLogs(limit: number = 50, offset: number = 0) {
    const { data, error } = await this.supabaseAdmin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data;
  }

  // Get all municipalities
  async getMunicipalities() {
    const { data, error } = await this.supabaseAdmin
      .from("municipalities")
      .select("*")
      .order("registered_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  // Get a single municipality by its ID
  async getMunicipalityById(id: string) {
    const { data, error } = await this.supabaseAdmin
      .from("municipalities")
      .select("*")
      .eq("m_uid", id)
      .single();

    if (error) throw error;
    return data;
  }

  // Delete a profile row by its ID
  async deleteProfileById(profileId: string) {
    const { error } = await this.supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", profileId);

    if (error) throw error;
  }

  // Delete a Supabase Auth user by their ID
  async deleteAuthUser(userId: string) {
    const { error } = await this.supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
  }

  // Update a municipality
  async updateMunicipality(id: string, data: Record<string, any>) {
    const { data: result, error } = await this.supabaseAdmin
      .from("municipalities")
      .update(data)
      .eq("m_uid", id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // Delete a municipality
  async deleteMunicipality(id: string) {
    const { data, error } = await this.supabaseAdmin
      .from("municipalities")
      .delete()
      .eq("m_uid", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
