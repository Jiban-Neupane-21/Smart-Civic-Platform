import { DepartmentRepository } from "../repository/department.repository";
import type { ComplaintStatus, Database } from "../../../types/database.type";

export class DepartmentService {
  constructor(private repo: DepartmentRepository) {}

  async buildDeploymentTeam(
    departmentId: string,
    teamName: string,
    complaintId: string,
  ) {
    return await this.repo.createTeam({
      department_id: departmentId,
      complaint_id: complaintId,
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
}
