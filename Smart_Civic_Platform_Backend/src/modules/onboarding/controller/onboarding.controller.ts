import { Response } from "express";
import { OnboardingService } from "../service/onboarding.service";

export class OnboardingController {
  constructor(private service: OnboardingService) {}

  getStatus = async (req: any, res: Response): Promise<void> => {
    try {
      const status = await this.service.getStatus(req.user.id);
      res.status(200).json({ success: true, data: status });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  step1 = async (req: any, res: Response): Promise<void> => {
    try {
      const result = await this.service.completeStep1(req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  step2 = async (req: any, res: Response): Promise<void> => {
    try {
      const { alternate_phone, designation, employee_id } = req.body;
      const result = await this.service.completeStep2(req.user.id, {
        alternate_phone,
        designation,
        employee_id,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  step3 = async (req: any, res: Response): Promise<void> => {
    try {
      const { identity_type, identity_number, identity_document_url } = req.body;
      if (!identity_type || !identity_number) {
        res.status(400).json({ success: false, error: "identity_type and identity_number are required." });
        return;
      }
      const result = await this.service.completeStep3(req.user.id, {
        identity_type,
        identity_number,
        identity_document_url: identity_document_url || "",
      });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  step4 = async (req: any, res: Response): Promise<void> => {
    try {
      const result = await this.service.finalizeOnboarding(req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
