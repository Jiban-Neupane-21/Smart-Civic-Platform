import { SupabaseClient } from "@supabase/supabase-js";
import type { ComplaintStatus } from "../types/database.type";
import { NotificationService } from "./notification.service";

export class LifecycleService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Validate state machine rules based on current status, target status, and actor role
   */
  validateTransition(
    currentStatus: ComplaintStatus,
    targetStatus: ComplaintStatus,
    actorRole: string
  ): boolean {
    const validTransitions: Record<ComplaintStatus, ComplaintStatus[]> = {
      pending: ["assigned", "rejected", "under_review", "cross_dept_pending"],
      assigned: ["in_progress", "rejected", "under_review", "escalated", "cross_dept_pending"],
      in_progress: ["resolved", "rejected", "under_review", "escalated", "cross_dept_pending"],
      under_review: ["assigned", "in_progress", "rejected", "cross_dept_pending"],
      cross_dept_pending: ["assigned", "in_progress", "resolved", "rejected"],
      resolved: ["closed", "reopened"],
      rejected: [],
      closed: [],
      reopened: ["assigned", "in_progress", "under_review"],
      escalated: ["assigned", "in_progress", "resolved", "rejected"],
    };

    const allowed = validTransitions[currentStatus] || [];
    return allowed.includes(targetStatus);
  }

  /**
   * Get citizen-friendly message for a status update
   */
  getCitizenFriendlyMessage(status: ComplaintStatus, note?: string): string {
    const messages: Record<ComplaintStatus, string> = {
      pending: "Grievance submitted and pending department triage.",
      assigned: "Grievance assigned to operational field team / officer.",
      in_progress: "Field work is actively underway.",
      under_review: "Grievance is undergoing technical / supervisor review.",
      cross_dept_pending: "Cross-departmental collaboration in progress.",
      resolved: "Resolution work completed. Awaiting citizen confirmation.",
      rejected: `Grievance rejected. ${note ? `Reason: ${note}` : ""}`,
      closed: "Grievance closed and finalized.",
      reopened: `Grievance reopened by citizen. ${note ? `Feedback: ${note}` : ""}`,
      escalated: "SLA warning triggered — escalated to Municipality Head for administrative intervention.",
    };

    return messages[status] || `Status updated to ${status}.`;
  }

  /**
   * Execute state transition with audit logging (complaint_updates) and side effects
   */
  async transition(
    complaintId: string,
    targetStatus: ComplaintStatus,
    actorId: string,
    actorRole = "system",
    note?: string
  ) {
    // 1. Fetch current complaint status
    const { data: complaint, error: fetchErr } = await this.supabaseAdmin
      .from("complaints")
      .select("co_uid, tracking_id, status, citizen_id, primary_department_id, municipality_id, title")
      .eq("co_uid", complaintId)
      .single();

    if (fetchErr || !complaint) throw new Error("Grievance ticket not found.");

    const currentStatus = complaint.status as ComplaintStatus;

    // 2. Validate transition (system bypasses role check)
    if (actorRole !== "system" && !this.validateTransition(currentStatus, targetStatus, actorRole)) {
      throw new Error(`Invalid transition from '${currentStatus}' to '${targetStatus}'.`);
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      status: targetStatus,
      updated_at: nowIso,
    };

    if (targetStatus === "resolved") {
      updatePayload.resolved_at = nowIso;
    } else if (targetStatus === "closed") {
      updatePayload.closed_at = nowIso;
    } else if (targetStatus === "escalated") {
      updatePayload.escalated_to_munic_head = true;
      updatePayload.escalated_at = nowIso;
    }

    // 3. Update complaints table
    const { data: updatedComplaint, error: updateErr } = await this.supabaseAdmin
      .from("complaints")
      .update(updatePayload)
      .eq("co_uid", complaintId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 4. Log to complaint_updates audit table
    await this.supabaseAdmin.from("complaint_updates").insert({
      complaint_id: complaintId,
      updated_by: actorId,
      old_status: currentStatus,
      new_status: targetStatus,
      update_text: note || this.getCitizenFriendlyMessage(targetStatus, note),
      created_at: nowIso,
    });

    // 5. Trigger notifications based on transition
    const notifService = new NotificationService(this.supabaseAdmin);

    if (targetStatus === "resolved" && complaint.citizen_id) {
      await notifService.notifyProfile(
        complaint.citizen_id,
        `Grievance Resolved — ${complaint.tracking_id}`,
        `Your complaint '${complaint.title}' has been marked resolved. Please confirm resolution.`,
        actorId,
        "complaint_update"
      );
    } else if (targetStatus === "escalated" && complaint.municipality_id) {
      await notifService.notifyDepartment(
        complaint.primary_department_id,
        `SLA ESCALATION — ${complaint.tracking_id}`,
        `Complaint '${complaint.title}' has breached SLA and been escalated to Municipality Head.`,
        actorId,
        "sla_escalation"
      );
    }

    return updatedComplaint;
  }

  /**
   * Get complaint status timeline history
   */
  async getTimeline(complaintId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("complaint_updates")
      .select(`
        id, old_status, new_status, update_text, created_at, updated_by,
        updater:profiles!updated_by(full_name, role)
      `)
      .eq("complaint_id", complaintId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      from_status: item.old_status,
      to_status: item.new_status,
      message: item.update_text,
      timestamp: item.created_at,
      updated_by_name: item.updater?.full_name || "System",
      updated_by_role: item.updater?.role || "system",
    }));
  }
}
