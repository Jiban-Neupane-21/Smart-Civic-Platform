import { SupabaseClient } from '@supabase/supabase-js';

export class StaffRepository {
  constructor(private supabaseAdmin: SupabaseClient) {}

  // Section 8: Maps the user's base authorization ID to their exact staff identifier record
  async resolveStaffProfile(userId: string) {
    const { data, error } = await this.supabaseAdmin
      .from('staff')
      .select('s_uid, municipality_id, primary_department_id, employee_id')
      .eq('profile_id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  // Section 18: Fetches all operational teams this specific employee has joined
  async getMyAssignedTeams(staffId: string) {
    const { data, error } = await this.supabaseAdmin
      .from('team_members')
      .select(`
        tm_id,
        is_leader,
        joined_at,
        teams (
          team_id,
          team_name,
          is_active,
          complaints (
            co_uid,
            title,
            description,
            status,
            attachment_url
          )
        )
      `)
      .eq('staff_id', staffId);

    if (error) throw error;
    return data;
  }

  // Section 16 & 22: Returns complaints specifically assigned to this employee's department
  async getDepartmentComplaintsLog(departmentId: string) {
    const { data, error } = await this.supabaseAdmin
      .from('complaints')
      .select('co_uid, title, description, status, submitted_date')
      .eq('assigned_department_id', departmentId)
      .order('submitted_date', { ascending: false });

    if (error) throw error;
    return data;
  }
}