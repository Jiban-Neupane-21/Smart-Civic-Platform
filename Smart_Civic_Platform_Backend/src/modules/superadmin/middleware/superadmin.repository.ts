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

  // Review and update KYC status of a municipality
  async reviewMunicipalityKyc(
    id: string,
    status: 'verified' | 'rejected',
    verifiedBy: string,
    rejectionReason?: string
  ) {
    const updateData: Record<string, any> = {
      kyc_status: status,
    };

    if (status === 'verified') {
      updateData.kyc_verified_at = new Date().toISOString();
      updateData.kyc_verified_by = verifiedBy;
      updateData.kyc_rejection_reason = null;
    } else if (status === 'rejected') {
      updateData.kyc_rejection_reason = rejectionReason || null;
    }

    const { data, error } = await this.supabaseAdmin
      .from("municipalities")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Reset and deactivate a municipality (retaining the Nepal geographical reference entity)
  async resetMunicipality(id: string) {
    const { data, error } = await this.supabaseAdmin
      .from("municipalities")
      .update({
        is_active: false,
        head_profile_id: null,
        head_name: null,
        head_email: null,
        head_contact_no: null,
        kyc_status: "unverified",
        kyc_submitted_at: null,
        kyc_verified_at: null,
        kyc_verified_by: null,
        kyc_rejection_reason: null,
        registration_document_url: null,
        head_identity_type: null,
        head_identity_number: null,
        head_identity_front_url: null,
        head_identity_back_url: null,
        about_description: null,
        mayor_chairperson_name: null,
        deputy_mayor_vice_chairperson_name: null,
        official_logo: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Cascade soft delete a municipality: archives & soft-deletes staff, deactivates departments & profiles, revokes invites, resets municipality
  async cascadeSoftDeleteMunicipality(municipalityId: string, deletedBy?: string) {
    const affectedProfileIds: string[] = [];

    // 1. Fetch municipality to get head_profile_id
    const { data: municipality, error: muniErr } = await this.supabaseAdmin
      .from("municipalities")
      .select("id, head_profile_id")
      .eq("id", municipalityId)
      .maybeSingle();

    if (muniErr) throw muniErr;
    if (!municipality) throw new Error("Municipality not found.");

    if (municipality.head_profile_id) {
      affectedProfileIds.push(municipality.head_profile_id);
    }

    // 2. Fetch all departments in this municipality
    const { data: departments, error: deptErr } = await this.supabaseAdmin
      .from("departments")
      .select("id, head_profile_id")
      .eq("municipality_id", municipalityId);

    if (deptErr) throw deptErr;

    (departments || []).forEach((d: any) => {
      if (d.head_profile_id) {
        affectedProfileIds.push(d.head_profile_id);
      }
    });

    // 3. Fetch all active staff members in this municipality
    const { data: staffList, error: staffErr } = await this.supabaseAdmin
      .from("staff")
      .select(`
        id, profile_id, employee_id, expertise, contact_number,
        gender, date_of_birth, personal_address, employee_status,
        primary_department_id, municipality_id,
        profiles:profiles!profile_id(full_name, email, phone)
      `)
      .eq("municipality_id", municipalityId)
      .eq("is_deleted", false);

    if (staffErr) {
      console.warn("Could not fetch staff for archive:", staffErr.message);
    }

    if (staffList && staffList.length > 0) {
      // Archive to deleted_staff
      const archiveRows = staffList.map((s: any) => {
        const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        if (s.profile_id) {
          affectedProfileIds.push(s.profile_id);
        }
        return {
          original_staff_id: s.id,
          original_profile_id: s.profile_id,
          full_name: profile?.full_name || "Unknown Staff",
          email: profile?.email || null,
          phone: profile?.phone || null,
          employee_id: s.employee_id || null,
          expertise: s.expertise || null,
          contact_number: s.contact_number || null,
          gender: s.gender || null,
          date_of_birth: s.date_of_birth || null,
          personal_address: s.personal_address || null,
          employee_status: "terminated",
          primary_department_id: s.primary_department_id,
          municipality_id: s.municipality_id,
          deleted_by: deletedBy || null,
          deleted_at: new Date().toISOString(),
        };
      });

      try {
        const { error: archiveErr } = await this.supabaseAdmin
          .from("deleted_staff")
          .insert(archiveRows);
        if (archiveErr) {
          console.warn("Archive staff insert warning:", archiveErr.message);
        }
      } catch (err: any) {
        console.warn("Failed to insert into deleted_staff:", err.message);
      }

      // Soft delete in staff table
      const { error: softDeleteStaffErr } = await this.supabaseAdmin
        .from("staff")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          employee_status: "terminated",
          updated_at: new Date().toISOString(),
        })
        .eq("municipality_id", municipalityId);

      if (softDeleteStaffErr) {
        console.warn("Soft delete staff error:", softDeleteStaffErr.message);
      }
    }

    // 4. Fetch any additional profiles directly belonging to this municipality
    const { data: tenantProfiles, error: tenantProfilesErr } = await this.supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("municipality_id", municipalityId)
      .eq("is_deleted", false);

    if (!tenantProfilesErr && tenantProfiles) {
      tenantProfiles.forEach((p: any) => affectedProfileIds.push(p.id));
    }

    const uniqueProfileIds = Array.from(new Set(affectedProfileIds)).filter(Boolean);

    // 5. Soft-delete and suspend all collected profiles
    if (uniqueProfileIds.length > 0) {
      const { error: softDeleteProfilesErr } = await this.supabaseAdmin
        .from("profiles")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          account_status: "suspended" as AccountStatus,
          updated_at: new Date().toISOString(),
        })
        .in("id", uniqueProfileIds);

      if (softDeleteProfilesErr) {
        console.warn("Soft delete profiles error:", softDeleteProfilesErr.message);
      }
    }

    // 6. Deactivate all departments in this municipality
    const { error: deactivateDeptsErr } = await this.supabaseAdmin
      .from("departments")
      .update({
        is_active: false,
        head_profile_id: null,
        head_name: null,
        head_email: null,
        kyc_status: "unverified",
        updated_at: new Date().toISOString(),
      })
      .eq("municipality_id", municipalityId);

    if (deactivateDeptsErr) {
      console.warn("Deactivate departments error:", deactivateDeptsErr.message);
    }

    // 7. Revoke all pending role invites for this municipality
    const { error: revokeInvitesErr } = await this.supabaseAdmin
      .from("role_invites")
      .update({
        is_revoked: true,
        revoked_at: new Date().toISOString(),
      })
      .eq("municipality_id", municipalityId)
      .eq("is_used", false);

    if (revokeInvitesErr) {
      console.warn("Revoke role invites warning:", revokeInvitesErr.message);
    }

    // 8. Reset and deactivate the municipality row
    const resetResult = await this.resetMunicipality(municipalityId);

    return {
      success: true,
      resetMunicipality: resetResult,
      affectedProfileIds: uniqueProfileIds,
      staffArchivedCount: staffList?.length || 0,
      departmentsDeactivatedCount: departments?.length || 0,
    };
  }

  // Delete all departments and teams in a municipality (legacy helper)
  async deleteDepartmentsByMunicipality(municipalityId: string) {
    const { error } = await this.supabaseAdmin
      .from("departments")
      .update({
        is_active: false,
        head_profile_id: null,
        head_name: null,
        head_email: null,
        kyc_status: "unverified",
        updated_at: new Date().toISOString(),
      })
      .eq("municipality_id", municipalityId);
    if (error) console.error("Error deactivating departments for municipality:", error.message);
  }

  // Delete all wards in a municipality
  async deleteWardsByMunicipality(municipalityId: string) {
    const { error } = await this.supabaseAdmin
      .from("wards")
      .delete()
      .eq("municipality_id", municipalityId);
    if (error) console.error("Error clearing wards for municipality:", error.message);
  }

  // Delete a municipality row completely (fallback)
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
