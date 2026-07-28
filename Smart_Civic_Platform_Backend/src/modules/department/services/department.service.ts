import { DepartmentRepository } from "../repository/department.repository";
import type { ComplaintStatus, Database } from "../../../types/database.type";
import { CollaborationService } from "../../../service/collaboration.service";
import { ExportService } from "../../../service/export.service";

export class DepartmentService {
  constructor(private repo: DepartmentRepository) { }

  async buildDeploymentTeam(
    departmentId: string,
    teamName: string,
    startDate: string,
    endDate: string,
    createdBy?: string,
    description?: string,
    memberStaffIds?: string[],
    leaderStaffId?: string,
    isEmergencyOverride = false,
    overrideReason?: string
  ) {
    const startMs = Date.parse(startDate);
    const endMs = Date.parse(endDate);
    if (isNaN(startMs) || isNaN(endMs) || startMs >= endMs) {
      throw new Error("Invalid team duration. start_date must be before end_date.");
    }

    // Schedule conflict checking (unless emergency override)
    if (memberStaffIds && memberStaffIds.length > 0 && !isEmergencyOverride) {
      const { ScheduleService } = require("../../../service/schedule.service");
      const scheduleService = new ScheduleService((this.repo as any).supabaseAdmin);
      const availResults = await scheduleService.checkBulkAvailability(memberStaffIds, startDate, endDate);

      const conflicts = availResults.filter((r: any) => !r.is_available);
      if (conflicts.length > 0) {
        const names = conflicts.map((c: any) => `${c.staff_id} (assigned to ${c.conflicting_team_name})`).join(", ");
        throw new Error(`Schedule conflict detected for staff member(s): ${names}. Use emergency override if required.`);
      }
    }

    const team = await this.repo.createTeam({
      department_id: departmentId,
      team_name: teamName,
      team_type: "single_department",
      start_date: startDate,
      end_date: endDate,
      created_by: createdBy || null,
      ...(description ? { description } : {}),
    });

    const teamPk = this.repo.extractTeamPk(team);

    if (teamPk && memberStaffIds && memberStaffIds.length > 0) {
      for (const staffId of memberStaffIds) {
        await this.repo.addTeamMember({
          team_id: teamPk,
          staff_id: staffId,
          is_leader: staffId === leaderStaffId,
        });

        // Insert staff_assignments row
        await (this.repo as any).supabaseAdmin.from("staff_assignments").insert({
          staff_id: staffId,
          team_id: teamPk,
          assigned_by: createdBy || null,
          start_date: startDate,
          end_date: endDate,
          is_emergency_override: isEmergencyOverride,
          override_reason: overrideReason || null,
        });
      }
    }

    return team;
  }

  async assignStaffToSquad(
    departmentId: string,
    data: Database["public"]["Tables"]["team_members"]["Insert"],
  ) {
    const teamPk = await this.repo.resolveTeamPk(data.team_id, departmentId);
    return await this.repo.addTeamMember({
      ...data,
      team_id: teamPk,
    });
  }

  async resolveGrievance(
    departmentId: string,
    complaintId: string,
    action: Exclude<ComplaintStatus, "pending">,
    notes: { resolution_note?: string; rejection_reason?: string },
  ) {
    const updatePayload: any = { status: action };

    if (action === "resolved") {
      updatePayload.resolution_note = notes.resolution_note;
      updatePayload.resolution_date = new Date().toISOString();
    } else if (action === "rejected") {
      updatePayload.rejection_reason = notes.rejection_reason;
      updatePayload.resolution_date = new Date().toISOString();
    } else {
      updatePayload.resolution_date = null;
    }

    return await this.repo.updateComplaintStatus(
      complaintId,
      departmentId,
      updatePayload,
    );
  }

  async listRoster(departmentId: string) {
    return await this.repo.getDepartmentStaff(departmentId);
  }

  async getMunicipalityId(departmentId: string): Promise<string> {
    return await this.repo.getDepartmentMunicipalityId(departmentId);
  }

  async getDepartmentCategoryAndName(departmentId: string) {
    return await this.repo.getDepartmentCategoryAndName(departmentId);
  }

  async modifyStaff(
    staffId: string,
    departmentId: string,
    payload: {
      full_name?: string;
      email?: string;
      phone?: string;
      expertise?: string;
      contact_number?: string;
      employee_status?: string;
      gender?: string;
      date_of_birth?: string;
      personal_address?: string;
    },
  ) {
    return await this.repo.updateStaffRecord(staffId, departmentId, payload);
  }

  async setStaffExpertise(
    profileId: string,
    departmentId: string,
    expertise: string,
  ) {
    return await this.repo.updateStaffExpertiseByProfileId(
      profileId,
      departmentId,
      expertise,
    );
  }

  async checkEmailExists(email: string): Promise<boolean> {
    return await this.repo.checkEmailExists(email);
  }

