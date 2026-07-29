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

  async checkEmailExists(email: string): Promise<boolean> {
    const { data, error } = await this.supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  }

  // Section 8: Lists all staff profiles operating under this department
  async getDepartmentStaff(departmentId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("staff")
      .select(
        `id, profile_id, employee_id, expertise, contact_number,
         gender, date_of_birth, personal_address, employee_status, onboarded_at, is_deleted,
         profiles(id, full_name, email, phone, role, account_status)`
      )
      .eq("primary_department_id", departmentId)
      .eq("is_deleted", false);

    if (error) throw error;
    return data;
  }

  // Section 22: Aggregates the department head's operational summary
  async getDepartmentSummary(departmentId: string) {
    const [
      departmentResult,
      complaintsResult,
      staffResult,
      teamsResult,
    ] = await Promise.all([
      this.supabaseAdmin
        .from("departments")
        .select("department_name, department_category")
        .eq("id", departmentId)
        .single(),
      this.supabaseAdmin
        .from("complaints")
        .select("co_uid, title, status, submitted_date, category_id", {
          count: "exact",
        })
        .eq("assigned_department_id", departmentId)
        .order("submitted_date", { ascending: false })
        .limit(5),
      this.supabaseAdmin
        .from("staff")
        .select("*", { count: "exact", head: true })
        .eq("primary_department_id", departmentId)
        .eq("is_deleted", false),
      this.supabaseAdmin
        .from("teams")
        .select("*", { count: "exact", head: true })
        .eq("department_id", departmentId)
        .eq("is_active", true),
    ]);

    if (departmentResult.error) throw departmentResult.error;
    if (complaintsResult.error) throw complaintsResult.error;
    if (staffResult.error) throw staffResult.error;
    if (teamsResult.error) throw teamsResult.error;

    return {
      department_name: departmentResult.data?.department_name ?? "Department",
      department_category: departmentResult.data?.department_category ?? null,
      complaints: complaintsResult.data ?? [],
      totalComplaints: complaintsResult.count ?? 0,
      totalStaff: staffResult.count ?? 0,
      activeTeams: teamsResult.count ?? 0,
    };
  }

  // Updates a staff member's record and linked profile, scoped by department
  async updateStaffRecord(
    staffId: string,
    departmentId: string,
    payload: {
      full_name?: string;
      email?: string;
      phone?: string;
      expertise?: string;
      contact_number?: string;
      employee_status?: string;
      gender?: string;
      date_of_birth?: string;
      personal_address?: string;
    },
  ) {
    // 1. Fetch the staff record to get the profile_id and verify department scope
    const { data: staffRecord, error: fetchError } = await this.supabaseAdmin
      .from("staff")
      .select("profile_id, primary_department_id")
      .eq("id", staffId)
      .eq("primary_department_id", departmentId)
      .single();

    if (fetchError || !staffRecord) {
      throw new Error("Staff record not found or access denied.");
    }

    // 2. Update the profile fields (full_name, email, phone)
    const profileUpdates: Record<string, string> = {};
    if (payload.full_name !== undefined) profileUpdates.full_name = payload.full_name;
    if (payload.email !== undefined) profileUpdates.email = payload.email;
    if (payload.phone !== undefined) profileUpdates.phone = payload.phone;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await this.supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", staffRecord.profile_id);

      if (profileError) throw profileError;
    }

    // 3. Update the staff-specific fields
    const staffUpdates: Record<string, string> = {};
    if (payload.expertise !== undefined) staffUpdates.expertise = payload.expertise;
    if (payload.contact_number !== undefined) staffUpdates.contact_number = payload.contact_number;
    if (payload.employee_status !== undefined) staffUpdates.employee_status = payload.employee_status;
    if (payload.gender !== undefined) staffUpdates.gender = payload.gender;
    if (payload.date_of_birth !== undefined) staffUpdates.date_of_birth = payload.date_of_birth;
    if (payload.personal_address !== undefined) staffUpdates.personal_address = payload.personal_address;

    if (Object.keys(staffUpdates).length > 0) {
      staffUpdates.updated_at = new Date().toISOString();

      const { data, error: staffError } = await this.supabaseAdmin
        .from("staff")
        .update(staffUpdates)
        .eq("id", staffId)
        .eq("primary_department_id", departmentId)
        .select()
        .single();

      if (staffError) throw staffError;
      return data;
    }

    return staffRecord;
  }

  // Updates expertise on a staff record by profile_id, scoped by department
  async updateStaffExpertiseByProfileId(
    profileId: string,
    departmentId: string,
    expertise: string,
  ) {
    const { error } = await this.supabaseAdmin
      .from("staff")
      .update({ expertise, updated_at: new Date().toISOString() })
      .eq("profile_id", profileId)
      .eq("primary_department_id", departmentId);

    if (error) throw error;
  }

  // Archives full staff+profile snapshot then deletes auth user (cascade: profiles → staff)
  async archiveAndDeleteStaff(
    staffId: string,
    departmentId: string,
    deletedBy: string,
  ) {
    // 1. Fetch full staff + profile data for archive
    const { data: staffRecord, error: fetchError } = await this.supabaseAdmin
      .from("staff")
      .select(
        `id, profile_id, employee_id, expertise, contact_number,
         gender, date_of_birth, personal_address, employee_status,
         primary_department_id, municipality_id,
         profiles(full_name, email, phone)`,
      )
      .eq("id", staffId)
      .eq("primary_department_id", departmentId)
      .single();

    if (fetchError || !staffRecord) {
      throw new Error("Staff record not found or access denied.");
    }

    const profileRows = staffRecord.profiles as { full_name: string; email: string; phone: string }[] | null;
    const profile = profileRows?.[0] ?? null;

    // 2. Archive full record to deleted_staff
    const { error: archiveError } = await this.supabaseAdmin
      .from("deleted_staff")
      .insert({
        original_staff_id: staffId,
        original_profile_id: staffRecord.profile_id,
        full_name: (profile?.full_name as string) ?? "",
        email: (profile?.email as string) ?? "",
        phone: (profile?.phone as string) ?? null,
        employee_id: staffRecord.employee_id ?? null,
        expertise: staffRecord.expertise ?? null,
        contact_number: staffRecord.contact_number ?? null,
        gender: staffRecord.gender ?? null,
        date_of_birth: staffRecord.date_of_birth ?? null,
        personal_address: staffRecord.personal_address ?? null,
        employee_status: staffRecord.employee_status ?? "active",
        primary_department_id: staffRecord.primary_department_id,
        municipality_id: staffRecord.municipality_id,
        deleted_by: deletedBy,
      });

    if (archiveError) throw archiveError;

    // 3. Delete auth user → cascades to profiles → staff via ON DELETE CASCADE
    const { error: authError } = await this.supabaseAdmin.auth.admin.deleteUser(
      staffRecord.profile_id,
    );

    if (authError) throw authError;

    return { success: true };
  }

  async updateStaffAccountStatus(staffId: string, departmentId: string, status: string) {
    const { data: staff, error: fetchErr } = await this.supabaseAdmin
      .from("staff")
      .select("profile_id")
      .eq("id", staffId)
      .eq("primary_department_id", departmentId)
      .single();

    if (fetchErr || !staff) throw new Error("Staff record not found in this department.");

    const { error } = await this.supabaseAdmin
      .from("profiles")
      .update({ account_status: status as any, updated_at: new Date().toISOString() })
      .eq("id", staff.profile_id);

    if (error) throw error;
  }

  async resetStaffPassword(staffId: string, departmentId: string, newPassword: string) {
    const { data: staff, error: fetchErr } = await this.supabaseAdmin
      .from("staff")
      .select("profile_id")
      .eq("id", staffId)
      .eq("primary_department_id", departmentId)
      .single();

    if (fetchErr || !staff) throw new Error("Staff record not found in this department.");

    const { error: authErr } = await this.supabaseAdmin.auth.admin.updateUserById(staff.profile_id, {
      password: newPassword,
    });
    if (authErr) throw authErr;

    await this.supabaseAdmin
      .from("profiles")
      .update({ force_password_reset: true, updated_at: new Date().toISOString() })
      .eq("id", staff.profile_id);
  }

  // Resolves the parent municipality_id for a given department
  async getDepartmentMunicipalityId(departmentId: string): Promise<string> {
    const { data, error } = await this.supabaseAdmin
      .from("departments")
      .select("municipality_id")
      .eq("id", departmentId)
      .single();

    if (error || !data) throw new Error("Department not found");
    return data.municipality_id;
  }

  // Fetches category and name for a department
  async getDepartmentCategoryAndName(departmentId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("departments")
      .select("department_name, department_category")
      .eq("id", departmentId)
      .single();

    if (error || !data) throw new Error("Department not found");
    return data;
  }

  // ─── Team Management ─────────────────────────────────────────────────────────

  // List all teams in a department with full member details and time-bound metadata
  async getDepartmentTeams(departmentId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("teams")
      .select(`
        *,
        team_members (
          staff_id, is_leader, joined_at,
          staff (
            id, employee_id, expertise,
            profiles ( full_name, email )
          )
        )
      `)
      .eq("department_id", departmentId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const now = new Date();
    return (data || []).map((t: any) => {
      let daysRemaining: number | null = null;
      let isExpired = false;

      if (t.end_date) {
        const endDate = new Date(t.end_date);
        const diffMs = endDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        isExpired = diffMs <= 0;
      }

      return {
        ...t,
        days_remaining: daysRemaining,
        is_expired: isExpired,
        member_count: t.team_members?.length || 0,
      };
    });
  }

  // Get a single team by team_name (unique per department)
  async getTeamByName(teamName: string, departmentId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("teams")
      .select(`
        *,
        team_members (
          staff_id, is_leader, joined_at,
          staff (
            id, employee_id, expertise,
            profiles ( full_name, email, phone )
          )
        )
      `)
      .eq("team_name", teamName)
      .eq("department_id", departmentId)
      .single();

    if (error) throw error;
    return data;
  }

  // Update team fields by team_name
  async updateTeam(
    teamName: string,
    departmentId: string,
    payload: { team_name?: string; description?: string; is_active?: boolean },
  ) {
    const { data, error } = await this.supabaseAdmin
      .from("teams")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("team_name", teamName)
      .eq("department_id", departmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Safely extracts the primary key UUID from a team record
  extractTeamPk(team: any): string {
    if (!team) return "";
    if (typeof team === "string") return team;
    if (team.id) return team.id;
    if (team.team_id) return team.team_id;
    if (team.t_uid) return team.t_uid;

    const cols = Object.keys(team);
    const uuidCols = cols.filter(
      (c) =>
        !["department_id", "created_at", "updated_at", "team_name", "description"].includes(c) &&
        typeof (team as Record<string, unknown>)[c] === "string" &&
        ((team as Record<string, unknown>)[c] as string).includes("-"),
    );
    if (uuidCols.length > 0) return (team as Record<string, unknown>)[uuidCols[0]] as string;
    return "";
  }

  // Resolve a team's actual PK value by team_name or UUID
  async resolveTeamPk(
    teamIdentifier: string,
    departmentId: string,
  ): Promise<string> {
    if (!teamIdentifier) throw new Error("Team identifier is required.");

    // If already a valid UUID (36 chars with hyphens), return directly
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(teamIdentifier)) {
      return teamIdentifier;
    }

    // Get any team_member row for this team — team_id holds the actual PK value
    const { data: member, error: mErr } = await this.supabaseAdmin
      .from("team_members")
      .select("team_id, teams!inner(team_name, department_id)")
      .eq("teams.team_name", teamIdentifier)
      .eq("teams.department_id", departmentId)
      .limit(1)
      .maybeSingle();

    if (!mErr && member) {
      return (member as Record<string, unknown>).team_id as string;
    }

    // Fallback: get team by team_name and resolve PK column
    const { data: team } = await this.supabaseAdmin
      .from("teams")
      .select("*")
      .eq("team_name", teamIdentifier)
      .eq("department_id", departmentId)
      .single();

    if (!team) throw new Error("Team not found.");

    const pk = this.extractTeamPk(team);
    if (pk) return pk;

    throw new Error("Cannot resolve team primary key for team: " + teamIdentifier);
  }

  // Remove a staff member from a team
  async removeTeamMember(
    teamName: string,
    staffId: string,
    departmentId: string,
  ) {
    const teamPk = await this.resolveTeamPk(teamName, departmentId);

    const { error } = await this.supabaseAdmin
      .from("team_members")
      .delete()
      .eq("team_id", teamPk)
      .eq("staff_id", staffId);

    if (error) throw error;
  }

  // Toggle leader status (ensures only one leader per team)
  async toggleTeamLeader(
    teamName: string,
    staffId: string,
    departmentId: string,
    isLeader: boolean,
  ) {
    const teamPk = await this.resolveTeamPk(teamName, departmentId);

    if (isLeader) {
      await this.supabaseAdmin
        .from("team_members")
        .update({ is_leader: false })
        .eq("team_id", teamPk)
        .eq("is_leader", true);
    }

    const { error } = await this.supabaseAdmin
      .from("team_members")
      .update({ is_leader: isLeader })
      .eq("team_id", teamPk)
      .eq("staff_id", staffId);

    if (error) throw error;
  }

  // ===== MULTI-DEPARTMENT QUEUE & COLLABORATION METHODS =====

  async getDepartmentComplaintsQueue(departmentId: string, statusFilter?: string) {
    // 1. Primary assigned / lead complaints
    let query = this.supabaseAdmin
      .from("complaints")
      .select(`
        co_uid, tracking_id, title, description, status, priority, severity_level,
        cross_dept_status, location_source, ward_number, submitted_date, sla_due_at, sla_breached,
        complaint_categories!complaints_category_id_fkey ( category_name ),
        citizens ( first_name, last_name, contact_number )
      `)
      .or(`assigned_department_id.eq.${departmentId},lead_department_id.eq.${departmentId}`);

    if (statusFilter) query = query.eq("status", statusFilter);

    const { data: primaryData, error: primaryErr } = await query.order("submitted_date", { ascending: false });
    if (primaryErr) throw primaryErr;

    // 2. Supporting department complaints via collaborations
    const { data: collabs } = await this.supabaseAdmin
      .from("complaint_collaborations")
      .select("complaint_id")
      .eq("supporting_dept_id", departmentId)
      .eq("status", "active");

    let supportingData: any[] = [];
    if (collabs && collabs.length > 0) {
      const collabIds = collabs.map((c) => c.complaint_id);
      let suppQuery = this.supabaseAdmin
        .from("complaints")
        .select(`
          co_uid, tracking_id, title, description, status, priority, severity_level,
          cross_dept_status, location_source, ward_number, submitted_date, sla_due_at, sla_breached,
          complaint_categories!complaints_category_id_fkey ( category_name ),
          citizens ( first_name, last_name, contact_number )
        `)
        .in("co_uid", collabIds);

      if (statusFilter) suppQuery = suppQuery.eq("status", statusFilter);

      const { data: suppList } = await suppQuery;
      if (suppList) supportingData = suppList;
    }

    // Merge and deduplicate by co_uid
    const mergedMap = new Map<string, any>();
    [...(primaryData || []), ...supportingData].forEach((item) => mergedMap.set(item.co_uid, item));

    return Array.from(mergedMap.values());
  }

  async getCollaborationRequests(departmentId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("complaint_collaborations")
      .select(`
        id, complaint_id, initiation_method, inspection_note,
        primary_sign_off, supporting_sign_off, status, created_at,
        complaint:complaints!complaint_id(co_uid, tracking_id, title, status, severity_level),
        primary_department:departments!primary_dept_id(department_name),
        supporting_department:departments!supporting_dept_id(department_name)
      `)
      .or(`primary_dept_id.eq.${departmentId},supporting_dept_id.eq.${departmentId}`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ===== COMPLAINT-TEAM ASSIGNMENT METHODS =====

  async assignComplaintToTeam(
    complaintId: string,
    teamId: string,
    assignedBy: string,
    notes?: string
  ) {
    await this.supabaseAdmin
      .from("complaint_assignments")
      .update({ is_current: false })
      .eq("complaint_id", complaintId);

    const { data, error } = await this.supabaseAdmin
      .from("complaint_assignments")
      .insert({
        complaint_id: complaintId,
        team_id: teamId,
        assigned_by: assignedBy,
        status: "pending",
        is_current: true,
        notes: notes || null,
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await this.supabaseAdmin
      .from("complaints")
      .update({
        status: "assigned",
        current_team_id: teamId,
        updated_at: new Date().toISOString(),
      })
      .eq("co_uid", complaintId);

    return data;
  }

  async getTeamComplaints(teamId: string) {
    const { data, error } = await this.supabaseAdmin
      .from("complaint_assignments")
      .select(`
        id, status, notes, assigned_at,
        complaint:complaints!complaint_id(co_uid, tracking_id, title, description, status, priority, severity_level, sla_due_at)
      `)
      .eq("team_id", teamId)
      .eq("is_current", true);

    if (error) throw error;
    return data || [];
  }
}
