// src/services/register.service.ts
import { supabase, supabaseAdmin } from '../config/supabase';

// ─── Municipality ────────────────────────────────────────────────────────────
export const registerMunicipality = async (body: any) => {
  const {
    official_name, slug, login_email, password, head_full_name, head_phone,
    region_state, country_code, time_zone, office_address,
    support_email, emergency_contact, website_url
  } = body;

  // 1. Create auth user for the municipality head
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email:          login_email,
    password,
    email_confirm:  true,   // skip email verification for admin-created accounts
    user_metadata:  { full_name: head_full_name, role: 'municipality_head' }
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw { status: 409, message: 'Email already registered' };
    }
    throw { status: 500, message: authError.message };
  }

  const authUserId = authData.user.id;

  try {
    // 2. Create the municipality row (head_id added in step 4)
    const { data: muni, error: muniError } = await supabaseAdmin
      .from('municipalities')
      .insert({
        official_name, slug, login_email, region_state,
        country_code:  country_code ?? 'NP',
        time_zone,     office_address, support_email,
        emergency_contact, website_url
      })
      .select('m_uid')
      .single();

    if (muniError) throw muniError;

    // 3. Create the profile for the municipality head
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id:              authUserId,
        full_name:       head_full_name,
        email:           login_email,
        phone:           head_phone ?? null,
        role:            'municipality_head',
        municipality_id: muni.m_uid
      });

    if (profileError) throw profileError;

    // 4. Create the staff row
    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        profile_id:      authUserId,
        municipality_id: muni.m_uid,
        staff_role:      'municipality_head',
        designation:     'Municipality Head'
      });

    if (staffError) throw staffError;

    // 5. Link head_id on the municipality (deferred FK resolves now)
    const { error: linkError } = await supabaseAdmin
      .from('municipalities')
      .update({ head_id: authUserId })
      .eq('m_uid', muni.m_uid);

    if (linkError) throw linkError;

    return {
      municipality_id: muni.m_uid,
      head_profile_id: authUserId,
      official_name,
      login_email
    };

  } catch (err: any) {
    // ROLLBACK: delete the auth user so there's no orphan
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    throw { status: 500, message: err.message ?? 'Registration failed. Rolled back.' };
  }
};


// ─── Department ──────────────────────────────────────────────────────────────
export const registerDepartment = async (body: any, requester: any) => {
  const {
    dept_name, dept_code, service_type, dept_contact, dept_email,
    operating_budget, head_full_name, head_email, head_password,
    head_phone, head_designation
  } = body;

  // Create auth user for the department head
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email:         head_email,
    password:      head_password,
    email_confirm: true,
    user_metadata: { full_name: head_full_name, role: 'department_head' }
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw { status: 409, message: 'Email already registered' };
    }
    throw { status: 500, message: authError.message };
  }

  const authUserId = authData.user.id;

  try {
    // Create department under the requester's municipality
    const { data: dept, error: deptError } = await supabaseAdmin
      .from('departments')
      .insert({
        municipality_id:  requester.municipality_id,
        dept_name, dept_code, service_type,
        dept_contact, dept_email, operating_budget
      })
      .select('d_uid')
      .single();

    if (deptError) throw deptError;

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id:              authUserId,
        full_name:       head_full_name,
        email:           head_email,
        phone:           head_phone ?? null,
        role:            'department_head',
        municipality_id: requester.municipality_id,
        department_id:   dept.d_uid
      });

    if (profileError) throw profileError;

    // Create staff row
    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        profile_id:      authUserId,
        municipality_id: requester.municipality_id,
        department_id:   dept.d_uid,
        staff_role:      'department_head',
        designation:     head_designation ?? 'Head of Department'
      });

    if (staffError) throw staffError;

    // Link head on department
    await supabaseAdmin
      .from('departments')
      .update({ head_id: authUserId })
      .eq('d_uid', dept.d_uid);

    return {
      department_id:   dept.d_uid,
      head_profile_id: authUserId,
      dept_name,
      head_email
    };

  } catch (err: any) {
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    throw { status: 500, message: err.message ?? 'Department registration failed. Rolled back.' };
  }
};


