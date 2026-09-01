import { NotificationsRepository } from "../repository/notification.repository";
import { BroadcastService } from "../../../service/broadcast.service";

export class NotificationsService {
  constructor(private repo: NotificationsRepository) {}

  async broadcastAdministrativeAlert(
    senderId: string,
    senderRole: string,
    payload: any
  ) {
    const broadcastService = new BroadcastService((this.repo as any).supabaseAdmin);
    return await broadcastService.createBroadcast({
      sender_id: senderId,
      sender_role: senderRole,
      audience: payload.audience || "all_citizens",
      target_municipality_id: payload.target_municipality_id,
      target_department_id: payload.target_department_id,
      target_team_id: payload.target_team_id,
      target_ward_id: payload.target_ward_id,
      target_profile_id: payload.target_profile_id,
      title: payload.title,
      body: payload.body,
      is_urgent: payload.is_urgent,
      scheduled_for: payload.scheduled_for,
    });
  }

  async listInboundQueue(userId: string) {
    return await this.repo.getMyInboundNotifications(userId);
  }

  async getUnreadCount(userId: string) {
    const list = await this.repo.getMyInboundNotifications(userId);
    const unread = list.filter((n: any) => !n.is_read).length;
    return { unread_count: unread };
  }

  async acknowledgeAlertReceipt(notificationId: string, userId: string) {
    return await this.repo.markAsRead(notificationId, userId);
  }

  async acknowledgeAllAlerts(userId: string) {
    return await this.repo.markAllAsRead(userId);
  }
}
