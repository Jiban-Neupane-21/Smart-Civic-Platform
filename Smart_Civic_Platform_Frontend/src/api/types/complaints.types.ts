export type ComplaintStatus = 
  | 'pending' 
  | 'under_review' 
  | 'in_progress' 
  | 'resolved' 
  | 'rejected' 
  | 'escalated';

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ComplaintComment {
  id: string;
  complaintId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  location?: string;
  wardNumber?: number;
  municipalityId: string;
  departmentId?: string;
  citizenId: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  attachments?: string[];
  comments?: ComplaintComment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateComplaintDto {
  title: string;
  description: string;
  category: string;
  priority?: ComplaintPriority;
  location?: string;
  wardNumber?: number;
  departmentId?: string;
  municipalityId?: string;
  attachments?: string[];
}

export interface UpdateComplaintStatusDto {
  status: ComplaintStatus;
  comment?: string;
}

export interface AssignStaffDto {
  staffId: string;
  note?: string;
}

export interface ComplaintFilterQuery {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  departmentId?: string;
  wardNumber?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ComplaintResponse {
  co_uid: string;
  tracking_id: string;
  title: string;
  description: string;
  status: string;
  severity_level: string;
  location_source: string;
  ward_number: number;
  latitude: number | null;
  longitude: number | null;
  cross_dept_status: string | null;
  submitted_date: string;
  resolution_date: string | null;
  resolution_note: string | null;
  rejection_reason: string | null;
  sla_due_at: string | null;
  sla_breached: boolean;
  complaint_categories?: { category_name: string };
  departments?: { department_name: string };
}

export interface ComplaintUpdate {
  id: string;
  note: string;
  is_internal: boolean;
  created_at: string;
  author: { full_name: string; role: string };
}

export interface ComplaintHistoryEntry {
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface SubmitComplaintPayload {
  location: {
    source: 'registered_address' | 'gps' | 'manual';
    ward_id?: string;
    latitude?: number;
    longitude?: number;
    municipality_id?: string;
  };
  category: {
    primary_category_id: string;
    secondary_category_id?: string;
  };
  details: {
    title: string;
    description: string;
    severity_level: 'low' | 'medium' | 'high';
  };
  step_completed: number;
}

export interface ComplaintCategory {
  id: string;
  category_name: string;
  department_category?: string;
  department_id?: string;
}

export interface ComplaintHistoryResponse {
  co_uid: string;
  tracking_id: string;
  title: string;
  status: string;
  severity_level: string;
  submitted_date: string;
  resolution_date: string | null;
  resolution_note: string | null;
  complaint_categories: { category_name: string } | null;
  departments: { department_name: string } | null;
}
