import { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccountStatus,
  UserRole,
  ProvinceRow,
  DistrictRow,
  WardRow,
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
  async updateMunicipalityHead(id: string, profile_id: string) {
    const { data, error } = await this.supabaseAdmin
      .from("municipalities")
      .update({ head_profile_id: profile_id })
      .eq("id", id)
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
      .select(`
        id,
        action,
        action_by_role,
        table_name,
        record_id,
        old_value,
        new_value,
        severity,
        created_at,
        action_by,
        municipality_id,
        target_user_id,
        actor:profiles!action_by ( full_name, email ),
        municipality:municipalities!municipality_id ( official_name ),
        target_user:profiles!target_user_id ( full_name, email )
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Flatten joined fields for a clean response shape
    return (data ?? []).map((row: any) => ({
      id: row.id,
      action: row.action,
      action_by: row.action_by,
      action_by_name: row.actor?.full_name ?? null,
      action_by_email: row.actor?.email ?? null,
      action_by_role: row.action_by_role,
      municipality_id: row.municipality_id,
      municipality_name: row.municipality?.official_name ?? null,
      target_user_id: row.target_user_id,
      target_user_name: row.target_user?.full_name ?? null,
      target_user_email: row.target_user?.email ?? null,
      table_name: row.table_name,
      record_id: row.record_id,
      old_value: row.old_value,
      new_value: row.new_value,
      severity: row.severity,
      created_at: row.created_at,
    }));
  }


  // Get active municipalities with joined province & district details
  async getMunicipalities() {
    const { data, error } = await this.supabaseAdmin
      .from("v_active_municipalities")
      .select("*")
      .order("official_name", { ascending: true });

    if (error) throw error;
    return data;
  }

  // Get a single municipality by its ID
  async getMunicipalityById(id: string) {
    const { data, error } = await this.supabaseAdmin
      .from("municipalities")
      .select("*")
      .eq("id", id)
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
      .eq("id", id)
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
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Reference Data API — Get all provinces
  async getProvinces(): Promise<ProvinceRow[]> {
    const { data, error } = await this.supabaseAdmin
      .from("provinces")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Reference Data API — Get districts (optionally filtered by province_id)
  async getDistricts(provinceId?: string): Promise<DistrictRow[]> {
    let query = this.supabaseAdmin
      .from("districts")
      .select("*")
      .order("name", { ascending: true });

    if (provinceId) {
      query = query.eq("province_id", provinceId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Reference Data API — Get reference municipalities for cascading dropdowns
  async getReferenceMunicipalities(
    districtId?: string,
    isActive?: boolean
  ): Promise<any[]> {
    let query = this.supabaseAdmin
      .from("municipalities")
      .select("id, official_name, local_level_type, total_wards, district_id, is_active, official_email, official_contact_no, mayor_chairperson_name, deputy_mayor_vice_chairperson_name, about_description")
      .order("official_name", { ascending: true });

    if (districtId) {
      query = query.eq("district_id", districtId);
    }
    if (isActive !== undefined) {
      query = query.eq("is_active", isActive);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Reference Data API — Get full municipality detail with province & district names
  async getMunicipalityDetail(id: string) {
    const { data, error } = await this.supabaseAdmin
      .from("v_municipality_detail")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }

  // Reference Data API — Get wards for a municipality
  async getWards(municipalityId: string): Promise<WardRow[]> {
    const { data, error } = await this.supabaseAdmin
      .from("wards")
      .select("*")
      .eq("municipality_id", municipalityId)
      .order("ward_no", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Activate pre-seeded municipality and assign head profile
  async activateMunicipality(
    id: string,
    headProfileId: string,
    headName: string,
    headEmail: string
  ) {
    const { data, error } = await this.supabaseAdmin
      .from("municipalities")
      .update({
        is_active: true,
        head_profile_id: headProfileId,
        head_name: headName,
        head_email: headEmail,
        registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("is_active", false)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Auto-create wards (1 to total_wards) upon activation
  async createWards(municipalityId: string, count: number): Promise<void> {
    const wardRows = Array.from({ length: count }, (_, i) => ({
      municipality_id: municipalityId,
      ward_no: i + 1,
    }));

    const { error } = await this.supabaseAdmin
      .from("wards")
      .insert(wardRows);

    if (error) throw error;
  }
}
