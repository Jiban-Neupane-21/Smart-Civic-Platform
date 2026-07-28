import { supabaseAdmin } from "../../../config/supabase";

export const getPublicProvinces = async () => {
  const { data, error } = await supabaseAdmin
    .from("provinces")
    .select("id, name, capital, created_at")
    .order("name");

  if (error) throw new Error(error.message);
  return data;
};

export const getPublicDistricts = async (provinceId?: string) => {
  let query = supabaseAdmin
    .from("districts")
    .select("id, province_id, name, created_at");

  if (provinceId) query = query.eq("province_id", provinceId);

  const { data, error } = await query.order("name");
  if (error) throw new Error(error.message);
  return data;
};

export const getPublicMunicipalities = async (districtId?: string) => {
  let query = supabaseAdmin
    .from("municipalities")
    .select("id, district_id, official_name, official_email, local_level_type, total_wards, is_active")
    .eq("is_active", true);

  if (districtId) query = query.eq("district_id", districtId);

  const { data, error } = await query.order("official_name");
  if (error) throw new Error(error.message);
  return data;
};

export const getPublicWards = async (municipalityId: string) => {
  const { data, error } = await supabaseAdmin
    .from("wards")
    .select("id, municipality_id, ward_no, ward_office_name, ward_chairperson_name, contact_number")
    .eq("municipality_id", municipalityId)
    .order("ward_no");

  if (error) throw new Error(error.message);
  return data;
};

export const trackComplaintByTrackingId = async (trackingId: string) => {
  const { data, error } = await supabaseAdmin
    .from("complaints")
    .select(`
      co_uid, tracking_id, title, status, severity_level, priority,
      submitted_date, resolution_date, resolution_note, ward_number,
      category:complaint_categories(category_name),
      department:departments!lead_department_id(department_name),
      municipality:municipalities!municipality_id(official_name)
    `)
    .eq("tracking_id", trackingId.trim())
    .maybeSingle();

  if (error || !data) {
    throw new Error(`No grievance ticket found with tracking ID '${trackingId}'.`);
  }

  return data;
};

export const validateRoleInvite = async (token: string) => {
  const { RoleInviteService } = require("../../../service/role-invite.service");
  const inviteService = new RoleInviteService(supabaseAdmin);
  return await inviteService.validateInvite(token);
};

export const acceptRoleInvite = async (token: string, password: string, fullName: string, phone?: string) => {
  const { RoleInviteService } = require("../../../service/role-invite.service");
  const inviteService = new RoleInviteService(supabaseAdmin);
  const invite = await inviteService.validateInvite(token);

  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone: phone || invite.phone,
      role: invite.role,
      municipality_id: invite.municipality_id,
      department_id: invite.department_id,
      account_status: "pending_onboarding",
    },
  });

  if (authErr || !authUser?.user) {
    throw new Error(authErr?.message || "Failed to create authentication user account.");
  }

  const userId = authUser.user.id;

  const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    email: invite.email,
    phone: phone || invite.phone || null,
    role: invite.role,
    account_status: "pending_onboarding",
    municipality_id: invite.municipality_id || null,
    department_id: invite.department_id || null,
    force_password_reset: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (profileErr) throw profileErr;

  await inviteService.consumeInvite(token);

  await supabaseAdmin.from("onboarding_wizard_progress").insert({
    profile_id: userId,
    current_step: 1,
    step1_completed: true,
    step2_completed: false,
    step3_completed: false,
    step4_completed: false,
  });

  return {
    user_id: userId,
    email: invite.email,
    role: invite.role,
    account_status: "pending_onboarding",
    next_step: 2,
  };
};
