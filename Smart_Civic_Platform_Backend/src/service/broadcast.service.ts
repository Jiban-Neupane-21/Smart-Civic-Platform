import { SupabaseClient } from "@supabase/supabase-js";
import { NotificationService } from "./notification.service";

export class BroadcastService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Create and dispatch a broadcast notification based on sender role and audience
   */
  async createBroadcast(payload: {
    sender_id: string;
    sender_role: string;
    sender_municipality_id?: string;
    sender_department_id?: string;
    audience: "all_citizens" | "ward_citizens" | "all_staff" | "department" | "team" | "individual";
    target_municipality_id?: string;
    target_department_id?: string;
    target_team_id?: string;
    target_ward_id?: string;
    target_profile_id?: string;
    title: string;
    body: string;
    is_urgent?: boolean;
    scheduled_for?: string;
  }) {
    // 1. Enforce Role-Based Permission Matrix
    if (payload.sender_role === "department_head") {
      if (["all_citizens", "ward_citizens", "all_staff"].includes(payload.audience)) {
        throw new Error("Department Heads are restricted to broadcasting to their department, teams, or individuals.");
      }
    }

    // 2. Insert broadcast notification row
    const { data: notification, error } = await this.supabaseAdmin
      .from("notifications")
      .insert({
        sender_id: payload.sender_id,
        type: "broadcast",
        audience: payload.audience as any,
        target_municipality_id: payload.target_municipality_id || payload.sender_municipality_id || null,
        target_department_id: payload.target_department_id || payload.sender_department_id || null,
        target_team_id: payload.target_team_id || null,
        target_ward_id: payload.target_ward_id || null,
        target_profile_id: payload.target_profile_id || null,
        title: payload.title,
        body: payload.body,
        is_urgent: payload.is_urgent ?? false,
        scheduled_for: payload.scheduled_for || null,
        sent_at: payload.scheduled_for ? null : new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Expand audience and dispatch immediately if not scheduled for future
    if (!payload.scheduled_for) {
      const notifService = new NotificationService(this.supabaseAdmin);
      const recipientIds = await notifService.resolveRecipients(
        payload.audience,
        {
          municipality_id: payload.target_municipality_id || payload.sender_municipality_id,
          department_id: payload.target_department_id || payload.sender_department_id,
          team_id: payload.target_team_id,
          ward_id: payload.target_ward_id,
          profile_id: payload.target_profile_id,
        }
      );

      // Pre-seed notification_reads entries for recipient feed
      if (recipientIds.length > 0) {
        const readRows = recipientIds.map((pid) => ({
          notification_id: notification.id,
          profile_id: pid,
          is_seen: false,
          is_clicked: false,
        }));
        await this.supabaseAdmin.from("notification_reads").upsert(readRows);
      }
    }

    return notification;
  }
}
