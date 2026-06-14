import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/database.type";

export class DepartmentRepository {
  constructor(private supabaseAdmin: SupabaseClient) {}

  // Section 16 & 18: Creates a tactical team assigned to a specific grievance
  async createTeam(teamData: Database["public"]["Tables"]["teams"]["Insert"]) {
    const { data, error } = await this.supabaseAdmin
      .from("teams")
      .insert([teamData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Section 18: Links a staff member to a targeted operational squad
  async addTeamMember(
    memberData: Database["public"]["Tables"]["team_members"]["Insert"],
  ) {
    const { data, error } = await this.supabaseAdmin
      .from("team_members")
      .insert([memberData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Section 16: Updates the lifecycle state and notes of an assigned complaint
  async updateComplaintStatus(
    complaintId: string,
    departmentId: string,
    updatePayload: {
      status: Exclude<
        Database["public"]["Enums"]["complaint_status"],
        "pending"
      >;
      resolution_note?: string;
      rejection_reason?: string;
      resolution_date?: string | null;
    },
  ) {
    const { data, error } = await this.supabaseAdmin
      .from("complaints")
      .update(updatePayload)
      .eq("co_uid", complaintId)
      .eq("assigned_department_id", departmentId) // Structural safety filter
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Section 8: Lists all staff profiles operating under this department
  async getDepartmentStaff(departmentId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("staff")
      .select("s_uid, employee_id, expertise, profiles(full_name, email)")
      .eq("primary_department_id", departmentId);

    if (error) throw error;
    return data;
  }

  // Resolves the parent municipality_id for a given department
  async getDepartmentMunicipalityId(departmentId: string): Promise<string> {
    const { data, error } = await this.supabaseAdmin
      .from("departments")
      .select("municipality_id")
      .eq("d_uid", departmentId)
      .single();

    if (error || !data) throw new Error("Department not found");
    return data.municipality_id;
  }
}
