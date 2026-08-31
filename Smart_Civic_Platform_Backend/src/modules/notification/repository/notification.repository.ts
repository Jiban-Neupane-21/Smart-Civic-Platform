import { SupabaseClient } from "@supabase/supabase-js";

export class NotificationsRepository {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Dispatch notification record
   */
  async dispatchNotification(notificationPayload: any) {
    const { data, error } = await this.supabaseAdmin
      .from("notifications")
      .insert([notificationPayload])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Fetch inbound notifications for current user via notification_reads or target_profile_id / global audience
   */
  async getMyInboundNotifications(userId: string) {
    // 1. Fetch notification_reads linked to user
    const { data: readEntries } = await this.supabaseAdmin
      .from("notification_reads")
      .select("notification_id, is_seen, read_at")
      .eq("profile_id", userId);

    const readMap = new Map<string, any>();
    (readEntries || []).forEach((r) => readMap.set(r.notification_id, r));

    // 2. Fetch notifications targeted at user or global audience
    const { data: notifs, error } = await this.supabaseAdmin
      .from("notifications")
      .select("*")
      .or(`target_profile_id.eq.${userId},audience.eq.all_citizens,audience.eq.all_staff`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return (notifs || []).map((n) => ({
      ...n,
      is_read: !!readMap.get(n.id)?.read_at,
      read_at: readMap.get(n.id)?.read_at || null,
    }));
  }

  /**
   * Mark a notification as read for user
   */
  async markAsRead(notificationId: string, userId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("notification_reads")
      .upsert({
        notification_id: notificationId,
        profile_id: userId,
        is_seen: true,
        read_at: new Date().toISOString(),
      }, { onConflict: "notification_id,profile_id" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string) {
    const notifs = await this.getMyInboundNotifications(userId);
    const nowIso = new Date().toISOString();

    const readRows = notifs.map((n) => ({
      notification_id: n.id,
      profile_id: userId,
      is_seen: true,
      read_at: nowIso,
    }));

    if (readRows.length > 0) {
      const { error } = await this.supabaseAdmin
        .from("notification_reads")
        .upsert(readRows, { onConflict: "notification_id,profile_id" });
      if (error) throw error;
    }

    return { success: true, count: readRows.length };
  }
}
