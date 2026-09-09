import { supabaseAdmin, createAuthClient } from "../../../config/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComplaintStatus, Database } from "../../../types/database.type";
import { StorageService } from "../../../service/storage.service";
import { LocationResolverService } from "../../../service/location-resolver.service";
import { RoutingEngineService } from "../../../service/routing-engine.service";
import { TrackingIdService } from "../../../service/tracking-id.service";
import { SlaMonitorService } from "../../../service/sla-monitor.service";
import { CollaborationService } from "../../../service/collaboration.service";
import { NotificationService } from "../../../service/notification.service";
import { SeverityDetectorService } from "../../../service/severity-detector.service";
import { DuplicateDetectorService, type DuplicateCheckInput } from "../../../service/duplicate-detector.service";

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

  const complaintTitle = detailsPayload.title || body.title || "";
  const complaintDescription = detailsPayload.description || body.description || "";

  // Auto-detect severity if not explicitly specified by user or if baseline medium
  const detectedSeverityResult = SeverityDetectorService.detectSeverity(complaintTitle, complaintDescription);
  const resolvedSeverity = detailsPayload.severity_level && detailsPayload.severity_level !== "medium"
    ? detailsPayload.severity_level
    : detectedSeverityResult.severity;

  // 5. SLA Due Date calculation
  console.log("--> [submitComplaint] Step 5: SLA Due Date calculation");
  const slaService = new SlaMonitorService(supabaseAdmin);
  const slaDueAt = slaService.calculateSlaDueDate(resolvedSeverity || "medium");

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
    title: complaintTitle,
    description: complaintDescription,
    severity_level: resolvedSeverity || "medium",
    priority: resolvedSeverity === "urgent" || resolvedSeverity === "high" ? "urgent" : "medium",
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

  // 9. Process optional media attachments (photos and short video clips)
  const attachedMedia = body.media || detailsPayload.media || [];
  const uploadedMediaRecords: any[] = [];
  if (Array.isArray(attachedMedia) && attachedMedia.length > 0) {
    console.log(`--> [submitComplaint] Step 9: Processing ${attachedMedia.length} media proof file(s)`);
    const storageService = new StorageService(supabaseAdmin);
    for (let i = 0; i < attachedMedia.length; i++) {
      const item = attachedMedia[i];
      if (!item || !item.media_base64) continue;
      try {
        const rawFileName = item.file_name || `proof_${i + 1}.jpg`;
        const sanitizedFileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileKey = `${citizenId}/complaints/${complaint.co_uid}/${Date.now()}_${i}_${sanitizedFileName}`;

        const isVideo = item.media_type === "video" || 
                        item.media_type?.startsWith("video/") || 
                        /\.(mp4|webm|mov|3gp|mkv)$/i.test(rawFileName);
        const mediaType = isVideo ? "video" : "image";

        const publicUrl = await storageService.upload(
          "complaint-media",
          fileKey,
          item.media_base64,
          item.media_type
        );

        const { data: mediaRecord, error: mediaErr } = await supabaseAdmin
          .from("media")
          .insert({
            context: "complaint",
            context_id: complaint.co_uid,
            uploaded_by: citizenId,
            file_url: publicUrl,
            media_type: mediaType,
            file_name: rawFileName,
            file_size_bytes: item.file_size || null,
          })
          .select()
          .single();

        if (!mediaErr && mediaRecord) {
          uploadedMediaRecords.push(mediaRecord);
        } else if (mediaErr) {
          console.warn("Error inserting media record:", mediaErr.message);
        }
      } catch (err) {
        console.error("Failed to upload proof media attachment:", err);
      }
    }
  }

  return {
    ...complaint,
    media: uploadedMediaRecords,
  };
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

  // Fetch attached evidence / proof media
  const { data: mediaList } = await supabaseAdmin
    .from("media")
    .select("id, file_url, media_type, file_name, file_size_bytes, created_at")
    .eq("context", "complaint")
    .eq("context_id", complaintId);

  return {
    ...data,
    media: mediaList || [],
  };
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

  const mediaType = /\.(mp4|webm|mov|3gp|mkv)$/i.test(fileName) ? "video" : "image";
  const { data, error } = await supabaseAdmin
    .from("media")
    .insert({
      context: "complaint",
      context_id: complaintId,
      uploaded_by: citizenId,
      file_url: publicUrl,
      media_type: mediaType,
      file_name: fileName,
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
    .select("id, name, capital, created_at")
    .order("name");
  if (error) throw new Error(error.message);
  return data;
};

export const getDistricts = async (provinceId?: string) => {
  let query = supabaseAdmin
    .from("districts")
    .select("id, province_id, name, created_at");

  if (provinceId) query = query.eq("province_id", provinceId);

  const { data, error } = await query.order("name");
  if (error) throw new Error(error.message);
  return data;
};

export const getMunicipalities = async (districtId?: string) => {
  let query = supabaseAdmin
    .from("municipalities")
    .select("id, district_id, official_name, official_email, local_level_type, total_wards, is_active");

  if (districtId) query = query.eq("district_id", districtId);

  const { data, error } = await query.order("official_name");
  if (error) throw new Error(error.message);
  return data;
};

export const getWards = async (municipalityId: string) => {
  const { data, error } = await supabaseAdmin
    .from("wards")
    .select("id, municipality_id, ward_no, ward_office_name, ward_chairperson_name, contact_number")
    .eq("municipality_id", municipalityId)
    .order("ward_no");
  if (error) throw new Error(error.message);

  if (data && data.length === 0) {
    const { data: muniData } = await supabaseAdmin
      .from("municipalities")
      .select("total_wards")
      .eq("id", municipalityId)
      .single();

    if (muniData && muniData.total_wards > 0) {
      const wardsToInsert = Array.from({ length: muniData.total_wards }).map((_, i) => ({
        municipality_id: municipalityId,
        ward_no: i + 1,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("wards")
        .insert(wardsToInsert);

      if (!insertError) {
        const { data: generatedWards } = await supabaseAdmin
          .from("wards")
          .select("id, municipality_id, ward_no, ward_office_name, ward_chairperson_name, contact_number")
          .eq("municipality_id", municipalityId)
          .order("ward_no");
        return generatedWards || [];
      }
    }
  }

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
  // Check if citizen KYC is verified
  const { data: cit } = await supabaseAdmin
    .from("citizens")
    .select("kyc_status")
    .eq("id", citizenId)
    .single();

  const isKycVerified = cit?.kyc_status === "verified";
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  // Only allow updating permanent address if KYC is not verified
  if (body.permanent && !isKycVerified) {
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
    if (body.current.ward_id !== undefined) {
      updates.current_ward_id = body.current.ward_id;
      updates.ward_id = body.current.ward_id; // Sync legacy ward_id
    }
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

  // Sync profiles.municipality_id if current or permanent municipality changed
  const newMuniId = body.current?.municipality_id || (!isKycVerified ? body.permanent?.municipality_id : undefined);
  if (newMuniId) {
    await supabaseAdmin
      .from("profiles")
      .update({ municipality_id: newMuniId })
      .eq("id", citizenId);
  }

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
  // Check if citizen is KYC verified
  const { data: cit } = await supabaseAdmin
    .from("citizens")
    .select("kyc_status")
    .eq("id", profileId)
    .single();

  const isKycVerified = cit?.kyc_status === "verified";

  const profileFields: Record<string, unknown> = {};
  const citizenFields: Record<string, unknown> = {};

  // Only allow editing name and DOB if KYC is not verified
  if (!isKycVerified) {
    if (body.first_name || body.middle_name || body.last_name) {
      const firstName = (body.first_name as string) || "";
      const middleName = (body.middle_name as string) || "";
      const lastName = (body.last_name as string) || "";
      profileFields.full_name = `${firstName}${middleName ? " " + middleName : ""}${lastName ? " " + lastName : ""}`.trim();
    }
    if (body.first_name !== undefined) citizenFields.first_name = body.first_name;
    if (body.middle_name !== undefined) citizenFields.middle_name = body.middle_name || null;
    if (body.last_name !== undefined) citizenFields.last_name = body.last_name;
    if (body.date_of_birth !== undefined) citizenFields.date_of_birth = body.date_of_birth;
  }

  if (body.phone !== undefined) profileFields.phone = body.phone;
  if (body.gender !== undefined) citizenFields.gender = body.gender;
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

/**
 * Check for spatiotemporal near-duplicate complaints
 */
export const checkComplaintDuplicates = async (
  citizenId: string,
  params: DuplicateCheckInput
) => {
  if (!params.title || params.title.trim().length < 3) {
    return { duplicates: [] };
  }

  // Fetch active candidate complaints in this municipality
  const query = supabaseAdmin
    .from("complaints")
    .select(`
      co_uid, tracking_id, title, description, category_id,
      status, severity_level, priority, latitude, longitude, ward_number,
      upvote_count, submitted_date, citizen_id,
      complaint_categories!category_id ( category_name ),
      departments!assigned_department_id ( department_name )
    `)
    .eq("municipality_id", params.municipality_id)
    .in("status", ["pending", "assigned", "under_review", "in_progress", "cross_dept_pending"])
    .order("submitted_date", { ascending: false })
    .limit(100);

  const { data: candidates, error } = await query;
  if (error) {
    console.error("Duplicate search query error:", error.message);
    return { duplicates: [] };
  }

  const mappedCandidates = (candidates || []).map((c: any) => ({
    co_uid: c.co_uid,
    tracking_id: c.tracking_id,
    title: c.title,
    description: c.description || "",
    category_id: c.category_id,
    category_name: c.complaint_categories?.category_name,
    department_name: c.departments?.department_name,
    status: c.status,
    severity_level: c.severity_level,
    priority: c.priority,
    latitude: c.latitude != null ? Number(c.latitude) : null,
    longitude: c.longitude != null ? Number(c.longitude) : null,
    ward_number: c.ward_number != null ? Number(c.ward_number) : null,
    upvote_count: c.upvote_count || 1,
    submitted_date: c.submitted_date,
    citizen_id: c.citizen_id,
  }));

  const matches = DuplicateDetectorService.findDuplicates(params, mappedCandidates, 55);

  // Check if current citizen has already upvoted each candidate
  const matchedIds = matches.map((m) => m.complaint.co_uid);
  const userUpvotedSet = new Set<string>();

  if (matchedIds.length > 0) {
    try {
      const { data: upvotes } = await supabaseAdmin
        .from("complaint_upvotes")
        .select("complaint_id")
        .eq("citizen_id", citizenId)
        .in("complaint_id", matchedIds);

      if (upvotes) {
        upvotes.forEach((u: any) => userUpvotedSet.add(u.complaint_id));
      }
    } catch {
      // Fallback to complaint_updates check if complaint_upvotes table isn't created yet
      try {
        const { data: updates } = await supabaseAdmin
          .from("complaint_updates")
          .select("complaint_id")
          .eq("author_id", citizenId)
          .in("complaint_id", matchedIds)
          .ilike("note", "%upvoted%");
        if (updates) {
          updates.forEach((u: any) => userUpvotedSet.add(u.complaint_id));
        }
      } catch {
        // Safe ignore
      }
    }
  }

  const enrichedMatches = matches.map((m) => {
    const isAuthor = (candidates || []).find((c: any) => c.co_uid === m.complaint.co_uid)?.citizen_id === citizenId;
    return {
      ...m,
      has_user_upvoted: userUpvotedSet.has(m.complaint.co_uid) || isAuthor,
      is_user_author: isAuthor,
    };
  });

  return { duplicates: enrichedMatches };
};

/**
 * Upvote / endorse an existing complaint (+1 citizen affected)
 */
export const upvoteComplaint = async (citizenId: string, complaintId: string) => {
  // 1. Fetch complaint
  const { data: complaint, error: compErr } = await supabaseAdmin
    .from("complaints")
    .select("co_uid, tracking_id, citizen_id, title, priority, status, upvote_count, assigned_department_id")
    .eq("co_uid", complaintId)
    .single();

  if (compErr || !complaint) {
    throw new Error("Complaint not found.");
  }

  if (complaint.citizen_id === citizenId) {
    throw new Error("You are the author of this complaint.");
  }

  // 2. Check if already upvoted
  let alreadyUpvoted = false;
  try {
    const { data: existingUpvote } = await supabaseAdmin
      .from("complaint_upvotes")
      .select("id")
      .eq("complaint_id", complaintId)
      .eq("citizen_id", citizenId)
      .maybeSingle();

    if (existingUpvote) alreadyUpvoted = true;
  } catch {
    // Fallback if table doesn't exist yet
    const { data: existingUpdates } = await supabaseAdmin
      .from("complaint_updates")
      .select("id")
      .eq("complaint_id", complaintId)
      .eq("author_id", citizenId)
      .ilike("note", "%upvoted%");

    if (existingUpdates && existingUpdates.length > 0) alreadyUpvoted = true;
  }

  if (alreadyUpvoted) {
    return {
      success: true,
      already_upvoted: true,
      tracking_id: complaint.tracking_id,
      upvote_count: complaint.upvote_count || 1,
      message: "You have already upvoted this complaint.",
    };
  }

  // 3. Register upvote in complaint_upvotes (if table exists)
  try {
    await supabaseAdmin.from("complaint_upvotes").insert({
      complaint_id: complaintId,
      citizen_id: citizenId,
    });
  } catch (err: any) {
    console.warn("Could not insert to complaint_upvotes (table might not exist yet):", err.message);
  }

  // 4. Always record in complaint_updates timeline
  try {
    await supabaseAdmin.from("complaint_updates").insert({
      complaint_id: complaintId,
      author_id: citizenId,
      note: "Citizen endorsed and upvoted this complaint (+1 affected resident).",
      is_internal: false,
    });
  } catch (updErr: any) {
    console.warn("Could not insert to complaint_updates:", updErr.message);
  }

  // 5. Increment upvote_count & handle auto-priority escalation
  const currentUpvotes = Number(complaint.upvote_count) || 1;
  const newUpvoteCount = currentUpvotes + 1;

  let newPriority = complaint.priority;
  let priorityEscalated = false;

  if (newUpvoteCount >= 10 && complaint.priority !== "urgent") {
    newPriority = "urgent";
    priorityEscalated = true;
  } else if (newUpvoteCount >= 4 && complaint.priority === "low") {
    newPriority = "medium";
    priorityEscalated = true;
  } else if (newUpvoteCount >= 4 && complaint.priority === "medium") {
    newPriority = "high";
    priorityEscalated = true;
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  try {
    updates.upvote_count = newUpvoteCount;
    if (priorityEscalated) {
      updates.priority = newPriority;
    }
    await supabaseAdmin
      .from("complaints")
      .update(updates)
      .eq("co_uid", complaintId);
  } catch (err: any) {
    console.warn("Could not update complaints upvote_count:", err.message);
  }

  // 6. Send in-app notification confirming subscription
  try {
    const notifService = new NotificationService(supabaseAdmin);
    await notifService.notifyProfile(
      citizenId,
      "Grievance Endorsed",
      `You are now supporting complaint '${complaint.title}' (${complaint.tracking_id}). You will receive live updates as municipal teams resolve it.`
    );

    if (priorityEscalated && complaint.assigned_department_id) {
      await notifService.notifyDepartment(
        complaint.assigned_department_id,
        "Priority Escalated (Citizen Endorsements)",
        `Complaint '${complaint.title}' (${complaint.tracking_id}) has reached ${newUpvoteCount} endorsements and was auto-escalated to ${newPriority.toUpperCase()}.`
      );
    }
  } catch (notifErr: any) {
    console.warn("Notification dispatch failed:", notifErr.message);
  }

  return {
    success: true,
    tracking_id: complaint.tracking_id,
    upvote_count: newUpvoteCount,
    priority_escalated: priorityEscalated,
    new_priority: newPriority,
    message: `Thank you! You are now supporting complaint #${complaint.tracking_id}.`,
  };
};

export const deleteComplaint = async (
  citizenId: string,
  complaintId: string,
  userClient?: SupabaseClient
) => {
  const client = userClient || supabaseAdmin;

  // 1. Fetch complaint and verify ownership
  const { data: complaint, error: fetchErr } = await client
    .from("complaints")
    .select("co_uid, tracking_id, citizen_id, title, status")
    .eq("co_uid", complaintId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!complaint) {
    throw new Error("Complaint not found.");
  }

  if (complaint.citizen_id !== citizenId) {
    throw new Error("Unauthorized: You can only remove complaints that you registered.");
  }

  // 2. Clean up media storage files from Supabase Storage bucket 'complaint-media'
  try {
    const storageService = new StorageService(supabaseAdmin);
    // Remove entire complaint proof folder
    await storageService.deleteFolder("complaint-media", `${citizenId}/complaints/${complaintId}`);

    // Also remove any files tracked in media table
    const { data: mediaFiles } = await supabaseAdmin
      .from("media")
      .select("file_url")
      .eq("context", "complaint")
      .eq("context_id", complaintId);

    if (mediaFiles && mediaFiles.length > 0) {
      const keys = mediaFiles
        .map((m: any) => {
          if (!m.file_url) return null;
          const match = m.file_url.match(/complaint-media\/(.+)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[];

      if (keys.length > 0) {
        await storageService.deleteFiles("complaint-media", keys);
      }
    }
  } catch (storageErr: any) {
    console.warn(`[deleteComplaint] Storage cleanup warning:`, storageErr.message);
  }

  // 3. Clean up related child database rows
  await supabaseAdmin.from("media").delete().eq("context", "complaint").eq("context_id", complaintId);
  await supabaseAdmin.from("complaint_updates").delete().eq("complaint_id", complaintId);
  await supabaseAdmin.from("complaint_collaborations").delete().eq("complaint_id", complaintId);
  await supabaseAdmin.from("complaint_sign_offs").delete().eq("complaint_id", complaintId);
  await supabaseAdmin.from("complaint_upvotes").delete().eq("complaint_id", complaintId);

  // 4. Delete the complaint record itself
  const { error: delErr } = await supabaseAdmin
    .from("complaints")
    .delete()
    .eq("co_uid", complaintId)
    .eq("citizen_id", citizenId);

  if (delErr) {
    throw new Error(`Failed to delete complaint: ${delErr.message}`);
  }

  // 5. Audit log entry
  try {
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: citizenId,
      action: "DELETE",
      resource_type: "complaint",
      resource_id: complaintId,
      metadata: {
        tracking_id: complaint.tracking_id,
        title: complaint.title,
        reason: "Citizen requested complaint removal and storage cleanup",
      },
    });
  } catch (auditErr: any) {
    console.warn("[deleteComplaint] Audit log warning:", auditErr.message);
  }

  return {
    success: true,
    message: `Complaint #${complaint.tracking_id} and all associated media files were removed cleanly.`,
    complaint_id: complaintId,
    tracking_id: complaint.tracking_id,
  };
};

/**
 * Permanently deletes a citizen's account, storage files, complaints, feedback,
 * upvotes, notifications, profiles, and Supabase Auth credentials.
 */
export const deleteCitizenAccount = async (
  citizenId: string,
  email: string,
  password: string,
) => {
  // 1. Password verification for authentication security
  const authClient = createAuthClient();
  const { error: authVerifyErr } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (authVerifyErr) {
    const error = new Error("Invalid password. Account deletion unauthorized.");
    (error as any).statusCode = 401;
    throw error;
  }

  const storageService = new StorageService(supabaseAdmin);

  // 2. Fetch all complaints by this citizen to clean up media
  const { data: complaints } = await supabaseAdmin
    .from("complaints")
    .select("co_uid")
    .eq("citizen_id", citizenId);

  const complaintIds: string[] = (complaints || []).map((c: any) => c.co_uid);

  // 3. Storage cleanup
  try {
    // Delete KYC identity documents folder
    await storageService.deleteFolder("identity-documents", citizenId);
    // Delete citizen complaint media folder
    await storageService.deleteFolder("complaint-media", citizenId);
    // Delete avatars folder if any
    await storageService.deleteFolder("avatars", citizenId);
  } catch (storageErr: any) {
    console.warn(`[deleteCitizenAccount] Storage cleanup warning:`, storageErr.message);
  }

  // 4. Clean up child records referencing complaints or citizen
  try {
    // Media table rows for citizen complaints or uploaded by citizen
    if (complaintIds.length > 0) {
      await supabaseAdmin.from("media").delete().eq("context", "complaint").in("context_id", complaintIds);
      await supabaseAdmin.from("complaint_collaborations").delete().in("complaint_id", complaintIds);
      await supabaseAdmin.from("complaint_sign_offs").delete().in("complaint_id", complaintIds);
      await supabaseAdmin.from("complaint_assignments").delete().in("complaint_id", complaintIds);
    }
    await supabaseAdmin.from("media").delete().eq("uploaded_by", citizenId);

    // Complaint updates / notes authored by this citizen
    await supabaseAdmin.from("complaint_updates").delete().eq("author_id", citizenId);

    // Upvotes by this citizen
    await supabaseAdmin.from("complaint_upvotes").delete().eq("citizen_id", citizenId);

    // Feedback given by this citizen
    await supabaseAdmin.from("feedback").delete().eq("citizen_id", citizenId);

    // Notifications directed to this citizen or sent by citizen
    await supabaseAdmin.from("notifications").delete().eq("target_profile_id", citizenId);
    await supabaseAdmin.from("notifications").delete().eq("sender_id", citizenId);

    // Complaints submitted by this citizen
    if (complaintIds.length > 0) {
      await supabaseAdmin.from("complaints").delete().eq("citizen_id", citizenId);
    }

    // Citizens record
    await supabaseAdmin.from("citizens").delete().eq("id", citizenId);

    // Profiles record
    await supabaseAdmin.from("profiles").delete().eq("id", citizenId);
  } catch (dbErr: any) {
    console.error("[deleteCitizenAccount] DB cleanup error:", dbErr.message);
    throw new Error(`Database cleanup failed: ${dbErr.message}`);
  }

  // 5. Delete Supabase Auth user (hard delete to free email and phone)
  const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(citizenId);
  if (authDeleteErr) {
    console.error("[deleteCitizenAccount] Auth deleteUser error:", authDeleteErr.message);
    throw new Error(`Failed to delete authentication credentials: ${authDeleteErr.message}`);
  }

  // 6. Audit log entry
  try {
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: null,
      action: "ACCOUNT_DELETED",
      resource_type: "citizen",
      resource_id: citizenId,
      metadata: {
        email,
        reason: "Citizen self-requested permanent account deletion",
        deleted_at: new Date().toISOString(),
      },
    });
  } catch (auditErr: any) {
    console.warn("[deleteCitizenAccount] Audit log warning:", auditErr.message);
  }

  return {
    success: true,
    message: "Your citizen account and all associated data have been permanently deleted.",
  };
};

