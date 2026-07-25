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
    // 1. Fetch municipality details
    const { data: municipality, error: muniError } = await this.supabaseAdmin
      .from("municipalities")
      .select("m_uid, official_name")
      .eq("m_uid", municipalityId)
      .single();

    if (muniError) throw muniError;

    // 2. Fetch all complaints for this municipality
    const { data: complaints, error: compError } = await this.supabaseAdmin
      .from("complaints")
      .select("status")
      .eq("municipality_id", municipalityId);

    if (compError) throw compError;

    let pending_count = 0;
    let ongoing_count = 0;
    let resolved_count = 0;
    let rejected_count = 0;
    const total_complaints = complaints.length;

    for (const c of complaints) {
      if (c.status === "pending") pending_count++;
      else if (c.status === "in_progress" || c.status === "under_review") ongoing_count++;
      else if (c.status === "resolved" || c.status === "closed") resolved_count++;
      else if (c.status === "rejected") rejected_count++;
    }

    const dynamic_resolution_rate = total_complaints > 0 
      ? Number(((resolved_count / total_complaints) * 100).toFixed(2))
      : 0;

    return {
      municipality_id: municipality.m_uid,
      official_name: municipality.official_name,
      pending_count,
      ongoing_count,
      resolved_count,
      rejected_count,
      total_complaints,
      dynamic_resolution_rate,
    };
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

  async getDepartments(municipalityId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("departments")
      .select("*")
      .eq("municipality_id", municipalityId);

    if (error) throw error;
    return data;
  }

  async getDepartmentById(departmentId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("departments")
      .select("*")
      .eq("d_uid", departmentId)
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProfileById(profileId: string) {
    const { error } = await this.supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", profileId);

    if (error) throw error;
  }

  async deleteAuthUser(userId: string) {
    const { error } = await this.supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
  }

  async updateDepartment(departmentId: string, departmentData: any) {
    const { data, error } = await this.supabaseAdmin
      .from("departments")
      .update(departmentData)
      .eq("d_uid", departmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteDepartment(departmentId: string) {
    const { error } = await this.supabaseAdmin
      .from("departments")
      .delete()
      .eq("d_uid", departmentId);

    if (error) throw error;
  }

  async getDepartmentCategories() {
    const { data, error } = await this.supabaseAdmin.rpc("get_department_categories");
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
