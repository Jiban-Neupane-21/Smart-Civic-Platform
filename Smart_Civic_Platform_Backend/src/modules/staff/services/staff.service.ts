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

  async fetchMyAssignedComplaints(userId: string) {
    try {
      const staff = await this.repo.resolveStaffProfile(userId);
      return await this.repo.getMyAssignedComplaints(staff.id);
    } catch (error: any) {
      throw new Error(`Failed to retrieve assigned complaints: ${error.message}`);
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

  private async resolveComplaintAndAssignment(identifier: string): Promise<{ complaintId: string; assignmentId: string | null }> {
    const supabase = (this.repo as any).supabaseAdmin;

    // 1. Check if identifier is an assignment id in complaint_assignments
    const { data: assign } = await supabase
      .from("complaint_assignments")
      .select("id, complaint_id")
      .eq("id", identifier)
      .maybeSingle();

    if (assign?.complaint_id) {
      return { complaintId: assign.complaint_id, assignmentId: assign.id };
    }

    // 2. Check if identifier is a complaint co_uid or tracking_id
    const { data: comp } = await supabase
      .from("complaints")
      .select("co_uid")
      .or(`co_uid.eq.${identifier},tracking_id.eq.${identifier}`)
      .maybeSingle();

    const complaintId = comp?.co_uid || identifier;

    // 3. Find active assignment for this complaint if any
    const { data: activeAssign } = await supabase
      .from("complaint_assignments")
      .select("id")
      .eq("complaint_id", complaintId)
      .eq("is_current", true)
      .maybeSingle();

    return { complaintId, assignmentId: activeAssign?.id || null };
  }

  async acceptAssignment(staffId: string, identifier: string, userProfileId?: string) {
    const { complaintId, assignmentId } = await this.resolveComplaintAndAssignment(identifier);

    let updated = null;
    if (assignmentId) {
      updated = await this.repo.updateComplaintAssignmentStatus(assignmentId, "accepted");
    }

    const lifecycle = new LifecycleService((this.repo as any).supabaseAdmin);
    await lifecycle.transition(complaintId, "assigned", userProfileId || staffId, "staff", "Assignment accepted by staff.");
    return updated || { success: true, complaint_id: complaintId };
  }

  async startAssignment(staffId: string, identifier: string, userProfileId?: string) {
    const { complaintId, assignmentId } = await this.resolveComplaintAndAssignment(identifier);

    let updated = null;
    if (assignmentId) {
      updated = await this.repo.updateComplaintAssignmentStatus(assignmentId, "in_progress");
    }

    const lifecycle = new LifecycleService((this.repo as any).supabaseAdmin);
    await lifecycle.transition(complaintId, "in_progress", userProfileId || staffId, "staff", "Field work started by staff.");
    return updated || { success: true, complaint_id: complaintId };
  }

  async completeAssignment(staffId: string, identifier: string, resolutionNote?: string, userProfileId?: string) {
    const { complaintId, assignmentId } = await this.resolveComplaintAndAssignment(identifier);

    let updated = null;
    if (assignmentId) {
      updated = await this.repo.updateComplaintAssignmentStatus(assignmentId, "completed");
    }

    const lifecycle = new LifecycleService((this.repo as any).supabaseAdmin);
    await lifecycle.transition(complaintId, "resolved", userProfileId || staffId, "staff", resolutionNote || "Field work completed by staff.");
    return updated || { success: true, complaint_id: complaintId };
  }

  async transferAssignment(
    staffId: string,
    identifier: string,
    toStaffId: string,
    reason: string,
    note?: string,
    userProfileId?: string
  ) {
    const { complaintId } = await this.resolveComplaintAndAssignment(identifier);
    const handoffService = new HandoffService((this.repo as any).supabaseAdmin);
    return await handoffService.transferToPeer(complaintId, staffId, toStaffId, reason, note, userProfileId);
  }

  async returnAssignmentToDeptHead(
    staffId: string,
    identifier: string,
    reason: string,
    note?: string,
    userProfileId?: string
  ) {
    const { complaintId, assignmentId } = await this.resolveComplaintAndAssignment(identifier);
    const supabase = (this.repo as any).supabaseAdmin;

    // 1. If an active assignment exists, update it to reassigned and no longer current
    if (assignmentId) {
      await supabase
        .from("complaint_assignments")
        .update({
          status: "reassigned",
          is_current: false,
          notes: reason ? `Returned to Dept Head: ${reason}` : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignmentId);
    }

    // 2. Clear current_staff_id and current_team_id on complaint record
    await supabase
      .from("complaints")
      .update({
        current_staff_id: null,
        current_team_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("co_uid", complaintId);

    // 3. Insert into complaint_handoffs and transition status with verified complaint co_uid and user profile id!
    const handoffService = new HandoffService(supabase);
    return await handoffService.returnToDepartmentHead(complaintId, staffId, reason, note, userProfileId);
  }

  // ===== KYC METHODS =====

  async fetchStaffKyc(userId: string) {
    try {
      return await this.repo.getStaffKyc(userId);
    } catch (error: any) {
      throw new Error(`Failed to retrieve staff KYC details: ${error.message}`);
    }
  }

  async submitStaffKyc(userId: string, payload: any) {
    try {
      return await this.repo.submitStaffKyc(userId, payload);
    } catch (error: any) {
      throw new Error(`Failed to submit staff KYC onboarding: ${error.message}`);
    }
  }

  async fetchComplaintDetail(complaintId: string) {
    try {
      const data = await this.repo.getComplaintDetail(complaintId);
      if (!data) throw new Error("Grievance ticket not found.");
      return data;
    } catch (error: any) {
      throw new Error(`Failed to retrieve complaint detail: ${error.message}`);
    }
  }

  async fetchComplaintTimeline(complaintId: string) {
    try {
      return await this.repo.getComplaintTimeline(complaintId);
    } catch (error: any) {
      throw new Error(`Failed to retrieve complaint timeline: ${error.message}`);
    }
  }
}
