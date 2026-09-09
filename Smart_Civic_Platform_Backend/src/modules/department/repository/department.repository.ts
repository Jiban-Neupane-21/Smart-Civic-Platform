import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/database.type";
import { LifecycleService } from "../../../service/lifecycle.service";

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
         gender, date_of_birth, personal_address, designation,
         kyc_status, kyc_submitted_at, kyc_verified_at, kyc_verified_by, kyc_rejection_reason,
         identity_type, identity_number, identity_front_url, identity_back_url, appointment_letter_url, photo_url,
         emergency_contact_name, emergency_contact_phone,
         employee_status, onboarded_at, is_deleted,
         profiles:profiles!profile_id(id, full_name, email, phone, role, account_status)`
      )
      .eq("primary_department_id", departmentId)
      .eq("is_deleted", false);

    if (error) throw error;
    return (data || []).filter((item: any) => {
      const role = item.profiles?.role;
      return !role || role === "staff";
    });
  }

  async reviewStaffKyc(
    staffId: string,
    departmentId: string,
    reviewerId: string,
    status: "verified" | "rejected",
    rejectionReason?: string
  ) {
    const nowIso = new Date().toISOString();
    const updates: Record<string, any> = {
      kyc_status: status,
      kyc_verified_by: reviewerId,
      kyc_verified_at: nowIso,
      updated_at: nowIso,
    };

    if (status === "rejected") {
      updates.kyc_rejection_reason = rejectionReason || "Document verification failed.";
    } else {
      updates.kyc_rejection_reason = null;
    }

    // Attempt matching on staff PK id first, then fallback to profile_id
    let { data, error } = await this.supabaseAdmin
      .from("staff")
      .update(updates)
      .eq("id", staffId)
      .eq("primary_department_id", departmentId)
      .select("id, profile_id, primary_department_id, kyc_status, kyc_verified_at, kyc_verified_by, kyc_rejection_reason, profile:profiles!profile_id(id, full_name, email)")
      .maybeSingle();

    if (!data) {
      const retry = await this.supabaseAdmin
        .from("staff")
        .update(updates)
        .eq("profile_id", staffId)
        .eq("primary_department_id", departmentId)
        .select("id, profile_id, primary_department_id, kyc_status, kyc_verified_at, kyc_verified_by, kyc_rejection_reason, profile:profiles!profile_id(id, full_name, email)")
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    if (!data) throw new Error("Staff member record not found in this department.");

    if (status === "verified" && data?.profile_id) {
      await this.supabaseAdmin
        .from("profiles")
        .update({
          identity_verified_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", data.profile_id);
    }

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
         profiles:profiles!profile_id(full_name, email, phone)`,
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
            profiles:profiles!profile_id ( full_name, email )
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
            profiles:profiles!profile_id ( full_name, email, phone )
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
        cross_dept_status, location_source, latitude, longitude, ward_number, submitted_date, sla_due_at, sla_breached,
        current_team_id,
        current_team:teams!current_team_id ( id, team_name ),
        complaint_categories!complaints_category_id_fkey ( category_name ),
        citizens ( first_name, last_name, contact_number, current_address, permanent_address, current_ward_id, permanent_ward_id ),
        municipalities!municipality_id ( id, official_name )
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
          cross_dept_status, location_source, latitude, longitude, ward_number, submitted_date, sla_due_at, sla_breached,
          current_team_id,
          current_team:teams!current_team_id ( id, team_name ),
          complaint_categories!complaints_category_id_fkey ( category_name ),
          citizens ( first_name, last_name, contact_number, current_address, permanent_address, current_ward_id, permanent_ward_id ),
          municipalities!municipality_id ( id, official_name )
        `)
        .in("co_uid", collabIds);

      if (statusFilter) suppQuery = suppQuery.eq("status", statusFilter);

      const { data: suppList } = await suppQuery;
      if (suppList) supportingData = suppList;
    }

    // Merge and deduplicate by co_uid
    const mergedMap = new Map<string, any>();
    [...(primaryData || []), ...supportingData].forEach((item) => {
      let wardNo = item.ward_number;
      if (!wardNo && item.citizens?.current_address) {
        const m = item.citizens.current_address.match(/ward\s*(\d+)/i);
        if (m) wardNo = parseInt(m[1], 10);
      }
      mergedMap.set(item.co_uid, {
        ...item,
        ward_number: wardNo,
        citizen: item.citizens,
        municipality: item.municipalities,
      });
    });

    return Array.from(mergedMap.values());
  }

  async getDepartmentComplaintDetail(departmentId: string, complaintId: string) {
    // 1. Fetch complaint with relations
    const { data: complaint, error: compErr } = await this.supabaseAdmin
      .from("complaints")
      .select(`
        co_uid, tracking_id, title, description, status, priority, severity_level, ticket_type,
        cross_dept_status, location_source, latitude, longitude, ward_number,
        submitted_date, resolution_date, resolution_note, rejection_reason,
        sla_due_at, sla_breached, current_team_id,
        current_team:teams!current_team_id ( id, team_name, description, team_type, is_active ),
        complaint_categories!complaints_category_id_fkey ( id, category_name ),
        citizens ( id, first_name, middle_name, last_name, contact_number, current_address, permanent_address, current_ward_id, permanent_ward_id, profile_picture ),
        municipalities!municipality_id ( id, official_name ),
        assigned_department:departments!assigned_department_id ( id, department_name ),
        lead_department:departments!lead_department_id ( id, department_name )
      `)
      .eq("co_uid", complaintId)
      .maybeSingle();

    if (compErr) throw compErr;
    if (!complaint) return null;

    // Fallback ward resolution if complaint.ward_number is null
    let resolvedWardNumber = complaint.ward_number;
    const citizenData: any = complaint.citizens;
    if (!resolvedWardNumber && citizenData) {
      const citizenWardId = citizenData.current_ward_id || citizenData.permanent_ward_id;
      if (citizenWardId) {
        const { data: wardRow } = await this.supabaseAdmin
          .from("wards")
          .select("ward_no")
          .eq("id", citizenWardId)
          .maybeSingle();
        if (wardRow?.ward_no) {
          resolvedWardNumber = wardRow.ward_no;
        }
      }
      if (!resolvedWardNumber && citizenData.current_address) {
        const m = citizenData.current_address.match(/ward\s*(\d+)/i);
        if (m) resolvedWardNumber = parseInt(m[1], 10);
      }
    }

    // 2. Fetch assigned team members if current_team_id exists
    let teamMembers: any[] = [];
    const currentTeam: any = complaint.current_team;
    const teamId = complaint.current_team_id || (Array.isArray(currentTeam) ? currentTeam[0]?.id : currentTeam?.id);
    if (teamId) {
      const { data: members, error: memErr } = await this.supabaseAdmin
        .from("team_members")
        .select(`
          id, staff_id, is_leader, joined_at,
          staff:staff!staff_id (
            id, employee_id, expertise, designation, contact_number,
            profile:profiles!profile_id ( id, full_name, email, phone )
          )
        `)
        .eq("team_id", teamId);

      if (!memErr && members) {
        teamMembers = members.map((m: any) => ({
          id: m.id,
          staff_id: m.staff_id,
          is_leader: m.is_leader,
          joined_at: m.joined_at,
          employee_id: m.staff?.employee_id,
          expertise: m.staff?.expertise,
          designation: m.staff?.designation,
          contact_number: m.staff?.contact_number || m.staff?.profile?.phone,
          full_name: m.staff?.profile?.full_name,
          email: m.staff?.profile?.email,
        }));
      }
    }

    // 3. Fetch media attachments
    const { data: mediaList, error: mediaErr } = await this.supabaseAdmin
      .from("media")
      .select("id, file_url, media_type, file_name, file_size_bytes, created_at")
      .eq("context", "complaint")
      .eq("context_id", complaintId);

    if (mediaErr) {
      console.warn("Could not load media attachments for complaint:", mediaErr.message);
    }

    // 4. Fetch complaint timeline history
    let timeline: any[] = [];
    try {
      const lifecycle = new LifecycleService(this.supabaseAdmin);
      timeline = await lifecycle.getTimeline(complaintId);
    } catch (tlErr: any) {
      console.warn("Could not load timeline for complaint:", tlErr.message);
    }

    return {
      ...complaint,
      ward_number: resolvedWardNumber,
      citizen: complaint.citizens,
      citizens: complaint.citizens,
      municipality: complaint.municipalities,
      municipalities: complaint.municipalities,
      category: complaint.complaint_categories,
      complaint_categories: complaint.complaint_categories,
      media: mediaList || [],
      team_members: teamMembers,
      timeline,
    };
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
    const nowIso = new Date().toISOString();

    // Check if there is an existing active assignment for this complaint
    const { data: existingAssignment } = await this.supabaseAdmin
      .from("complaint_assignments")
      .select("id, team_id, status")
      .eq("complaint_id", complaintId)
      .eq("is_current", true)
      .maybeSingle();

    if (existingAssignment) {
      // If already assigned to this exact team, update notes if provided and return existing
      if (existingAssignment.team_id === teamId) {
        if (notes) {
          await this.supabaseAdmin
            .from("complaint_assignments")
            .update({ notes, updated_at: nowIso })
            .eq("id", existingAssignment.id);
        }
        return existingAssignment;
      }

      // If assigned to a different team, archive the old assignment
      await this.supabaseAdmin
        .from("complaint_assignments")
        .update({
          is_current: false,
          status: "reassigned",
          updated_at: nowIso,
        })
        .eq("id", existingAssignment.id);
    }

    const { data, error } = await this.supabaseAdmin
      .from("complaint_assignments")
      .insert({
        complaint_id: complaintId,
        team_id: teamId,
        assigned_by: assignedBy,
        status: "pending",
        is_current: true,
        notes: notes || null,
        assigned_at: nowIso,
      })
      .select()
      .single();

    if (error) throw error;

    await this.supabaseAdmin
      .from("complaints")
      .update({
        status: "assigned",
        current_team_id: teamId,
        updated_at: nowIso,
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

  // Section: In-depth operational report & analytics aggregation
  async getDepartmentAnalytics(departmentId: string) {
    const now = new Date();

    const [deptRes, complaintsRes, teamsRes, staffRes, collabsRes] = await Promise.all([
      this.supabaseAdmin
        .from("departments")
        .select("id, department_name, department_category")
        .eq("id", departmentId)
        .single(),
      this.supabaseAdmin
        .from("complaints")
        .select(`
          co_uid, tracking_id, title, description, status, priority, severity_level,
          ward_number, submitted_date, resolution_date, sla_due_at, sla_breached,
          current_team_id,
          current_team:teams!current_team_id ( id, team_name ),
          category:complaint_categories!complaints_category_id_fkey ( category_name )
        `)
        .or(`assigned_department_id.eq.${departmentId},lead_department_id.eq.${departmentId}`)
        .order("submitted_date", { ascending: false }),
      this.supabaseAdmin
        .from("teams")
        .select("id, team_name, is_active, team_type")
        .eq("department_id", departmentId),
      this.supabaseAdmin
        .from("staff")
        .select("id", { count: "exact", head: true })
        .eq("primary_department_id", departmentId)
        .eq("is_deleted", false),
      this.supabaseAdmin
        .from("complaint_collaborations")
        .select("id, status")
        .or(`primary_dept_id.eq.${departmentId},supporting_dept_id.eq.${departmentId}`),
    ]);

    if (deptRes.error) throw deptRes.error;
    if (complaintsRes.error) throw complaintsRes.error;

    const complaints = complaintsRes.data || [];
    const teams = teamsRes.data || [];
    const totalStaff = staffRes.count || 0;
    const collaborations = collabsRes.data || [];

    // 1. Status Breakdown
    const statusCounts: Record<string, number> = {
      pending: 0,
      under_review: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
      closed: 0,
    };

    // 2. Priority Breakdown
    const priorityCounts: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      emergency: 0,
    };

    // 3. Severity Breakdown
    const severityCounts: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    // 4. Ward Map
    const wardMap = new Map<number, { ward_number: number; total: number; resolved: number; pending: number; in_progress: number }>();

    // 5. Category Map
    const categoryMap = new Map<string, { category_name: string; total: number; resolved: number }>();

    // 6. Team Map
    const teamMap = new Map<string, { id: string; team_name: string; is_active: boolean; team_type: string; total_assigned: number; resolved: number; pending: number }>();
    teams.forEach((t) => {
      teamMap.set(t.id, {
        id: t.id,
        team_name: t.team_name,
        is_active: t.is_active ?? true,
        team_type: t.team_type || "Standard",
        total_assigned: 0,
        resolved: 0,
        pending: 0,
      });
    });

    // 7. Monthly Trend Map (Last 6 Months)
    const monthlyTrendMap = new Map<string, { month: string; submitted: number; resolved: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyTrendMap.set(key, { month: key, submitted: 0, resolved: 0 });
    }

    let breachedCount = 0;
    let totalResolutionHours = 0;
    let resolvedWithDurationCount = 0;

    for (const c of complaints) {
      // Status
      if (c.status in statusCounts) {
        statusCounts[c.status] += 1;
      }

      // Priority
      const prio = (c.priority || "medium").toLowerCase();
      if (prio in priorityCounts) {
        priorityCounts[prio] += 1;
      } else {
        priorityCounts.medium += 1;
      }

      // Severity
      const sev = (c.severity_level || "medium").toLowerCase();
      if (sev in severityCounts) {
        severityCounts[sev] += 1;
      }

      // SLA Breached
      const isResolvedOrClosed = c.status === "resolved" || c.status === "closed";
      const isBreached = c.sla_breached || (c.sla_due_at && new Date(c.sla_due_at) < now && !isResolvedOrClosed);
      if (isBreached) {
        breachedCount += 1;
      }

      // Resolution Time
      if (isResolvedOrClosed && c.submitted_date && c.resolution_date) {
        const start = new Date(c.submitted_date).getTime();
        const end = new Date(c.resolution_date).getTime();
        const diffHours = (end - start) / (1000 * 60 * 60);
        if (diffHours > 0) {
          totalResolutionHours += diffHours;
          resolvedWithDurationCount += 1;
        }
      }

      // Ward
      if (c.ward_number !== null && c.ward_number !== undefined) {
        const wardNo = Number(c.ward_number);
        const curr = wardMap.get(wardNo) || { ward_number: wardNo, total: 0, resolved: 0, pending: 0, in_progress: 0 };
        curr.total += 1;
        if (isResolvedOrClosed) curr.resolved += 1;
        else if (c.status === "pending") curr.pending += 1;
        else curr.in_progress += 1;
        wardMap.set(wardNo, curr);
      }

      // Category
      const catName = (c.category as any)?.category_name || "General";
      const catCurr = categoryMap.get(catName) || { category_name: catName, total: 0, resolved: 0 };
      catCurr.total += 1;
      if (isResolvedOrClosed) catCurr.resolved += 1;
      categoryMap.set(catName, catCurr);

      // Team Workload
      if (c.current_team_id && teamMap.has(c.current_team_id)) {
        const teamObj = teamMap.get(c.current_team_id)!;
        teamObj.total_assigned += 1;
        if (isResolvedOrClosed) teamObj.resolved += 1;
        else teamObj.pending += 1;
      }

      // Monthly Trend
      if (c.submitted_date) {
        const subDate = new Date(c.submitted_date);
        const subKey = `${subDate.getFullYear()}-${String(subDate.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyTrendMap.has(subKey)) {
          monthlyTrendMap.get(subKey)!.submitted += 1;
        }
      }
      if (c.resolution_date && isResolvedOrClosed) {
        const resDate = new Date(c.resolution_date);
        const resKey = `${resDate.getFullYear()}-${String(resDate.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyTrendMap.has(resKey)) {
          monthlyTrendMap.get(resKey)!.resolved += 1;
        }
      }
    }

    const totalComplaints = complaints.length;
    const resolvedTotal = statusCounts.resolved + statusCounts.closed;
    const resolutionRate = totalComplaints > 0 ? Number(((resolvedTotal / totalComplaints) * 100).toFixed(1)) : 0;
    const slaComplianceRate = totalComplaints > 0
      ? Number((((totalComplaints - breachedCount) / totalComplaints) * 100).toFixed(1))
      : 100;

    const avgResolutionHours = resolvedWithDurationCount > 0
      ? Number((totalResolutionHours / resolvedWithDurationCount).toFixed(1))
      : 0;

    const wardBreakdown = Array.from(wardMap.values()).sort((a, b) => b.total - a.total);
    const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
    const teamWorkload = Array.from(teamMap.values()).sort((a, b) => b.total_assigned - a.total_assigned);
    const monthlyTrend = Array.from(monthlyTrendMap.values());

    return {
      department: {
        id: deptRes.data.id,
        name: deptRes.data.department_name,
        category: deptRes.data.department_category,
      },
      summary: {
        totalComplaints,
        pending: statusCounts.pending,
        under_review: statusCounts.under_review,
        in_progress: statusCounts.in_progress,
        resolved: statusCounts.resolved,
        rejected: statusCounts.rejected,
        closed: statusCounts.closed,
        activeWorkload: statusCounts.pending + statusCounts.under_review + statusCounts.in_progress,
        resolvedTotal,
        resolutionRate,
        totalStaff,
        activeTeams: teams.filter((t) => t.is_active).length,
        totalCollaborations: collaborations.length,
      },
      sla: {
        breachedCount,
        onTimeCount: Math.max(0, totalComplaints - breachedCount),
        slaComplianceRate,
        avgResolutionHours,
      },
      priorityCounts,
      severityCounts,
      wardBreakdown,
      categoryBreakdown,
      teamWorkload,
      monthlyTrend,
    };
  }

  async getNotices(municipalityId?: string, departmentId?: string, category?: string) {
    let targetMunicipalityId = municipalityId;

    if (!targetMunicipalityId && departmentId) {
      const { data: dept } = await this.supabaseAdmin
        .from("departments")
        .select("municipality_id")
        .eq("id", departmentId)
        .maybeSingle();
      if (dept?.municipality_id) {
        targetMunicipalityId = dept.municipality_id;
      }
    }

    let query = this.supabaseAdmin
      .from("notifications")
      .select("id, title, body, type, audience, target_department_id, metadata, created_at")
      .eq("type", "broadcast")
      .order("created_at", { ascending: false });

    if (targetMunicipalityId) {
      query = query.eq("target_municipality_id", targetMunicipalityId);
    }

    if (departmentId) {
      query = query.or(`target_department_id.eq.${departmentId},and(target_department_id.is.null,audience.in.(everyone,all_staff,all_citizens))`);
    } else {
      query = query.or("audience.in.(everyone,all_staff)");
    }

    const { data, error } = await query;
    if (error) {
      console.error("[DEPT-GET-NOTICES-ERROR]", error);
      throw error;
    }

    let notices = (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      category: item.metadata?.category || "General",
      audience: item.audience,
      target_department_id: item.target_department_id,
      metadata: item.metadata,
      created_at: item.created_at,
    }));

    if (category && category !== "All") {
      notices = notices.filter((n: any) => n.category?.toLowerCase() === category.toLowerCase());
    }

    return notices;
  }
}

