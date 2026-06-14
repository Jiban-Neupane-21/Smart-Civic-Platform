import { Response } from "express";
import type { ComplaintStatus } from "../../../types/database.type";
import { MunicipalityService } from "../services/municipality.service";
import { createUserService } from "../../auth/services/auth.service";

export class MunicipalityController {
  constructor(private service: MunicipalityService) {}

  getAnalytics = async (req: any, res: Response): Promise<void> => {
    try {
      const stats = await this.service.getDashboardAnalytics(
        req.municipalityId,
      );
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  provisionDepartment = async (req: any, res: Response): Promise<void> => {
    try {
      const { department_name, official_email, head_name, head_email } =
        req.body;
      if (!department_name || !official_email || !head_name || !head_email) {
        res.status(400).json({
          success: false,
          error: "Missing fundamental structural department elements.",
        });
        return;
      }

      const dept = await this.service.registerDepartment(
        req.municipalityId,
        req.body,
      );
      res.status(201).json({ success: true, data: dept });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  onboardStaffProfile = async (req: any, res: Response): Promise<void> => {
    try {
      const { profile_id, primary_department_id, employee_id, expertise } =
        req.body;
      if (!profile_id || !primary_department_id || !employee_id || !expertise) {
        res.status(400).json({
          success: false,
          error:
            "Missing core components required for corporate staff enrollment.",
        });
        return;
      }

      const staff = await this.service.registerStaffMember(
        req.municipalityId,
        req.body,
      );
      res.status(201).json({ success: true, data: staff });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  getComplaints = async (req: any, res: Response): Promise<void> => {
    try {
      const statusFilter = req.query.status as ComplaintStatus | undefined;
      const list = await this.service.getComplaintsLog(
        req.municipalityId,
        statusFilter,
      );
      res.status(200).json({ success: true, data: list });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  createUser = async (req: any, res: Response): Promise<void> => {
    try {
      const { email, password, full_name, role, department_id, phone } = req.body;

      if (!email || !password || !full_name || !role) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: email, password, full_name, role.",
        });
        return;
      }

      // Municipality head can create department_head or staff
      if (!["department_head", "staff"].includes(role)) {
        res.status(400).json({
          success: false,
          error: "Municipality head can only create department_head or staff users.",
        });
        return;
      }

      // department_id is required for department_head and staff
      if (!department_id) {
        res.status(400).json({
          success: false,
          error: "department_id is required when creating department_head or staff.",
        });
        return;
      }

      const profile = await createUserService({
        email,
        password,
        full_name,
        role,
        municipality_id: req.municipalityId,
        department_id,
        phone,
        created_by: req.user.id,
      });

      res.status(201).json({ success: true, data: profile });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
