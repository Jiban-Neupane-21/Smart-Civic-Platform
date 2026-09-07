export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  municipalityId: string;
  headId?: string;
  headName?: string;
  headEmail?: string;
  staffCount?: number;
  activeComplaintsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentDto {
  name: string;
  code?: string;
  description?: string;
  municipalityId?: string;
  headId?: string;
}

export interface UpdateDepartmentDto {
  name?: string;
  code?: string;
  description?: string;
  headId?: string;
}

// Queue item returned by GET /api/department/queue
export interface DeptQueueComplaint {
  co_uid: string;
  tracking_id: string;
  title: string;
  description?: string;
  status: string; // "pending" | "assigned" | "under_review" | "in_progress" | "resolved" | "rejected" | "closed" | "escalated" | "reopened" | "cross_dept_pending"
  priority?: string;
  severity_level: "low" | "medium" | "high" | "urgent";
  cross_dept_status: "none" | "pending_collaboration" | "in_collaboration" | "joint_signoff";
  location_source?: string;
  ward_number?: number;
  latitude?: number | null;
  longitude?: number | null;
  submitted_date: string;
  sla_due_at?: string | null;
  sla_breached?: boolean;
  complaint_categories: { category_name: string } | null;
  citizens: { first_name: string; last_name: string; contact_number: string; current_address?: string; permanent_address?: string } | null;
  citizen?: { first_name: string; last_name: string; contact_number: string; current_address?: string; permanent_address?: string } | null;
  municipalities?: { id: string; official_name: string } | null;
  municipality?: { id: string; official_name: string } | null;
}

// Status update payload
export interface UpdateComplaintStateDto {
  action: "in_progress" | "resolved" | "rejected" | "closed" | "under_review";
  resolution_note?: string;
  rejection_reason?: string;
}

// Collaboration request payload
export interface RequestCollaborationDto {
  supporting_department_id: string;
  inspection_note?: string;
}

// Sign-off payload
export interface SubmitSignOffDto {
  decision: "approved" | "rejected";
  note?: string;
}

// Collaboration item
export interface DeptCollaboration {
  id: string;
  complaint_id: string;
  primary_dept_id: string;
  supporting_dept_id: string;
  initiated_by: string;
  initiation_method: "citizen_tagging" | "staff_escalation";
  inspection_note?: string;
  primary_sign_off: boolean;
  supporting_sign_off: boolean;
  status: "active" | "completed" | "cancelled";
  created_at: string;
}

// Team Member Profile
export interface TeamMemberProfile {
  full_name: string;
  email: string;
  phone?: string;
}

// Team Member Staff Info
export interface TeamMemberStaff {
  s_uid: string;
  employee_id: string | null;
  expertise: string | null;
  profiles: TeamMemberProfile | null;
}

// Team Member
export interface TeamMember {
  staff_id: string;
  is_leader: boolean;
  joined_at: string;
  staff: TeamMemberStaff | null;
}

// Team
export interface Team {
  team_name: string;
  description: string | null;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  team_type?: string;
  created_at: string;
  updated_at: string;
  team_members: TeamMember[];
}

// Create Team DTO
export interface CreateTeamDto {
  team_name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  member_staff_ids?: string[];
  leader_staff_id?: string;
}

// Complaint Assignment to Team
export interface TeamComplaintAssignment {
  id: string;
  complaint_id: string;
  team_id: string;
  assigned_by: string;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  assigned_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  complaint?: {
    tracking_id: string;
    title: string;
    status: string;
    severity_level: string;
    submitted_date: string;
    sla_due_at?: string;
    sla_breached?: boolean;
    complaint_categories: { category_name: string } | null;
  };
}

export interface DeptComplaintMedia {
  id: string;
  file_url: string;
  media_type: string;
  file_name: string;
  file_size_bytes?: number | null;
  created_at?: string;
}

export interface DeptComplaintTeamMember {
  id: string;
  staff_id: string;
  is_leader: boolean;
  joined_at?: string;
  employee_id?: string;
  expertise?: string;
  designation?: string;
  contact_number?: string;
  full_name?: string;
  email?: string;
}

export interface DeptComplaintDetail extends DeptQueueComplaint {
  latitude?: number | null;
  longitude?: number | null;
  rejection_reason?: string | null;
  resolution_note?: string | null;
  resolution_date?: string | null;
  ticket_type?: string;
  media?: DeptComplaintMedia[];
  team_members?: DeptComplaintTeamMember[];
  current_team?: {
    id: string;
    team_name: string;
    description?: string;
    team_type?: string;
    is_active?: boolean;
  } | null;
  category?: {
    id: string;
    category_name: string;
  } | null;
  citizen?: {
    id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    contact_number: string;
    current_address?: string;
    permanent_address?: string;
    profile_picture?: string;
  } | null;
  municipality?: {
    id: string;
    name?: string;
    official_name?: string;
  } | null;
  municipalities?: {
    id: string;
    official_name?: string;
  } | null;
  assigned_department?: {
    id: string;
    department_name: string;
  } | null;
  lead_department?: {
    id: string;
    department_name: string;
  } | null;
}
