import { SupabaseClient } from "@supabase/supabase-js";
import { LifecycleService } from "./lifecycle.service";

export class HandoffService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Transfer complaint to another peer staff member in the department
   */
  async transferToPeer(
    complaintId: string,
    fromStaffId: string,
    toStaffId: string,
    reason: string,
    note?: string
  ) {
    // 1. Create complaint_handoffs record
    const { data: handoff, error } = await this.supabaseAdmin
      .from("complaint_handoffs")
      .insert({
        complaint_id: complaintId,
        from_staff_id: fromStaffId,
        to_staff_id: toStaffId,
        to_department_head: false,
        handoff_type: "peer_reassign",
        handoff_reason: reason,
        handoff_note: note || null,
        initiated_by: fromStaffId,
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Increment handoff_count and update current_staff_id on complaint
    const { data: complaint } = await this.supabaseAdmin
      .from("complaints")
      .select("handoff_count")
      .eq("co_uid", complaintId)
      .single();

    const currentCount = complaint?.handoff_count || 0;

    await this.supabaseAdmin
      .from("complaints")
      .update({
        current_staff_id: toStaffId,
        handoff_count: currentCount + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("co_uid", complaintId);

    // 3. Log lifecycle transition text
    const lifecycle = new LifecycleService(this.supabaseAdmin);
    await lifecycle.transition(
      complaintId,
      "assigned",
      fromStaffId,
      "staff",
      `Peer Handoff: Transferred to staff ${toStaffId}. Reason: ${reason}`
    );

    return handoff;
  }

  /**
   * Return complaint to Department Head for reassignment
   */
  async returnToDepartmentHead(
    complaintId: string,
    fromStaffId: string,
    reason: string,
    note?: string
  ) {
    const { data: handoff, error } = await this.supabaseAdmin
      .from("complaint_handoffs")
      .insert({
        complaint_id: complaintId,
        from_staff_id: fromStaffId,
        to_staff_id: null,
        to_department_head: true,
        handoff_type: "return_to_dept_head",
        handoff_reason: reason,
        handoff_note: note || null,
        initiated_by: fromStaffId,
      })
      .select()
      .single();

    if (error) throw error;

    // Clear current_staff_id on complaint and set status back to under_review or assigned
    await this.supabaseAdmin
      .from("complaints")
      .update({
        current_staff_id: null,
        status: "under_review",
        updated_at: new Date().toISOString(),
      })
      .eq("co_uid", complaintId);

    const lifecycle = new LifecycleService(this.supabaseAdmin);
    await lifecycle.transition(
      complaintId,
      "under_review",
      fromStaffId,
      "staff",
      `Returned to Department Head. Reason: ${reason}`
    );

    return handoff;
  }
}
