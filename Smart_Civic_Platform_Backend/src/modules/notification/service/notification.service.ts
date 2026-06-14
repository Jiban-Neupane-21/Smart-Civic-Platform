import { NotificationsRepository } from "../repository/notification.repository";
import type { Database } from "../../../types/database.type";

export class NotificationsService {
  constructor(private repo: NotificationsRepository) {}

  async broadcastAdministrativeAlert(
    senderId: string,
    alertData: Omit<
      Database["public"]["Tables"]["notifications"]["Insert"],
      "sender_profile_id"
    >,
  ) {
    return await this.repo.dispatchNotification({
      ...alertData,
      sender_profile_id: senderId,
    });
  }

  async listInboundQueue(userId: string) {
    return await this.repo.getMyInboundNotifications(userId);
  }

  async acknowledgeAlertReceipt(notificationId: string, userId: string) {
    return await this.repo.markAsRead(notificationId, userId);
  }
}
