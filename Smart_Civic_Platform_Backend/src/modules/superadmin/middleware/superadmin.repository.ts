import { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccountStatus,
  Database,
  MunicipalityInsert,
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
  async createMunicipality(muniData: MunicipalityInsert) {
    const { data, error } = await this.supabaseAdmin
      .from("municipalities")
      .insert([muniData])
      .select()
      .single();

    if (error) throw error;
    return data;
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
}
