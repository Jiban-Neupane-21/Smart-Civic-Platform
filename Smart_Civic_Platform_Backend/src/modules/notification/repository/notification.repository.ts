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
   * Fetch inbound notifications for current user via scoped criteria + notification_reads
   */
  async getMyInboundNotifications(userId: string) {
    // 1. Fetch notification_reads linked to user
    const { data: readEntries } = await this.supabaseAdmin
      .from("notification_reads")
      .select("notification_id, is_seen, read_at")
      .eq("profile_id", userId);

    const readMap = new Map<string, any>();
    (readEntries || []).forEach((r) => readMap.set(r.notification_id, r));

    // 2. Fetch user profile and role-specific context
    const { data: profile } = await this.supabaseAdmin
      .from("profiles")
      .select("id, role, municipality_id, department_id")
      .eq("id", userId)
      .maybeSingle();

    const role = profile?.role || "citizen";
    const orConditions: string[] = [`target_profile_id.eq.${userId}`, `audience.eq.everyone`];

    // Include pre-seeded notification IDs if any
    const readNotifIds = (readEntries || []).map((r) => r.notification_id).filter(Boolean);
    if (readNotifIds.length > 0) {
      orConditions.push(`id.in.(${readNotifIds.slice(0, 50).join(",")})`);
    }

    if (role === "superadmin") {
      // Superadmin sees platform-wide notifications
      orConditions.push("audience.eq.all_citizens", "audience.eq.all_staff", "type.eq.system");
    } else if (role === "citizen") {
      orConditions.push("audience.eq.all_citizens");
      // Check citizen table for ward/municipality scoping
      const { data: citizen } = await this.supabaseAdmin
        .from("citizens")
        .select("id, current_ward_id, current_municipality_id")
        .or(`id.eq.${userId},profile_id.eq.${userId}`)
        .maybeSingle();

      if (citizen?.current_municipality_id) {
        orConditions.push(`and(target_municipality_id.eq.${citizen.current_municipality_id},audience.in.(all_citizens,everyone))`);
      }
      if (citizen?.current_ward_id) {
        orConditions.push(`target_ward_id.eq.${citizen.current_ward_id}`);
      }
    } else {
      // Staff, Department Head, Municipality Head
      orConditions.push("audience.eq.all_staff");

      let municId = profile?.municipality_id;
      if (!municId && profile?.department_id) {
        const { data: dept } = await this.supabaseAdmin
          .from("departments")
          .select("municipality_id")
          .eq("id", profile.department_id)
          .maybeSingle();
        if (dept?.municipality_id) {
          municId = dept.municipality_id;
        }
      }

      if (role === "department_head") {
        if (profile?.department_id) {
          orConditions.push(`target_department_id.eq.${profile.department_id}`);
        }
        if (!municId) {
          const { data: dept } = await this.supabaseAdmin
            .from("departments")
            .select("id, municipality_id")
            .eq("head_profile_id", userId)
            .maybeSingle();
          if (dept?.municipality_id) {
            municId = dept.municipality_id;
          }
          if (dept?.id && !profile?.department_id) {
            orConditions.push(`target_department_id.eq.${dept.id}`);
          }
        }
      }

      if (municId) {
        orConditions.push(`and(target_municipality_id.eq.${municId},audience.in.(all_staff,everyone))`);
      }

      if (role === "municipality_head" && profile?.municipality_id) {
        orConditions.push(`target_municipality_id.eq.${profile.municipality_id}`);
      }

      if (role === "staff") {
        const { data: staffRec } = await this.supabaseAdmin
          .from("staff")
          .select("id, primary_department_id")
          .eq("profile_id", userId)
          .maybeSingle();

        if (staffRec?.primary_department_id) {
          orConditions.push(`target_department_id.eq.${staffRec.primary_department_id}`);
          if (!municId) {
            const { data: dept } = await this.supabaseAdmin
              .from("departments")
              .select("municipality_id")
              .eq("id", staffRec.primary_department_id)
              .maybeSingle();
            if (dept?.municipality_id) {
              orConditions.push(`and(target_municipality_id.eq.${dept.municipality_id},audience.in.(all_staff,everyone))`);
            }
          }
        }

        if (staffRec?.id) {
          const { data: teams } = await this.supabaseAdmin
            .from("team_members")
            .select("team_id")
            .eq("staff_id", staffRec.id);

          const teamIds = (teams || []).map((t: any) => t.team_id).filter(Boolean);
          if (teamIds.length > 0) {
            orConditions.push(`target_team_id.in.(${teamIds.join(",")})`);
          }
        }
      }
    }

    // 3. Fetch notifications
    const { data: notifs, error } = await this.supabaseAdmin
      .from("notifications")
      .select("*")
      .or(orConditions.join(","))
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[GET-INBOUND-NOTIFS-ERROR]", error);
      throw error;
    }

    // Deduplicate by ID
    const notifMap = new Map<string, any>();
    (notifs || []).forEach((n) => {
      notifMap.set(n.id, {
        ...n,
        is_read: !!readMap.get(n.id)?.read_at || !!readMap.get(n.id)?.is_seen,
        read_at: readMap.get(n.id)?.read_at || null,
      });
    });

    return Array.from(notifMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Mark a notification as read for user
   */
  async markAsRead(notificationId: string, userId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("notification_reads")
      .upsert(
        {
          notification_id: notificationId,
          profile_id: userId,
          is_seen: true,
          read_at: new Date().toISOString(),
        },
        { onConflict: "notification_id,profile_id" }
      )
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
    const unreadNotifs = notifs.filter((n) => !n.is_read);
    const nowIso = new Date().toISOString();

    const readRows = unreadNotifs.map((n) => ({
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
