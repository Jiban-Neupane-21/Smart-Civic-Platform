import { supabaseAdmin } from "../config/supabase";
// ── Dashboard — all complaints in municipality ───────────────
export const getDashboard = async (municipalityId: string, filters: {
  status?: string; priority?: string; page?: number; limit?: number;
}) => {
  const page  = filters.page  ?? 1;
  const limit = filters.limit ?? 20;
  const from  = (page - 1) * limit;

  let query = supabaseAdmin
    .from('complaint_dashboard')
    .select('*', { count: 'exact' })
    .eq('municipality_name', municipalityId); // We'll use base table for accuracy

  // Use the base complaints table with joins for filtering
  let base = supabaseAdmin
    .from('complaints')
    .select(`
      co_uid, complaint_number, title, status, priority, reported_at,
      resolved_at, is_anonymous,
      profiles!citizen_id ( full_name, email ),
      departments ( dept_name ),
      complaint_categories ( name )
    `, { count: 'exact' })
    .eq('municipality_id', municipalityId)
    .eq('is_deleted', false)
    .order('reported_at', { ascending: false })
    .range(from, from + limit - 1);

  if (filters.status)   base = base.eq('status', filters.status);
  if (filters.priority) base = base.eq('priority', filters.priority);

  const { data, error, count } = await base;
  if (error) throw new Error(error.message);
  return { data, total: count, page, limit };
};

// ── Review + assign complaint to department ──────────────────
export const assignToDepartment = async (
  complaintId: string, departmentId: string,
  reviewerId: string, remark?: string
) => {
  const { error } = await supabaseAdmin.rpc('assign_complaint_to_department', {
    p_complaint_id:  complaintId,
    p_department_id: departmentId,
    p_reviewer_id:   reviewerId,
    p_remark:        remark ?? null,
  });
  if (error) throw new Error(error.message);
  return { message: 'Complaint assigned to department' };
};

// ── Reject a complaint ───────────────────────────────────────
export const rejectComplaint = async (
  complaintId: string, reviewerId: string, reason: string
) => {
  const { error } = await supabaseAdmin
    .from('complaints')
    .update({ status: 'rejected', rejection_reason: reason, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq('co_uid', complaintId);
  if (error) throw new Error(error.message);

  await supabaseAdmin.from('complaint_status_history').insert({
    complaint_id: complaintId, changed_by: reviewerId,
    old_status: 'submitted', new_status: 'rejected', remark: reason,
  });
  return { message: 'Complaint rejected' };
};

// ── Departments CRUD ─────────────────────────────────────────
export const getDepartments = async (municipalityId: string) => {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('d_uid, dept_name, department_type, dept_email, dept_contact, is_active, profiles!head_id ( full_name )')
    .eq('municipality_id', municipalityId)
    .eq('is_deleted', false)
    .order('dept_name');
  if (error) throw new Error(error.message);
  return data;
};

export const createDepartment = async (municipalityId: string, body: {
  dept_name: string; department_type?: string;
  dept_email?: string; dept_contact?: string;
}) => {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .insert({ municipality_id: municipalityId, ...body })
    .select('d_uid, dept_name').single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateDepartment = async (deptId: string, municipalityId: string, body: object) => {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .update(body)
    .eq('d_uid', deptId)
    .eq('municipality_id', municipalityId)
    .select().single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteDepartment = async (deptId: string, municipalityId: string) => {
  const { error } = await supabaseAdmin
    .from('departments')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('d_uid', deptId).eq('municipality_id', municipalityId);
  if (error) throw new Error(error.message);
};

// ── SLA breaches view ────────────────────────────────────────
export const getSLABreaches = async (municipalityId: string) => {
  const { data, error } = await supabaseAdmin
    .from('v_sla_breaches')
    .select('*')
    .eq('municipality_id', municipalityId);
  if (error) throw new Error(error.message);
  return data;
};

// ── Pending invitations ──────────────────────────────────────
export const getPendingInvitations = async (municipalityId: string) => {
  const { data, error } = await supabaseAdmin
    .from('v_pending_invitations')
    .select('*')
    .eq('municipality_name', municipalityId);
  if (error) throw new Error(error.message);
  return data;
};