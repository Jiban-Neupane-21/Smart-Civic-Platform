import { StaffRepository } from "../repository/staff.repository";
import { LifecycleService } from "../../../service/lifecycle.service";
import { HandoffService } from "../../../service/handoff.service";

export class StaffService {
  constructor(private repo: StaffRepository) {}

  async fetchAssignedFieldWork(staffId: string) {
    try {
      return await this.repo.getMyAssignedTeams(staffId);
    } catch (error: any) {
      throw new Error(
        `Failed to compile assigned team tasks ledger: ${error.message}`,
      );
    }
  }

  async fetchDepartmentalGrievances(departmentId: string) {
    try {
      return await this.repo.getDepartmentComplaintsLog(departmentId);
    } catch (error: any) {
      throw new Error(
        `Failed to retrieve department complaints log: ${error.message}`,
      );
    }
  }

  async fetchMyProfile(userId: string) {
    try {
      return await this.repo.getStaffProfile(userId);
    } catch (error: any) {
      throw new Error(`Failed to retrieve staff profile: ${error.message}`);
    }
  }

  async modifyMyProfile(userId: string, payload: { phone?: string; personal_address?: string }) {
    try {
      return await this.repo.updateStaffProfile(userId, payload);
    } catch (error: any) {
      throw new Error(`Failed to update staff profile: ${error.message}`);
    }
  }

  async fetchMyDepartment(departmentId: string) {
    try {
      return await this.repo.getStaffDepartment(departmentId);
    } catch (error: any) {
      throw new Error(`Failed to retrieve department details: ${error.message}`);
    }
  }

  async fetchMySchedule(staffId: string) {
    try {
      return await this.repo.getStaffSchedule(staffId);
    } catch (error: any) {
      throw new Error(`Failed to retrieve staff schedule: ${error.message}`);
    }
  }

  async acknowledgeAssignment(staffId: string, teamMemberId: string) {
    try {
      return await this.repo.acknowledgeAssignment(staffId, teamMemberId);
    } catch (error: any) {
      throw new Error(`Failed to acknowledge team assignment: ${error.message}`);
    }
  }

  // ===== COMPLAINT ASSIGNMENT LIFECYCLE & HANDOFF METHODS =====

  async acceptAssignment(staffId: string, assignmentId: string) {
    const updated = await this.repo.updateComplaintAssignmentStatus(assignmentId, "accepted");
    if (updated?.complaint_id) {
      const lifecycle = new LifecycleService((this.repo as any).supabaseAdmin);
      await lifecycle.transition(updated.complaint_id, "assigned", staffId, "staff", "Assignment accepted by staff.");
    }
    return updated;
  }

  async startAssignment(staffId: string, assignmentId: string) {
    const updated = await this.repo.updateComplaintAssignmentStatus(assignmentId, "in_progress");
    if (updated?.complaint_id) {
      const lifecycle = new LifecycleService((this.repo as any).supabaseAdmin);
      await lifecycle.transition(updated.complaint_id, "in_progress", staffId, "staff", "Field work started by staff.");
    }
    return updated;
  }

  async completeAssignment(staffId: string, assignmentId: string) {
    const updated = await this.repo.updateComplaintAssignmentStatus(assignmentId, "completed");
    if (updated?.complaint_id) {
      const lifecycle = new LifecycleService((this.repo as any).supabaseAdmin);
      await lifecycle.transition(updated.complaint_id, "resolved", staffId, "staff", "Field work completed by staff.");
    }
    return updated;
  }

  async transferAssignment(
    staffId: string,
    complaintId: string,
    toStaffId: string,
    reason: string,
    note?: string
  ) {
    const handoffService = new HandoffService((this.repo as any).supabaseAdmin);
    return await handoffService.transferToPeer(complaintId, staffId, toStaffId, reason, note);
  }

  async returnAssignmentToDeptHead(
    staffId: string,
    complaintId: string,
    reason: string,
    note?: string
  ) {
    const handoffService = new HandoffService((this.repo as any).supabaseAdmin);
    return await handoffService.returnToDepartmentHead(complaintId, staffId, reason, note);
  }
}
