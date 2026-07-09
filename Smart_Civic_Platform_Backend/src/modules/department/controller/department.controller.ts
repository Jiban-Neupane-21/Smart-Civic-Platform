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

  getStaffRoster = async (req: any, res: Response): Promise<void> => {
    try {
      const roster = await this.service.listRoster(req.departmentId);
      res.status(200).json({ success: true, data: roster });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  createStaff = async (req: any, res: Response): Promise<void> => {
    try {
      const { email, password, full_name, phone } = req.body;

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

      res.status(201).json({ success: true, data: profile });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
