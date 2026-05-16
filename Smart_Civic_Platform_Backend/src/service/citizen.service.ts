import { supabaseAdmin } from '../config/supabase';

// ── Submit a complaint ───────────────────────────────────────
export const submitComplaint = async (citizenId: string, body: {
  municipality_id: string; title: string; description: string;
  category_id?: string; priority?: string; address_hint?: string;
  latitude?: number; longitude?: number; is_anonymous?: boolean;
}) => {
  const { data, error } = await supabaseAdmin
    .from('complaints')
    .insert({
      citizen_id:      citizenId,
      municipality_id: body.municipality_id,
      title:           body.title,
      description:     body.description,
      category_id:     body.category_id ?? null,
      priority:        body.priority ?? 'medium',
      address_hint:    body.address_hint ?? null,
      latitude:        body.latitude ?? null,
      longitude:       body.longitude ?? null,
      is_anonymous:    body.is_anonymous ?? false,
      status:          'submitted',
    })
    .select('co_uid, complaint_number, status, title, reported_at')
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// ── List own complaints ──────────────────────────────────────
export const getMyComplaints = async (citizenId: string, status?: string) => {
  let query = supabaseAdmin
    .from('complaint_dashboard')
    .select('*')
    .eq('citizen_name', citizenId) // use co_uid path below
    .order('reported_at', { ascending: false });

  // Use the base table for filtering by citizen_id
  let base = supabaseAdmin
    .from('complaints')
    .select(`
      co_uid, complaint_number, title, status, priority,
      reported_at, resolved_at, resolution_note,
      complaint_categories ( name ),
      departments ( dept_name )
    `)
    .eq('citizen_id', citizenId)
    .eq('is_deleted', false)
    .order('reported_at', { ascending: false });

  if (status) base = base.eq('status', status);

  const { data, error } = await base;
  if (error) throw new Error(error.message);
  return data;
};

// ── Get single complaint detail ──────────────────────────────
export const getComplaintDetail = async (citizenId: string, complaintId: string) => {
  const { data, error } = await supabaseAdmin
    .from('complaints')
    .select(`
      co_uid, complaint_number, title, description, status, priority,
      reported_at, resolved_at, resolution_note, address_hint,
      latitude, longitude, is_anonymous,
      complaint_categories ( name, icon_name ),
      departments ( dept_name ),
      complaint_replies ( message, is_visible_to_citizen, created_at ),
      complaint_attachments ( file_url, file_name, attachment_type, created_at )
    `)
    .eq('co_uid', complaintId)
    .eq('citizen_id', citizenId)
    .eq('is_deleted', false)
    .single();

  if (error) throw new Error('Complaint not found');
  return data;
};

// ── Get complaint status history ─────────────────────────────
export const getComplaintHistory = async (citizenId: string, complaintId: string) => {
  // Verify ownership first
  const { data: complaint } = await supabaseAdmin
    .from('complaints').select('co_uid').eq('co_uid', complaintId).eq('citizen_id', citizenId).single();
  if (!complaint) throw new Error('Complaint not found');

  const { data, error } = await supabaseAdmin
    .from('complaint_status_history')
    .select('old_status, new_status, remark, created_at, profiles ( full_name, role )')
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

// ── Get municipalities list (for complaint form dropdown) ────
export const getMunicipalities = async () => {
  const { data, error } = await supabaseAdmin
    .from('municipalities')
    .select('m_uid, official_name, region_state')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('official_name');
  if (error) throw new Error(error.message);
  return data;
};

// ── Get categories for a municipality ───────────────────────
export const getCategories = async (municipalityId: string) => {
  const { data, error } = await supabaseAdmin
    .from('complaint_categories')
    .select('category_id, name, description, icon_name, color_hex')
    .eq('municipality_id', municipalityId)
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('display_order');
  if (error) throw new Error(error.message);
  return data;
};

// ── Submit feedback after resolution ────────────────────────
export const submitFeedback = async (citizenId: string, complaintId: string, body: {
  rating: number; comment?: string; is_anonymous?: boolean;
}) => {
  // Verify complaint is resolved and belongs to citizen
  const { data: complaint } = await supabaseAdmin
    .from('complaints').select('status').eq('co_uid', complaintId).eq('citizen_id', citizenId).single();
  if (!complaint) throw new Error('Complaint not found');
  if (complaint.status !== 'resolved') throw new Error('Can only rate resolved complaints');

  const { data, error } = await supabaseAdmin
    .from('feedback')
    .insert({ complaint_id: complaintId, citizen_id: citizenId, ...body })
    .select('f_uid, rating, comment')
    .single();

  if (error) throw new Error(error.message);
  return data;
};