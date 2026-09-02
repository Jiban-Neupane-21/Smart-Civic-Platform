import { SupabaseClient } from '@supabase/supabase-js';
import { LifecycleService } from '../../../service/lifecycle.service';

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
    identifier: string,
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

    // 1. Try updating by assignment primary key (id)
    const { data: byIdData } = await this.supabaseAdmin
      .from("complaint_assignments")
      .update(updates)
      .eq("id", identifier)
      .select("*, complaint:complaints!complaint_id(co_uid, status)")
      .maybeSingle();

    if (byIdData) return byIdData;

    // 2. Fallback: try updating by complaint_id (co_uid) where is_current = true
    const { data: byComplaintData, error: compErr } = await this.supabaseAdmin
      .from("complaint_assignments")
      .update(updates)
      .eq("complaint_id", identifier)
      .eq("is_current", true)
      .select("*, complaint:complaints!complaint_id(co_uid, status)")
      .single();

    if (compErr) throw compErr;
    return byComplaintData;
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

  // Get all active complaints assigned to the staff member's teams or directly to staff
  async getMyAssignedComplaints(staffId: string): Promise<any[]> {
    // 1. Find all teams this staff is a member of
    const { data: memberRows, error: memberErr } = await this.supabaseAdmin
      .from('team_members')
      .select('team_id, is_leader, teams!team_id ( id, team_name, team_type, is_active )')
      .eq('staff_id', staffId);

    if (memberErr) throw memberErr;

    const teamIds = (memberRows || []).map((m: any) => m.team_id);
    const leaderMap = new Map<string, boolean>();
    (memberRows || []).forEach((m: any) => leaderMap.set(m.team_id, !!m.is_leader));

    // 2. Fetch complaint assignments for these teams OR directly assigned to this staff
    let query = this.supabaseAdmin
      .from('complaint_assignments')
      .select(`
        id,
        complaint_id,
        team_id,
        staff_id,
        status,
        notes,
        assigned_at,
        accepted_at,
        started_at,
        completed_at,
        is_current,
        team:teams!team_id ( id, team_name, team_type ),
        complaint:complaints!complaint_id (
          co_uid,
          tracking_id,
          title,
          description,
          status,
          priority,
          severity_level,
          ward_number,
          location_source,
          latitude,
          longitude,
          submitted_date,
          resolution_note,
          category:complaint_categories!category_id ( id, category_name ),
          department:departments!assigned_department_id ( id, department_name )
        )
      `)
      .eq('is_current', true);

    if (teamIds.length > 0) {
      query = query.or(`team_id.in.(${teamIds.join(',')}),staff_id.eq.${staffId}`);
    } else {
      query = query.eq('staff_id', staffId);
    }

    const { data: assignments, error: assignErr } = await query.order('assigned_at', { ascending: false });

    if (assignErr) throw assignErr;
    if (!assignments) return [];

    return assignments.map((item: any) => {
      const comp = item.complaint || {};
      const fallbackAddress = comp.ward_number
        ? `Ward ${comp.ward_number}`
        : comp.location_source === "registered_address"
        ? "Citizen Registered Address"
        : comp.location_source || "Field Location";

      return {
        assignment_id: item.id,
        complaint_id: comp.co_uid || item.complaint_id,
        tracking_id: comp.tracking_id || (comp.co_uid ? comp.co_uid.slice(0, 8) : item.id.slice(0, 8)),
        title: comp.title || "Field Grievance Task",
        description: comp.description || "",
        status: comp.status || item.status || "assigned",
        assignment_status: item.status,
        priority: comp.priority || comp.severity_level || "medium",
        severity_level: comp.severity_level || "medium",
        ward_number: comp.ward_number,
        location_source: comp.location_source,
        latitude: comp.latitude,
        longitude: comp.longitude,
        address: fallbackAddress,
        submitted_date: comp.submitted_date || item.assigned_at,
        resolution_note: comp.resolution_note || null,
        category_name: comp.category?.category_name || "General",
        department_name: comp.department?.department_name || "Assigned Department",
        team_name: item.team?.team_name || "Assigned Team",
        team_id: item.team_id,
        is_leader: leaderMap.get(item.team_id) || false,
        assigned_at: item.assigned_at,
        accepted_at: item.accepted_at,
        started_at: item.started_at,
        completed_at: item.completed_at,
      };
    });
  }

  // Get full complaint details for field staff
  async getComplaintDetail(identifier: string): Promise<any> {
    const complaintSelect = `
      co_uid, tracking_id, title, description, status, priority, severity_level,
      ticket_type, ward_number, location_source, latitude, longitude, submitted_date, resolution_date, resolution_note,
      citizen:citizens!citizen_id(
        id, first_name, last_name, contact_number,
        profile:profiles!citizens_id_fkey(id, full_name, email, phone)
      ),
      category:complaint_categories!category_id(id, category_name),
      department:departments!assigned_department_id(id, department_name),
      current_team:teams!current_team_id(id, team_name, is_active)
    `;

    // 1. Direct query by complaint co_uid or tracking_id
    const { data: comp } = await this.supabaseAdmin
      .from('complaints')
      .select(complaintSelect)
      .or(`co_uid.eq.${identifier},tracking_id.eq.${identifier}`)
      .maybeSingle();

    let resolvedComplaint: any = comp;
    let assignmentId: string | null = null;
    let teamId: string | null = null;

    // 2. If not found, check if identifier is a complaint_assignment id
    if (!resolvedComplaint) {
      const { data: assignData } = await this.supabaseAdmin
        .from('complaint_assignments')
        .select(`
          id, team_id, complaint_id,
          complaint:complaints!complaint_id (
            ${complaintSelect}
          )
        `)
        .eq('id', identifier)
        .maybeSingle();

      if (assignData?.complaint) {
        resolvedComplaint = assignData.complaint;
        assignmentId = assignData.id;
        teamId = assignData.team_id;
      }
    }

    // 3. If still not found, check if identifier is a staff_assignment shift id
    if (!resolvedComplaint) {
      const { data: shiftData } = await this.supabaseAdmin
        .from('staff_assignments')
        .select('team_id')
        .eq('id', identifier)
        .maybeSingle();

      if (shiftData?.team_id) {
        const { data: activeAssign } = await this.supabaseAdmin
          .from('complaint_assignments')
          .select('id, complaint_id')
          .eq('team_id', shiftData.team_id)
          .eq('is_current', true)
          .maybeSingle();

        if (activeAssign?.complaint_id) {
          return await this.getComplaintDetail(activeAssign.complaint_id);
        }
      }
    }

    if (!resolvedComplaint) return null;

    // If assignmentId not resolved yet, fetch current complaint_assignment for this ticket
    if (!assignmentId) {
      const { data: activeAssign } = await this.supabaseAdmin
        .from('complaint_assignments')
        .select('id, team_id')
        .eq('complaint_id', resolvedComplaint.co_uid)
        .eq('is_current', true)
        .maybeSingle();

      if (activeAssign) {
        assignmentId = activeAssign.id;
        teamId = activeAssign.team_id;
      }
    }

    const citizenInfo = resolvedComplaint.citizen?.profile || {};
    const citizenName = citizenInfo.full_name || [resolvedComplaint.citizen?.first_name, resolvedComplaint.citizen?.last_name].filter(Boolean).join(" ") || "Citizen";
    const citizenPhone = citizenInfo.phone || resolvedComplaint.citizen?.contact_number || "";

    const fallbackAddress = resolvedComplaint.ward_number
      ? `Ward ${resolvedComplaint.ward_number}`
      : resolvedComplaint.location_source === "registered_address"
      ? "Citizen Registered Address"
      : resolvedComplaint.location_source || "Field Location";

    return {
      ...resolvedComplaint,
      address: fallbackAddress,
      citizen_name: citizenName,
      citizen_phone: citizenPhone,
      assignment_id: assignmentId,
      team_id: teamId,
    };
  }

  async getComplaintTimeline(identifier: string): Promise<any[]> {
    // Resolve co_uid if an assignment ID was passed
    const comp = await this.getComplaintDetail(identifier);
    const targetId = comp?.co_uid || identifier;
    const lifecycle = new LifecycleService(this.supabaseAdmin);
    return await lifecycle.getTimeline(targetId);
  }
}