import { SupabaseClient } from "@supabase/supabase-js";

export class CollaborationService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Method A: Create collaboration on complaint submission (citizen tagging)
   */
  async createCollaborationOnSubmission(
    complaintId: string,
    primaryDeptId: string,
    supportingDeptId: string,
    initiatedBy: string
  ) {
    const { data, error } = await this.supabaseAdmin
      .from("complaint_collaborations")
      .insert({
        complaint_id: complaintId,
        primary_dept_id: primaryDeptId,
        supporting_dept_id: supportingDeptId,
        initiated_by: initiatedBy,
        initiation_method: "citizen_tagging",
        primary_sign_off: false,
        supporting_sign_off: false,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Method B: Request collaboration post-inspection (staff escalation)
   */
  async requestStaffEscalation(
    complaintId: string,
    primaryDeptId: string,
    supportingDeptId: string,
    initiatedBy: string,
    inspectionNote?: string
  ) {
    // 1. Create collaboration row
    const { data, error } = await this.supabaseAdmin
      .from("complaint_collaborations")
      .insert({
        complaint_id: complaintId,
        primary_dept_id: primaryDeptId,
        supporting_dept_id: supportingDeptId,
        initiated_by: initiatedBy,
        initiation_method: "staff_escalation",
        inspection_note: inspectionNote || null,
        primary_sign_off: false,
        supporting_sign_off: false,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Update complaint cross_dept_status
    await this.supabaseAdmin
      .from("complaints")
      .update({
        cross_dept_status: "in_collaboration",
        status: "cross_dept_pending",
        secondary_category_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("co_uid", complaintId);

    return data;
  }

  /**
   * Record sign-off decision by primary or supporting department head
   */
  async recordSignOff(
    complaintId: string,
    departmentId: string,
    signedBy: string,
    roleAtTime: string,
    decision: "approved" | "rejected",
    note?: string
  ) {
    // 1. Add audit sign-off row
    const { error: signOffErr } = await this.supabaseAdmin
      .from("complaint_sign_offs")
      .insert({
        complaint_id: complaintId,
        department_id: departmentId,
        signed_by: signedBy,
        role_at_time: roleAtTime as any,
        decision,
        note: note || null,
      });

    if (signOffErr) throw signOffErr;

    // 2. Find active collaboration
    const { data: collab } = await this.supabaseAdmin
      .from("complaint_collaborations")
      .select("*")
      .eq("complaint_id", complaintId)
      .eq("status", "active")
      .maybeSingle();

    if (!collab) return { completed: false, status: decision };

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (departmentId === collab.primary_dept_id) {
      updates.primary_sign_off = decision === "approved";
      updates.primary_signed_at = new Date().toISOString();
    } else if (departmentId === collab.supporting_dept_id) {
      updates.supporting_sign_off = decision === "approved";
      updates.supporting_signed_at = new Date().toISOString();
    }

    // Check if both signed off
    const isPrimarySigned = departmentId === collab.primary_dept_id ? decision === "approved" : collab.primary_sign_off;
    const isSupportingSigned = departmentId === collab.supporting_dept_id ? decision === "approved" : collab.supporting_sign_off;

    if (isPrimarySigned && isSupportingSigned) {
      updates.status = "completed";

      await this.supabaseAdmin
        .from("complaint_collaborations")
        .update(updates)
        .eq("id", collab.id);

      // Transition complaint to RESOLVED
      await this.supabaseAdmin
        .from("complaints")
        .update({
          status: "resolved",
          cross_dept_status: "joint_signoff",
          resolution_date: new Date().toISOString(),
          resolution_note: note || "Joint multi-department resolution approved.",
          updated_at: new Date().toISOString(),
        })
        .eq("co_uid", complaintId);

      return { completed: true, status: "resolved" };
    }

    await this.supabaseAdmin
      .from("complaint_collaborations")
      .update(updates)
      .eq("id", collab.id);

    return { completed: false, status: "pending_other_dept" };
  }
}
