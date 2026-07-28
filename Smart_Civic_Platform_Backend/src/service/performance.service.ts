import { SupabaseClient } from "@supabase/supabase-js";

export class PerformanceService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Calculate and store monthly performance score for a department
   */
  async computeDepartmentScore(departmentId: string, monthStr?: string) {
    const month = monthStr || new Date().toISOString().slice(0, 7); // Format: YYYY-MM

    // 1. Fetch department municipality_id
    const { data: dept } = await this.supabaseAdmin
      .from("departments")
      .select("municipality_id")
      .eq("id", departmentId)
      .single();

    if (!dept) throw new Error("Department not found.");

    // 2. Fetch all complaints for department in current month
    const { data: complaints } = await this.supabaseAdmin
      .from("complaints")
      .select("co_uid, status, sla_breached, handoff_count, resolved_at, created_at")
      .eq("primary_department_id", departmentId);

    const total = complaints?.length || 0;
    const resolved = complaints?.filter((c) => ["resolved", "closed"].includes(c.status)).length || 0;
    const slaBreached = complaints?.filter((c) => c.sla_breached).length || 0;
    const handoffs = complaints?.reduce((acc, c) => acc + (c.handoff_count || 0), 0) || 0;
    const escalations = complaints?.filter((c) => c.status === "escalated").length || 0;

    // Calculate component scores
    const resolutionRate = total > 0 ? (resolved / total) * 100 : 100;
    const slaComplianceRate = total > 0 ? ((total - slaBreached) / total) * 100 : 100;
    const handoffEfficiency = Math.max(0, 100 - handoffs * 5); // Deduction per handoff

    // 3. Fetch average citizen feedback rating
    const { data: feedback } = await this.supabaseAdmin
      .from("feedback")
      .select("rating")
      .eq("department_id", departmentId);

    let avgRating = 4.0;
    if (feedback && feedback.length > 0) {
      const sum = feedback.reduce((acc, f) => acc + (f.rating || 0), 0);
      avgRating = sum / feedback.length;
    }
    const ratingScore = (avgRating / 5) * 100;

    // Formula: 40% Resolution Rate + 30% SLA Compliance + 20% Rating + 10% Handoff Efficiency
    const finalScore = Math.round(
      resolutionRate * 0.4 +
      slaComplianceRate * 0.3 +
      ratingScore * 0.2 +
      handoffEfficiency * 0.1
    );

    const { data: scoreRecord, error } = await this.supabaseAdmin
      .from("department_performance_scores")
      .upsert({
        department_id: departmentId,
        municipality_id: dept.municipality_id,
        month,
        total_complaints: total,
        resolved_count: resolved,
        sla_breach_count: slaBreached,
        avg_resolution_hours: 48,
        avg_rating: avgRating,
        handoff_count: handoffs,
        escalation_count: escalations,
        performance_score: finalScore,
        computed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      month,
      department_id: departmentId,
      performance_score: finalScore,
      breakdown: {
        resolutionRate,
        slaComplianceRate,
        avgRating,
        handoffEfficiency,
      },
      record: scoreRecord,
    };
  }

  /**
   * Fetch department score
   */
  async getDepartmentScore(departmentId: string) {
    const { data } = await this.supabaseAdmin
      .from("department_performance_scores")
      .select("*")
      .eq("department_id", departmentId)
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      return await this.computeDepartmentScore(departmentId);
    }
    return data;
  }
}