  async removeStaff(staffId: string, departmentId: string, deletedBy: string) {
    return await this.repo.archiveAndDeleteStaff(
      staffId,
      departmentId,
      deletedBy,
    );
  }

  async updateStaffAccountStatus(staffId: string, departmentId: string, status: string) {
    return await this.repo.updateStaffAccountStatus(staffId, departmentId, status);
  }

  async resetStaffPassword(staffId: string, departmentId: string, newPassword: string) {
    return await this.repo.resetStaffPassword(staffId, departmentId, newPassword);
  }

  async getDashboard(departmentId: string) {
    const summary = await this.repo.getDepartmentSummary(departmentId);

    const counts: Record<string, number> = {
      pending: 0,
      under_review: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
      closed: 0,
    };

    for (const complaint of summary.complaints) {
      if (complaint.status in counts) {
        counts[complaint.status] += 1;
      }
    }

    const totalComplaints = summary.totalComplaints;

    const resolvedCount = counts.resolved + counts.closed;
    const resolutionRate =
      totalComplaints > 0
        ? Math.round((resolvedCount / totalComplaints) * 100)
        : 0;

    return {
      department_name: summary.department_name,
      department_category: summary.department_category,
      totalComplaints,
      pending: counts.pending,
      under_review: counts.under_review,
      in_progress: counts.in_progress,
      resolved: counts.resolved,
      rejected: counts.rejected,
      closed: counts.closed,
      resolutionRate,
      totalStaff: summary.totalStaff,
      activeTeams: summary.activeTeams,
      recentComplaints: summary.complaints.map((c: any) => ({
        co_uid: c.co_uid,
        title: c.title,
        status: c.status,
        submitted_date: c.submitted_date,
        category_id: c.category_id,
      })),
    };
  }

  // ===== MULTI-DEPARTMENT & COLLABORATION METHODS =====

  async getDepartmentQueue(departmentId: string, statusFilter?: string) {
    return await this.repo.getDepartmentComplaintsQueue(departmentId, statusFilter);
  }

  async getCollaborations(departmentId: string) {
    return await this.repo.getCollaborationRequests(departmentId);
  }

  async requestCollaboration(
    departmentId: string,
    complaintId: string,
    supportingDeptId: string,
    initiatedBy: string,
    inspectionNote?: string
  ) {
    const collabService = new CollaborationService((this.repo as any).supabaseAdmin);
    return await collabService.requestStaffEscalation(
      complaintId,
      departmentId,
      supportingDeptId,
      initiatedBy,
      inspectionNote
    );
  }

  async submitSignOff(
    departmentId: string,
    complaintId: string,
    signedBy: string,
    roleAtTime: string,
    decision: "approved" | "rejected",
    note?: string
  ) {
    const collabService = new CollaborationService((this.repo as any).supabaseAdmin);
    return await collabService.recordSignOff(
      complaintId,
      departmentId,
      signedBy,
      roleAtTime,
      decision,
      note
    );
  }

  async exportComplaintsCsv(departmentId: string) {
    const exportService = new ExportService((this.repo as any).supabaseAdmin);
    return await exportService.exportDepartmentComplaintsCsv(departmentId);
  }

  // ─── Team Management ─────────────────────────────────────────────────────────

  async listTeams(departmentId: string) {
    return await this.repo.getDepartmentTeams(departmentId);
  }

  async getTeamDetails(teamName: string, departmentId: string) {
    return await this.repo.getTeamByName(teamName, departmentId);
  }

  async updateTeamInfo(
    teamName: string,
    departmentId: string,
    payload: { team_name?: string; description?: string; is_active?: boolean },
  ) {
    return await this.repo.updateTeam(teamName, departmentId, payload);
  }

  async removeMemberFromTeam(
    teamName: string,
    staffId: string,
    departmentId: string,
  ) {
    return await this.repo.removeTeamMember(teamName, staffId, departmentId);
  }

  async setTeamLeader(
    teamName: string,
    staffId: string,
    departmentId: string,
    isLeader: boolean,
  ) {
    return await this.repo.toggleTeamLeader(
      teamName,
      staffId,
      departmentId,
      isLeader,
    );
  }

  async assignComplaintToTeam(
    departmentId: string,
    teamName: string,
    complaintId: string,
    assignedBy: string,
    notes?: string
  ) {
    const team = await this.repo.getTeamByName(teamName, departmentId);
    if (!team) throw new Error("Team not found in department.");
    return await this.repo.assignComplaintToTeam(complaintId, team.id, assignedBy, notes);
  }

  async getTeamComplaints(departmentId: string, teamName: string) {
    const team = await this.repo.getTeamByName(teamName, departmentId);
    if (!team) throw new Error("Team not found in department.");
    return await this.repo.getTeamComplaints(team.id);
  }
}
