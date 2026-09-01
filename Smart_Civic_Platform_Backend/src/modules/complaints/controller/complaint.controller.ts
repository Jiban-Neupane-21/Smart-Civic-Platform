import { Request, Response } from "express";
import { ComplaintsService } from "../services/complaints.service";

export class ComplaintsController {
  constructor(private service: ComplaintsService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const citizenId = req.user?.id;
      if (!citizenId) throw new Error("Citizen authentication required.");

      const complaint = await this.service.fileNewGrievance(
        citizenId,
        req.body,
      );
      res.status(201).json({ success: true, data: complaint });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  getMyHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const citizenId = req.user?.id;
      if (!citizenId) throw new Error("Citizen authentication required.");

      const history = await this.service.fetchCitizenHistory(citizenId);
      res.status(200).json({ success: true, data: history });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  getCategories = async (_req: Request, res: Response): Promise<void> => {
    try {
      const categories = await this.service.fetchSystemCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
