import { DepartmentRepository } from "../repository/department.repository";
import type { ComplaintStatus, Database } from "../../../types/database.type";

export class DepartmentService {
  constructor(private repo: DepartmentRepository) {}

  async buildDeploymentTeam(
    departmentId: string,
    teamName: string
  ) {
    return await this.repo.createTeam({
      department_id: departmentId,
      team_name: teamName,
    });
  }

  async assignStaffToSquad(
    data: Database["public"]["Tables"]["team_members"]["Insert"],
  ) {
    return await this.repo.addTeamMember(data);
  }

  async resolveGrievance(
    departmentId: string,
    complaintId: string,
    action: Exclude<ComplaintStatus, "pending">,
    notes: { resolution_note?: string; rejection_reason?: string },
  ) {
    // Section 16: Enforce constraints based on status changes
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

  async removeStaff(staffId: string, departmentId: string, deletedBy: string) {
    return await this.repo.archiveAndDeleteStaff(
      staffId,
      departmentId,
      deletedBy,
    );
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
        priority: c.priority,
        submitted_date: c.submitted_date,
        category_id: c.category_id,
      })),
    };
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
}
