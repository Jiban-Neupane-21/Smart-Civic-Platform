import { supabaseAdmin } from "../../../config/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComplaintStatus, Database } from "../../../types/database.type";
import { StorageService } from "../../../service/storage.service";
import { LocationResolverService } from "../../../service/location-resolver.service";
import { RoutingEngineService } from "../../../service/routing-engine.service";
import { TrackingIdService } from "../../../service/tracking-id.service";
import { SlaMonitorService } from "../../../service/sla-monitor.service";
import { CollaborationService } from "../../../service/collaboration.service";
import { NotificationService } from "../../../service/notification.service";

type CitizenSupabaseClient = {
  from: <TableName extends keyof Database["public"]["Tables"]>(
    relation: TableName,
  ) => any;
};

const getCitizenDb = (_client: SupabaseClient<any>) =>
  _client as unknown as CitizenSupabaseClient;

export const submitComplaint = async (
  citizenId: string,
  body: any,
  client: SupabaseClient<any>,
) => {
  const db = getCitizenDb(client);

  // 1. Check KYC status: unverified citizens are capped at max 3 pending complaints
  const { data: citizen } = await db
    .from("citizens")
    .select("kyc_status")
    .eq("id", citizenId)
    .maybeSingle();

  if (citizen && citizen.kyc_status === "unverified") {
    const { data: pendingList } = await db
      .from("complaints")
      .select("co_uid")
      .eq("citizen_id", citizenId)
      .eq("status", "pending");

    if (pendingList && pendingList.length >= 3) {
      throw new Error(
        "Unverified citizens can have a maximum of 3 pending complaints. Please submit identity verification (KYC) to lift this restriction."
      );
    }
  }

  // Support both 4-step structured body AND flat body for backwards compatibility
  const locationPayload = body.location || {};
  const categoryPayload = body.category || {
    primary_category_id: body.category_id || body.primary_category_id,
    secondary_category_id: body.secondary_category_id || null,
  };
  const detailsPayload = body.details || {
    title: body.title,
    description: body.description,
    severity_level: body.severity_level || "medium",
    ticket_type: body.ticket_type || "complaint",
  };

  const primaryCategoryId = categoryPayload.primary_category_id;
  if (!primaryCategoryId) {
    throw new Error("Category selection is required.");
  }

  // 2. Location resolution
  console.log("--> [submitComplaint] Step 2: Location resolution");
  const locationResolver = new LocationResolverService(supabaseAdmin);
  const location = await locationResolver.resolveLocation(citizenId, {
    ...locationPayload,
    municipality_id: locationPayload.municipality_id || body.municipality_id,
  });

  // 3. Routing resolution
  console.log("--> [submitComplaint] Step 3: Routing resolution");
  const routingEngine = new RoutingEngineService(supabaseAdmin);
  const routing = await routingEngine.routeComplaint(
    location.municipality_id,
    primaryCategoryId,
    categoryPayload.secondary_category_id
  );

  // 4. Tracking ID generation
  console.log("--> [submitComplaint] Step 4: Tracking ID generation");
  const trackingService = new TrackingIdService(supabaseAdmin);
  const trackingId = await trackingService.generateTrackingId(
    location.municipality_id,
    location.ward_number,
    primaryCategoryId
  );
  console.log("GENERATED TRACKING ID:", trackingId);

  // 5. SLA Due Date calculation
  console.log("--> [submitComplaint] Step 5: SLA Due Date calculation");
  const slaService = new SlaMonitorService(supabaseAdmin);
  const slaDueAt = slaService.calculateSlaDueDate(detailsPayload.severity_level || "medium");

  // 6. Insert complaint record
  console.log("--> [submitComplaint] Step 6: Insert complaint record");
  const payload: any = {
    citizen_id: citizenId,
    tracking_id: trackingId,
    municipality_id: location.municipality_id,
    ward_number: location.ward_number,
    location_source: location.source,
    latitude: location.latitude,
    longitude: location.longitude,
    category_id: primaryCategoryId,
    secondary_category_id: categoryPayload.secondary_category_id || null,
    assigned_department_id: routing.lead_department_id,
    lead_department_id: routing.lead_department_id,
    cross_dept_status: routing.cross_dept_status,
    ticket_type: detailsPayload.ticket_type || "complaint",
    title: detailsPayload.title || body.title,
    description: detailsPayload.description || body.description,
    severity_level: detailsPayload.severity_level || "medium",
    priority: detailsPayload.severity_level === "urgent" ? "urgent" : "medium",
    status: routing.supporting_department_id ? "cross_dept_pending" : "pending",
    sla_due_at: slaDueAt,
    submission_step_completed: body.submission_step_completed || 4,
    submitted_date: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: complaint, error: insertErr } = await supabaseAdmin
    .from("complaints")
    .insert(payload)
    .select()
    .single();

  if (insertErr) throw new Error(insertErr.message);

  // 7. If Method A collaboration (citizen tagged secondary category), create collaboration row
  console.log("--> [submitComplaint] Step 7: Collaboration");
  if (routing.supporting_department_id) {
    const collabService = new CollaborationService(supabaseAdmin);
    await collabService.createCollaborationOnSubmission(
      complaint.co_uid,
      routing.lead_department_id,
      routing.supporting_department_id,
      citizenId
    );
  }

  // 8. Trigger notification
  console.log("--> [submitComplaint] Step 8: Trigger notification");
  const notifService = new NotificationService(supabaseAdmin);
  await notifService.notifyDepartment(
    routing.lead_department_id,
    "New Grievance Submitted",
    `New grievance '${payload.title}' (${trackingId}) assigned to your department.`
  );

  return complaint;
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
      co_uid, tracking_id, title, status, severity_level, submitted_date, resolution_date, resolution_note,
      complaint_categories!category_id ( category_name ),
      departments!assigned_department_id ( department_name )
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
      co_uid, tracking_id, title, description, status, severity_level,
      location_source, ward_number, latitude, longitude, cross_dept_status,
      submitted_date, resolution_date, resolution_note, rejection_reason, sla_due_at, sla_breached,
      complaint_categories!category_id ( category_name ),
      departments!assigned_department_id ( department_name )
    `,
    )
    .eq("co_uid", complaintId)
    .eq("citizen_id", citizenId)
    .single();

  if (error) throw new Error("Complaint not found");
  return data;
};

export const reopenComplaint = async (
  citizenId: string,
  complaintId: string,
  reopenReason: string
) => {
  const { data: complaint, error: fetchErr } = await supabaseAdmin
    .from("complaints")
    .select("co_uid, status, lead_department_id, tracking_id")
    .eq("co_uid", complaintId)
    .eq("citizen_id", citizenId)
    .single();

  if (fetchErr || !complaint) throw new Error("Complaint not found.");

  if (!["resolved", "closed"].includes(complaint.status)) {
    throw new Error("Only resolved or closed complaints can be reopened.");
  }

  const { data, error } = await supabaseAdmin
    .from("complaints")
    .update({
      status: "reopened",
      updated_at: new Date().toISOString(),
    })
    .eq("co_uid", complaintId)
    .select()
    .single();

  if (error) throw error;

  await supabaseAdmin.from("complaint_updates").insert({
    complaint_id: complaintId,
    author_id: citizenId,
    note: `Complaint reopened by citizen. Reason: ${reopenReason}`,
    is_internal: false,
  });

  if (complaint.lead_department_id) {
    const notifService = new NotificationService(supabaseAdmin);
    await notifService.notifyDepartment(
      complaint.lead_department_id,
      "Grievance Reopened",
      `Ticket ${complaint.tracking_id || complaintId} has been reopened by citizen.`
    );
  }

  return data;
};

export const addComplaintNote = async (
  citizenId: string,
  complaintId: string,
  note: string
) => {
  const { data, error } = await supabaseAdmin
    .from("complaint_updates")
    .insert({
      complaint_id: complaintId,
      author_id: citizenId,
      note,
      is_internal: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getComplaintUpdates = async (complaintId: string) => {
  const { data, error } = await supabaseAdmin
    .from("complaint_updates")
    .select("id, note, is_internal, created_at, author:profiles!author_id(full_name, role)")
    .eq("complaint_id", complaintId)
    .eq("is_internal", false)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
};

export const uploadComplaintMedia = async (
  citizenId: string,
  complaintId: string,
  mediaBase64: string,
  fileName: string
) => {
  const storageService = new StorageService(supabaseAdmin);
  const fileKey = `${citizenId}/complaints/${complaintId}/${Date.now()}_${fileName}`;
  const publicUrl = await storageService.upload(
    "complaint-media",
    fileKey,
    mediaBase64
  );

  const { data, error } = await supabaseAdmin
    .from("media")
    .insert({
      context: "complaint",
      context_id: complaintId,
      uploaded_by: citizenId,
      file_url: publicUrl,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
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

export const getProvinces = async () => {
  const { data, error } = await supabaseAdmin
    .from("provinces")
    .select("id, name, code, is_active")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(error.message);
  return data;
};

export const getDistricts = async (provinceId?: string) => {
  let query = supabaseAdmin
    .from("districts")
    .select("id, province_id, name, code, is_active")
    .eq("is_active", true);

  if (provinceId) query = query.eq("province_id", provinceId);

  const { data, error } = await query.order("name");
  if (error) throw new Error(error.message);
  return data;
};

export const getMunicipalities = async (districtId?: string) => {
  let query = supabaseAdmin
    .from("municipalities")
    .select("id, district_id, official_name, official_email, local_level_type, total_wards, is_active")
    .eq("is_active", true);

  if (districtId) query = query.eq("district_id", districtId);

  const { data, error } = await query.order("official_name");
  if (error) throw new Error(error.message);
  return data;
};

export const getWards = async (municipalityId: string) => {
  const { data, error } = await supabaseAdmin
    .from("wards")
    .select("id, municipality_id, ward_number, office_address, contact_phone")
    .eq("municipality_id", municipalityId)
    .order("ward_number");
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

  const { data: complaints, error: complaintsError } = await db
    .from("complaints")
    .select("co_uid, tracking_id, status, title, submitted_date")
    .eq("citizen_id", citizenId)
    .order("submitted_date", { ascending: false });

  if (complaintsError) throw new Error("Failed to fetch complaints data");

  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter((c: any) => c.status === "resolved").length;
  const pendingComplaints = complaints.filter((c: any) => c.status === "pending").length;

  const recentComplaints = complaints.slice(0, 5).map((c: any) => ({
    id: c.co_uid,
    co_uid: c.co_uid,
    tracking_id: c.tracking_id,
    title: c.title,
    status: c.status,
    created_at: c.submitted_date,
  }));

  const { data: announcements } = await supabaseAdmin
    .from("announcements")
    .select("id, title, created_at")
    .in("audience", ["all_citizens", "everyone"])
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentIncidents = announcements?.map((a: any) => ({
    id: a.id,
    title: a.title,
    status: "open",
    created_at: a.created_at,
  })) || [];

  return {
    summary: {
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      activeIncidentsReported: recentIncidents.length,
      unreadNotifications: 0,
    },
    recentComplaints,
    recentIncidents,
    recentNotifications: [],
  };
};

export const updateStructuredAddress = async (
  citizenId: string,
  body: {
    permanent?: { province_id?: string; district_id?: string; municipality_id?: string; ward_id?: string; tole?: string; full_address?: string };
    current?: { province_id?: string; district_id?: string; municipality_id?: string; ward_id?: string; tole?: string; full_address?: string };
  }
) => {
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (body.permanent) {
    if (body.permanent.province_id !== undefined) updates.permanent_province_id = body.permanent.province_id;
    if (body.permanent.district_id !== undefined) updates.permanent_district_id = body.permanent.district_id;
    if (body.permanent.municipality_id !== undefined) updates.permanent_municipality_id = body.permanent.municipality_id;
    if (body.permanent.ward_id !== undefined) updates.permanent_ward_id = body.permanent.ward_id;
    if (body.permanent.tole !== undefined) updates.permanent_tole = body.permanent.tole;
    if (body.permanent.full_address !== undefined) updates.permanent_address = body.permanent.full_address;
  }

  if (body.current) {
    if (body.current.province_id !== undefined) updates.current_province_id = body.current.province_id;
    if (body.current.district_id !== undefined) updates.current_district_id = body.current.district_id;
    if (body.current.municipality_id !== undefined) updates.current_municipality_id = body.current.municipality_id;
    if (body.current.ward_id !== undefined) updates.current_ward_id = body.current.ward_id;
    if (body.current.tole !== undefined) updates.current_tole = body.current.tole;
    if (body.current.full_address !== undefined) updates.current_address = body.current.full_address;
  }

  const { data, error } = await supabaseAdmin
    .from("citizens")
    .update(updates)
    .eq("id", citizenId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const uploadIdentityDocuments = async (
  citizenId: string,
  body: {
    identity_type: string;
    identity_number: string;
    front_image?: string;
    back_image?: string;
  }
) => {
  const { data: existing } = await supabaseAdmin
    .from("citizens")
    .select("id")
    .eq("identity_number", body.identity_number)
    .neq("id", citizenId)
    .maybeSingle();

  if (existing) {
    throw new Error("A citizen record with this identity document number already exists.");
  }

  const storageService = new StorageService(supabaseAdmin);
  let frontUrl = null;
  let backUrl = null;

  if (body.front_image) {
    frontUrl = await storageService.uploadIdentityDocument(
      citizenId,
      body.front_image,
      `${body.identity_type}_front.jpg`
    );
  }

  if (body.back_image) {
    backUrl = await storageService.uploadIdentityDocument(
      citizenId,
      body.back_image,
      `${body.identity_type}_back.jpg`
    );
  }

  const updates: Record<string, any> = {
    identity_type: body.identity_type,
    identity_number: body.identity_number,
    kyc_status: "pending",
    updated_at: new Date().toISOString(),
  };

  if (frontUrl) updates.identity_front_image_url = frontUrl;
  if (backUrl) updates.identity_back_image_url = backUrl;

  const { data, error } = await supabaseAdmin
    .from("citizens")
    .update(updates)
    .eq("id", citizenId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const updateProfile = async (
  profileId: string,
  body: Record<string, unknown>,
) => {
  const profileFields: Record<string, unknown> = {};
  const citizenFields: Record<string, unknown> = {};

  if (body.first_name || body.middle_name || body.last_name) {
    const firstName = (body.first_name as string) || "";
    const middleName = (body.middle_name as string) || "";
    const lastName = (body.last_name as string) || "";
    profileFields.full_name = `${firstName}${middleName ? " " + middleName : ""}${lastName ? " " + lastName : ""}`.trim();
  }
  if (body.phone !== undefined) profileFields.phone = body.phone;

  if (body.first_name !== undefined) citizenFields.first_name = body.first_name;
  if (body.middle_name !== undefined) citizenFields.middle_name = body.middle_name || null;
  if (body.last_name !== undefined) citizenFields.last_name = body.last_name;
  if (body.gender !== undefined) citizenFields.gender = body.gender;
  if (body.date_of_birth !== undefined) citizenFields.date_of_birth = body.date_of_birth;
  if (body.current_address !== undefined) citizenFields.current_address = body.current_address;
  if (body.permanent_address !== undefined) citizenFields.permanent_address = body.permanent_address;
  if (body.notification_pref !== undefined) citizenFields.notification_pref = body.notification_pref;

  if (Object.keys(profileFields).length > 0) {
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update(profileFields)
      .eq("id", profileId);
    if (profileErr) throw new Error(profileErr.message);
  }

  if (Object.keys(citizenFields).length > 0) {
    const { error: citizenErr } = await supabaseAdmin
      .from("citizens")
      .update(citizenFields)
      .eq("id", profileId);
    if (citizenErr) throw new Error(citizenErr.message);
  }

  return { message: "Profile updated successfully" };
};
