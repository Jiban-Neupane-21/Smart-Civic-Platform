import { SupabaseClient } from "@supabase/supabase-js";
import { LifecycleService } from "./lifecycle.service";
import { NotificationService } from "./notification.service";

export class SlaMonitorService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Calculate SLA due date timestamp based on severity level
   */
  calculateSlaDueDate(severity: string): string {
    const now = new Date();
    let hours = 72; // default medium

    if (severity === "urgent" || severity === "high") {
      hours = 24;
    } else if (severity === "low") {
      hours = 120;
    }

    return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
  }

  /**
   * Process Level 1 Warnings (24h in ASSIGNED without progress) and Level 2 Escalations (48h overdue)
   */
  async checkAndFlagBreaches(): Promise<{ warningCount: number; escalationCount: number }> {
    const nowIso = new Date().toISOString();
    const lifecycle = new LifecycleService(this.supabaseAdmin);
    const notifService = new NotificationService(this.supabaseAdmin);

    let warningCount = 0;
    let escalationCount = 0;

    // 1. Level 1 Warnings: Assigned complaints where sla_level = 0 and past due date warning threshold
    const { data: level1Complaints } = await this.supabaseAdmin
      .from("complaints")
      .select("co_uid, tracking_id, title, assigned_department_id, current_staff_id, sla_level")
      .eq("status", "assigned")
      .eq("sla_level", 0)
      .lt("sla_due_at", nowIso);

    if (level1Complaints && level1Complaints.length > 0) {
      for (const c of level1Complaints) {
        await this.supabaseAdmin
          .from("complaints")
          .update({ sla_level: 1, updated_at: nowIso })
          .eq("co_uid", c.co_uid);

        await this.supabaseAdmin.from("sla_events").insert({
          complaint_id: c.co_uid,
          sla_level: 1,
          triggered_at: nowIso,
          status_at_time: "assigned",
          notified_staff: true,
          notified_dept_head: true,
          notified_munic_head: false,
        });

        if (c.assigned_department_id) {
          await notifService.notifyDepartment(
            c.assigned_department_id,
            `SLA Level 1 Warning — ${c.tracking_id}`,
            `Complaint '${c.title}' has crossed the initial SLA threshold without progress.`,
            "system",
            "sla_warning"
          );
        }

        warningCount++;
      }
    }

    // 2. Level 2 Escalations: Overdue complaints where sla_level < 2 and status not in resolved/closed/rejected
    const { data: level2Complaints } = await this.supabaseAdmin
      .from("complaints")
      .select("co_uid, tracking_id, title, municipality_id, assigned_department_id, sla_level, status")
      .not("status", "in", "('resolved','closed','rejected','escalated')")
      .lt("sla_due_at", nowIso);

    if (level2Complaints && level2Complaints.length > 0) {
      for (const c of level2Complaints) {
        await this.supabaseAdmin
          .from("complaints")
          .update({
            sla_level: 2,
            sla_breached: true,
            sla_breached_at: nowIso,
            escalated_to_munic_head: true,
            escalated_at: nowIso,
            updated_at: nowIso,
          })
          .eq("co_uid", c.co_uid);

        await this.supabaseAdmin.from("sla_events").insert({
          complaint_id: c.co_uid,
          sla_level: 2,
          triggered_at: nowIso,
          status_at_time: c.status as any,
          notified_staff: true,
          notified_dept_head: true,
          notified_munic_head: true,
        });

        await lifecycle.transition(
          c.co_uid,
          "escalated",
          "system",
          "system",
          "Automatic Level 2 SLA Escalation to Municipality Head."
        );

        escalationCount++;
      }
    }

    return { warningCount, escalationCount };
  }
}
