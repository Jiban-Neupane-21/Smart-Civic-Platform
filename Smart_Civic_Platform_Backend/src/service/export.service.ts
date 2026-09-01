import { SupabaseClient } from "@supabase/supabase-js";

export class ExportService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Export department complaints as CSV string
   */
  async exportDepartmentComplaintsCsv(departmentId: string): Promise<string> {
    const { data: complaints, error } = await this.supabaseAdmin
      .from("complaints")
      .select(`
        tracking_id, title, description, status, priority, severity_level,
        submitted_date, resolution_date, resolution_note, sla_breached,
        complaint_categories(category_name)
      `)
      .or(`assigned_department_id.eq.${departmentId},lead_department_id.eq.${departmentId}`)
      .order("submitted_date", { ascending: false });

    if (error) throw error;

    const headers = [
      "Tracking ID",
      "Title",
      "Category",
      "Status",
      "Priority",
      "Severity",
      "Submitted Date",
      "Resolution Date",
      "SLA Breached",
      "Resolution Note",
    ];

    const rows = (complaints || []).map((c: any) => [
      `"${c.tracking_id || ""}"`,
      `"${(c.title || "").replace(/"/g, '""')}"`,
      `"${(c.complaint_categories?.category_name || "").replace(/"/g, '""')}"`,
      `"${c.status || ""}"`,
      `"${c.priority || ""}"`,
      `"${c.severity_level || ""}"`,
      `"${c.submitted_date || ""}"`,
      `"${c.resolution_date || ""}"`,
      `"${c.sla_breached ? "YES" : "NO"}"`,
      `"${(c.resolution_note || "").replace(/"/g, '""')}"`,
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
}
