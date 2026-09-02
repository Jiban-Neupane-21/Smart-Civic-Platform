import { DepartmentRepository } from "../repository/department.repository";
import type { ComplaintStatus, Database } from "../../../types/database.type";
import { CollaborationService } from "../../../service/collaboration.service";
import { ExportService } from "../../../service/export.service";
import { StorageService } from "../../../service/storage.service";
import { supabaseAdmin } from "../../../config/supabase";

export class DepartmentService {
  constructor(private repo: DepartmentRepository) { }

  async updateLogo(departmentId: string, base64Data: string) {
    const storageService = new StorageService(supabaseAdmin);
    const fileKey = `departments/${departmentId}/logo_${Date.now()}.jpg`;
    
    const publicUrl = await storageService.upload("logos", fileKey, base64Data);

    const { data, error } = await supabaseAdmin
      .from("departments")
      .update({ department_logo: publicUrl })
      .eq("id", departmentId)
      .select("department_logo")
      .single();

    if (error) throw new Error(`Failed to update department logo: ${error.message}`);
    return data;
  }

  async getDepartmentProfile(departmentId: string, userId: string) {
    const { data: deptData, error: deptError } = await supabaseAdmin
      .from("departments")
      .select("department_name, department_category, official_email, department_logo, head_name, head_email, kyc_status, kyc_rejection_reason")
      .eq("id", departmentId)
      .single();

    if (deptError) throw new Error(`Failed to fetch department details: ${deptError.message}`);

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("phone, identity_type, identity_number, identity_document_url, identity_verified_at")
      .eq("id", userId)
      .single();

    if (profileError) throw new Error(`Failed to fetch head profile: ${profileError.message}`);

    return {
      ...deptData,
      head_contact_no: profileData.phone,
      head_identity_type: profileData.identity_type,
      head_identity_number: profileData.identity_number,
      head_identity_front_url: profileData.identity_document_url,
      identity_verified_at: profileData.identity_verified_at,
    };
  }

  async setupDepartmentProfile(
    departmentId: string,
    userId: string,
    payload: any
  ) {
    const storageService = new StorageService(supabaseAdmin);
    let logoUrl = payload.department_logo_base64 ? undefined : payload.department_logo;

    if (payload.department_logo_base64) {
      const fileKey = `departments/${departmentId}/logo_${Date.now()}.jpg`;
      logoUrl = await storageService.upload("logos", fileKey, payload.department_logo_base64);
    }

    let identityFrontUrl = payload.head_identity_front_base64 ? undefined : payload.head_identity_front_url;
    if (payload.head_identity_front_base64) {
      identityFrontUrl = await storageService.uploadIdentityDocument(
        userId,
        payload.head_identity_front_base64,
        "identity_front"
      );
    }

    let identityBackUrl = payload.head_identity_back_base64 ? undefined : payload.head_identity_back_url;
    if (payload.head_identity_back_base64) {
      identityBackUrl = await storageService.uploadIdentityDocument(
        userId,
        payload.head_identity_back_base64,
        "identity_back"
      );
    }

    // Update departments table
    const deptUpdates: any = {};
    if (payload.official_email !== undefined) deptUpdates.official_email = payload.official_email;
    if (logoUrl !== undefined) deptUpdates.department_logo = logoUrl;
    if (payload.head_name !== undefined) deptUpdates.head_name = payload.head_name;
    if (payload.head_email !== undefined) deptUpdates.head_email = payload.head_email;

    // Set KYC status to pending when documents are submitted
    if (identityFrontUrl) {
      deptUpdates.kyc_status = 'pending';
      deptUpdates.kyc_rejection_reason = null;
    }

    if (Object.keys(deptUpdates).length > 0) {
      const { error: deptErr } = await supabaseAdmin
        .from("departments")
        .update(deptUpdates)
        .eq("id", departmentId);
      if (deptErr) throw new Error(`Failed to update department: ${deptErr.message}`);
    }

    // Update profiles table
    const profileUpdates: any = {};
    if (payload.head_identity_type !== undefined) profileUpdates.identity_type = payload.head_identity_type;
    if (payload.head_identity_number !== undefined) profileUpdates.identity_number = payload.head_identity_number;
    if (identityFrontUrl !== undefined) profileUpdates.identity_document_url = identityFrontUrl;
    if (payload.head_contact_no !== undefined) profileUpdates.phone = payload.head_contact_no;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profErr } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", userId);
      if (profErr) throw new Error(`Failed to update head profile: ${profErr.message}`);
    }

    return await this.getDepartmentProfile(departmentId, userId);
  }

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

      // Notify team members of new team formation
      try {
        const { NotificationService } = require("../../../service/notification.service");
        const notifService = new NotificationService((this.repo as any).supabaseAdmin);
        await notifService.notifyTeam(
          teamPk,
          `Team Deployment — ${teamName}`,
          `You have been assigned to operational team '${teamName}' from ${startDate} to ${endDate}.`,
          createdBy || "system",
          "team_assignment"
        );
      } catch (notifErr: any) {
        console.warn("[BUILD-TEAM-NOTIF-WARN]", notifErr.message);
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
    const assignment = await this.repo.assignComplaintToTeam(complaintId, team.id, assignedBy, notes);

    // Notify assigned team and citizen
    try {
      const { NotificationService } = require("../../../service/notification.service");
      const { LifecycleService } = require("../../../service/lifecycle.service");
      const notifService = new NotificationService((this.repo as any).supabaseAdmin);
      const lifecycle = new LifecycleService((this.repo as any).supabaseAdmin);

      // Audit transition and notify citizen
      await lifecycle.transition(
        complaintId,
        "assigned",
        assignedBy,
        "department_head",
        notes || `Assigned to team ${teamName}.`
      );

      // Notify team members
      await notifService.notifyTeam(
        team.id,
        `New Field Assignment — Team ${teamName}`,
        `Complaint #${complaintId.slice(0, 8)} has been assigned to your team. ${notes ? `Notes: ${notes}` : ""}`,
        assignedBy,
        "complaint_assignment"
      );
    } catch (notifErr: any) {
      console.warn("[ASSIGN-COMPLAINT-NOTIF-WARN]", notifErr.message);
    }

    return assignment;
  }

  async getTeamComplaints(departmentId: string, teamName: string) {
    const team = await this.repo.getTeamByName(teamName, departmentId);
    if (!team) throw new Error("Team not found in department.");
    return await this.repo.getTeamComplaints(team.id);
  }

  async reviewStaffKyc(
    staffId: string,
    departmentId: string,
    reviewerId: string,
    status: "verified" | "rejected",
    rejectionReason?: string
  ) {
    return await this.repo.reviewStaffKyc(
      staffId,
      departmentId,
      reviewerId,
      status,
      rejectionReason
    );
  }
}
