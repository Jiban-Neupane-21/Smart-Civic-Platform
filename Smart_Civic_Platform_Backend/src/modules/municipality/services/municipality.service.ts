import { MunicipalityRepository } from "../repository/municipality.repository";
import type {
  ComplaintStatus,
  DepartmentInsert,
  StaffInsert,
} from "../../../types/database.type";

export class MunicipalityService {
  constructor(private repo: MunicipalityRepository) {}

  async getDashboardAnalytics(municipalityId: string) {
    return await this.repo.getLocalComplaintStats(municipalityId);
  }

  async getDepartments(municipalityId: string) {
    return await this.repo.getDepartments(municipalityId);
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
