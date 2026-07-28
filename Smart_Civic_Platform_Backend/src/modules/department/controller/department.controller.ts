import { Response } from "express";
import crypto from "crypto";
import { DepartmentService } from "../services/department.service";
import { createUserService } from "../../auth/services/auth.service";

export class DepartmentController {
  constructor(private service: DepartmentService) { }

  setupTeam = async (req: any, res: Response): Promise<void> => {
    try {
      const {
        team_name,
        description,
        start_date,
        end_date,
        member_staff_ids,
        leader_staff_id,
        is_emergency_override,
        override_reason,
      } = req.body;

      if (!team_name || !start_date || !end_date) {
        res.status(400).json({
          success: false,
          error: "team_name, start_date, and end_date are required fields.",
        });
        return;
      }

      const team = await this.service.buildDeploymentTeam(
        req.departmentId,
        team_name,
        start_date,
        end_date,
        req.user?.id,
        description,
        Array.isArray(member_staff_ids) ? member_staff_ids : [],
        leader_staff_id,
        is_emergency_override ?? false,
        override_reason
      );
      res.status(201).json({ success: true, data: team });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  attachStaff = async (req: any, res: Response): Promise<void> => {
    try {
      const { team_id, staff_id, is_leader } = req.body;
      if (!team_id || !staff_id) {
        res
          .status(400)
          .json({
            success: false,
            error:
              "Target squad ID mapping and clear staff profile connection required.",
          });
        return;
      }

      const assignment = await this.service.assignStaffToSquad(
        req.departmentId,
        {
          team_id,
          staff_id,
          is_leader: !!is_leader,
        },
      );
      res.status(201).json({ success: true, data: assignment });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  processGrievanceState = async (req: any, res: Response): Promise<void> => {
    try {
      const { complaintId } = req.params;
      const { action, resolution_note, rejection_reason } = req.body;

      if (!action || !["in_progress", "resolved", "rejected", "closed", "under_review"].includes(action)) {
        res
          .status(400)
          .json({
            success: false,
            error:
              "Valid operational state modifier required (under_review, in_progress, resolved, rejected, closed).",
          });
        return;
      }

      const result = await this.service.resolveGrievance(
        req.departmentId,
        complaintId,
        action,
        { resolution_note, rejection_reason },
      );
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  updateStaff = async (req: any, res: Response): Promise<void> => {
    try {
      const { staffId } = req.params;
      const { full_name, email, phone, expertise, contact_number, employee_status, gender, date_of_birth, personal_address } = req.body;

      if (!staffId) {
        res.status(400).json({ success: false, error: "Staff ID is required." });
        return;
      }

      // At least one field must be provided
      const hasUpdate = [full_name, email, phone, expertise, contact_number, employee_status, gender, date_of_birth, personal_address].some(
        (v) => v !== undefined && v !== null && v !== "",
      );
      if (!hasUpdate) {
        res.status(400).json({ success: false, error: "No update fields provided." });
        return;
      }

      const updated = await this.service.modifyStaff(staffId, req.departmentId, {
        full_name,
        email,
        phone,
        expertise,
        contact_number,
        employee_status,
        gender,
        date_of_birth,
        personal_address,
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  removeStaff = async (req: any, res: Response): Promise<void> => {
    try {
      const { staffId } = req.params;

      if (!staffId) {
        res.status(400).json({ success: false, error: "Staff ID is required." });
        return;
      }

      await this.service.removeStaff(staffId, req.departmentId, req.user.id);
      res.status(200).json({ success: true, message: "Staff member removed successfully." });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  getStaffRoster = async (req: any, res: Response): Promise<void> => {
    try {
      const roster = await this.service.listRoster(req.departmentId);
      res.status(200).json({ success: true, data: roster });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getDashboard = async (req: any, res: Response): Promise<void> => {
    try {
      const data = await this.service.getDashboard(req.departmentId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  createStaff = async (req: any, res: Response): Promise<void> => {
    try {
      const { email, password, full_name, phone, expertise } = req.body;

      if (!email || !full_name) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: email, full_name.",
        });
        return;
      }

      // Department head can ONLY create staff role accounts
      if (req.body.role && req.body.role !== "staff") {
        res.status(403).json({
          success: false,
          error: "Department head can only create staff role accounts.",
        });
        return;
      }

      // Check duplicate email
      const emailExists = await this.service.checkEmailExists(email);
      if (emailExists) {
        res.status(409).json({
          success: false,
          error: "A user with this email already exists.",
        });
        return;
      }

      const municipalityId = await this.service.getMunicipalityId(req.departmentId);

      const { RoleInviteService } = require("../../../service/role-invite.service");
      const inviteService = new RoleInviteService((this.service as any).repo.supabaseAdmin);

      const invite = await inviteService.createInvite({
        invited_by: req.user.id,
        email,
        phone,
        role: "staff",
        municipality_id: municipalityId,
        department_id: req.departmentId,
        additional_data: { full_name, expertise },
      });

      res.status(201).json({
        success: true,
        message: "Staff role invitation dispatched successfully.",
        data: {
          invite_id: invite.id,
          email: invite.email,
          role: invite.role,
          invite_token: invite.token,
          expires_at: invite.expires_at,
          invite_link: `/accept-invite?token=${invite.token}`,
        },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  updateStaffStatus = async (req: any, res: Response): Promise<void> => {
    try {
      const { staffId } = req.params;
      const { status } = req.body;
      if (!status || !["active", "inactive", "suspended"].includes(status)) {
        res.status(400).json({ success: false, error: "Status must be active, inactive, or suspended." });
        return;
      }
      await this.service.updateStaffAccountStatus(staffId, req.departmentId, status);
      res.status(200).json({ success: true, message: "Staff account status updated successfully." });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  resetStaffPassword = async (req: any, res: Response): Promise<void> => {
    try {
      const { staffId } = req.params;
      const newPassword = crypto.randomBytes(6).toString("hex");
      await this.service.resetStaffPassword(staffId, req.departmentId, newPassword);
      res.status(200).json({ success: true, data: { temp_password: newPassword } });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  // ─── Team Management ─────────────────────────────────────────────────────────

  getTeams = async (req: any, res: Response): Promise<void> => {
    try {
      const teams = await this.service.listTeams(req.departmentId);
      res.status(200).json({ success: true, data: teams });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getTeamDetails = async (req: any, res: Response): Promise<void> => {
    try {
      const { teamName } = req.params;
      if (!teamName) {
        res.status(400).json({ success: false, error: "Team name is required." });
        return;
      }
      const team = await this.service.getTeamDetails(
        decodeURIComponent(teamName),
        req.departmentId,
      );
      res.status(200).json({ success: true, data: team });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  updateTeam = async (req: any, res: Response): Promise<void> => {
    try {
      const { teamName } = req.params;
      const { team_name, description, is_active } = req.body;

      if (!teamName) {
        res.status(400).json({ success: false, error: "Team name is required." });
        return;
      }

      const hasUpdate = [team_name, description, is_active].some(
        (v) => v !== undefined && v !== null,
      );
      if (!hasUpdate) {
        res.status(400).json({ success: false, error: "No update fields provided." });
        return;
      }

      const updated = await this.service.updateTeamInfo(
        decodeURIComponent(teamName),
        req.departmentId,
        { team_name, description, is_active },
      );
      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  removeMember = async (req: any, res: Response): Promise<void> => {
    try {
      const { teamName, staffId } = req.params;
      if (!teamName || !staffId) {
        res.status(400).json({ success: false, error: "Team name and Staff ID are required." });
        return;
      }
      await this.service.removeMemberFromTeam(
        decodeURIComponent(teamName),
        staffId,
        req.departmentId,
      );
      res.status(200).json({ success: true, message: "Member removed from team." });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  toggleLeader = async (req: any, res: Response): Promise<void> => {
    try {
      const { teamName, staffId } = req.params;
      const { is_leader } = req.body;

      if (!teamName || !staffId) {
        res.status(400).json({ success: false, error: "Team name and Staff ID are required." });
        return;
      }

      if (typeof is_leader !== "boolean") {
        res.status(400).json({ success: false, error: "is_leader must be a boolean." });
        return;
      }

      await this.service.setTeamLeader(
        decodeURIComponent(teamName),
        staffId,
        req.departmentId,
        is_leader,
      );
      res.status(200).json({ success: true, message: `Member ${is_leader ? "promoted to" : "demoted from"} leader.` });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  // ===== MULTI-DEPARTMENT & COLLABORATION HANDLERS =====

  getQueue = async (req: any, res: Response): Promise<void> => {
    try {
      const statusFilter = req.query.status as string | undefined;
      const data = await this.service.getDepartmentQueue(req.departmentId, statusFilter);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getCollaborations = async (req: any, res: Response): Promise<void> => {
    try {
      const data = await this.service.getCollaborations(req.departmentId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  requestCollaboration = async (req: any, res: Response): Promise<void> => {
    try {
      const { complaintId } = req.params;
      const { supporting_department_id, inspection_note } = req.body;

      if (!supporting_department_id) {
        res.status(400).json({ success: false, error: "supporting_department_id is required." });
        return;
      }

      const data = await this.service.requestCollaboration(
        req.departmentId,
        complaintId,
        supporting_department_id,
        req.user.id,
        inspection_note
      );

      res.status(201).json({
        success: true,
        message: "Multi-department collaboration requested.",
        data,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  submitSignOff = async (req: any, res: Response): Promise<void> => {
    try {
      const { complaintId } = req.params;
      const { decision, note } = req.body;

      if (!decision || !["approved", "rejected"].includes(decision)) {
        res.status(400).json({ success: false, error: "decision must be 'approved' or 'rejected'." });
        return;
      }

      const result = await this.service.submitSignOff(
        req.departmentId,
        complaintId,
        req.user.id,
        req.user.role || "department_head",
        decision,
        note
      );

      res.status(200).json({
        success: true,
        message: "Sign-off recorded successfully.",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  exportComplaintsCsv = async (req: any, res: Response): Promise<void> => {
    try {
      const csvData = await this.service.exportComplaintsCsv(req.departmentId);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="department_complaints.csv"`);
      res.status(200).send(csvData);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  assignComplaintToTeam = async (req: any, res: Response): Promise<void> => {
    try {
      const { teamName } = req.params;
      const { complaint_id, notes } = req.body;

      if (!complaint_id) {
        res.status(400).json({ success: false, error: "complaint_id is required." });
        return;
      }

      const data = await this.service.assignComplaintToTeam(
        req.departmentId,
        decodeURIComponent(teamName),
        complaint_id,
        req.user.id,
        notes
      );

      res.status(201).json({
        success: true,
        message: "Grievance ticket assigned to operational team.",
        data,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  getTeamComplaints = async (req: any, res: Response): Promise<void> => {
    try {
      const { teamName } = req.params;
      const data = await this.service.getTeamComplaints(
        req.departmentId,
        decodeURIComponent(teamName)
      );
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
