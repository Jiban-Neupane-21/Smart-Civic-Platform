import { supabaseAdmin } from "../../../config/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComplaintStatus, Database } from "../../../types/database.type";

type CitizenSupabaseClient = {
  from: <TableName extends keyof Database["public"]["Tables"]>(
    relation: TableName,
  ) => any;
};

const getCitizenDb = (_client: SupabaseClient<any>) =>
  _client as unknown as CitizenSupabaseClient;

export const submitComplaint = async (
  citizenId: string,
  body: {
    municipality_id: string;
    title: string;
    description: string;
    category_id?: string;
  },
  client: SupabaseClient<any>,
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
      status: "pending",
    } as any)
    .select("co_uid, title, status, submitted_date")
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getMyComplaints = async (
  citizenId: string,
  status: string | undefined,
  client: SupabaseClient<any>,
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
  client: SupabaseClient<any>,
) => {
  const db = getCitizenDb(client);

  const { data, error } = await db
    .from("complaints")
    .select(
      `
      co_uid, title, description, status,
      submitted_date, resolution_date, resolution_note,
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
  client: SupabaseClient<any>,
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
      "id, official_name, official_email, local_level_type",
    )
    .eq("is_active", true)
    .order("official_name");
  if (error) throw new Error(error.message);
  return data;
};

export const getCategories = async (_municipalityId: string) => {
  const { data, error } = await supabaseAdmin
    .from("complaint_categories")
    .select("id, category_name, department_category, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

export const submitFeedback = async (
  citizenId: string,
  complaintId: string,
  body: { rating: number; comment?: string; is_anonymous?: boolean },
  client: SupabaseClient<any>,
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
    .from("complaint_assignments")
    .select("team_id, staff_id")
    .eq("complaint_id", complaintId)
    .order("completed_at", { ascending: false })
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
    .insert(payload as any)
    .select("id, rating, comment")
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getDashboardData = async (
  citizenId: string,
  client: SupabaseClient<any>,
) => {
  const db = getCitizenDb(client);

  // 1. Fetch complaints summary
  const { data: complaints, error: complaintsError } = await db
    .from("complaints")
    .select("co_uid, status, title, submitted_date")
    .eq("citizen_id", citizenId)
    .order("submitted_date", { ascending: false });

  if (complaintsError) throw new Error("Failed to fetch complaints data");

  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter((c: any) => c.status === "resolved").length;
  const pendingComplaints = complaints.filter((c: any) => c.status === "pending").length;

  const recentComplaints = complaints.slice(0, 5).map((c: any) => ({
    id: c.co_uid,
    co_uid: c.co_uid,
    title: c.title,
    status: c.status,
    created_at: c.submitted_date,
  }));

  // 2. Fetch active incidents (announcements for citizens)
  const { data: announcements, error: annError } = await supabaseAdmin
    .from("announcements")
    .select("id, title, created_at")
    .in("audience", ["all_citizens", "everyone"])
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentIncidents = announcements?.map((a: any) => ({
    id: a.id,
    title: a.title,
    status: "open", // generic status for incidents
    created_at: a.created_at,
  })) || [];

  const activeIncidentsReported = recentIncidents.length;

  // 3. For citizen notifications, return empty since they use SMS/email in this schema
  const recentNotifications: any[] = [];
  const unreadNotifications = 0;

  return {
    summary: {
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      activeIncidentsReported,
      unreadNotifications,
    },
    recentComplaints,
    recentIncidents,
    recentNotifications,
  };
};

