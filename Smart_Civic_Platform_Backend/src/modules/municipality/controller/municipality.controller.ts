import { Response } from "express";
import crypto from "crypto";
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

  updateLogo = async (req: any, res: Response): Promise<void> => {
    try {
      if (!req.body.logo) {
        res.status(400).json({ success: false, error: "logo base64 string is required" });
        return;
      }
      const data = await this.service.updateLogo(req.municipalityId, req.body.logo);
      res.status(200).json({ success: true, data, message: "Logo updated successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getMunicipalityProfile = async (req: any, res: Response): Promise<void> => {
    try {
      const data = await this.service.getMunicipalityProfile(req.municipalityId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  updateMunicipalityProfile = async (req: any, res: Response): Promise<void> => {
    try {
      const data = await this.service.updateMunicipalityProfile(req.municipalityId, req.body, req.user?.id);
      res.status(200).json({
        success: true,
        data,
        message: data.kyc_status === "pending"
          ? "Profile updated and submitted for KYC verification!"
          : "Profile updated successfully.",
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getDepartments = async (req: any, res: Response): Promise<void> => {
    try {
      const depts = await this.service.getDepartments(req.municipalityId);
      res.status(200).json({ success: true, data: { departments: depts } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getDepartmentDetail = async (req: any, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dept = await this.service.getDepartmentById(id);
      if (!dept) {
        res.status(404).json({ success: false, error: "Department not found." });
        return;
      }
      res.status(200).json({ success: true, data: dept });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getDepartmentCategories = async (req: any, res: Response): Promise<void> => {
    try {
      const categories = await this.service.getDepartmentCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  reviewDepartmentKyc = async (req: any, res: Response): Promise<void> => {
    try {
      const { id: departmentId } = req.params;
      const { status, rejection_reason } = req.body;

      if (!status || !["verified", "rejected"].includes(status)) {
        res.status(400).json({ success: false, error: "status must be 'verified' or 'rejected'." });
        return;
      }

      const updated = await this.service.reviewDepartmentKyc(
        req.municipalityId,
        departmentId,
        req.user.id,
        status,
        rejection_reason
      );

      res.status(200).json({
        success: true,
        message: `Department KYC status updated to '${status}'.`,
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  provisionDepartment = async (req: any, res: Response): Promise<void> => {
    try {
      const { department_name, official_email, head_name, head_email, head_password: customPassword } = req.body;

      if (!department_name || !official_email || !head_name || !head_email) {
        res.status(400).json({
          success: false,
          error: "Missing fundamental structural department elements.",
        });
        return;
      }

      // Check for duplicate department name within this municipality
      const existingDepts = await this.service.getDepartments(req.municipalityId);
      if (existingDepts?.some((d: any) => d.department_name.toLowerCase() === department_name.toLowerCase())) {
        res.status(409).json({
          success: false,
          error: "A department with this name already exists in your municipality.",
        });
        return;
      }

      // 1. Generate or use password for department head
      const head_password = customPassword || crypto.randomBytes(6).toString("hex");

      // 2. Register department
      const { department_category } = req.body;
      const departmentData = {
        department_name,
        official_email,
        head_name,
        head_email,
        ...(department_category && { department_category }),
      };

      const dept = await this.service.registerDepartment(
        req.municipalityId,
        departmentData,
      );

      try {
        // 3. Create the department head user profile (using dept.id)
        const userProfile = await createUserService({
          email: head_email,
          password: head_password,
          full_name: head_name,
          role: "department_head",
          municipality_id: req.municipalityId,
          department_id: dept.id,
          phone: req.body.head_contact_no || undefined,
          created_by: req.user?.id || "municipality_head",
        });

        // 4. Update department record with head profile ID (using dept.id)
        await this.service.updateDepartment(dept.id, {
          head_profile_id: userProfile.id,
        });

        res.status(201).json({
          success: true,
          data: {
            ...dept,
            head_password,
            head_email,
            department_name,
          },
        });
      } catch (userError: any) {
        // Rollback department creation if user fails (using dept.id)
        await this.service.deleteDepartment(dept.id);
        throw new Error(`Failed to create head user account. Department creation rolled back. Reason: ${userError.message}`);
      }
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  updateDepartment = async (req: any, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { head_contact_no, head_name, head_email, ...deptFields } = req.body;

      // Sync linked profile if head_name, head_email, or contact number changed
      if (head_name || head_email || head_contact_no) {
        const department = await this.service.getDepartmentById(id);
        if (department?.head_profile_id) {
          const profileUpdate: any = {};
          if (head_name) profileUpdate.full_name = head_name;
          if (head_email) profileUpdate.email = head_email;
          if (head_contact_no) profileUpdate.phone = head_contact_no;
          await this.service.updateProfile(department.head_profile_id, profileUpdate);
        }
      }

      const dept = await this.service.updateDepartment(id, {
        ...deptFields,
        ...(head_name && { head_name }),
        ...(head_email && { head_email }),
      });

      res.status(200).json({ success: true, data: dept });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  deleteDepartment = async (req: any, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // 1. Fetch department to get linked head profile ID
      const department = await this.service.getDepartmentById(id);
      const headProfileId = department?.head_profile_id;

      if (headProfileId) {
        // 2. Break FK link
        await this.service.updateDepartment(id, { head_profile_id: null });

        try {
          // 3. Delete profile and auth user
          await this.service.removeProfile(headProfileId);
          await this.service.removeAuthUser(headProfileId);
        } catch (userError: any) {
          console.error("Failed to clean up user on department delete:", userError.message);
        }
      }

      // 4. Delete department row
      await this.service.deleteDepartment(id);
      res.status(200).json({ success: true, message: "Department and linked user deleted successfully." });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  replaceDepartmentHead = async (req: any, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { head_name, head_email, head_contact_no, head_password: customPassword } = req.body;

      if (!head_name || !head_email) {
        res.status(400).json({ success: false, error: "head_name and head_email are required." });
        return;
      }

      const department = await this.service.getDepartmentById(id);
      if (!department) {
        res.status(404).json({ success: false, error: "Department not found." });
        return;
      }

      // 1. Unlink old head if exists
      if (department.head_profile_id) {
        await this.service.updateDepartment(id, { head_profile_id: null });
      }

      // 2. Create new head user
      const head_password = customPassword || crypto.randomBytes(6).toString("hex");
      const userProfile = await createUserService({
        email: head_email,
        password: head_password,
        full_name: head_name,
        role: "department_head",
        municipality_id: req.municipalityId,
        department_id: id,
        phone: head_contact_no || undefined,
        created_by: req.user?.id || "municipality_head",
      });

      // 3. Link new head profile to department
      const updatedDept = await this.service.updateDepartment(id, {
        head_profile_id: userProfile.id,
        head_name,
        head_email,
      });

      res.status(200).json({
        success: true,
        data: {
          ...updatedDept,
          head_password,
        },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  // ===== STAFF CRUD HANDLERS =====

  listStaff = async (req: any, res: Response): Promise<void> => {
    try {
      const department_id = req.query.department_id as string | undefined;
      const staffList = await this.service.getStaff(req.municipalityId, department_id);
      res.status(200).json({ success: true, data: staffList });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  createStaff = async (req: any, res: Response): Promise<void> => {
    try {
      const { full_name, email, role, department_id, phone } = req.body;

      if (!email || !role || !department_id) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: email, role, department_id.",
        });
        return;
      }

      if (!["staff", "department_head"].includes(role)) {
        res.status(400).json({
          success: false,
          error: "Role must be 'staff' or 'department_head'.",
        });
        return;
      }

      const { RoleInviteService } = require("../../../service/role-invite.service");
      const inviteService = new RoleInviteService((this.service as any).repo.supabaseAdmin);

      const invite = await inviteService.createInvite({
        invited_by: req.user.id,
        email,
        phone,
        role,
        municipality_id: req.municipalityId,
        department_id,
        additional_data: { full_name },
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

  updateStaff = async (req: any, res: Response): Promise<void> => {
    try {
      const { staffId } = req.params;
      const updated = await this.service.updateStaff(req.municipalityId, staffId, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  deleteStaff = async (req: any, res: Response): Promise<void> => {
    try {
      const { staffId } = req.params;
      await this.service.archiveAndDeleteStaff(staffId, req.municipalityId, req.user.id);
      res.status(200).json({ success: true, message: "Staff member deleted successfully." });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  updateStaffStatus = async (req: any, res: Response): Promise<void> => {
    try {
      const { staffId } = req.params;
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ success: false, error: "Status field is required." });
        return;
      }
      await this.service.updateStaffAccountStatus(req.municipalityId, staffId, status);
      res.status(200).json({ success: true, message: "Staff account status updated successfully." });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  resetStaffPassword = async (req: any, res: Response): Promise<void> => {
    try {
      const { staffId } = req.params;
      const newPassword = crypto.randomBytes(6).toString("hex");
      await this.service.resetStaffPassword(req.municipalityId, staffId, newPassword);
      res.status(200).json({ success: true, data: { temp_password: newPassword } });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  reviewStaffKyc = async (req: any, res: Response): Promise<void> => {
    try {
      const { id: staffId } = req.params;
      const { status, rejection_reason } = req.body;

      if (!status || !["verified", "rejected"].includes(status)) {
        res.status(400).json({
          success: false,
          error: "Status must be 'verified' or 'rejected'.",
        });
        return;
      }

      if (status === "rejected" && !rejection_reason) {
        res.status(400).json({
          success: false,
          error: "Rejection reason is required when rejecting KYC.",
        });
        return;
      }

      const updated = await this.service.reviewStaffKyc(
        req.municipalityId,
        staffId,
        req.user.id,
        status,
        rejection_reason
      );

      res.status(200).json({
        success: true,
        message: `Staff KYC ${status === "verified" ? "approved" : "rejected"} successfully.`,
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  onboardStaffProfile = async (req: any, res: Response): Promise<void> => {
    try {
      const { profile_id, primary_department_id, employee_id, expertise } = req.body;
      if (!profile_id || !primary_department_id || !employee_id || !expertise) {
        res.status(400).json({
          success: false,
          error: "Missing core components required for staff enrollment.",
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

      if (!email || !full_name || !role) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: email, full_name, role.",
        });
        return;
      }

      if (!["department_head", "staff"].includes(role)) {
        res.status(400).json({
          success: false,
          error: "Municipality head can only create department_head or staff users.",
        });
        return;
      }

      if (!department_id) {
        res.status(400).json({
          success: false,
          error: "department_id is required when creating department_head or staff.",
        });
        return;
      }

      const generatedPassword = password || crypto.randomBytes(6).toString("hex");

      const profile = await createUserService({
        email,
        password: generatedPassword,
        full_name,
        role,
        municipality_id: req.municipalityId,
        department_id,
        phone,
        created_by: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: {
          ...profile,
          password: generatedPassword,
        },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  // ===== KYC VERIFICATION HANDLERS =====

  getPendingKycList = async (req: any, res: Response): Promise<void> => {
    try {
      const list = await this.service.getPendingKycList(req.municipalityId);
      res.status(200).json({ success: true, data: list });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getKycCitizenDetail = async (req: any, res: Response): Promise<void> => {
    try {
      const { citizenId } = req.params;
      const detail = await this.service.getKycCitizenDetail(req.municipalityId, citizenId);
      if (!detail) {
        res.status(404).json({ success: false, error: "Citizen record not found." });
        return;
      }
      res.status(200).json({ success: true, data: detail });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  reviewKyc = async (req: any, res: Response): Promise<void> => {
    try {
      const { citizenId } = req.params;
      const { status, rejection_reason } = req.body;

      if (!status || !["verified", "rejected"].includes(status)) {
        res.status(400).json({ success: false, error: "status must be 'verified' or 'rejected'." });
        return;
      }

      const updated = await this.service.reviewKyc(
        req.municipalityId,
        citizenId,
        req.user.id,
        status,
        rejection_reason
      );

      res.status(200).json({
        success: true,
        message: `KYC verification status updated to '${status}'.`,
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  // ===== CROSS-DEPARTMENT TEAM HANDLERS =====

  getCrossDeptTeams = async (req: any, res: Response): Promise<void> => {
    try {
      const teams = await this.service.getCrossDeptTeams(req.municipalityId);
      res.status(200).json({ success: true, data: teams });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  createCrossDeptTeam = async (req: any, res: Response): Promise<void> => {
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

      const team = await this.service.createCrossDeptTeam(req.municipalityId, {
        team_name,
        description,
        start_date,
        end_date,
        created_by: req.user.id,
        member_staff_ids: Array.isArray(member_staff_ids) ? member_staff_ids : [],
        leader_staff_id,
        is_emergency_override,
        override_reason,
      });

      res.status(201).json({ success: true, data: team });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  deactivateCrossDeptTeam = async (req: any, res: Response): Promise<void> => {
    try {
      const { teamId } = req.params;
      const deactivated = await this.service.deactivateCrossDeptTeam(teamId, req.municipalityId);
      res.status(200).json({ success: true, message: "Cross-department team deactivated.", data: deactivated });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  assignComplaintToTeam = async (req: any, res: Response): Promise<void> => {
    try {
      const { teamId } = req.params;
      const { complaint_id, notes } = req.body;

      if (!complaint_id) {
        res.status(400).json({ success: false, error: "complaint_id is required." });
        return;
      }

      const data = await this.service.assignComplaintToTeam(
        req.municipalityId,
        teamId,
        complaint_id,
        req.user.id,
        notes
      );

      res.status(201).json({
        success: true,
        message: "Grievance ticket assigned to cross-department team.",
        data,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  getTeamComplaints = async (req: any, res: Response): Promise<void> => {
    try {
      const { teamId } = req.params;
      const data = await this.service.getTeamComplaints(req.municipalityId, teamId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  // ===== ESCALATED COMPLAINTS & INTERVENTION HANDLERS =====

  getEscalatedComplaints = async (req: any, res: Response): Promise<void> => {
    try {
      const complaints = await this.service.getEscalatedComplaints(req.municipalityId);
      res.status(200).json({ success: true, data: complaints });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  interveneInComplaint = async (req: any, res: Response): Promise<void> => {
    try {
      const { id: complaintId } = req.params;
      const { action, note } = req.body;

      if (!action || !["reassign", "resolve", "reject"].includes(action)) {
        res.status(400).json({ success: false, error: "action must be 'reassign', 'resolve', or 'reject'." });
        return;
      }

      const result = await this.service.interveneInComplaint(
        req.municipalityId,
        complaintId,
        action,
        note
      );

      res.status(200).json({
        success: true,
        message: `Municipality Head intervention recorded cleanly (${action}).`,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
