import { SupabaseClient } from '@supabase/supabase-js';

export class StaffRepository {
  constructor(private supabaseAdmin: SupabaseClient) {}

  // Section 8: Maps the user's base authorization ID to their exact staff identifier record
  async resolveStaffProfile(userId: string) {
    const { data, error } = await this.supabaseAdmin
      .from('staff')
      .select('id, municipality_id, primary_department_id, employee_id')
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
        id,
        is_leader,
        joined_at,
        teams (
          id,
          team_name,
          is_active
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
      .select('id, title, description, status, submitted_date')
      .eq('assigned_department_id', departmentId)
      .order('submitted_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Get full staff profile for self-service
  async getStaffProfile(userId: string) {
    const { data, error } = await this.supabaseAdmin
      .from('staff')
      .select(`
        id, employee_id, expertise, contact_number, gender, date_of_birth, personal_address, onboarded_at,
        profile:profiles!profile_id(id, full_name, email, phone, role, account_status, created_at),
        department:departments!primary_department_id(id, department_name, department_category),
        municipality:municipalities!municipality_id(id, official_name)
      `)
      .eq('profile_id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  // Update staff profile (limited self-service fields: phone, personal_address)
  async updateStaffProfile(userId: string, payload: { phone?: string; personal_address?: string }) {
    if (payload.phone !== undefined) {
      const { error: profileErr } = await this.supabaseAdmin
        .from('profiles')
        .update({ phone: payload.phone, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (profileErr) throw profileErr;
    }

    if (payload.personal_address !== undefined) {
      const { error: staffErr } = await this.supabaseAdmin
        .from('staff')
        .update({ personal_address: payload.personal_address, updated_at: new Date().toISOString() })
        .eq('profile_id', userId);

      if (staffErr) throw staffErr;
    }

    return await this.getStaffProfile(userId);
  }

  // Get staff department details
  async getStaffDepartment(departmentId: string) {
    const { data, error } = await this.supabaseAdmin
      .from('departments')
      .select('id, department_name, department_category, head_name, head_email, official_email')
      .eq('id', departmentId)
      .single();

    if (error) throw error;
    return data;
  }

  // ===== SCHEDULE & ACKNOWLEDGMENT METHODS =====

  async getStaffSchedule(staffId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("staff_assignments")
      .select(`
        id, start_date, end_date, released_at, release_reason, is_emergency_override, override_reason, created_at,
        team:teams!team_id(id, team_name, description, team_type, is_active)
      `)
      .eq("staff_id", staffId)
      .order("start_date", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async acknowledgeAssignment(staffId: string, teamMemberId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("team_members")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", teamMemberId)
      .eq("staff_id", staffId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateComplaintAssignmentStatus(
    assignmentId: string,
    status: "accepted" | "in_progress" | "completed"
  ) {
    const nowIso = new Date().toISOString();
    const updates: Record<string, any> = {
      status,
      updated_at: nowIso,
    };

    if (status === "accepted") {
      updates.accepted_at = nowIso;
    } else if (status === "in_progress") {
      updates.started_at = nowIso;
    } else if (status === "completed") {
      updates.completed_at = nowIso;
    }

    const { data, error } = await this.supabaseAdmin
      .from("complaint_assignments")
      .update(updates)
      .eq("id", assignmentId)
      .select("*, complaint:complaints!complaint_id(co_uid, status)")
      .single();

    if (error) throw error;
    return data;
  }

  // ===== KYC METHODS =====

  async getStaffKyc(userId: string) {
    const { data, error } = await this.supabaseAdmin
      .from('staff')
      .select(`
        *,
        profile:profiles!profile_id(id, full_name, email, phone, role, account_status, identity_verified_at, identity_document_url),
        department:departments!primary_department_id(id, department_name, department_category),
        municipality:municipalities!municipality_id(id, official_name)
      `)
      .eq('profile_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async submitStaffKyc(userId: string, payload: any) {
    const nowIso = new Date().toISOString();
    const staffUpdates: any = {
      kyc_status: 'pending',
      kyc_submitted_at: nowIso,
      updated_at: nowIso,
      contact_number: payload.contact_number || payload.phone,
      gender: payload.gender || null,
      date_of_birth: payload.date_of_birth || null,
      personal_address: payload.personal_address || payload.current_address || null,
      designation: payload.designation || null,
      expertise: payload.expertise || null,
      emergency_contact_name: payload.emergency_contact_name || null,
      emergency_contact_phone: payload.emergency_contact_phone || null,
      identity_type: payload.identity_type || null,
      identity_number: payload.identity_number || null,
      identity_front_url: payload.identity_front_url || null,
      identity_back_url: payload.identity_back_url || null,
      appointment_letter_url: payload.appointment_letter_url || null,
      photo_url: payload.photo_url || null,
    };

    if (payload.employee_id) {
      staffUpdates.employee_id = payload.employee_id;
    }

    const { data, error } = await this.supabaseAdmin
      .from('staff')
      .update(staffUpdates)
      .eq('profile_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Sync profiles table contact and identity document details
    const profileUpdates: any = { updated_at: nowIso };
    if (payload.full_name) profileUpdates.full_name = payload.full_name;
    if (payload.phone || payload.contact_number) profileUpdates.phone = payload.phone || payload.contact_number;
    if (payload.identity_type) profileUpdates.identity_type = payload.identity_type;
    if (payload.identity_number) profileUpdates.identity_number = payload.identity_number;
    if (payload.identity_front_url) profileUpdates.identity_document_url = payload.identity_front_url;

    await this.supabaseAdmin
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId);

    return await this.getStaffKyc(userId);
  }
}