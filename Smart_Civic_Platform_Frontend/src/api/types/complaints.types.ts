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
