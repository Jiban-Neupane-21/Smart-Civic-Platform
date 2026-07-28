import { SupabaseClient } from "@supabase/supabase-js";

export interface RoutedDepartments {
  lead_department_id: string;
  supporting_department_id: string | null;
  cross_dept_status: "none" | "pending_collaboration" | "in_collaboration";
}

export class RoutingEngineService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Route primary and secondary categories to target departments in municipality
   */
  async routeComplaint(
    municipalityId: string,
    primaryCategoryId: string,
    secondaryCategoryId?: string | null
  ): Promise<RoutedDepartments> {
    // 1. Resolve primary department from category
    const leadDeptId = await this.resolveDepartmentFromCategory(municipalityId, primaryCategoryId);

    let supportingDeptId: string | null = null;
    let crossDeptStatus: "none" | "pending_collaboration" | "in_collaboration" = "none";

    // 2. Resolve secondary department if passed (Method A: citizen tagging)
    if (secondaryCategoryId && secondaryCategoryId !== primaryCategoryId) {
      try {
        const secondaryDeptId = await this.resolveDepartmentFromCategory(municipalityId, secondaryCategoryId);
        if (secondaryDeptId && secondaryDeptId !== leadDeptId) {
          supportingDeptId = secondaryDeptId;
          crossDeptStatus = "in_collaboration";
        }
      } catch (err) {
        console.warn("[ROUTING-ENGINE] Secondary category routing skipped:", err);
      }
    }

    return {
      lead_department_id: leadDeptId,
      supporting_department_id: supportingDeptId,
      cross_dept_status: crossDeptStatus,
    };
  }

  /**
   * Helper: Match category -> department_category or explicit department_id -> department row
   */
  private async resolveDepartmentFromCategory(
    municipalityId: string,
    categoryId: string
  ): Promise<string> {
    // Check category record
    const { data: category, error: catErr } = await this.supabaseAdmin
      .from("complaint_categories")
      .select("id, category_name, department_category, department_id")
      .eq("id", categoryId)
      .single();

    if (catErr || !category) {
      throw new Error(`Category record '${categoryId}' not found.`);
    }

    // A. Direct department_id check
    if (category.department_id) {
      const { data: directDept } = await this.supabaseAdmin
        .from("departments")
        .select("id")
        .eq("id", category.department_id)
        .eq("municipality_id", municipalityId)
        .maybeSingle();

      if (directDept) return directDept.id;
    }

    // B. Match via department_category enum
    if (category.department_category) {
      const { data: matchedDept } = await this.supabaseAdmin
        .from("departments")
        .select("id")
        .eq("municipality_id", municipalityId)
        .eq("department_category", category.department_category)
        .maybeSingle();

      if (matchedDept) return matchedDept.id;
    }

    // C. Fallback: Find General Administration or any default department in this municipality
    const { data: fallbackDept } = await this.supabaseAdmin
      .from("departments")
      .select("id")
      .eq("municipality_id", municipalityId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fallbackDept) return fallbackDept.id;

    throw new Error("No active department found in municipality to process this complaint category.");
  }
}
