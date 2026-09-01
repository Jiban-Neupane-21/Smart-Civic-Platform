import { MunicipalityRepository } from "../repository/municipality.repository";
import type {
  ComplaintStatus,
  DepartmentInsert,
  StaffInsert,
} from "../../../types/database.type";
import { StorageService } from "../../../service/storage.service";
import { supabaseAdmin } from "../../../config/supabase";

export class MunicipalityService {
  constructor(private repo: MunicipalityRepository) {}

  async getDashboardAnalytics(municipalityId: string) {
    return await this.repo.getLocalComplaintStats(municipalityId);
  }

  async updateLogo(municipalityId: string, base64Data: string) {
    const storageService = new StorageService(supabaseAdmin);
    const fileKey = `municipalities/${municipalityId}/logo_${Date.now()}.jpg`;
    
    const publicUrl = await storageService.upload("logos", fileKey, base64Data);

    const { data, error } = await supabaseAdmin
      .from("municipalities")
      .update({ official_logo: publicUrl })
      .eq("id", municipalityId)
      .select("official_logo")
      .single();

    if (error) throw new Error(`Failed to update municipality logo: ${error.message}`);
    return data;
  }

  async getMunicipalityProfile(municipalityId: string) {
    const { data, error } = await supabaseAdmin
      .from("municipalities")
      .select(`
        id, official_name, official_email, official_contact_no,
        local_level_type, total_wards, official_logo, about_description,
        mayor_chairperson_name, deputy_mayor_vice_chairperson_name,
        head_name, head_email, head_contact_no,
        head_identity_type, head_identity_number,
        head_identity_front_url, head_identity_back_url,
        registration_document_url,
        kyc_status, kyc_submitted_at, kyc_verified_at, kyc_rejection_reason,
        is_active, registered_at, updated_at
      `)
      .eq("id", municipalityId)
      .single();

    if (error) throw new Error(`Failed to fetch municipality profile: ${error.message}`);
    return data;
  }

