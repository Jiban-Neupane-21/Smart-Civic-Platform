import { SupabaseClient } from "@supabase/supabase-js";
import type {
  ComplaintStatus,
  DepartmentInsert,
  StaffInsert,
} from "../../../types/database.type";

export class MunicipalityRepository {
  constructor(private supabaseAdmin: SupabaseClient) {}

  // Section 22: Extracts localized real-time dashboard analytics
  async getLocalComplaintStats(municipalityId: string) {
    // 1. Fetch municipality details
    const { data: municipality, error: muniError } = await this.supabaseAdmin
      .from("municipalities")
      .select("id, official_name")
      .eq("id", municipalityId)
      .single();

    if (muniError) throw muniError;

    // 2. Fetch all complaints for this municipality
    const { data: complaints, error: compError } = await this.supabaseAdmin
      .from("complaints")
      .select("status")
      .eq("municipality_id", municipalityId);

    if (compError) throw compError;

    let pending_count = 0;
    let ongoing_count = 0;
    let resolved_count = 0;
    let rejected_count = 0;
    const total_complaints = complaints.length;

    for (const c of complaints) {
      if (c.status === "pending") pending_count++;
      else if (c.status === "in_progress" || c.status === "under_review") ongoing_count++;
      else if (c.status === "resolved" || c.status === "closed") resolved_count++;
      else if (c.status === "rejected") rejected_count++;
    }

    const dynamic_resolution_rate = total_complaints > 0 
      ? Number(((resolved_count / total_complaints) * 100).toFixed(2))
      : 0;

    return {
      municipality_id: municipality.id,
      official_name: municipality.official_name,
      pending_count,
      ongoing_count,
      resolved_count,
      rejected_count,
      total_complaints,
      dynamic_resolution_rate,
    };
  }

