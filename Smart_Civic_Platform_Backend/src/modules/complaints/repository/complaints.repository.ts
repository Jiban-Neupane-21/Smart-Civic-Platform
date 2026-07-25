import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/database.type";

export class ComplaintsRepository {
  constructor(private supabaseAdmin: SupabaseClient) {}

  // Section 16: Registers a localized grievance into the platform instance
  async submitComplaint(
    complaintData: Database["public"]["Tables"]["complaints"]["Insert"],
  ) {
    const { data, error } = await this.supabaseAdmin
      .from("complaints")
      .insert([complaintData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Section 16: Implements citizen self-read access isolation bounded by RLS structures
  async getCitizenComplaints(citizenId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("complaints")
      .select(
        `
        co_uid, title, description, status, submitted_date,
        assigned_department_id, resolution_note, rejection_reason
      `,
      )
      .eq("citizen_id", citizenId)
      .order("submitted_date", { ascending: false });

    if (error) throw error;
    return data;
  }

  // Section 15: Exposes valid categories for input filtering choices
  async getActiveCategories() {
    const { data, error } = await this.supabaseAdmin
      .from("complaint_categories")
      .select("id, category_name, department_category");

    if (error) throw error;
    return data;
  }
}