// ─── Staff ───────────────────────────────────────────────────────────────────
export const registerStaff = async (body: any, requester: any) => {
  const {
    full_name, email, password, phone, staff_role,
    designation, employee_id, department_id,
    shift_start, shift_end, joined_date
  } = body;

  // Scope enforcement: department_head can only add to their own dept
  if (requester.role === 'department_head') {
    if (department_id && department_id !== requester.department_id) {
      throw { status: 403, message: 'You can only add staff to your own department' };
    }
  }

  // If municipality_head, verify target dept belongs to their municipality
  if (requester.role === 'municipality_head' && department_id) {
    const { data: dept, error } = await supabaseAdmin
      .from('departments')
      .select('municipality_id')
      .eq('d_uid', department_id)
      .eq('is_deleted', false)
      .single();

    if (error || !dept) throw { status: 404, message: 'Department not found' };

    if (dept.municipality_id !== requester.municipality_id) {
      throw { status: 403, message: 'Department does not belong to your municipality' };
    }
  }

  const resolvedDeptId   = department_id ?? requester.department_id;
  const resolvedMuniId   = requester.municipality_id;

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name, role: staff_role ?? 'staff' }
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw { status: 409, message: 'Email already registered' };
    }
    throw { status: 500, message: authError.message };
  }

  const authUserId = authData.user.id;

  try {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id:              authUserId,
        full_name, email, phone: phone ?? null,
        role:            staff_role ?? 'staff',
        municipality_id: resolvedMuniId,
        department_id:   resolvedDeptId ?? null
      });

    if (profileError) throw profileError;

    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        profile_id:      authUserId,
        municipality_id: resolvedMuniId,
        department_id:   resolvedDeptId ?? null,
        employee_id:     employee_id ?? null,
        staff_role:      staff_role ?? 'staff',
        designation, shift_start, shift_end, joined_date
      });

    if (staffError) throw staffError;

    return {
      staff_profile_id: authUserId,
      full_name, email,
      staff_role: staff_role ?? 'staff',
      department_id: resolvedDeptId
    };

  } catch (err: any) {
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    throw { status: 500, message: err.message ?? 'Staff registration failed. Rolled back.' };
  }
};


// ─── Citizen (self-register) ──────────────────────────────────────────────────
export const registerCitizen = async (body: any) => {
  const {
    first_name, middle_name, last_name, email, password, phone,
    municipality_id, ward_number, home_address,
    date_of_birth, gender, notification_pref
  } = body;

  // Citizens use the regular client — goes through normal email verification
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email, password,
    options: {
      data: { full_name: `${first_name} ${last_name}`, role: 'citizen' }
    }
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw { status: 409, message: 'Email already registered' };
    }
    throw { status: 500, message: authError.message };
  }

  const authUserId = authData.user!.id;

  try {
    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id:              authUserId,
        full_name:       `${first_name} ${last_name}`,
        email, phone:    phone ?? null,
        role:            'citizen',
        municipality_id: municipality_id ?? null
      });

    if (profileError) throw profileError;

    // Create citizen row
    const { error: citizenError } = await supabaseAdmin
      .from('citizens')
      .insert({
        id: authUserId,
        first_name, middle_name: middle_name ?? null, last_name,
        ward_number: ward_number ?? null,
        home_address: home_address ?? null,
        date_of_birth: date_of_birth ?? null,
        gender: gender ?? null,
        notification_pref: notification_pref ?? 'email'
      });

    if (citizenError) throw citizenError;

    return {
      citizen_id: authUserId,
      email,
      message: 'Please check your email to verify your account'
    };

  } catch (err: any) {
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    throw { status: 500, message: err.message ?? 'Citizen registration failed. Rolled back.' };
  }
};


// ─── Login (all roles) ────────────────────────────────────────────────────────
export const loginUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw { status: 401, message: 'Invalid email or password' };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role, municipality_id, department_id, account_status')
    .eq('id', data.user.id)
    .single();

  if (!profile) throw { status: 404, message: 'Profile not found' };

  if (profile.account_status !== 'active') {
    throw { status: 403, message: `Account is ${profile.account_status}` };
  }

  // Update last_login_at
  await supabaseAdmin
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.user.id);

  return {
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id:              profile.id,
      full_name:       profile.full_name,
      email:           data.user.email,
      role:            profile.role,
      municipality_id: profile.municipality_id,
      department_id:   profile.department_id
    }
  };
};