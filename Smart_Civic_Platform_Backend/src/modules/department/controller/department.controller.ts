import { Response } from "express";
import { DepartmentService } from "../services/department.service";
import { createUserService } from "../../auth/services/auth.service";

export class DepartmentController {
  constructor(private service: DepartmentService) {}

  setupTeam = async (req: any, res: Response): Promise<void> => {
    try {
      const { team_name } = req.body;
      if (!team_name) {
        res
          .status(400)
          .json({
            success: false,
            error:
              "Team designation name is required.",
          });
        return;
      }

      const team = await this.service.buildDeploymentTeam(
        req.departmentId,
        team_name
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

      const assignment = await this.service.assignStaffToSquad({
        team_id,
        staff_id,
        is_leader: !!is_leader,
      });
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

      if (!email || !password || !full_name) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: email, password, full_name.",
        });
        return;
      }

      // Resolve the parent municipality_id from the department
      const municipalityId = await this.service.getMunicipalityId(
        req.departmentId,
      );

      const profile = await createUserService({
        email,
        password,
        full_name,
        role: "staff",
        municipality_id: municipalityId,
        department_id: req.departmentId,
        phone,
        created_by: req.user.id,
      });

      // The DB trigger creates the staff row — now update it with expertise
      if (expertise) {
        await this.service.setStaffExpertise(
          profile.id,
          req.departmentId,
          expertise,
        );
      }

      res.status(201).json({ success: true, data: profile });
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
}
