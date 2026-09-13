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
      .eq("profile_id", userId)
      .limit(100);

    const readMap = new Map<string, any>();
    (readEntries || []).forEach((r) => readMap.set(r.notification_id, r));

    // 2. Fetch user profile and role-specific context
    const { data: profile } = await this.supabaseAdmin
      .from("profiles")
      .select("id, role, municipality_id, department_id")
      .eq("id", userId)
      .maybeSingle();

    const role = profile?.role || "citizen";
    let orConditions: string[] = [`target_profile_id.eq.${userId}`];

    if (role === "superadmin") {
      // Superadmin MUST NOT receive notifications about municipalities, departments, teams, complaints, citizens, or staff.
      // Superadmin ONLY receives notifications explicitly targeted to their profile_id with no municipal/complaint linkage,
      // or global platform system alerts.
      orConditions = [
        `and(target_profile_id.eq.${userId},complaint_id.is.null,target_municipality_id.is.null,target_department_id.is.null,target_team_id.is.null)`,
        `and(type.eq.system,audience.eq.everyone,target_municipality_id.is.null,target_department_id.is.null,target_team_id.is.null,complaint_id.is.null)`
      ];
    } else {
      // Include pre-seeded notification IDs if any for non-superadmin
      const readNotifIds = (readEntries || []).map((r) => r.notification_id).filter(Boolean);
      if (readNotifIds.length > 0) {
        orConditions.push(`id.in.(${readNotifIds.slice(0, 50).join(",")})`);
      }
    }

    if (role === "citizen") {
      // Strictly scoped to citizen's registered municipalities and ward
      const { data: citizen } = await this.supabaseAdmin
        .from("citizens")
        .select("id, current_ward_id, current_municipality_id, permanent_municipality_id")
        .or(`id.eq.${userId},profile_id.eq.${userId}`)
        .maybeSingle();

      const citizenMunicipalityIds = new Set<string>();
      if (citizen?.current_municipality_id) citizenMunicipalityIds.add(citizen.current_municipality_id);
      if (citizen?.permanent_municipality_id) citizenMunicipalityIds.add(citizen.permanent_municipality_id);
      if (profile?.municipality_id) citizenMunicipalityIds.add(profile.municipality_id);

      for (const mId of citizenMunicipalityIds) {
        orConditions.push(`and(target_municipality_id.eq.${mId},audience.in.(all_citizens,everyone))`);
      }

      if (citizen?.current_ward_id) {
        orConditions.push(`and(target_ward_id.eq.${citizen.current_ward_id},audience.eq.ward_citizens)`);
      }

      // Global platform announcements only
      orConditions.push(`and(target_municipality_id.is.null,audience.in.(all_citizens,everyone))`);
    } else if (role === "staff") {
      // Field staff: strictly receive direct assignments, team assignments, and municipality-level staff notices
      const { data: staffRec } = await this.supabaseAdmin
        .from("staff")
        .select("id, municipality_id, primary_department_id")
        .eq("profile_id", userId)
        .maybeSingle();

      let staffMuniId = staffRec?.municipality_id || profile?.municipality_id;
      if (!staffMuniId && staffRec?.primary_department_id) {
        const { data: dept } = await this.supabaseAdmin
          .from("departments")
          .select("municipality_id")
          .eq("id", staffRec.primary_department_id)
          .maybeSingle();
        staffMuniId = dept?.municipality_id;
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

      if (staffMuniId) {
        orConditions.push(`and(target_municipality_id.eq.${staffMuniId},audience.in.(all_staff,everyone))`);
      }
      orConditions.push(`and(target_municipality_id.is.null,audience.in.(all_staff,everyone))`);
    } else if (role === "department_head") {
      let deptId = profile?.department_id;
      let deptMuniId = profile?.municipality_id;

      const { data: dept } = await this.supabaseAdmin
        .from("departments")
        .select("id, municipality_id")
        .or(`head_profile_id.eq.${userId},id.eq.${deptId || "00000000-0000-0000-0000-000000000000"}`)
        .maybeSingle();

      if (dept) {
        deptId = dept.id;
        deptMuniId = dept.municipality_id || deptMuniId;
      }

      if (deptId) {
        orConditions.push(`target_department_id.eq.${deptId}`);
      }

      if (deptMuniId) {
        orConditions.push(`and(target_municipality_id.eq.${deptMuniId},audience.in.(all_staff,everyone))`);
      }
      orConditions.push(`and(target_municipality_id.is.null,audience.in.(all_staff,everyone))`);
    } else if (role === "municipality_head") {
      const municId = profile?.municipality_id;
      if (municId) {
        orConditions.push(`target_municipality_id.eq.${municId}`);
      }
      orConditions.push(`and(target_municipality_id.is.null,audience.in.(all_staff,everyone))`);
    } else {
      orConditions.push(`and(target_municipality_id.is.null,audience.in.(all_staff,everyone))`);
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

    // Deduplicate by ID and apply defense-in-depth role exclusions
    const notifMap = new Map<string, any>();
    (notifs || []).forEach((n) => {
      // Defense-in-depth: Superadmin must never see complaints, municipal, department, or team notices
      if (role === "superadmin") {
        if (
          n.complaint_id ||
          n.target_municipality_id ||
          n.target_department_id ||
          n.target_team_id ||
          n.target_ward_id ||
          ["all_citizens", "ward_citizens", "all_staff", "department", "team"].includes(n.audience)
        ) {
          return;
        }
      }

      notifMap.set(n.id, {
        ...n,
        priority: n.priority || (n.is_urgent ? "emergency" : "normal"),
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
