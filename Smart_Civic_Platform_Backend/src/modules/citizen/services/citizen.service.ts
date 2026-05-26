import { supabaseAdmin } from "../../../config/supabase";

export const submitComplaint = async (
  citizenId: string,
  body: {
    municipality_id: string;
    title: string;
    description: string;
    category_id?: string;
    priority?: string;
    address_hint?: string;
    latitude?: number;
    longitude?: number;
    is_anonymous?: boolean;
    record_type?: string;
  },
) => {
  const { data, error } = await supabaseAdmin
    .from("complaints")
    .insert({
      citizen_id: citizenId,
      municipality_id: body.municipality_id,
      title: body.title,
      description: body.description,
      category_id: body.category_id ?? null,
      priority: body.priority ?? "medium",
      address_hint: body.address_hint ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      is_anonymous: body.is_anonymous ?? false,
      record_type: body.record_type ?? "complaint",
      status: "pending",
    })
    .select("co_uid, title, status, priority, reported_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getMyComplaints = async (citizenId: string, status?: string) => {
  let query = supabaseAdmin
    .from("complaints")
    .select(
      `
      co_uid, title, status, priority, record_type,
      reported_at, resolved_at, resolution_note,
      complaint_categories ( name ),
      departments ( dept_name )
    `,
    )
    .eq("citizen_id", citizenId)
    .eq("is_deleted", false)
    .order("reported_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const getComplaintDetail = async (
  citizenId: string,
  complaintId: string,
) => {
  const { data, error } = await supabaseAdmin
    .from("complaints")
    .select(
      `
      co_uid, title, description, status, priority, record_type,
      reported_at, resolved_at, resolution_note, address_hint,
      latitude, longitude, is_anonymous,
      complaint_categories ( name, icon_name ),
      departments ( dept_name )
    `,
    )
    .eq("co_uid", complaintId)
    .eq("citizen_id", citizenId)
    .eq("is_deleted", false)
    .single();

  if (error) throw new Error("Complaint not found");
  return data;
};

export const getComplaintHistory = async (
  citizenId: string,
  complaintId: string,
) => {
  const { data: complaint } = await supabaseAdmin
    .from("complaints")
    .select("co_uid")
    .eq("co_uid", complaintId)
    .eq("citizen_id", citizenId)
    .maybeSingle();
  if (!complaint) throw new Error("Complaint not found");

  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .select("action, old_value, new_value, note, created_at")
    .eq("table_name", "complaints")
    .eq("record_id", complaintId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

export const getMunicipalities = async () => {
  const { data, error } = await supabaseAdmin
    .from("municipalities")
    .select("m_uid, official_name, region_state, slug")
    .eq("is_active", true)
    .eq("is_deleted", false)
    .order("official_name");
  if (error) throw new Error(error.message);
  return data;
};

export const getCategories = async (municipalityId: string) => {
  const { data, error } = await supabaseAdmin
    .from("complaint_categories")
    .select("category_id, name, description, icon_name, color_hex")
    .eq("municipality_id", municipalityId)
    .eq("is_active", true)
    .eq("is_deleted", false)
    .order("display_order");
  if (error) throw new Error(error.message);
  return data;
};

export const submitFeedback = async (
  citizenId: string,
  complaintId: string,
  body: { rating: number; comment?: string; is_anonymous?: boolean },
) => {
  const { data: complaint } = await supabaseAdmin
    .from("complaints")
    .select("status")
    .eq("co_uid", complaintId)
    .eq("citizen_id", citizenId)
    .maybeSingle();
  if (!complaint) throw new Error("Complaint not found");
  if (complaint.status !== "resolved") {
    throw new Error("Can only rate resolved complaints");
  }

  const { data, error } = await supabaseAdmin
    .from("feedback")
    .insert({
      complaint_id: complaintId,
      citizen_id: citizenId,
      rating: body.rating,
      comment: body.comment ?? null,
      is_anonymous: body.is_anonymous ?? false,
    })
    .select("f_uid, rating, comment")
    .single();

  if (error) throw new Error(error.message);
  return data;
};
