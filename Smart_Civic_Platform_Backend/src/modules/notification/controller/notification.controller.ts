import { Response } from "express";
import { NotificationsService } from "../service/notification.service";

export class NotificationsController {
  constructor(private service: NotificationsService) {}

  sendAlert = async (req: any, res: Response): Promise<void> => {
    try {
      const { audience_type, title, body } = req.body;
      if (!audience_type || !title || !body) {
        res
          .status(400)
          .json({
            success: false,
            error: "Audience vector configuration criteria incomplete.",
          });
        return;
      }
      const alert = await this.service.broadcastAdministrativeAlert(
        req.user.id,
        req.body,
      );
      res.status(201).json({ success: true, data: alert });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  fetchMyAlerts = async (req: any, res: Response): Promise<void> => {
    try {
      const alerts = await this.service.listInboundQueue(req.user.id);
      res.status(200).json({ success: true, data: alerts });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  readAlert = async (req: any, res: Response): Promise<void> => {
    try {
      const { notificationId } = req.params;
      const readRecord = await this.service.acknowledgeAlertReceipt(
        notificationId,
        req.user.id,
      );
      res.status(200).json({ success: true, data: readRecord });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
