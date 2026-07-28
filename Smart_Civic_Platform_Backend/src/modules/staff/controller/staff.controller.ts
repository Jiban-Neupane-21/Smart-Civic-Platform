import { Response } from "express";
import { StaffService } from "../services/staff.service";

export class StaffController {
  constructor(private service: StaffService) {}

  getMyTeams = async (req: any, res: Response): Promise<void> => {
    try {
      const fieldSquads = await this.service.fetchAssignedFieldWork(
        req.staffId,
      );
      res.status(200).json({ success: true, data: fieldSquads });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getDepartmentQueue = async (req: any, res: Response): Promise<void> => {
    try {
      const tickets = await this.service.fetchDepartmentalGrievances(
        req.departmentId,
      );
      res.status(200).json({ success: true, data: tickets });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getMyProfile = async (req: any, res: Response): Promise<void> => {
    try {
      const profile = await this.service.fetchMyProfile(req.user.id);
      res.status(200).json({ success: true, data: profile });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  updateMyProfile = async (req: any, res: Response): Promise<void> => {
    try {
      const { phone, personal_address } = req.body;
      const updated = await this.service.modifyMyProfile(req.user.id, {
        phone,
        personal_address,
      });
      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  getMyDepartment = async (req: any, res: Response): Promise<void> => {
    try {
      const dept = await this.service.fetchMyDepartment(req.departmentId);
      res.status(200).json({ success: true, data: dept });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getMySchedule = async (req: any, res: Response): Promise<void> => {
    try {
      const schedule = await this.service.fetchMySchedule(req.staffId);
      res.status(200).json({ success: true, data: schedule });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  acknowledgeAssignment = async (req: any, res: Response): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const ack = await this.service.acknowledgeAssignment(req.staffId, assignmentId);
      res.status(200).json({ success: true, message: "Assignment acknowledged.", data: ack });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  // ===== COMPLAINT ASSIGNMENT LIFECYCLE HANDLERS =====

  acceptAssignment = async (req: any, res: Response): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const result = await this.service.acceptAssignment(req.staffId, assignmentId);
      res.status(200).json({ success: true, message: "Assignment accepted.", data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  startAssignment = async (req: any, res: Response): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const result = await this.service.startAssignment(req.staffId, assignmentId);
      res.status(200).json({ success: true, message: "Field work started.", data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  completeAssignment = async (req: any, res: Response): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const result = await this.service.completeAssignment(req.staffId, assignmentId);
      res.status(200).json({ success: true, message: "Assignment completed & resolved.", data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  transferAssignment = async (req: any, res: Response): Promise<void> => {
    try {
      const { id: complaintId } = req.params;
      const { to_staff_id, reason, note } = req.body;

      if (!to_staff_id || !reason) {
        res.status(400).json({ success: false, error: "to_staff_id and reason are required." });
        return;
      }

      const handoff = await this.service.transferAssignment(
        req.staffId,
        complaintId,
        to_staff_id,
        reason,
        note
      );

      res.status(201).json({ success: true, message: "Complaint transferred to peer.", data: handoff });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  returnAssignmentToDeptHead = async (req: any, res: Response): Promise<void> => {
    try {
      const { id: complaintId } = req.params;
      const { reason, note } = req.body;

      if (!reason) {
        res.status(400).json({ success: false, error: "reason is required." });
        return;
      }

      const handoff = await this.service.returnAssignmentToDeptHead(
        req.staffId,
        complaintId,
        reason,
        note
      );

      res.status(201).json({ success: true, message: "Complaint returned to Department Head.", data: handoff });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
