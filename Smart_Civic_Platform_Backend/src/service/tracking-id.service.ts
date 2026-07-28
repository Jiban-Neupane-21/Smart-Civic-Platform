import { SupabaseClient } from "@supabase/supabase-js";

export class TrackingIdService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Generate standardized ticket tracking ID
   * Format: {MUNI_CODE}-WARD{WARD_NO}-{CAT_CODE}-{YEAR}-{SEQ}
   * Example: KTM-WARD4-SWM-2026-000001
   */
  async generateTrackingId(
    municipalityId: string,
    wardNumber: number | null | undefined,
    categoryId: string | null | undefined
  ): Promise<string> {
    const year = new Date().getFullYear();

    // 1. Fetch municipality details (or fallback prefix)
    let muniCode = "MUNI";
    if (municipalityId) {
      const { data: muni } = await this.supabaseAdmin
        .from("municipalities")
        .select("official_name")
        .eq("id", municipalityId)
        .maybeSingle();

      if (muni?.official_name) {
        // Extract 3-letter initials or code from official name
        muniCode = muni.official_name
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 4);
      }
    }

    // 2. Fetch category code (or fallback)
    let catCode = "GEN";
    if (categoryId) {
      const { data: cat } = await this.supabaseAdmin
        .from("complaint_categories")
        .select("department_category, category_name")
        .eq("id", categoryId)
        .maybeSingle();

      if (cat?.department_category) {
        catCode = cat.department_category.slice(0, 3).toUpperCase();
      } else if (cat?.category_name) {
        catCode = cat.category_name.slice(0, 3).toUpperCase();
      }
    }

    const wardStr = wardNumber ? `WARD${wardNumber}` : "GENERAL";

    // 3. Calculate sequential ticket number for current year
    const { count } = await this.supabaseAdmin
      .from("complaints")
      .select("co_uid", { count: "exact", head: true });

    const sequence = String((count || 0) + 1).padStart(6, "0");

    return `${muniCode}-${wardStr}-${catCode}-${year}-${sequence}`;
  }
}
