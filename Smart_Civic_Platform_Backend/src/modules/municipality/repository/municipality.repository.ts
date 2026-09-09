import { SupabaseClient } from "@supabase/supabase-js";
import type {
  ComplaintStatus,
  DepartmentInsert,
  StaffInsert,
} from "../../../types/database.type";
import { LifecycleService } from "../../../service/lifecycle.service";

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

  async getDepartments(municipalityId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("departments")
      .select(`
        *,
        head_profile:profiles!head_profile_id(identity_type, identity_number, identity_document_url, identity_verified_at, phone),
        staff_count:staff(count),
        complaint_count:complaints!assigned_department_id(count)
      `)
      .eq("municipality_id", municipalityId);

    if (error) throw error;
    
    // Flatten counts if returned as objects
    return (data || []).map((dept: any) => ({
      ...dept,
      head_identity_type: dept.head_profile?.identity_type,
      head_identity_number: dept.head_profile?.identity_number,
      head_identity_front_url: dept.head_profile?.identity_document_url,
      head_contact_no: dept.head_profile?.phone,
      staff_count: Array.isArray(dept.staff_count) ? dept.staff_count[0]?.count || 0 : dept.staff_count?.count || 0,
      complaint_count: Array.isArray(dept.complaint_count) ? dept.complaint_count[0]?.count || 0 : dept.complaint_count?.count || 0,
    }));
  }

  async reviewDepartmentKyc(
    municipalityId: string,
    departmentId: string,
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
      .from("departments")
      .update(updates)
      .eq("id", departmentId)
      .eq("municipality_id", municipalityId)
      .select()
      .single();

    if (error) throw error;
    return data;
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
        id, employee_id, expertise, contact_number, gender, date_of_birth, personal_address, designation,
        kyc_status, kyc_submitted_at, kyc_verified_at, kyc_verified_by, kyc_rejection_reason,
        identity_type, identity_number, identity_front_url, identity_back_url, appointment_letter_url, photo_url,
        emergency_contact_name, emergency_contact_phone, employee_status, onboarded_at,
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
    return (data || []).filter((item: any) => {
      const role = item.profile?.role;
      return !role || role === "staff";
    });
  }

  async reviewStaffKyc(
    staffId: string,
    municipalityId: string,
    reviewerId: string,
    status: "verified" | "rejected",
    rejectionReason?: string
  ) {
    const nowIso = new Date().toISOString();
    const updates: Record<string, any> = {
      kyc_status: status,
      kyc_verified_by: reviewerId,
      kyc_verified_at: nowIso,
      updated_at: nowIso,
    };

    if (status === "rejected") {
      updates.kyc_rejection_reason = rejectionReason || "Document verification failed.";
    } else {
      updates.kyc_rejection_reason = null;
    }

    // Attempt matching on staff PK id first, then fallback to profile_id
    let { data, error } = await this.supabaseAdmin
      .from("staff")
      .update(updates)
      .eq("id", staffId)
      .eq("municipality_id", municipalityId)
      .select("id, profile_id, municipality_id, kyc_status, kyc_verified_at, kyc_verified_by, kyc_rejection_reason, profile:profiles!profile_id(id, full_name, email)")
      .maybeSingle();

    if (!data) {
      const retry = await this.supabaseAdmin
        .from("staff")
        .update(updates)
        .eq("profile_id", staffId)
        .eq("municipality_id", municipalityId)
        .select("id, profile_id, municipality_id, kyc_status, kyc_verified_at, kyc_verified_by, kyc_rejection_reason, profile:profiles!profile_id(id, full_name, email)")
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    if (!data) throw new Error("Staff member record not found in this municipality.");

    if (status === "verified" && data?.profile_id) {
      await this.supabaseAdmin
        .from("profiles")
        .update({
          identity_verified_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", data.profile_id);
    }

    return data;
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
        profiles:profiles!profile_id(full_name, email, phone)
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
        `co_uid, tracking_id, title, description, status, priority, severity_level, ward_number, citizen_id, municipality_id, assigned_department_id, category_id, submitted_date, updated_at, resolution_date, resolution_note, sla_due_at, sla_breached, location_source, latitude, longitude, department:departments!assigned_department_id(id, department_name), category:complaint_categories!category_id(id, category_name), citizen:citizens(id, first_name, last_name, contact_number, current_address, permanent_address, current_province_id, current_district_id, current_municipality_id, permanent_province_id, permanent_district_id, permanent_municipality_id)`,
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

  // Fetches full in-depth complaint detail for municipality jurisdiction
  async getRegionalComplaintDetail(municipalityId: string, complaintId: string) {
    let query = this.supabaseAdmin
      .from("complaints")
      .select(`
        co_uid, tracking_id, title, description, status, priority, severity_level, ticket_type,
        cross_dept_status, location_source, latitude, longitude, ward_number,
        submitted_date, resolution_date, resolution_note, rejection_reason,
        sla_due_at, sla_breached, current_team_id, municipality_id,
        current_team:teams!current_team_id ( id, team_name, description, team_type, is_active ),
        complaint_categories!complaints_category_id_fkey ( id, category_name ),
        citizens ( id, first_name, middle_name, last_name, contact_number, current_address, permanent_address, current_ward_id, permanent_ward_id, profile_picture, kyc_status, profile:profiles!citizens_id_fkey ( id, full_name, email, phone ) ),
        municipalities!municipality_id ( id, official_name ),
        assigned_department:departments!assigned_department_id ( id, department_name ),
        lead_department:departments!lead_department_id ( id, department_name )
      `)
      .eq("co_uid", complaintId);

    if (municipalityId) {
      query = query.eq("municipality_id", municipalityId);
    }

    const { data: complaint, error: compErr } = await query.maybeSingle();
    if (compErr) throw compErr;
    if (!complaint) return null;

    // Fallback ward resolution
    let resolvedWardNumber = complaint.ward_number;
    const citizenData: any = complaint.citizens;
    if (!resolvedWardNumber && citizenData) {
      const citizenWardId = citizenData.current_ward_id || citizenData.permanent_ward_id;
      if (citizenWardId) {
        const { data: wardRow } = await this.supabaseAdmin
          .from("wards")
          .select("ward_no")
          .eq("id", citizenWardId)
          .maybeSingle();
        if (wardRow?.ward_no) {
          resolvedWardNumber = wardRow.ward_no;
        }
      }
      if (!resolvedWardNumber && citizenData.current_address) {
        const m = citizenData.current_address.match(/ward\s*(\d+)/i);
        if (m) resolvedWardNumber = parseInt(m[1], 10);
      }
    }

    // Fetch team members if team assigned
    let teamMembers: any[] = [];
    const currentTeam: any = complaint.current_team;
    const teamId = complaint.current_team_id || (Array.isArray(currentTeam) ? currentTeam[0]?.id : currentTeam?.id);
    if (teamId) {
      const { data: members, error: memErr } = await this.supabaseAdmin
        .from("team_members")
        .select(`
          id, staff_id, is_leader, joined_at,
          staff:staff!staff_id (
            id, employee_id, expertise, designation, contact_number,
            profile:profiles!profile_id ( id, full_name, email, phone )
          )
        `)
        .eq("team_id", teamId);

      if (!memErr && members) {
        teamMembers = members.map((m: any) => ({
          id: m.id,
          staff_id: m.staff_id,
          is_leader: m.is_leader,
          joined_at: m.joined_at,
          employee_id: m.staff?.employee_id,
          expertise: m.staff?.expertise,
          designation: m.staff?.designation,
          contact_number: m.staff?.contact_number || m.staff?.profile?.phone,
          full_name: m.staff?.profile?.full_name,
          email: m.staff?.profile?.email,
        }));
      }
    }

    // Fetch media attachments
    const { data: mediaList, error: mediaErr } = await this.supabaseAdmin
      .from("media")
      .select("id, file_url, media_type, file_name, file_size_bytes, created_at")
      .eq("context", "complaint")
      .eq("context_id", complaintId);

    if (mediaErr) {
      console.warn("Could not load media attachments for complaint:", mediaErr.message);
    }

    // Fetch complaint timeline history
    let timeline: any[] = [];
    try {
      const lifecycle = new LifecycleService(this.supabaseAdmin);
      timeline = await lifecycle.getTimeline(complaintId);
    } catch (tlErr: any) {
      console.warn("Could not load timeline for complaint:", tlErr.message);
    }

    return {
      ...complaint,
      ward_number: resolvedWardNumber,
      citizen: complaint.citizens,
      citizens: complaint.citizens,
      municipality: complaint.municipalities,
      municipalities: complaint.municipalities,
      category: complaint.complaint_categories,
      complaint_categories: complaint.complaint_categories,
      department: complaint.assigned_department,
      assigned_department: complaint.assigned_department,
      media: mediaList || [],
      team_members: teamMembers,
      timeline,
    };
  }

  // ===== KYC VERIFICATION METHODS =====

  async getPendingKycList(municipalityId: string, statusFilter?: string) {
    let query = this.supabaseAdmin
      .from("citizens")
      .select(`
        id, first_name, middle_name, last_name, gender, date_of_birth,
        contact_number, current_address, permanent_address,
        current_ward_id, permanent_ward_id,
        identity_type, identity_number,
        identity_front_image_url, identity_back_image_url,
        kyc_status, kyc_verified_at, kyc_rejection_reason,
        registered_at, updated_at,
        profile:profiles!citizens_id_fkey(id, full_name, email, phone)
      `)
      .or(`current_municipality_id.eq.${municipalityId},permanent_municipality_id.eq.${municipalityId}`);

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("kyc_status", statusFilter);
    }

    const { data, error } = await query.order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getKycCitizenDetail(municipalityId: string, citizenId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("citizens")
      .select(`
        *,
        profile:profiles!citizens_id_fkey(id, full_name, email, phone)
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
    } else if (status === "verified") {
      const { data: currentCitizen } = await this.supabaseAdmin
        .from("citizens")
        .select("profile_picture, identity_front_image_url")
        .eq("id", citizenId)
        .maybeSingle();

      const profilePicToSet = currentCitizen?.profile_picture || currentCitizen?.identity_front_image_url;
      if (profilePicToSet) {
        updates.profile_picture = profilePicToSet;
        await this.supabaseAdmin
          .from("profiles")
          .update({
            profile_picture: profilePicToSet,
            updated_at: new Date().toISOString(),
          })
          .eq("id", citizenId);
      }
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
          staff_id, is_leader, joined_at,
          staff (
            id, employee_id, primary_department_id, expertise,
            profiles:profiles!profile_id ( full_name, email )
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

  async assignComplaintToTeam(
    municipalityId: string,
    teamId: string,
    complaintId: string,
    assignedBy: string,
    notes?: string
  ) {
    // Check if the team actually exists and belongs to this municipality
    const { data: team, error: teamError } = await this.supabaseAdmin
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .eq("municipality_id", municipalityId)
      .single();

    if (teamError || !team) {
      throw new Error("Team not found in this municipality.");
    }

    // Check if there is an existing active assignment for this complaint
    const { data: existingAssignment } = await this.supabaseAdmin
      .from("complaint_assignments")
      .select("id")
      .eq("complaint_id", complaintId)
      .eq("is_current", true)
      .single();

    if (existingAssignment) {
      throw new Error("This complaint is already assigned to a team and cannot be reassigned.");
    }

    // Insert new assignment
    const { data, error } = await this.supabaseAdmin
      .from("complaint_assignments")
      .insert({
        complaint_id: complaintId,
        team_id: teamId,
        assigned_by: assignedBy,
        status: "pending",
        is_current: true,
        notes: notes || null,
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await this.supabaseAdmin
      .from("complaints")
      .update({
        status: "assigned",
        current_team_id: teamId,
        updated_at: new Date().toISOString(),
      })
      .eq("co_uid", complaintId);

    return data;
  }

  async getTeamComplaints(municipalityId: string, teamId: string) {
    // Check if the team belongs to this municipality
    const { data: team, error: teamError } = await this.supabaseAdmin
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .eq("municipality_id", municipalityId)
      .single();

    if (teamError || !team) {
      throw new Error("Team not found in this municipality.");
    }

    const { data, error } = await this.supabaseAdmin
      .from("complaint_assignments")
      .select(`
        id, status, notes, assigned_at,
        complaint:complaints!complaint_id(co_uid, tracking_id, title, description, status, priority, severity_level, sla_due_at)
      `)
      .eq("team_id", teamId)
      .eq("is_current", true);

    if (error) throw error;
    return data || [];
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

  // ===== MUNICIPALITY NOTICES / ANNOUNCEMENTS METHODS =====

  async getNotices(municipalityId: string, categoryFilter?: string) {
    const { data, error } = await this.supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("target_municipality_id", municipalityId)
      .eq("type", "broadcast")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const parseNotice = (n: any) => {
      let category = "general";
      let cleanTitle = n.title || "";
      const match = cleanTitle.match(/^\[([A-Z_]+)\]\s*(.*)$/i);
      if (match) {
        category = match[1].toLowerCase();
        cleanTitle = match[2];
      } else if (n.is_urgent) {
        category = "emergency";
      }

      return {
        id: n.id,
        title: cleanTitle,
        body: n.body,
        category,
        audience: n.audience,
        target_department_id: n.target_department_id,
        created_at: n.created_at,
        updated_at: n.created_at,
      };
    };

    const notices = (data || []).map(parseNotice);

    if (categoryFilter && categoryFilter !== "all") {
      return notices.filter(
        (n: any) => n.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    return notices;
  }

  async createNotice(
    senderId: string,
    municipalityId: string,
    data: {
      title: string;
      body: string;
      category?: string;
      audience?: string;
      target_department_id?: string;
    }
  ) {
    const category = (data.category || "general").toLowerCase();
    const isUrgent = category === "emergency";
    const rawTitle = (data.title || "").replace(/^\[[A-Z_]+\]\s*/i, "").trim();
    const formattedTitle = `[${category.toUpperCase()}] ${rawTitle}`;
    const targetAudience = (data.audience || "everyone") as any;

    // 1. Insert broadcast notification
    const { data: notification, error } = await this.supabaseAdmin
      .from("notifications")
      .insert({
        sender_id: senderId,
        type: "broadcast",
        audience: targetAudience,
        target_municipality_id: municipalityId,
        target_department_id: data.target_department_id || null,
        title: formattedTitle,
        body: data.body,
        is_urgent: isUrgent,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Resolve recipients and pre-seed notification_reads so citizens & staff/departments in the municipality receive it
    try {
      const { NotificationService } = require("../../../service/notification.service");
      const notifService = new NotificationService(this.supabaseAdmin);
      const recipientIds = await notifService.resolveRecipients(targetAudience, {
        municipality_id: municipalityId,
        department_id: data.target_department_id || undefined,
      });

      if (recipientIds && recipientIds.length > 0) {
        const readRows = recipientIds.map((pid: string) => ({
          notification_id: notification.id,
          profile_id: pid,
          is_seen: false,
          is_clicked: false,
        }));
        await this.supabaseAdmin.from("notification_reads").upsert(readRows);
      }
    } catch (deliveryErr) {
      console.error("[MUNICIPALITY-NOTICE-DELIVERY-WARN]", deliveryErr);
    }

    return {
      id: notification.id,
      title: rawTitle,
      body: notification.body,
      category,
      audience: targetAudience,
      target_department_id: data.target_department_id || null,
      created_at: notification.created_at,
      updated_at: notification.created_at,
    };
  }

  async updateNotice(
    id: string,
    municipalityId: string,
    data: { title?: string; body?: string; category?: string }
  ) {
    const updatePayload: any = {};

    if (data.title !== undefined || data.category !== undefined) {
      const category = (data.category || "general").toLowerCase();
      const rawTitle = (data.title || "").replace(/^\[[A-Z_]+\]\s*/i, "").trim();
      updatePayload.title = `[${category.toUpperCase()}] ${rawTitle}`;
      updatePayload.is_urgent = category === "emergency";
    }

    if (data.body !== undefined) {
      updatePayload.body = data.body;
    }

    const { data: updated, error } = await this.supabaseAdmin
      .from("notifications")
      .update(updatePayload)
      .eq("id", id)
      .eq("target_municipality_id", municipalityId)
      .select()
      .single();

    if (error) throw error;

    let category = "general";
    let cleanTitle = updated.title || "";
    const match = cleanTitle.match(/^\[([A-Z_]+)\]\s*(.*)$/i);
    if (match) {
      category = match[1].toLowerCase();
      cleanTitle = match[2];
    } else if (updated.is_urgent) {
      category = "emergency";
    }

    return {
      id: updated.id,
      title: cleanTitle,
      body: updated.body,
      category,
      created_at: updated.created_at,
      updated_at: updated.created_at,
    };
  }

  async deleteNotice(id: string, municipalityId: string) {
    // Delete reads first
    await this.supabaseAdmin
      .from("notification_reads")
      .delete()
      .eq("notification_id", id);

    const { error } = await this.supabaseAdmin
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("target_municipality_id", municipalityId);

    if (error) throw error;
    return { success: true };
  }
}
