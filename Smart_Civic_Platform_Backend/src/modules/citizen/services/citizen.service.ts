import { supabaseAdmin } from "../../../config/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComplaintStatus, Database } from "../../../types/database.type";

type CitizenSupabaseClient = {
  from: <TableName extends keyof Database["public"]["Tables"]>(
    relation: TableName,
  ) => any;
};

const getCitizenDb = (_client: SupabaseClient<Database>) =>
  _client as unknown as CitizenSupabaseClient;

export const submitComplaint = async (
  citizenId: string,
  body: {
    municipality_id: string;
    title: string;
    description: string;
    category_id?: string;
    attachment_url?: string;
  },
  client: SupabaseClient<Database>,
) => {
  const db = getCitizenDb(client);

  const { data, error } = await db
    .from("complaints")
    .insert({
      citizen_id: citizenId,
      municipality_id: body.municipality_id,
      title: body.title,
      description: body.description,
      category_id: body.category_id ?? null,
      attachment_url: body.attachment_url ?? null,
      status: "pending",
    })
    .select("co_uid, title, status, submitted_date")
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getMyComplaints = async (
  citizenId: string,
  status: string | undefined,
  client: SupabaseClient<Database>,
) => {
  const db = getCitizenDb(client);

  let query = db
    .from("complaints")
    .select(
      `
      co_uid, title, status, submitted_date, resolution_date, resolution_note,
      complaint_categories ( category_name ),
      departments ( department_name )
    `,
    )
    .eq("citizen_id", citizenId)
    .order("submitted_date", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const getComplaintDetail = async (
  citizenId: string,
  complaintId: string,
  client: SupabaseClient<Database>,
) => {
  const db = getCitizenDb(client);

  const { data, error } = await db
    .from("complaints")
    .select(
      `
      co_uid, title, description, status,
      submitted_date, resolution_date, resolution_note,
      attachment_url,
      complaint_categories ( category_name ),
      departments ( department_name )
    `,
    )
    .eq("co_uid", complaintId)
    .eq("citizen_id", citizenId)
    .single();

  if (error) throw new Error("Complaint not found");
  return data;
};

export const getComplaintHistory = async (
  citizenId: string,
  complaintId: string,
  client: SupabaseClient<Database>,
) => {
  const db = getCitizenDb(client);

  const { data: complaint } = await db
    .from("complaints")
    .select("co_uid")
    .eq("co_uid", complaintId)
    .eq("citizen_id", citizenId)
    .maybeSingle();
  if (!complaint) throw new Error("Complaint not found");

  const { data, error } = await db
    .from("audit_logs")
    .select("action, old_value, new_value, created_at")
    .eq("table_name", "complaints")
    .eq("record_id", complaintId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

export const getMunicipalities = async () => {
  const { data, error } = await supabaseAdmin
    .from("municipalities")
    .select(
      "m_uid, official_name, official_email, municipality_type, province, district",
    )
    .eq("is_active", true)
    .order("official_name");
  if (error) throw new Error(error.message);
  return data;
};

export const getCategories = async (_municipalityId: string) => {
  const { data, error } = await supabaseAdmin
    .from("complaint_categories")
    .select("category_id, category_name, target_department_name, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

export const submitFeedback = async (
  citizenId: string,
  complaintId: string,
  body: { rating: number; comment?: string; is_anonymous?: boolean },
  client: SupabaseClient<Database>,
) => {
  const db = getCitizenDb(client);

  const { data: complaint } = (await db
    .from("complaints")
    .select("status")
    .eq("co_uid", complaintId)
    .eq("citizen_id", citizenId)
    .maybeSingle()) as {
    data: { status: ComplaintStatus } | null;
    error: unknown;
  };

  if (!complaint) throw new Error("Complaint not found");
  if (complaint.status !== "resolved") {
    throw new Error("Can only rate resolved complaints");
  }

  const { data: assignment } = await supabaseAdmin
    .from("assignments")
    .select("team_id, staff_id")
    .eq("complaint_id", complaintId)
    .order("actual_end", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    complaint_id: complaintId,
    citizen_id: citizenId,
    rating: body.rating,
    comment: body.comment ?? null,
    is_anonymous: body.is_anonymous ?? false,
  };

  if (assignment?.team_id) payload.team_id = assignment.team_id;
  if (assignment?.staff_id) payload.staff_id = assignment.staff_id;

  const { data, error } = await db
    .from("feedback")
    .insert(payload)
    .select("f_uid, rating, comment")
    .single();

  if (error) throw new Error(error.message);
  return data;
};
