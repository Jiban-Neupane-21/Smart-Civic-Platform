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
        municipality_id,
        head_name,
        head_email,
        head_password: customPassword,
      } = req.body;

      if (!municipality_id || !head_name || !head_email) {
        res.status(400).json({
          success: false,
          error: "municipality_id, head_name, and head_email are required.",
        });
        return;
      }

      // 1. Fetch target municipality and verify it exists and is inactive
      const municipality = await this.service.fetchMunicipalityById(municipality_id);
      if (!municipality) {
        res.status(404).json({
          success: false,
          error: "Selected municipality entity not found.",
        });
        return;
      }
      if (municipality.is_active) {
        res.status(400).json({
          success: false,
          error: "Selected municipality is already activated.",
        });
        return;
      }

      // 2. Check if head_email already exists
      const emailExists = await this.service.checkEmailExists(head_email);
      if (emailExists) {
        res.status(400).json({
          success: false,
          error: "A user with the provided head email already exists.",
        });
        return;
      }

      // 3. Generate or use password
      const head_password = customPassword || crypto.randomBytes(6).toString("hex");

      // 4. Create auth user and profile
      let profile;
      try {
        profile = await createUserService({
          email: head_email,
          password: head_password,
          full_name: head_name,
          role: "municipality_head",
          municipality_id: municipality_id,
          created_by: (req as any).user?.id,
        });
      } catch (userError: any) {
        res.status(400).json({
          success: false,
          error: `Failed to create municipality head account: ${userError.message}`,
        });
        return;
      }

      // 5. Activate municipality and link head profile
      let activatedMuni;
      try {
        activatedMuni = await this.service.activateMunicipality(
          municipality_id,
          profile.id,
          head_name,
          head_email
        );
      } catch (activateError: any) {
        // Rollback created user account
        try {
          await this.service.removeProfile(profile.id);
          await this.service.removeAuthUser(profile.id);
        } catch (cleanupError: any) {
          console.error("Rollback cleanup error:", cleanupError.message);
        }
        res.status(500).json({
          success: false,
          error: `Municipality activation failed, user rolled back: ${activateError.message}`,
        });
        return;
      }

      // 6. Auto-create wards (1 to total_wards)
      try {
        const totalWards = municipality.total_wards || 1;
        await this.service.createWards(municipality_id, totalWards);
      } catch (wardError: any) {
        console.error("Ward auto-creation warning:", wardError.message);
      }

      res.status(201).json({
        success: true,
        data: {
          municipality_id,
          official_name: activatedMuni.official_name,
          head_email,
          head_password,
          local_level_type: activatedMuni.local_level_type,
          total_wards: activatedMuni.total_wards,
        },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  getProvinces = async (req: Request, res: Response): Promise<void> => {
    try {
      const provinces = await this.service.getProvinces();
      res.status(200).json({ success: true, data: provinces });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getDistricts = async (req: Request, res: Response): Promise<void> => {
    try {
      const province_id = req.query.province_id as string | undefined;
      const districts = await this.service.getDistricts(province_id);
      res.status(200).json({ success: true, data: districts });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getReferenceMunicipalities = async (req: Request, res: Response): Promise<void> => {
    try {
      const district_id = req.query.district_id as string | undefined;
      const is_active_param = req.query.is_active as string | undefined;
      const isActiveBool = is_active_param !== undefined ? is_active_param === "true" : undefined;

      const municipalities = await this.service.getReferenceMunicipalities(
        district_id,
        isActiveBool
      );
      res.status(200).json({ success: true, data: municipalities });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getMunicipalityDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({ success: false, error: "Municipality ID is required." });
        return;
      }

      const detail = await this.service.getMunicipalityDetail(id);
      res.status(200).json({ success: true, data: detail });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getWards = async (req: Request, res: Response): Promise<void> => {
    try {
      const municipality_id = req.params.municipality_id as string;
      if (!municipality_id) {
        res.status(400).json({ success: false, error: "Municipality ID is required." });
        return;
      }

      const wards = await this.service.getWards(municipality_id);
      res.status(200).json({ success: true, data: wards });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
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

  updateMunicipality = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({ success: false, error: "Municipality ID is required." });
        return;
      }

      const updated = await this.service.modifyMunicipality(id, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  deleteMunicipality = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({ success: false, error: "Municipality ID is required." });
        return;
      }

      // 1. Fetch the municipality to get the linked head profile ID
      const municipality = await this.service.fetchMunicipalityById(id);
      const headProfileId = municipality?.head_profile_id;

      if (headProfileId) {
        // 2. Break the FK link first
        await this.service.modifyMunicipality(id, { head_profile_id: null });

        try {
          // 3. Delete the profile row
          await this.service.removeProfile(headProfileId);
          // 4. Delete the Supabase Auth user
          await this.service.removeAuthUser(headProfileId);
        } catch (userError: any) {
          console.error("Failed to clean up user on municipality delete:", userError.message);
        }
      }

      // 5. Delete the municipality itself
      await this.service.removeMunicipality(id);
      res.status(200).json({ success: true, message: "Municipality and linked user deleted successfully." });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
