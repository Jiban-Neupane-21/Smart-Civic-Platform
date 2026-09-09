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
      const recipientSet = new Set<string>();

      // 1. Fetch Department Head from departments table
      const { data: dept } = await this.supabaseAdmin
        .from("departments")
        .select("head_profile_id")
        .eq("id", filters.department_id)
        .maybeSingle();

      if (dept?.head_profile_id) recipientSet.add(dept.head_profile_id);

      // 2. Fetch Department Heads in profiles
      const { data: deptHeads } = await this.supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("department_id", filters.department_id)
        .eq("role", "department_head");

      (deptHeads || []).forEach((h) => recipientSet.add(h.id));

      // 3. Fetch Staff in department
      const { data: staffList } = await this.supabaseAdmin
        .from("staff")
        .select("profile_id")
        .eq("primary_department_id", filters.department_id)
        .eq("is_deleted", false);

      (staffList || []).forEach((s) => s.profile_id && recipientSet.add(s.profile_id));

      return Array.from(recipientSet);
    }

    if (audience === "all_staff" && filters.municipality_id) {
      const recipientSet = new Set<string>();

      const { data: staffList } = await this.supabaseAdmin
        .from("staff")
        .select("profile_id")
        .eq("municipality_id", filters.municipality_id)
        .eq("is_deleted", false);

      (staffList || []).forEach((s) => s.profile_id && recipientSet.add(s.profile_id));

      const { data: adminProfiles } = await this.supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("municipality_id", filters.municipality_id)
        .in("role", ["department_head", "municipality_head", "staff"]);

      (adminProfiles || []).forEach((p) => recipientSet.add(p.id));

      return Array.from(recipientSet);
    }

    if (audience === "all_citizens" && filters.municipality_id) {
      const { data: citizens } = await this.supabaseAdmin
        .from("citizens")
        .select("id")
        .or(`current_municipality_id.eq.${filters.municipality_id},permanent_municipality_id.eq.${filters.municipality_id}`);

      return (citizens || []).map((c: any) => c.id);
    }

    if (audience === "everyone" && filters.municipality_id) {
      const recipientSet = new Set<string>();

      // 1. All citizens in the municipality
      const { data: citizens } = await this.supabaseAdmin
        .from("citizens")
        .select("id")
        .or(`current_municipality_id.eq.${filters.municipality_id},permanent_municipality_id.eq.${filters.municipality_id}`);
      (citizens || []).forEach((c: any) => c.id && recipientSet.add(c.id));

      // 2. All admin profiles (dept heads, municipality head, staff) in municipality
      const { data: adminProfiles } = await this.supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("municipality_id", filters.municipality_id);
      (adminProfiles || []).forEach((p: any) => p.id && recipientSet.add(p.id));

      // 3. All staff records linked to municipality
      const { data: staffList } = await this.supabaseAdmin
        .from("staff")
        .select("profile_id")
        .eq("municipality_id", filters.municipality_id)
        .eq("is_deleted", false);
      (staffList || []).forEach((s: any) => s.profile_id && recipientSet.add(s.profile_id));

      return Array.from(recipientSet);
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

  private systemProfileId: string = "";

  /**
   * Helper to resolve a valid profile UUID for automated/system notifications
   */
  async getSystemSenderId(): Promise<string> {
    if (this.systemProfileId) return this.systemProfileId;

    const { data: superadmin } = await this.supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "superadmin")
      .limit(1)
      .maybeSingle();

    if (superadmin?.id) {
      this.systemProfileId = superadmin.id;
      return superadmin.id;
    }

    const { data: anyProfile } = await this.supabaseAdmin
      .from("profiles")
      .select("id")
      .limit(1)
      .maybeSingle();

    this.systemProfileId = anyProfile?.id || "00000000-0000-0000-0000-000000000000";
    return this.systemProfileId;
  }

  private isUuid(str?: string): boolean {
    if (!str) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
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
    const resolvedSenderId = this.isUuid(senderId) ? senderId : (this.isUuid(profileId) ? profileId : await this.getSystemSenderId());

    const { data: notification, error } = await this.supabaseAdmin
      .from("notifications")
      .insert({
        sender_id: resolvedSenderId,
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
    const resolvedSenderId = this.isUuid(senderId) ? senderId : await this.getSystemSenderId();

    const { data: notification, error } = await this.supabaseAdmin
      .from("notifications")
      .insert({
        sender_id: resolvedSenderId,
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
    const resolvedSenderId = this.isUuid(senderId) ? senderId : await this.getSystemSenderId();

    const { data: notification, error } = await this.supabaseAdmin
      .from("notifications")
      .insert({
        sender_id: resolvedSenderId,
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

  /**
   * Send notification to a municipality (Municipality Head & administration)
   */
  async notifyMunicipality(
    municipalityId: string,
    title: string,
    body: string,
    senderId = "system",
    type = "system"
  ) {
    const resolvedSenderId = this.isUuid(senderId) ? senderId : await this.getSystemSenderId();

    const { data: notification, error } = await this.supabaseAdmin
      .from("notifications")
      .insert({
        sender_id: resolvedSenderId,
        type: type as any,
        audience: "all_staff",
        target_municipality_id: municipalityId,
        title,
        body,
        channels: ["in_app"],
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[NOTIFICATION-MUNIC-ERROR]", error.message);
      return null;
    }

    const recipientIds = await this.resolveRecipients("all_staff", { municipality_id: municipalityId });
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

