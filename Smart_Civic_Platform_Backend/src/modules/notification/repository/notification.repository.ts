import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/database.type";

export class NotificationsRepository {
  constructor(private supabaseAdmin: SupabaseClient) {}

  // Section 19: Dispatches broadcast records targeted at specific administrative clusters
  async dispatchNotification(
    notificationPayload: any,
  ) {
    const { data, error } = await this.supabaseAdmin
      .from("announcements")
      .insert([notificationPayload])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Section 19: Reads inbound messages evaluating dynamic audience parameters (RLS mirrored)
  async getMyInboundNotifications(userId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  // Section 19: Tightened lock step update—guarantees only mutation to the read state is possible
  async markAsRead(notificationId: string, userId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("notifications")
      .update({ read_status: true })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
