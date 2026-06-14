import { SupabaseClient } from "@supabase/supabase-js";
import type {
  ComplaintStatus,
  Database,
  DepartmentInsert,
  StaffInsert,
} from "../../../types/database.type";

export class MunicipalityRepository {
  constructor(private supabaseAdmin: SupabaseClient) {}

  // Section 22: Extracts localized real-time dashboard analytics from the view
  async getLocalComplaintStats(municipalityId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("v_municipality_complaint_stats")
      .select("*")
      .eq("municipality_id", municipalityId)
      .single();

    if (error) throw error;
    return data;
  }

  // Section 7: Provisions a functional department within this municipality
  async createDepartment(departmentData: DepartmentInsert) {
    const { data, error } = await this.supabaseAdmin
      .from("departments")
      .insert([departmentData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Section 8: Enrolls a new staff member linked to a targeted department
  async onboardStaff(staffData: StaffInsert) {
    const { data, error } = await this.supabaseAdmin
      .from("staff")
      .insert([staffData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Section 16: Fetches all complaints submitted to this specific jurisdiction
  async getRegionalComplaints(
    municipalityId: string,
    status?: ComplaintStatus,
  ) {
    let query = this.supabaseAdmin
      .from("complaints")
      .select(
        "co_uid, title, status, submitted_date, assigned_department_id, category_id",
      )
      .eq("municipality_id", municipalityId);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("submitted_date", {
      ascending: false,
    });
    if (error) throw error;
    return data;
  }
}
