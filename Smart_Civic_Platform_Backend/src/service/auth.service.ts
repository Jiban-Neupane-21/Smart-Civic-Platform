import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase';
import { sendInviteEmail, sendPasswordResetEmail } from '../config/mailer';

// ── Register (citizen self-registration) ────────────────────
export const registerService = async (body: {
  email: string; password: string;
  first_name: string; last_name: string;
  phone?: string; ward_number?: string;
}) => {
  // Supabase creates auth.users row; handle_new_user trigger auto-creates profiles + citizens
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      full_name:  `${body.first_name} ${body.last_name}`,
      first_name: body.first_name,
      last_name:  body.last_name,
    },
  });

  if (error) throw new Error(error.message);

  // Update optional citizen fields if provided
  if (body.phone || body.ward_number) {
    await supabaseAdmin.from('profiles').update({ phone: body.phone }).eq('id', data.user.id);
    await supabaseAdmin.from('citizens').update({
      ward_number: body.ward_number,
    }).eq('id', data.user.id);
  }

  return { id: data.user.id, email: data.user.email };
};

// ── Login ────────────────────────────────────────────────────
export const loginService = async (email: string, password: string) => {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error) throw new Error('Invalid email or password');

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, role, municipality_id, department_id, account_status, force_password_reset')
    .eq('id', data.user.id)
    .single();

  if (profile?.account_status === 'suspended') throw new Error('Account is suspended');

  // Persist refresh token hash in our table for revocation support
  const tokenHash = crypto.createHash('sha256').update(data.session.refresh_token).digest('hex');
  await supabaseAdmin.from('refresh_tokens').upsert({
    profile_id: data.user.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  }, { onConflict: 'token_hash' });

  return {
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in:    data.session.expires_in,
    profile,
  };
};

// ── Refresh token ────────────────────────────────────────────
export const refreshTokenService = async (refreshToken: string) => {
  // Verify token exists and is not revoked in our table
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const { data: stored, error: lookupErr } = await supabaseAdmin
    .from('refresh_tokens')
    .select('is_revoked, expires_at, profile_id')
    .eq('token_hash', tokenHash)
    .single();

  if (lookupErr || !stored) throw new Error('Refresh token not found');
  if (stored.is_revoked)    throw new Error('Refresh token has been revoked');
  if (new Date(stored.expires_at) < new Date()) throw new Error('Refresh token expired');

  const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken });
  if (error) throw new Error('Could not refresh session');

  // Rotate: revoke old, store new
  await supabaseAdmin.from('refresh_tokens')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('token_hash', tokenHash);

  const newHash = crypto.createHash('sha256').update(data.session!.refresh_token).digest('hex');
  await supabaseAdmin.from('refresh_tokens').insert({
    profile_id: stored.profile_id,
    token_hash: newHash,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  return {
    access_token:  data.session!.access_token,
    refresh_token: data.session!.refresh_token,
    expires_in:    data.session!.expires_in,
  };
};

// ── Logout ───────────────────────────────────────────────────
export const logoutService = async (refreshToken: string, userId: string) => {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await supabaseAdmin.from('refresh_tokens')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)
    .eq('profile_id', userId);
};

// ── Send staff invitation ────────────────────────────────────
export const inviteStaffService = async (body: {
  target_email: string; target_role: string;
  department_id?: string; municipality_id: string;
  invited_by: string;
}) => {
  // Check not already a user
  const { data: existing } = await supabaseAdmin
    .from('profiles').select('id').eq('email', body.target_email).single();
  if (existing) throw new Error('A user with this email already exists');

  // Generate secure token
  const rawToken  = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await supabaseAdmin.from('staff_invitations').insert({
    token_hash:      tokenHash,
    target_email:    body.target_email,
    target_role:     body.target_role,
    municipality_id: body.municipality_id,
    department_id:   body.department_id ?? null,
    invited_by:      body.invited_by,
    status:          'pending',
  });

  const inviteUrl = `${process.env.CLIENT_URL}/accept-invite?token=${rawToken}`;
  await sendInviteEmail(body.target_email, inviteUrl, body.target_role);

  return { message: `Invitation sent to ${body.target_email}` };
};

// ── Accept invite ────────────────────────────────────────────
export const acceptInviteService = async (body: {
  token: string; full_name: string; password: string; phone?: string;
}) => {
  const tokenHash = crypto.createHash('sha256').update(body.token).digest('hex');

  const { data: invite, error } = await supabaseAdmin
    .from('staff_invitations')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('status', 'pending')
    .single();

  if (error || !invite) throw new Error('Invalid or expired invitation token');
  if (new Date(invite.expires_at) < new Date()) throw new Error('Invitation has expired');

  // Create auth user
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: invite.target_email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: body.full_name },
  });
  if (authErr) throw new Error(authErr.message);

  const uid = authData.user.id;

  // Update profile (handle_new_user created it as 'citizen', we fix the role)
  await supabaseAdmin.from('profiles').update({
    full_name:       body.full_name,
    role:            invite.target_role,
    municipality_id: invite.municipality_id,
    department_id:   invite.department_id,
    phone:           body.phone ?? null,
    invited_by:      invite.invited_by,
    force_password_reset: false,
  }).eq('id', uid);

  // Create staff row
  await supabaseAdmin.from('staff').insert({
    profile_id:      uid,
    municipality_id: invite.municipality_id,
    department_id:   invite.department_id,
    staff_role:      invite.target_role,
    invited_at:      new Date().toISOString(),
    onboarded_at:    new Date().toISOString(),
  });

  // Mark invitation as accepted
  await supabaseAdmin.from('staff_invitations').update({
    status: 'accepted', accepted_at: new Date().toISOString(),
  }).eq('token_hash', tokenHash);

  return { message: 'Account created successfully. You can now log in.' };
};

// ── Forgot password ──────────────────────────────────────────
export const forgotPasswordService = async (email: string) => {
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.CLIENT_URL}/reset-password`,
  });
  if (error) throw new Error(error.message);
  return { message: 'Password reset email sent if the account exists.' };
};