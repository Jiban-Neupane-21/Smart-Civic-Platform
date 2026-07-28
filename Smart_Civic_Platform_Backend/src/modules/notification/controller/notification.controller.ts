import { Response } from "express";
import { NotificationsService } from "../service/notification.service";

export class NotificationsController {
  constructor(private service: NotificationsService) {}

  sendAlert = async (req: any, res: Response): Promise<void> => {
    try {
      const { title, body } = req.body;
      if (!title || !body) {
        res.status(400).json({
          success: false,
          error: "title and body are required fields.",
        });
        return;
      }
      const alert = await this.service.broadcastAdministrativeAlert(
        req.user.id,
        req.user.role || "staff",
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

  getUnreadCount = async (req: any, res: Response): Promise<void> => {
    try {
      const result = await this.service.getUnreadCount(req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  readAlert = async (req: any, res: Response): Promise<void> => {
    try {
      const notificationId = req.params.notificationId || req.params.id;
      const readRecord = await this.service.acknowledgeAlertReceipt(
        notificationId,
        req.user.id,
      );
      res.status(200).json({ success: true, data: readRecord });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  readAllAlerts = async (req: any, res: Response): Promise<void> => {
    try {
      const result = await this.service.acknowledgeAllAlerts(req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