  // Section 7: Provisions a functional department within this municipality
  async createDepartment(departmentData: DepartmentInsert) {
    const { data, error } = await this.supabaseAdmin
      .from("departments")
      .insert([departmentData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get departments with staff_count and complaint_count aggregations
  async getDepartments(municipalityId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("departments")
      .select(`
        *,
        staff_count:staff(count),
        complaint_count:complaints!assigned_department_id(count)
      `)
      .eq("municipality_id", municipalityId);

    if (error) throw error;
    
    // Flatten counts if returned as objects
    return (data || []).map((dept: any) => ({
      ...dept,
      staff_count: Array.isArray(dept.staff_count) ? dept.staff_count[0]?.count || 0 : dept.staff_count?.count || 0,
      complaint_count: Array.isArray(dept.complaint_count) ? dept.complaint_count[0]?.count || 0 : dept.complaint_count?.count || 0,
    }));
  }

  async getDepartmentById(departmentId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("departments")
      .select(`
        *,
        head_profile:profiles!head_profile_id(full_name, email, phone)
      `)
      .eq("id", departmentId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateDepartment(departmentId: string, departmentData: any) {
    const { data, error } = await this.supabaseAdmin
      .from("departments")
      .update(departmentData)
      .eq("id", departmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProfile(profileId: string, payload: any) {
    const { data, error } = await this.supabaseAdmin
      .from("profiles")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", profileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProfileById(profileId: string) {
    const { error } = await this.supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", profileId);

    if (error) throw error;
  }

  async deleteAuthUser(userId: string) {
    const { error } = await this.supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
  }

  async deleteDepartment(departmentId: string) {
    const { error } = await this.supabaseAdmin
      .from("departments")
      .delete()
      .eq("id", departmentId);

    if (error) throw error;
  }

  async getDepartmentCategories() {
    const { data, error } = await this.supabaseAdmin.rpc("get_department_categories");
    if (error) throw error;
    return data;
  }

  // Section 8: Enrolls a new staff member linked to a targeted department
  async onboardStaff(staffData: StaffInsert) {
    const { data, error } = await this.supabaseAdmin
      .from("staff")
      .insert([staffData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Staff CRUD — Get list of staff in municipality
  async getStaff(municipalityId: string, departmentId?: string) {
    let query = this.supabaseAdmin
      .from("staff")
      .select(`
        id, employee_id, expertise, contact_number, gender, date_of_birth, employee_status, onboarded_at,
        profile:profiles!profile_id(id, full_name, email, phone, role, account_status),
        department:departments!primary_department_id(id, department_name, department_category)
      `)
      .eq("municipality_id", municipalityId)
      .eq("is_deleted", false);

    if (departmentId) {
      query = query.eq("primary_department_id", departmentId);
    }

    const { data, error } = await query.order("onboarded_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // Staff CRUD — Update staff record
  async updateStaffRecord(staffId: string, municipalityId: string, payload: any) {
    // 1. Fetch staff record to obtain profile_id
    const { data: staffRecord, error: fetchErr } = await this.supabaseAdmin
      .from("staff")
      .select("profile_id, primary_department_id")
      .eq("id", staffId)
      .eq("municipality_id", municipalityId)
      .single();

    if (fetchErr || !staffRecord) {
      throw new Error("Staff record not found in this municipality.");
    }

    // 2. Update profile fields
    const profileUpdates: any = {};
    if (payload.full_name !== undefined) profileUpdates.full_name = payload.full_name;
    if (payload.email !== undefined) profileUpdates.email = payload.email;
    if (payload.phone !== undefined) profileUpdates.phone = payload.phone;

    if (Object.keys(profileUpdates).length > 0) {
      profileUpdates.updated_at = new Date().toISOString();
      const { error: profileErr } = await this.supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", staffRecord.profile_id);

      if (profileErr) throw profileErr;
    }

    // 3. Update staff fields
    const staffUpdates: any = {};
    if (payload.expertise !== undefined) staffUpdates.expertise = payload.expertise;
    if (payload.contact_number !== undefined) staffUpdates.contact_number = payload.contact_number;
    if (payload.employee_status !== undefined) staffUpdates.employee_status = payload.employee_status;
    if (payload.gender !== undefined) staffUpdates.gender = payload.gender;
    if (payload.date_of_birth !== undefined) staffUpdates.date_of_birth = payload.date_of_birth;
    if (payload.primary_department_id !== undefined) staffUpdates.primary_department_id = payload.primary_department_id;

    if (Object.keys(staffUpdates).length > 0) {
      staffUpdates.updated_at = new Date().toISOString();
      const { data, error: staffErr } = await this.supabaseAdmin
        .from("staff")
        .update(staffUpdates)
        .eq("id", staffId)
        .eq("municipality_id", municipalityId)
        .select()
        .single();

      if (staffErr) throw staffErr;
      return data;
    }

    return staffRecord;
  }

  // Staff CRUD — Archive to deleted_staff then delete auth user
  async archiveAndDeleteStaff(staffId: string, municipalityId: string, deletedBy: string) {
    const { data: staffRecord, error: fetchErr } = await this.supabaseAdmin
      .from("staff")
      .select(`
        id, profile_id, employee_id, expertise, contact_number,
        gender, date_of_birth, personal_address, employee_status,
        primary_department_id, municipality_id,
        profiles(full_name, email, phone)
      `)
      .eq("id", staffId)
      .eq("municipality_id", municipalityId)
      .single();

    if (fetchErr || !staffRecord) {
      throw new Error("Staff member not found.");
    }

    const profileRows = staffRecord.profiles as any;
    const profile = Array.isArray(profileRows) ? profileRows[0] : profileRows;

    // Archive to deleted_staff
    const { error: archiveErr } = await this.supabaseAdmin
      .from("deleted_staff")
      .insert({
        original_staff_id: staffId,
        original_profile_id: staffRecord.profile_id,
        full_name: profile?.full_name || "",
        email: profile?.email || "",
        phone: profile?.phone || null,
        employee_id: staffRecord.employee_id || null,
        expertise: staffRecord.expertise || null,
        contact_number: staffRecord.contact_number || null,
        gender: staffRecord.gender || null,
        date_of_birth: staffRecord.date_of_birth || null,
        personal_address: staffRecord.personal_address || null,
        employee_status: staffRecord.employee_status || "active",
        primary_department_id: staffRecord.primary_department_id,
        municipality_id: staffRecord.municipality_id,
        deleted_by: deletedBy,
      });

    if (archiveErr) throw archiveErr;

    // Delete auth user -> cascades profile and staff
    const { error: authErr } = await this.supabaseAdmin.auth.admin.deleteUser(staffRecord.profile_id);
    if (authErr) throw authErr;

    return { success: true };
  }

  // Staff CRUD — Update account status
  async updateStaffAccountStatus(staffId: string, municipalityId: string, status: string) {
    const { data: staff, error: fetchErr } = await this.supabaseAdmin
      .from("staff")
      .select("profile_id")
      .eq("id", staffId)
      .eq("municipality_id", municipalityId)
      .single();

    if (fetchErr || !staff) {
      throw new Error("Staff member not found.");
    }

    const { error } = await this.supabaseAdmin
      .from("profiles")
      .update({ account_status: status as any, updated_at: new Date().toISOString() })
      .eq("id", staff.profile_id);

    if (error) throw error;
  }

  // Staff CRUD — Reset password
  async resetStaffPassword(staffId: string, municipalityId: string, newPassword: string) {
    const { data: staff, error: fetchErr } = await this.supabaseAdmin
      .from("staff")
      .select("profile_id")
      .eq("id", staffId)
      .eq("municipality_id", municipalityId)
      .single();

    if (fetchErr || !staff) {
      throw new Error("Staff member not found.");
    }

    const { error: authErr } = await this.supabaseAdmin.auth.admin.updateUserById(staff.profile_id, {
      password: newPassword,
    });
    if (authErr) throw authErr;

    await this.supabaseAdmin
      .from("profiles")
      .update({ force_password_reset: true, updated_at: new Date().toISOString() })
      .eq("id", staff.profile_id);
  }

  // Section 16: Fetches all complaints submitted to this specific jurisdiction
  async getRegionalComplaints(
    municipalityId: string,
    status?: ComplaintStatus,
  ) {
    let query = this.supabaseAdmin
      .from("complaints")
      .select(
        `co_uid, tracking_id, title, description, status, priority, severity_level, ward_number, citizen_id, municipality_id, assigned_department_id, category_id, submitted_date, updated_at, resolution_date, resolution_note, sla_due_at, sla_breached, department:departments!assigned_department_id(id, department_name), category:complaint_categories!category_id(id, category_name), citizen:citizens(id, current_province_id, current_district_id, current_municipality_id, permanent_province_id, permanent_district_id, permanent_municipality_id)`,
      )
      .eq("municipality_id", municipalityId);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("submitted_date", {
      ascending: false,
    });
    if (error) throw error;
    return data;
  }

  // ===== KYC VERIFICATION METHODS =====

  async getPendingKycList(municipalityId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("citizens")
      .select(`
        id, first_name, middle_name, last_name, identity_type, identity_number,
        identity_front_image_url, identity_back_image_url, kyc_status, registered_at,
        profile:profiles!id(id, full_name, email, phone)
      `)
      .or(`current_municipality_id.eq.${municipalityId},permanent_municipality_id.eq.${municipalityId}`)
      .eq("kyc_status", "pending")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getKycCitizenDetail(municipalityId: string, citizenId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("citizens")
      .select(`
        *,
        profile:profiles!id(id, full_name, email, phone)
      `)
      .eq("id", citizenId)
      .single();

    if (error) throw error;
    return data;
  }

  async reviewKyc(
    municipalityId: string,
    citizenId: string,
    reviewerId: string,
    status: "verified" | "rejected",
    rejectionReason?: string
  ) {
    const updates: Record<string, any> = {
      kyc_status: status,
      kyc_verified_by: reviewerId,
      kyc_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (status === "rejected") {
      updates.kyc_rejection_reason = rejectionReason || "Document verification failed.";
    }

    const { data, error } = await this.supabaseAdmin
      .from("citizens")
      .update(updates)
      .eq("id", citizenId)
      .select()
      .single();

    if (error) throw error;

    try {
      const { data: profile } = await this.supabaseAdmin
        .from("profiles")
        .select("phone")
        .eq("id", citizenId)
        .single();

      if (profile?.phone) {
        const { SmsService } = require("../../../service/sms.service");
        const msg = status === "verified"
          ? "Your identity verification (KYC) on Smart Civic Platform has been APPROVED. You now have full access."
          : `Your identity verification (KYC) on Smart Civic Platform was REJECTED: ${rejectionReason || "Please re-upload clear document images."}`;
        await SmsService.sendSMS(profile.phone, msg);
      }
    } catch (smsErr: any) {
      console.warn("[KYC-SMS-WARN]", smsErr.message);
    }

    return data;
  }

  // ===== CROSS-DEPARTMENT TEAM METHODS =====

  async getCrossDeptTeams(municipalityId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("teams")
      .select(`
        *,
        team_members (
          staff_id, is_leader, joined_at, acknowledged_at,
          staff (
            id, employee_id, primary_department_id, expertise,
            profiles ( full_name, email )
          )
        )
      `)
      .eq("municipality_id", municipalityId)
      .eq("team_type", "cross_departmental")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const now = new Date();
    return (data || []).map((t: any) => {
      let daysRemaining: number | null = null;
      let isExpired = false;

      if (t.end_date) {
        const endDate = new Date(t.end_date);
        const diffMs = endDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        isExpired = diffMs <= 0;
      }

      return {
        ...t,
        days_remaining: daysRemaining,
        is_expired: isExpired,
        member_count: t.team_members?.length || 0,
      };
    });
  }

  async createCrossDeptTeam(municipalityId: string, payload: any) {
    const { data, error } = await this.supabaseAdmin
      .from("teams")
      .insert({
        municipality_id: municipalityId,
        department_id: null,
        team_name: payload.team_name,
        description: payload.description || null,
        team_type: "cross_departmental",
        start_date: payload.start_date,
        end_date: payload.end_date,
        created_by: payload.created_by || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deactivateCrossDeptTeam(teamId: string, municipalityId: string) {
    const nowIso = new Date().toISOString();

    const { data, error } = await this.supabaseAdmin
      .from("teams")
      .update({ is_active: false, updated_at: nowIso })
      .eq("id", teamId)
      .eq("municipality_id", municipalityId)
      .select()
      .single();

    if (error) throw error;

    await this.supabaseAdmin
      .from("staff_assignments")
      .update({
        released_at: nowIso,
        release_reason: "Deactivated by Municipality Head",
      })
      .eq("team_id", teamId)
    return data;
  }

  // ===== ESCALATED COMPLAINTS & INTERVENTION METHODS =====

  async getEscalatedComplaints(municipalityId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("complaints")
      .select(`
        co_uid, tracking_id, title, description, status, priority, severity_level, sla_due_at, sla_breached_at, escalated_at,
        department:departments!primary_department_id(department_name),
        category:complaint_categories!category_id(category_name)
      `)
      .eq("municipality_id", municipalityId)
      .eq("status", "escalated")
      .order("escalated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async interveneInComplaint(
    municipalityId: string,
    complaintId: string,
    action: "reassign" | "resolve" | "reject",
    note?: string
  ) {
    const { data: complaint, error: fetchErr } = await this.supabaseAdmin
      .from("complaints")
      .select("co_uid")
      .eq("co_uid", complaintId)
      .eq("municipality_id", municipalityId)
      .single();

    if (fetchErr || !complaint) throw new Error("Escalated complaint not found in municipality.");

    const { LifecycleService } = require("../../../service/lifecycle.service");
    const lifecycle = new LifecycleService(this.supabaseAdmin);

    const targetStatus = action === "resolve" ? "resolved" : action === "reject" ? "rejected" : "assigned";
    return await lifecycle.transition(
      complaintId,
      targetStatus,
      "municipality_head",
      "municipality_head",
      `Administrative Intervention by Municipality Head. Action: ${action}. ${note || ""}`
    );
  }
}
