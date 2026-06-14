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
}
