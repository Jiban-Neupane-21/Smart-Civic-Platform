import { Request, Response } from "express";
import { SuperadminService } from "../services/superadmin.services";
import { createUserService } from "../../auth/services/auth.service";

export class SuperadminController {
  constructor(private service: SuperadminService) {}

  getMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = await this.service.getDashboardMetrics();
      res.status(200).json({ success: true, data: metrics });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  provisionMunicipality = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        official_name,
        official_email,
        head_name,
        head_email,
        municipality_type,
        total_wards,
      } = req.body;

      // Inline payload sanitation check
      if (!official_name || !official_email || !head_name || !head_email) {
        res.status(400).json({
          success: false,
          error: "Missing core municipality identity fields.",
        });
        return;
      }

      const newMuni = await this.service.registerNewMunicipality(req.body);
      res.status(201).json({ success: true, data: newMuni });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  changeUserRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { targetUserId, newRole } = req.body;
      if (!targetUserId || !newRole) {
        res.status(400).json({
          success: false,
          error: "Target user ID and exact role target required.",
        });
        return;
      }

      await this.service.adjustUserAuthorization(targetUserId, newRole);
      res.status(200).json({
        success: true,
        message: `User role successfully targeted to ${newRole}.`,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  restrictUserAccess = async (req: Request, res: Response): Promise<void> => {
    try {
      const { targetUserId, status } = req.body;
      if (!targetUserId || !status) {
        res.status(400).json({
          success: false,
          error: "Target identifier and status setting required.",
        });
        return;
      }

      const profile = await this.service.modifyUserAccess(targetUserId, status);
      res.status(200).json({ success: true, data: profile });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  getSystemAudits = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const logs = await this.service.fetchSystemAuditTrail(page, limit);
      res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, full_name, role, municipality_id, department_id, phone } = req.body;

      if (!email || !password || !full_name || !role || !municipality_id) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: email, password, full_name, role, municipality_id.",
        });
        return;
      }

      // Superadmin can only create municipality_head users via this endpoint
      if (role !== "municipality_head") {
        res.status(400).json({
          success: false,
          error: "Superadmin can only create municipality_head users via this endpoint.",
        });
        return;
      }

      const profile = await createUserService({
        email,
        password,
        full_name,
        role,
        municipality_id,
        department_id,
        phone,
        created_by: (req as any).user.id,
      });

      res.status(201).json({ success: true, data: profile });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
