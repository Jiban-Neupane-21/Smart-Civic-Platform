import { SupabaseClient } from "@supabase/supabase-js";
import { SmsService } from "./sms.service";

export class NotificationService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Resolve target profile IDs based on audience scope and filters
   */
  async resolveRecipients(
    audience: string,
    filters: {
      municipality_id?: string;
      department_id?: string;
      team_id?: string;
      ward_id?: string;
      profile_id?: string;
    }
  ): Promise<string[]> {
    if (audience === "individual" && filters.profile_id) {
      return [filters.profile_id];
    }

    if (audience === "team" && filters.team_id) {
      const { data: members } = await this.supabaseAdmin
        .from("team_members")
        .select("staff(profile_id)")
        .eq("team_id", filters.team_id);

      return (members || [])
        .map((m: any) => m.staff?.profile_id)
        .filter(Boolean);
    }

    if (audience === "department" && filters.department_id) {
      const { data: staffList } = await this.supabaseAdmin
        .from("staff")
        .select("profile_id")
        .eq("primary_department_id", filters.department_id)
        .eq("is_deleted", false);

      return (staffList || []).map((s: any) => s.profile_id).filter(Boolean);
    }

    if (audience === "all_staff" && filters.municipality_id) {
      const { data: staffList } = await this.supabaseAdmin
        .from("staff")
        .select("profile_id")
        .eq("municipality_id", filters.municipality_id)
        .eq("is_deleted", false);

      return (staffList || []).map((s: any) => s.profile_id).filter(Boolean);
    }

    if (audience === "all_citizens" && filters.municipality_id) {
      const { data: citizens } = await this.supabaseAdmin
        .from("citizens")
        .select("id")
        .or(`current_municipality_id.eq.${filters.municipality_id},permanent_municipality_id.eq.${filters.municipality_id}`);

      return (citizens || []).map((c: any) => c.id);
    }

    if (audience === "ward_citizens" && filters.ward_id) {
      const { data: citizens } = await this.supabaseAdmin
        .from("citizens")
        .select("id")
        .or(`current_ward_id.eq.${filters.ward_id},permanent_ward_id.eq.${filters.ward_id},ward_id.eq.${filters.ward_id}`);

      return (citizens || []).map((c: any) => c.id);
    }

    return [];
  }

  /**
   * Send notification to a single profile (In-App + SMS)
   */
  async notifyProfile(
    profileId: string,
    title: string,
    body: string,
    senderId = "system",
    type = "system"
  ) {
    const { data: notification, error } = await this.supabaseAdmin
      .from("notifications")
      .insert({
        sender_id: senderId === "system" ? profileId : senderId,
        type: type as any,
        audience: "individual",
        target_profile_id: profileId,
        title,
        body,
        channels: ["in_app"],
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[NOTIFICATION-ERROR]", error.message);
      return null;
    }

    // Insert into notification_reads
    await this.supabaseAdmin.from("notification_reads").upsert({
      notification_id: notification.id,
      profile_id: profileId,
      is_seen: false,
      is_clicked: false,
    });

    // Check profile phone for SMS dispatch
    try {
      const { data: profile } = await this.supabaseAdmin
        .from("profiles")
        .select("phone")
        .eq("id", profileId)
        .maybeSingle();

      if (profile?.phone) {
        await SmsService.sendSMS(profile.phone, `${title}: ${body}`);
      }
    } catch (smsErr: any) {
      console.warn("[NOTIFICATION-SMS-WARN]", smsErr.message);
    }

    return notification;
  }

  /**
   * Send notification to a department
   */
  async notifyDepartment(
    departmentId: string,
    title: string,
    body: string,
    senderId = "system",
    type = "system"
  ) {
    const { data: notification, error } = await this.supabaseAdmin
      .from("notifications")
      .insert({
        sender_id: senderId,
        type: type as any,
        audience: "department",
        target_department_id: departmentId,
        title,
        body,
        channels: ["in_app"],
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[NOTIFICATION-DEPT-ERROR]", error.message);
      return null;
    }

    // Resolve staff recipients and pre-seed notification_reads
    const recipientIds = await this.resolveRecipients("department", { department_id: departmentId });
    if (recipientIds.length > 0) {
      const readRows = recipientIds.map((pid) => ({
        notification_id: notification.id,
        profile_id: pid,
        is_seen: false,
        is_clicked: false,
      }));
      await this.supabaseAdmin.from("notification_reads").upsert(readRows);
    }

    return notification;
  }

  /**
   * Send notification to all staff members of an operational team
   */
  async notifyTeam(
    teamId: string,
    title: string,
    body: string,
    senderId = "system",
    type = "team_assignment"
  ) {
    const { data: notification, error } = await this.supabaseAdmin
      .from("notifications")
      .insert({
        sender_id: senderId,
        type: type as any,
        audience: "team",
        target_team_id: teamId,
        title,
        body,
        channels: ["in_app"],
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[NOTIFICATION-TEAM-ERROR]", error.message);
      return null;
    }

    const recipientIds = await this.resolveRecipients("team", { team_id: teamId });
    if (recipientIds.length > 0) {
      const readRows = recipientIds.map((pid) => ({
        notification_id: notification.id,
        profile_id: pid,
        is_seen: false,
        is_clicked: false,
      }));
      await this.supabaseAdmin.from("notification_reads").upsert(readRows);
    }

    return notification;
  }
}

