import { Request, Response } from "express";
import crypto from "crypto";
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
        province,
        district,
      } = req.body;

      // Inline payload sanitation check
      if (!official_name || !official_email || !head_name || !head_email) {
        res.status(400).json({
          success: false,
          error: "Missing core municipality identity fields.",
        });
        return;
      }

      // 1. Check if the head_email already exists to prevent orphaned municipalities
      const emailExists = await this.service.checkEmailExists(head_email);
      if (emailExists) {
        res.status(400).json({
          success: false,
          error: "A user with the provided head email already exists.",
        });
        return;
      }

      // 2. Generate a temporary password
      const head_password = crypto.randomBytes(6).toString("hex");

      // 3. Register the municipality
      const newMuni = await this.service.registerNewMunicipality(req.body);
      
      try {
        // 4. Create the municipality head user
        await createUserService({
          email: head_email,
          password: head_password,
          full_name: head_name,
          role: "municipality_head",
          municipality_id: newMuni.m_uid,
          created_by: "superadmin" // or from req.user
        });
        
        // 5. Update the municipality with the created profile ID.
        // Wait a small moment for the trigger to fire, then fetch the profile.
        // Wait 500ms
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const profileId = await this.service.getProfileIdByEmail(head_email);
          
        if (profileId) {
          await this.service.updateMunicipalityHead(newMuni.m_uid, profileId);
        }
      } catch (userError: any) {
        // Rollback: delete the municipality
        await this.service.removeMunicipality(newMuni.m_uid);
        throw new Error(`Failed to create head user. Municipality was rolled back. Reason: ${userError.message}`);
      }

      // Return the generated password so the frontend can display it
      res.status(201).json({ success: true, data: { ...newMuni, head_password } });
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

  getMunicipalities = async (req: Request, res: Response): Promise<void> => {
    try {
      const municipalities = await this.service.getAllMunicipalities();
      res.status(200).json({ success: true, data: municipalities });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  deleteMunicipality = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: "Municipality ID is required." });
        return;
      }
      await this.service.removeMunicipality(id);
      res.status(200).json({ success: true, message: "Municipality deleted successfully." });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
