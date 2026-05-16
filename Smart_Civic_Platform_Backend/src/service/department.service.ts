// ── department.service.ts ────────────────────────────────────
import { supabaseAdmin } from '../config/supabase.js';

export const getDeptComplaints = async (deptId: string, filters: { status?: string; page?: number; limit?: number }) => {
  const page = filters.page ?? 1; const limit = filters.limit ?? 20;
  let query = supabaseAdmin
    .from('complaints')
    .select(`co_uid, complaint_number, title, status, priority, reported_at,
      profiles!citizen_id ( full_name ), profiles!assigned_staff_id ( full_name )`, { count: 'exact' })
    .eq('department_id', deptId).eq('is_deleted', false)
    .order('reported_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (filters.status) query = query.eq('status', filters.status);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data, total: count, page, limit };
};

export const assignToStaff = async (complaintId: string, staffId: string, assignerId: string, remark?: string) => {
  const { error } = await supabaseAdmin.rpc('assign_complaint_to_staff', {
    p_complaint_id: complaintId, p_staff_id: staffId,
    p_assigner_id: assignerId, p_remark: remark ?? null,
  });
  if (error) throw new Error(error.message);
  return { message: 'Complaint assigned to staff' };
};

export const getTeamWorkload = async (deptId: string) => {
  const { data, error } = await supabaseAdmin
    .from('v_team_workload').select('*').eq('dept_name', deptId);
  if (error) throw new Error(error.message);
  return data;
};

export const getDeptStaff = async (deptId: string) => {
  const { data, error } = await supabaseAdmin
    .from('staff')
    .select('s_uid, employee_id, staff_role, employee_status, profiles ( full_name, email, phone )')
    .eq('department_id', deptId).eq('is_deleted', false);
  if (error) throw new Error(error.message);
  return data;
};

export const createTeam = async (deptId: string, body: { team_name: string; specialty?: string }) => {
  const { data, error } = await supabaseAdmin.from('teams')
    .insert({ department_id: deptId, ...body }).select('t_uid, team_name').single();
  if (error) throw new Error(error.message);
  return data;
};

export const getTeams = async (deptId: string) => {
  const { data, error } = await supabaseAdmin.from('teams')
    .select('t_uid, team_name, specialty, is_available, team_members ( tm_uid, profiles!staff_profile_id ( full_name ) )')
    .eq('department_id', deptId).eq('is_deleted', false);
  if (error) throw new Error(error.message);
  return data;
};