  async updateMunicipalityProfile(municipalityId: string, payload: {
    official_name?: string;
    official_email?: string;
    official_contact_no?: string;
    about_description?: string;
    mayor_chairperson_name?: string;
    deputy_mayor_vice_chairperson_name?: string;
    head_name?: string;
    head_email?: string;
    head_contact_no?: string;
    head_identity_type?: string;
    head_identity_number?: string;
    // Base64 images — uploaded to storage then saved as URLs
    head_identity_front_base64?: string;
    head_identity_back_base64?: string;
    registration_document_base64?: string;
    official_logo_base64?: string;
  }, userId?: string) {
    const storageService = new StorageService(supabaseAdmin);
    const updateData: Record<string, any> = {};

    // Copy plain text fields
    const textFields = [
      "official_name", "official_email", "official_contact_no", "about_description",
      "mayor_chairperson_name", "deputy_mayor_vice_chairperson_name",
      "head_name", "head_email", "head_contact_no",
      "head_identity_type", "head_identity_number",
    ] as const;
    for (const field of textFields) {
      if (payload[field] !== undefined) updateData[field] = payload[field];
    }

    // Upload identity front image
    if (payload.head_identity_front_base64) {
      updateData.head_identity_front_url = await storageService.upload(
        "identity-documents",
        `municipalities/${municipalityId}/head_identity_front_${Date.now()}.jpg`,
        payload.head_identity_front_base64
      );
    }

    // Upload identity back image
    if (payload.head_identity_back_base64) {
      updateData.head_identity_back_url = await storageService.upload(
        "identity-documents",
        `municipalities/${municipalityId}/head_identity_back_${Date.now()}.jpg`,
        payload.head_identity_back_base64
      );
    }

    // Upload registration/authority document
    if (payload.registration_document_base64) {
      updateData.registration_document_url = await storageService.upload(
        "identity-documents",
        `municipalities/${municipalityId}/registration_doc_${Date.now()}.pdf`,
        payload.registration_document_base64
      );
    }

    // Upload official logo
    if (payload.official_logo_base64) {
      updateData.official_logo = await storageService.upload(
        "logos",
        `municipalities/${municipalityId}/logo_${Date.now()}.jpg`,
        payload.official_logo_base64
      );
    }

    updateData.updated_at = new Date().toISOString();

    // Auto-promote to 'pending' if all required fields are now present
    // First fetch current state to merge
    const { data: current } = await supabaseAdmin
      .from("municipalities")
      .select("official_name, official_email, official_contact_no, mayor_chairperson_name, head_name, head_contact_no, head_identity_type, head_identity_number, head_identity_front_url, head_identity_back_url, registration_document_url, kyc_status")
      .eq("id", municipalityId)
      .single();

    const merged = { ...current, ...updateData };
    const isKycComplete = !!(
      merged.official_name &&
      merged.official_email &&
      merged.official_contact_no &&
      merged.mayor_chairperson_name &&
      merged.head_name &&
      merged.head_contact_no &&
      merged.head_identity_type &&
      merged.head_identity_number &&
      (merged.head_identity_front_url || updateData.head_identity_front_url) &&
      (merged.registration_document_url || updateData.registration_document_url)
    );

    // Only move to pending if currently unverified or rejected (not if already verified)
    if (isKycComplete && merged.kyc_status !== "verified") {
      updateData.kyc_status = "pending";
      updateData.kyc_submitted_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("municipalities")
      .update(updateData)
      .eq("id", municipalityId)
      .select(`
        id, official_name, official_email, official_contact_no,
        local_level_type, total_wards, official_logo, about_description,
        mayor_chairperson_name, deputy_mayor_vice_chairperson_name,
        head_name, head_email, head_contact_no,
        head_identity_type, head_identity_number,
        head_identity_front_url, head_identity_back_url,
        registration_document_url,
        kyc_status, kyc_submitted_at, kyc_verified_at, kyc_rejection_reason,
        updated_at
      `)
      .single();

    if (error) throw new Error(`Failed to update municipality profile: ${error.message}`);

    // Sync the head's personal profile row so the frontend recognizes their KYC as completed
    if (userId && (payload.head_identity_type || payload.head_identity_number || updateData.head_identity_front_url)) {
      const profileUpdate: any = {};
      if (payload.head_identity_type) profileUpdate.identity_type = payload.head_identity_type;
      if (payload.head_identity_number) profileUpdate.identity_number = payload.head_identity_number;
      if (updateData.head_identity_front_url) profileUpdate.identity_document_url = updateData.head_identity_front_url;
      
      const { error: profileErr } = await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", userId);
      if (profileErr) console.error("Failed to sync profile identity details:", profileErr);
    }

    return data;
  }

  async getDepartments(municipalityId: string) {
    return await this.repo.getDepartments(municipalityId);
  }

  async reviewDepartmentKyc(
    municipalityId: string,
    departmentId: string,
    reviewerId: string,
    status: "verified" | "rejected",
    rejectionReason?: string
  ) {
    return await this.repo.reviewDepartmentKyc(municipalityId, departmentId, reviewerId, status, rejectionReason);
  }

  async registerDepartment(municipalityId: string, data: DepartmentInsert) {
    const completePayload = { ...data, municipality_id: municipalityId };
    return await this.repo.createDepartment(completePayload);
  }

  async updateDepartment(departmentId: string, data: any) {
    return await this.repo.updateDepartment(departmentId, data);
  }

  async getDepartmentById(departmentId: string) {
    return await this.repo.getDepartmentById(departmentId);
  }

  async updateProfile(profileId: string, payload: any) {
    return await this.repo.updateProfile(profileId, payload);
  }

  async removeProfile(profileId: string) {
    return await this.repo.deleteProfileById(profileId);
  }

  async removeAuthUser(userId: string) {
    return await this.repo.deleteAuthUser(userId);
  }

  async deleteDepartment(departmentId: string) {
    return await this.repo.deleteDepartment(departmentId);
  }

  async getDepartmentCategories() {
    return await this.repo.getDepartmentCategories();
  }

  async registerStaffMember(municipalityId: string, data: StaffInsert) {
    const completePayload = { ...data, municipality_id: municipalityId };
    return await this.repo.onboardStaff(completePayload);
  }

  // ===== NEW STAFF & DEPARTMENT METHODS =====

  async getStaff(municipalityId: string, departmentId?: string) {
    return await this.repo.getStaff(municipalityId, departmentId);
  }

  async updateStaff(municipalityId: string, staffId: string, payload: any) {
    return await this.repo.updateStaffRecord(staffId, municipalityId, payload);
  }

  async archiveAndDeleteStaff(staffId: string, municipalityId: string, deletedBy: string) {
    return await this.repo.archiveAndDeleteStaff(staffId, municipalityId, deletedBy);
  }

  async reviewStaffKyc(
    municipalityId: string,
    staffId: string,
    reviewerId: string,
    status: "verified" | "rejected",
    rejectionReason?: string
  ) {
    return await this.repo.reviewStaffKyc(staffId, municipalityId, reviewerId, status, rejectionReason);
  }

  async updateStaffAccountStatus(municipalityId: string, staffId: string, status: string) {
    return await this.repo.updateStaffAccountStatus(staffId, municipalityId, status);
  }

  async resetStaffPassword(municipalityId: string, staffId: string, newPassword: string) {
    return await this.repo.resetStaffPassword(staffId, municipalityId, newPassword);
  }

  async getComplaintsLog(
    municipalityId: string,
    filterStatus?: ComplaintStatus,
  ) {
    return await this.repo.getRegionalComplaints(municipalityId, filterStatus);
  }

  // ===== KYC VERIFICATION METHODS =====

  async getPendingKycList(municipalityId: string) {
    return await this.repo.getPendingKycList(municipalityId);
  }

  async getKycCitizenDetail(municipalityId: string, citizenId: string) {
    return await this.repo.getKycCitizenDetail(municipalityId, citizenId);
  }

  async reviewKyc(
    municipalityId: string,
    citizenId: string,
    reviewerId: string,
    status: "verified" | "rejected",
    rejectionReason?: string
  ) {
    return await this.repo.reviewKyc(municipalityId, citizenId, reviewerId, status, rejectionReason);
  }

  // ===== CROSS-DEPARTMENT TEAM METHODS =====

  async getCrossDeptTeams(municipalityId: string) {
    return await this.repo.getCrossDeptTeams(municipalityId);
  }

  async createCrossDeptTeam(
    municipalityId: string,
    payload: {
      team_name: string;
      description?: string;
      start_date: string;
      end_date: string;
      created_by?: string;
      member_staff_ids?: string[];
      leader_staff_id?: string;
      is_emergency_override?: boolean;
      override_reason?: string;
    }
  ) {
    // Schedule conflict check (unless emergency override)
    if (payload.member_staff_ids && payload.member_staff_ids.length > 0 && !payload.is_emergency_override) {
      const { ScheduleService } = require("../../../service/schedule.service");
      const scheduleService = new ScheduleService((this.repo as any).supabaseAdmin);
      const availResults = await scheduleService.checkBulkAvailability(
        payload.member_staff_ids,
        payload.start_date,
        payload.end_date
      );

      const conflicts = availResults.filter((r: any) => !r.is_available);
      if (conflicts.length > 0) {
        const names = conflicts.map((c: any) => `${c.staff_id} (assigned to ${c.conflicting_team_name})`).join(", ");
        throw new Error(`Schedule conflict detected for staff member(s): ${names}. Use emergency override if required.`);
      }
    }

    const team = await this.repo.createCrossDeptTeam(municipalityId, payload);

    if (team?.id && payload.member_staff_ids && payload.member_staff_ids.length > 0) {
      for (const staffId of payload.member_staff_ids) {
        await (this.repo as any).supabaseAdmin.from("team_members").insert({
          team_id: team.id,
          staff_id: staffId,
          is_leader: staffId === payload.leader_staff_id,
        });

        await (this.repo as any).supabaseAdmin.from("staff_assignments").insert({
          staff_id: staffId,
          team_id: team.id,
          assigned_by: payload.created_by || null,
          start_date: payload.start_date,
          end_date: payload.end_date,
          is_emergency_override: payload.is_emergency_override ?? false,
          override_reason: payload.override_reason || null,
        });
      }
    }

    return team;
  }

  async deactivateCrossDeptTeam(teamId: string, municipalityId: string) {
    return await this.repo.deactivateCrossDeptTeam(teamId, municipalityId);
  }

  async assignComplaintToTeam(
    municipalityId: string,
    teamId: string,
    complaintId: string,
    assignedBy: string,
    notes?: string
  ) {
    return await this.repo.assignComplaintToTeam(municipalityId, teamId, complaintId, assignedBy, notes);
  }

  async getTeamComplaints(municipalityId: string, teamId: string) {
    return await this.repo.getTeamComplaints(municipalityId, teamId);
  }

  // ===== ESCALATED COMPLAINTS & INTERVENTION METHODS =====

  async getEscalatedComplaints(municipalityId: string) {
    return await this.repo.getEscalatedComplaints(municipalityId);
  }

  async interveneInComplaint(
    municipalityId: string,
    complaintId: string,
    action: "reassign" | "resolve" | "reject",
    note?: string
  ) {
    return await this.repo.interveneInComplaint(municipalityId, complaintId, action, note);
  }
}
