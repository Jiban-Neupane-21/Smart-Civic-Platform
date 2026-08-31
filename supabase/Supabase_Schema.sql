-- ============================================================================================
-- Smart Civic Platform — Supabase SQL Schema (v3, consolidated)
-- ============================================================================================
-- Run this in the Supabase SQL Editor (or `psql -f`) on a fresh database.
-- Designed around Nepal's federal local-government structure:
--   Province -> District -> Local Level (Municipality / Rural Municipality) -> Ward
--
-- Groups all 11 module plans into one coherent schema:
--   1. Municipality Creation      2. Dept & Staff Mgmt    3. Staff Creation (two-tier)
--   4. Team Creation              5. Citizen Registration  6. Complaint Flow
--   7. Lifecycle/SLA/Handoff      8. Notification System   9. Analytics & Dashboards
--  10. SuperAdmin Onboarding     11. First-Login Onboarding
-- ============================================================================================

-- ============================================================================================
-- 1. EXTENSIONS
-- ============================================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================================
-- 2. ENUMS
-- ============================================================================================

-- 2a. Core identity & account enums
CREATE TYPE user_role AS ENUM ('superadmin', 'municipality_head', 'department_head', 'staff', 'citizen');
CREATE TYPE onboarding_status AS ENUM ('invited', 'pending_onboarding', 'active', 'expired', 'suspended');
CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'suspended', 'terminated');
CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE notification_pref AS ENUM ('email', 'sms', 'both', 'none');

-- 2b. Administrative geography enums
CREATE TYPE local_level_type AS ENUM ('metropolitan_city', 'sub_metropolitan_city', 'municipality', 'rural_municipality');

-- 2c. Department & complaint enums
CREATE TYPE department_category AS ENUM (
  'water_supply', 'electricity', 'road_transport', 'sanitation', 'health',
  'education', 'public_works', 'revenue_tax', 'agriculture', 'disaster_management',
  'administration', 'other'
);
CREATE TYPE record_type AS ENUM ('complaint', 'request', 'inquiry');
CREATE TYPE complaint_status AS ENUM ('pending', 'assigned', 'under_review', 'in_progress', 'resolved', 'rejected', 'closed', 'escalated', 'reopened', 'cross_dept_pending');
CREATE TYPE assignment_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'reassigned');
CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE audience_scope AS ENUM ('individual', 'team', 'department', 'all_staff', 'all_citizens', 'everyone');

-- 2d. Security & onboarding enums
CREATE TYPE audit_action AS ENUM ('LOGIN', 'LOGOUT', 'INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'ROLE_CHANGE', 'ASSIGN', 'EXPORT');
CREATE TYPE severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE media_context AS ENUM ('complaint', 'assignment_proof', 'announcement');
CREATE TYPE dual_control_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE kyc_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE handoff_type AS ENUM ('peer_reassign', 'return_to_dept_head');
CREATE TYPE team_type AS ENUM ('single_department', 'cross_departmental');
CREATE TYPE invite_purpose AS ENUM ('staff_onboarding', 'department_head_onboarding', 'municipality_head_onboarding');
CREATE TYPE notification_type AS ENUM ('system', 'complaint_update', 'team_assignment', 'handoff', 'sla_warning', 'sla_escalation', 'broadcast');
CREATE TYPE notification_channel AS ENUM ('in_app', 'push', 'sms', 'email');

-- ============================================================================================
-- 3. NEPAL ADMINISTRATIVE HIERARCHY — Province -> District
-- ============================================================================================
CREATE TABLE provinces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    capital TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    province_id UUID NOT NULL REFERENCES provinces(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (province_id, name)
);

-- ============================================================================================
-- 4. MUNICIPALITIES
-- ============================================================================================
-- NOTE: All 753 municipalities are pre-seeded with is_active = FALSE.
-- Activation occurs when a municipality head is assigned (see PLAN-50-Phases.md).
-- head_profile_id FK added via ALTER TABLE after profiles table exists.
CREATE TABLE municipalities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
    official_name TEXT NOT NULL,
    official_email TEXT NOT NULL UNIQUE,
    official_contact_no TEXT,
    local_level_type local_level_type NOT NULL DEFAULT 'municipality',
    total_wards INTEGER NOT NULL DEFAULT 1 CHECK (total_wards > 0),
    official_logo TEXT,
    about_description TEXT,
    mayor_chairperson_name TEXT,
    deputy_mayor_vice_chairperson_name TEXT,
    head_profile_id UUID,
    head_name TEXT,
    head_email TEXT,
    head_contact_no TEXT,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 5. WARDS
-- ============================================================================================
CREATE TABLE wards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    ward_no INTEGER NOT NULL CHECK (ward_no > 0),
    ward_office_name TEXT,
    ward_chairperson_name TEXT,
    contact_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (municipality_id, ward_no)
);

-- ============================================================================================
-- 6. DEPARTMENTS
-- ============================================================================================
-- head_profile_id FK added via ALTER TABLE after profiles table exists.
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL,
    department_category department_category NOT NULL DEFAULT 'other',
    official_email TEXT NOT NULL,
    department_logo TEXT,
    head_profile_id UUID,
    head_name TEXT,
    head_email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (municipality_id, department_name)
);

-- ============================================================================================
-- 7. PROFILES — one row per auth.users; tenant scoping (municipality/department) for non-citizen roles
-- ============================================================================================
-- Enhanced with onboarding wizard, MFA, identity document, and security tracking columns.
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'citizen',
    account_status onboarding_status NOT NULL DEFAULT 'invited',
    municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    force_password_reset BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    password_updated_at TIMESTAMPTZ,
    force_mfa BOOLEAN NOT NULL DEFAULT FALSE,
    alternate_phone TEXT,
    designation TEXT,
    employee_id TEXT,
    onboarding_wizard_completed BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_completed_at TIMESTAMPTZ,
    identity_type TEXT,
    identity_number TEXT,
    identity_document_url TEXT,
    identity_verified_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dept_head_has_department CHECK (role <> 'department_head' OR department_id IS NOT NULL),
    CONSTRAINT chk_tenant_roles_have_municipality CHECK (role NOT IN ('municipality_head', 'department_head', 'staff') OR municipality_id IS NOT NULL),
    CONSTRAINT chk_contact_method CHECK (phone IS NOT NULL OR email IS NOT NULL)
);
CREATE UNIQUE INDEX idx_profiles_phone ON profiles(phone);
CREATE UNIQUE INDEX idx_profiles_identity_number ON profiles(identity_number) WHERE identity_number IS NOT NULL;

-- Close the circular FK references now that profiles exists.
ALTER TABLE municipalities ADD CONSTRAINT fk_municipalities_head_profile FOREIGN KEY (head_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE departments ADD CONSTRAINT fk_departments_head_profile FOREIGN KEY (head_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================================================
-- 8. STAFF
-- ============================================================================================
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    primary_department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    employee_id TEXT,
    expertise TEXT,
    contact_number TEXT,
    gender gender,
    date_of_birth DATE,
    personal_address TEXT,
    designation TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    kyc_status kyc_status NOT NULL DEFAULT 'unverified',
    kyc_submitted_at TIMESTAMPTZ,
    kyc_verified_at TIMESTAMPTZ,
    kyc_verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    kyc_rejection_reason TEXT,
    identity_type TEXT,
    identity_number TEXT,
    identity_front_url TEXT,
    identity_back_url TEXT,
    appointment_letter_url TEXT,
    photo_url TEXT,
    onboarded_at TIMESTAMPTZ DEFAULT NOW(),
    employee_status employee_status NOT NULL DEFAULT 'active',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, municipality_id)
);
CREATE INDEX idx_staff_kyc_status ON staff(kyc_status);

-- ============================================================================================
-- 8b. DELETED_STAFF — archive table for soft-deleted staff records
-- ============================================================================================
CREATE TABLE deleted_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_staff_id UUID NOT NULL,
    original_profile_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    employee_id TEXT,
    expertise TEXT,
    contact_number TEXT,
    gender gender,
    date_of_birth DATE,
    personal_address TEXT,
    employee_status TEXT,
    primary_department_id UUID,
    municipality_id UUID,
    deleted_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 9. CITIZENS
-- ============================================================================================
-- Enhanced with structured address fields (permanent/current) and KYC identity verification.
CREATE TABLE citizens (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    citizenship_id TEXT UNIQUE,
    gender gender,
    date_of_birth DATE CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE - INTERVAL '16 years'),
    profile_picture TEXT,
    current_address TEXT,
    permanent_address TEXT,
    -- Structured permanent address
    permanent_province_id UUID REFERENCES provinces(id) ON DELETE SET NULL,
    permanent_district_id UUID REFERENCES districts(id) ON DELETE SET NULL,
    permanent_municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL,
    permanent_ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
    permanent_tole TEXT,
    -- Structured current address
    current_province_id UUID REFERENCES provinces(id) ON DELETE SET NULL,
    current_district_id UUID REFERENCES districts(id) ON DELETE SET NULL,
    current_municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL,
    current_ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
    current_tole TEXT,
    -- KYC fields
    identity_type TEXT,
    identity_number TEXT UNIQUE,
    identity_front_image_url TEXT,
    identity_back_image_url TEXT,
    kyc_status kyc_status NOT NULL DEFAULT 'unverified',
    kyc_verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    kyc_verified_at TIMESTAMPTZ,
    kyc_rejection_reason TEXT,
    -- Legacy FK (kept for backward compat)
    ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
    contact_number TEXT,
    notification_pref notification_pref NOT NULL DEFAULT 'both',
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 10. OTP CODES — phone verification for citizen registration
-- ============================================================================================
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'registration',
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 11. SUPERADMIN INVITES — zero-trust admin onboarding (15-min token expiry)
-- ============================================================================================
CREATE TABLE superadmin_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    inviter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    designation TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 12. ROLE INVITES — unified invite for staff/dept head/muni head onboarding
-- ============================================================================================
CREATE TABLE role_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT,
    phone TEXT,
    token TEXT NOT NULL UNIQUE,
    role user_role NOT NULL,
    purpose invite_purpose NOT NULL DEFAULT 'staff_onboarding',
    municipality_id UUID REFERENCES municipalities(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    staff_role TEXT,
    additional_data JSONB,
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at TIMESTAMPTZ,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 13. ONBOARDING WIZARD PROGRESS — first-login forced wizard (4 steps)
-- ============================================================================================
CREATE TABLE onboarding_wizard_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 4),
    step1_completed BOOLEAN NOT NULL DEFAULT FALSE,
    step2_completed BOOLEAN NOT NULL DEFAULT FALSE,
    step3_completed BOOLEAN NOT NULL DEFAULT FALSE,
    step4_completed BOOLEAN NOT NULL DEFAULT FALSE,
    wizard_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 14. MFA TOKENS — multi-factor authentication (TOTP)
-- ============================================================================================
CREATE TABLE mfa_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'totp',
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (profile_id, method)
);

-- ============================================================================================
-- 15. IP WHITELIST — CIDR-based network rules for superadmins
-- ============================================================================================
CREATE TABLE ip_whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cidr TEXT NOT NULL,
    label TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 16. DUAL CONTROL REQUESTS — two-person approval for critical operations
-- ============================================================================================
CREATE TABLE dual_control_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    target_id UUID,
    payload JSONB,
    requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status dual_control_status NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    rejection_reason TEXT
);

-- ============================================================================================
-- 17. PASSWORD POLICY — global security config
-- ============================================================================================
CREATE TABLE password_policy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    min_length INTEGER NOT NULL DEFAULT 16,
    require_uppercase BOOLEAN NOT NULL DEFAULT TRUE,
    require_lowercase BOOLEAN NOT NULL DEFAULT TRUE,
    require_number BOOLEAN NOT NULL DEFAULT TRUE,
    require_special BOOLEAN NOT NULL DEFAULT TRUE,
    max_age_days INTEGER NOT NULL DEFAULT 90,
    prevent_reuse_count INTEGER NOT NULL DEFAULT 5,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 18. TEAMS — persistent squads (single-department or cross-departmental)
-- ============================================================================================
-- Enhanced with time-bound scheduling (start_date/end_date), type, and municipality scoping.
-- NOTE: teams table is defined early so complaints, assignments, and feedback can reference it.
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    municipality_id UUID REFERENCES municipalities(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    description TEXT,
    team_type team_type NOT NULL DEFAULT 'single_department',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_team_type CHECK (
        (team_type = 'single_department' AND department_id IS NOT NULL) OR
        (team_type = 'cross_departmental' AND municipality_id IS NOT NULL)
    ),
    CONSTRAINT chk_team_dates CHECK (start_date IS NULL OR end_date IS NULL OR start_date < end_date)
);
CREATE UNIQUE INDEX idx_teams_dept_name ON teams(department_id, team_name) WHERE department_id IS NOT NULL;

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    is_leader BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, staff_id)
);

-- ============================================================================================
-- 18a. STAFF ASSIGNMENTS — time-bound team membership with conflict detection
-- ============================================================================================
CREATE TABLE staff_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_emergency_override BOOLEAN NOT NULL DEFAULT FALSE,
    override_reason TEXT,
    released_at TIMESTAMPTZ,
    release_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (staff_id, team_id),
    CHECK (start_date < end_date)
);

-- ============================================================================================
-- 19. COMPLAINT CATEGORIES — drives routing, SLA, and department assignment
-- ============================================================================================
CREATE TABLE complaint_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_name TEXT NOT NULL UNIQUE,
    department_category department_category NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    default_priority priority NOT NULL DEFAULT 'medium',
    default_sla_hours INTEGER NOT NULL DEFAULT 72 CHECK (default_sla_hours > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 20. COMPLAINTS — core grievance ticket
-- ============================================================================================
-- Enhanced with tracking ID, geo-location, multi-department routing, SLA tracking, and handoff state.
CREATE TABLE complaints (
    co_uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_id TEXT NOT NULL UNIQUE,
    citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES complaint_categories(id),
    secondary_category_id UUID REFERENCES complaint_categories(id) ON DELETE SET NULL,
    assigned_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    lead_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    current_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    current_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    ticket_type record_type NOT NULL DEFAULT 'complaint',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority priority NOT NULL DEFAULT 'medium',
    severity_level TEXT NOT NULL DEFAULT 'medium',
    status complaint_status NOT NULL DEFAULT 'pending',
    cross_dept_status TEXT,
    -- Geo-location
    location_source TEXT,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    ward_number SMALLINT,
    rejection_reason TEXT,
    resolution_note TEXT,
    -- SLA tracking
    sla_level INTEGER NOT NULL DEFAULT 0,
    sla_breached BOOLEAN NOT NULL DEFAULT FALSE,
    sla_breached_at TIMESTAMPTZ,
    escalated_to_munic_head BOOLEAN NOT NULL DEFAULT FALSE,
    escalated_at TIMESTAMPTZ,
    sla_due_at TIMESTAMPTZ,
    -- Handoff & workflow
    handoff_count INTEGER NOT NULL DEFAULT 0,
    submission_step_completed INTEGER NOT NULL DEFAULT 0,
    submitted_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolution_date TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 21. MEDIA — generic multi-attachment table
-- ============================================================================================
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    context media_context NOT NULL,
    context_id UUID NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 22. COMPLAINT UPDATES — citizen-visible timeline + internal notes
-- ============================================================================================
CREATE TABLE complaint_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(co_uid) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id),
    note TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 23. COMPLAINT ASSIGNMENTS — dispatch history (one current assignment per complaint)
-- ============================================================================================
CREATE TABLE complaint_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(co_uid) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    assigned_by UUID NOT NULL REFERENCES profiles(id),
    status assignment_status NOT NULL DEFAULT 'pending',
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 24. COMPLAINT HANDOFFS — staff handoff audit trail
-- ============================================================================================
CREATE TABLE complaint_handoffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(co_uid) ON DELETE CASCADE,
    from_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    to_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    to_department_head BOOLEAN NOT NULL DEFAULT FALSE,
    handoff_type handoff_type NOT NULL DEFAULT 'peer_reassign',
    handoff_reason TEXT NOT NULL,
    handoff_note TEXT,
    initiated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 25. COMPLAINT COLLABORATIONS — multi-department joint resolution
-- ============================================================================================
CREATE TABLE complaint_collaborations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(co_uid) ON DELETE CASCADE,
    primary_dept_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    supporting_dept_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    initiated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    initiation_method TEXT NOT NULL,
    inspection_note TEXT,
    primary_sign_off BOOLEAN NOT NULL DEFAULT FALSE,
    supporting_sign_off BOOLEAN NOT NULL DEFAULT FALSE,
    primary_signed_at TIMESTAMPTZ,
    supporting_signed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 26. COMPLAINT SIGN-OFFS — joint resolution approval audit
-- ============================================================================================
CREATE TABLE complaint_sign_offs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(co_uid) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    signed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_at_time user_role NOT NULL,
    decision TEXT NOT NULL,
    note TEXT,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 27. SLA EVENTS — escalation history (warning level 1, escalation level 2)
-- ============================================================================================
CREATE TABLE sla_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(co_uid) ON DELETE CASCADE,
    sla_level INTEGER NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status_at_time complaint_status NOT NULL,
    notified_staff BOOLEAN NOT NULL DEFAULT FALSE,
    notified_dept_head BOOLEAN NOT NULL DEFAULT FALSE,
    notified_munic_head BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ
);

-- ============================================================================================
-- 28. FEEDBACK
-- ============================================================================================
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL UNIQUE REFERENCES complaints(co_uid) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 29. ANNOUNCEMENTS
-- ============================================================================================
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    audience audience_scope NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 30. NOTIFICATIONS — broadcast messages with per-recipient read tracking
-- ============================================================================================
-- Enhanced with type, channel routing, complaint/ward linking, and delivery metadata.
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type notification_type NOT NULL DEFAULT 'system',
    audience audience_scope NOT NULL,
    target_municipality_id UUID REFERENCES municipalities(id) ON DELETE CASCADE,
    target_department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    target_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    target_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    target_ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
    complaint_id UUID REFERENCES complaints(co_uid) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    channels notification_channel[] NOT NULL DEFAULT '{in_app}',
    is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivery_status JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_seen BOOLEAN NOT NULL DEFAULT FALSE,
    is_clicked BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    UNIQUE (notification_id, profile_id)
);

CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    disabled_types notification_type[],
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    UNIQUE (profile_id, channel)
);

CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (profile_id, token)
);

CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_event TEXT NOT NULL UNIQUE,
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    channels notification_channel[] NOT NULL DEFAULT '{in_app}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 31. SYSTEM SETTINGS
-- ============================================================================================
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 32. AUDIT LOGS
-- ============================================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action_by_role user_role NOT NULL,
    municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    severity severity NOT NULL DEFAULT 'info',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 33. REFRESH TOKENS
-- ============================================================================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT
);

-- ============================================================================================
-- 34. ANALYTICS TABLES
-- ============================================================================================

CREATE TABLE dashboard_metrics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope TEXT NOT NULL,
    scope_id UUID NOT NULL,
    metrics JSONB NOT NULL,
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    UNIQUE (scope, scope_id)
);

CREATE TABLE monthly_aggregated_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipality_id UUID REFERENCES municipalities(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    year_month DATE NOT NULL,
    total_complaints INTEGER NOT NULL DEFAULT 0,
    resolved_count INTEGER NOT NULL DEFAULT 0,
    rejected_count INTEGER NOT NULL DEFAULT 0,
    reopened_count INTEGER NOT NULL DEFAULT 0,
    sla_breach_count INTEGER NOT NULL DEFAULT 0,
    avg_resolution_hours DECIMAL(10,2),
    avg_rating DECIMAL(3,2),
    total_handoffs INTEGER NOT NULL DEFAULT 0,
    total_escalations INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE executive_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope TEXT NOT NULL,
    scope_id UUID NOT NULL,
    title TEXT NOT NULL,
    report_type TEXT NOT NULL,
    format TEXT NOT NULL,
    file_url TEXT NOT NULL,
    parameters JSONB,
    generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE department_performance_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    total_complaints INTEGER NOT NULL DEFAULT 0,
    resolved_count INTEGER NOT NULL DEFAULT 0,
    sla_breach_count INTEGER NOT NULL DEFAULT 0,
    avg_resolution_hours DECIMAL(10,2),
    avg_rating DECIMAL(3,2),
    handoff_count INTEGER NOT NULL DEFAULT 0,
    escalation_count INTEGER NOT NULL DEFAULT 0,
    performance_score DECIMAL(5,2),
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (department_id, month)
);

-- ============================================================================================
-- 35. INDEXES
-- ============================================================================================

-- 35a. Geography indexes (v2 preserved)
CREATE INDEX idx_districts_province ON districts(province_id);
CREATE INDEX idx_municipalities_district ON municipalities(district_id);
CREATE INDEX idx_wards_municipality ON wards(municipality_id);
CREATE INDEX idx_departments_municipality ON departments(municipality_id);

-- 35b. Profile & staff indexes
CREATE INDEX idx_profiles_municipality ON profiles(municipality_id);
CREATE INDEX idx_profiles_department ON profiles(department_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_onboarding ON profiles(onboarding_wizard_completed, account_status);
CREATE INDEX idx_staff_municipality ON staff(municipality_id);
CREATE INDEX idx_staff_department ON staff(primary_department_id);

-- 35c. Citizen indexes
CREATE INDEX idx_citizens_ward ON citizens(ward_id);
CREATE INDEX idx_citizens_current_ward ON citizens(current_ward_id);
CREATE INDEX idx_citizens_kyc ON citizens(kyc_status);

-- 35d. OTP indexes
CREATE INDEX idx_otp_codes_phone_purpose ON otp_codes(phone, purpose, is_used);

-- 35e. Complaint indexes
CREATE INDEX idx_complaints_tracking ON complaints(tracking_id);
CREATE INDEX idx_complaints_municipality ON complaints(municipality_id);
CREATE INDEX idx_complaints_department ON complaints(assigned_department_id);
CREATE INDEX idx_complaints_citizen ON complaints(citizen_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_category ON complaints(category_id);
CREATE INDEX idx_complaints_resolution_date ON complaints(resolution_date);
CREATE INDEX idx_complaints_muni_status_date ON complaints(municipality_id, status, submitted_date);
CREATE INDEX idx_complaints_dept_status_date ON complaints(assigned_department_id, status, submitted_date);
CREATE INDEX idx_complaints_current_assignee ON complaints(current_staff_id);
CREATE INDEX idx_complaints_sla_breached ON complaints(municipality_id, sla_breached);
CREATE INDEX idx_complaints_ward_lookup ON complaints(citizen_id, submitted_date);

-- 35f. Media indexes
CREATE INDEX idx_media_context ON media(context, context_id);

-- 35g. Team indexes
CREATE INDEX idx_teams_department ON teams(department_id);
CREATE INDEX idx_teams_municipality ON teams(municipality_id);
CREATE INDEX idx_teams_created_by ON teams(created_by);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_staff ON team_members(staff_id);

-- 35h. Staff assignment indexes
CREATE INDEX idx_staff_assignments_staff ON staff_assignments(staff_id);
CREATE INDEX idx_staff_assignments_team ON staff_assignments(team_id);
CREATE INDEX idx_staff_assignments_dates ON staff_assignments(staff_id, start_date, end_date);

-- 35i. Complaint assignment indexes
CREATE INDEX idx_assignments_complaint ON complaint_assignments(complaint_id);
CREATE INDEX idx_assignments_team ON complaint_assignments(team_id);
CREATE INDEX idx_assignments_staff ON complaint_assignments(staff_id);
CREATE INDEX idx_assignments_current ON complaint_assignments(complaint_id) WHERE is_current = TRUE;

-- 35j. Complaint workflow indexes
CREATE INDEX idx_updates_complaint ON complaint_updates(complaint_id);
CREATE INDEX idx_handoffs_complaint ON complaint_handoffs(complaint_id);
CREATE INDEX idx_sla_events_complaint ON sla_events(complaint_id);
CREATE INDEX idx_collaborations_complaint ON complaint_collaborations(complaint_id);
CREATE INDEX idx_sign_offs_complaint ON complaint_sign_offs(complaint_id);

-- 35k. Feedback indexes
CREATE INDEX idx_feedback_rating ON feedback(complaint_id, rating);

-- 35l. Announcement indexes
CREATE INDEX idx_announcements_municipality ON announcements(municipality_id);

-- 35m. Notification indexes
CREATE INDEX idx_notifications_municipality ON notifications(target_municipality_id);
CREATE INDEX idx_notifications_department ON notifications(target_department_id);
CREATE INDEX idx_notifications_profile ON notifications(target_profile_id);
CREATE INDEX idx_notifications_type_sent ON notifications(type, sent_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_audience_ward ON notifications(audience, target_ward_id);
CREATE INDEX idx_notification_reads_profile ON notification_reads(profile_id);
CREATE INDEX idx_notif_logs_profile ON notification_logs(profile_id, status);
CREATE INDEX idx_notif_logs_notification ON notification_logs(notification_id);
CREATE INDEX idx_notif_logs_channel_status ON notification_logs(channel, status);

-- 35n. Security indexes
CREATE INDEX idx_sa_invites_token ON superadmin_invites(token);
CREATE INDEX idx_sa_invites_email ON superadmin_invites(email);
CREATE INDEX idx_role_invites_token ON role_invites(token);
CREATE INDEX idx_role_invites_email ON role_invites(email);
CREATE INDEX idx_dual_control_status ON dual_control_requests(status, requested_by);

-- 35o. Audit log indexes
CREATE INDEX idx_audit_logs_municipality ON audit_logs(municipality_id);
CREATE INDEX idx_audit_logs_action_by ON audit_logs(action_by);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- 35p. Analytics indexes
CREATE INDEX idx_monthly_stats_muni ON monthly_aggregated_stats(municipality_id, year_month);
CREATE INDEX idx_monthly_stats_dept ON monthly_aggregated_stats(department_id, year_month);
CREATE INDEX idx_dept_perf_month ON department_performance_scores(department_id, month);

-- ============================================================================================
-- 36. VIEWS
-- ============================================================================================

CREATE VIEW v_inactive_municipalities AS
SELECT m.id, m.official_name, m.official_email, m.local_level_type,
       d.name AS district_name, p.name AS province_name
FROM municipalities m
JOIN districts d ON d.id = m.district_id
JOIN provinces p ON p.id = d.province_id
WHERE m.is_active = FALSE;

CREATE VIEW v_active_municipalities AS
SELECT m.id, m.official_name, m.official_email, m.local_level_type,
       d.name AS district_name, p.name AS province_name,
       m.head_name, m.head_email
FROM municipalities m
JOIN districts d ON d.id = m.district_id
JOIN provinces p ON p.id = d.province_id
WHERE m.is_active = TRUE;

CREATE VIEW v_municipality_detail AS
SELECT m.*, d.name AS district_name, p.name AS province_name,
       prof.full_name AS head_full_name, prof.email AS head_email_address
FROM municipalities m
LEFT JOIN districts d ON d.id = m.district_id
LEFT JOIN provinces p ON p.id = d.province_id
LEFT JOIN profiles prof ON prof.id = m.head_profile_id;

-- ============================================================================================
-- 37. TRIGGERS & FUNCTIONS
-- ============================================================================================

-- 37a. Generic updated_at maintenance
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_municipalities_updated_at BEFORE UPDATE ON municipalities FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_wards_updated_at BEFORE UPDATE ON wards FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_citizens_updated_at BEFORE UPDATE ON citizens FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON complaint_assignments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_onboarding_progress_updated_at BEFORE UPDATE ON onboarding_wizard_progress FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_mfa_tokens_updated_at BEFORE UPDATE ON mfa_tokens FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_collaborations_updated_at BEFORE UPDATE ON complaint_collaborations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 37b. Auto-create profile (and citizen/staff record) when a new auth.users row appears
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
  v_gender public.gender;
  v_municipality_id UUID;
  v_department_id UUID;
  v_raw_role TEXT;
  v_raw_gender TEXT;
  v_raw_muni TEXT;
  v_raw_dept TEXT;
  v_citizen_pk_col TEXT;
  v_sql TEXT;
BEGIN
  v_raw_role   := NEW.raw_user_meta_data->>'role';
  v_raw_gender := NEW.raw_user_meta_data->>'gender';
  v_raw_muni   := NEW.raw_user_meta_data->>'municipality_id';
  v_raw_dept   := NEW.raw_user_meta_data->>'department_id';

  v_role := CASE
    WHEN v_raw_role IN ('superadmin', 'municipality_head', 'department_head', 'staff', 'citizen')
    THEN v_raw_role::public.user_role
    ELSE 'citizen'::public.user_role
  END;

  v_gender := CASE
    WHEN LOWER(v_raw_gender) IN ('male', 'female', 'other', 'prefer_not_to_say')
    THEN LOWER(v_raw_gender)::public.gender
    ELSE NULL
  END;

  v_municipality_id := CASE
    WHEN v_raw_muni ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    THEN v_raw_muni::uuid
    ELSE NULL
  END;

  v_department_id := CASE
    WHEN v_raw_dept ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    THEN v_raw_dept::uuid
    ELSE NULL
  END;

  INSERT INTO public.profiles (id, email, full_name, phone, role, municipality_id, department_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), NEW.phone),
    v_role,
    v_municipality_id,
    v_department_id
  );

  IF v_role = 'citizen' THEN
    INSERT INTO public.citizens (id, first_name, middle_name, last_name, current_address, permanent_address, gender, contact_number)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'first_name',
      NULLIF(NEW.raw_user_meta_data->>'middle_name', ''),
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'current_address',
      COALESCE(NEW.raw_user_meta_data->>'full_address', NEW.raw_user_meta_data->>'permanent_address'),
      v_gender,
      NULLIF(NEW.raw_user_meta_data->>'phone', '')
    );
  ELSIF v_role = 'staff' THEN
    IF v_municipality_id IS NOT NULL AND v_department_id IS NOT NULL THEN
      INSERT INTO public.staff (profile_id, municipality_id, primary_department_id, contact_number, gender, onboarded_at, employee_status)
      VALUES (NEW.id, v_municipality_id, v_department_id, NULLIF(NEW.raw_user_meta_data->>'phone', ''), v_gender, NOW(), 'active')
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 37c. Auto-fill SLA deadline from complaint category
CREATE OR REPLACE FUNCTION set_complaint_sla()
RETURNS TRIGGER AS $$
DECLARE
  v_hours INTEGER;
BEGIN
  IF NEW.sla_due_at IS NULL THEN
    SELECT default_sla_hours INTO v_hours FROM complaint_categories WHERE id = NEW.category_id;
    NEW.sla_due_at := NOW() + (COALESCE(v_hours, 72) || ' hours')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_complaint_sla BEFORE INSERT ON complaints FOR EACH ROW EXECUTE FUNCTION set_complaint_sla();

-- 37d. Keep exactly one "current" assignment per complaint
CREATE OR REPLACE FUNCTION deactivate_previous_assignments()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current THEN
    UPDATE complaint_assignments
       SET is_current = FALSE
     WHERE complaint_id = NEW.complaint_id
       AND id <> NEW.id
       AND is_current = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deactivate_previous_assignments AFTER INSERT ON complaint_assignments FOR EACH ROW EXECUTE FUNCTION deactivate_previous_assignments();

-- 37e. Auto-generate tracking ID for complaints
CREATE OR REPLACE FUNCTION generate_tracking_id()
RETURNS TRIGGER AS $$
DECLARE
  v_muni_code TEXT;
  v_year TEXT;
  v_seq INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YY');
  v_muni_code := UPPER(SUBSTRING(REPLACE(NEW.municipality_id::TEXT, '-', ''), 1, 4));
  SELECT COALESCE(MAX(CAST(SPLIT_PART(tracking_id, '-', 3) AS INTEGER)), 0) + 1
    INTO v_seq
    FROM complaints
   WHERE tracking_id LIKE v_muni_code || '-' || v_year || '-%';
  NEW.tracking_id := v_muni_code || '-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_tracking_id BEFORE INSERT ON complaints FOR EACH ROW EXECUTE FUNCTION generate_tracking_id();

-- 37f. Staff availability check function
CREATE OR REPLACE FUNCTION check_staff_availability(
  p_staff_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE(
  is_available BOOLEAN,
  conflicting_team_id UUID,
  conflicting_team_name TEXT,
  conflict_start TIMESTAMPTZ,
  conflict_end TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    FALSE AS is_available,
    t.id AS conflicting_team_id,
    t.team_name AS conflicting_team_name,
    sa.start_date AS conflict_start,
    sa.end_date AS conflict_end
  FROM staff_assignments sa
  JOIN teams t ON t.id = sa.team_id
  WHERE sa.staff_id = p_staff_id
    AND sa.released_at IS NULL
    AND sa.start_date < p_end_date
    AND sa.end_date > p_start_date;

  IF NOT FOUND THEN
    RETURN QUERY SELECT TRUE::BOOLEAN, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 37g. Auto-release expired staff assignments
CREATE OR REPLACE FUNCTION auto_release_expired_assignments()
RETURNS TABLE(released_staff_id UUID, team_id UUID) AS $$
BEGIN
  RETURN QUERY
  UPDATE staff_assignments sa
     SET released_at = NOW(),
         release_reason = 'auto_release_schedule_expired'
  WHERE sa.released_at IS NULL
    AND sa.end_date < NOW()
  RETURNING sa.staff_id, sa.team_id;
END;
$$ LANGUAGE plpgsql;

-- 37h. SLA escalation check function
CREATE OR REPLACE FUNCTION handle_sla_escalation()
RETURNS TABLE(complaint_id UUID, sla_level INTEGER) AS $$
DECLARE
  v_complaint RECORD;
BEGIN
  FOR v_complaint IN
    SELECT co_uid, status, sla_due_at, sla_level, municipality_id
    FROM complaints
    WHERE sla_breached = FALSE
      AND status NOT IN ('resolved', 'closed', 'rejected')
  LOOP
    -- Level 1: SLA due at passed (warning)
    IF v_complaint.sla_due_at IS NOT NULL
       AND v_complaint.sla_due_at < NOW()
       AND v_complaint.sla_level = 0
    THEN
      UPDATE complaints
         SET sla_level = 1,
             sla_breached = TRUE,
             sla_breached_at = NOW()
       WHERE co_uid = v_complaint.co_uid;

      INSERT INTO sla_events (complaint_id, sla_level, status_at_time, notified_staff, notified_dept_head)
      VALUES (v_complaint.co_uid, 1, v_complaint.status, TRUE, TRUE);

      complaint_id := v_complaint.co_uid;
      sla_level := 1;
      RETURN NEXT;
    END IF;

    -- Level 2: 48h after SLA due (escalation to municipality head)
    IF v_complaint.sla_due_at IS NOT NULL
       AND v_complaint.sla_due_at + INTERVAL '48 hours' < NOW()
       AND v_complaint.sla_level = 1
    THEN
      UPDATE complaints
         SET sla_level = 2,
             escalated_to_munic_head = TRUE,
             escalated_at = NOW(),
             status = 'escalated'
       WHERE co_uid = v_complaint.co_uid;

      INSERT INTO sla_events (complaint_id, sla_level, status_at_time, notified_staff, notified_dept_head, notified_munic_head)
      VALUES (v_complaint.co_uid, 2, v_complaint.status, TRUE, TRUE, TRUE);

      complaint_id := v_complaint.co_uid;
      sla_level := 2;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 37i. Audit logging function
CREATE OR REPLACE FUNCTION log_audit(
  p_action_by UUID,
  p_action_by_role user_role,
  p_municipality_id UUID,
  p_action audit_action,
  p_table_name TEXT,
  p_record_id TEXT,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_severity severity DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_logs (action_by, action_by_role, municipality_id, action, table_name, record_id, old_value, new_value, severity)
  VALUES (p_action_by, p_action_by_role, p_municipality_id, p_action, p_table_name, p_record_id, p_old_value, p_new_value, p_severity)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================================
-- 38. RPCs
-- ============================================================================================

CREATE OR REPLACE FUNCTION admin_set_user_role(target_user_id UUID, new_role user_role)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized: Only superadmins can change roles.';
  END IF;

  UPDATE profiles SET role = new_role WHERE id = target_user_id;

  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(new_role)
  )
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_department_categories()
RETURNS text[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT enumlabel
    FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'department_category'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================================
-- 39. RLS HELPER FUNCTIONS
-- ============================================================================================

CREATE OR REPLACE FUNCTION auth_role() RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_municipality_id() RETURNS UUID AS $$
  SELECT municipality_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_department_id() RETURNS UUID AS $$
  SELECT department_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_staff_id() RETURNS UUID AS $$
  SELECT id FROM staff WHERE profile_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================================
-- 40. ROW LEVEL SECURITY
-- ============================================================================================

-- 40a. Enable RLS on all tables
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizens ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_sign_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE superadmin_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_wizard_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE dual_control_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_aggregated_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_performance_scores ENABLE ROW LEVEL SECURITY;

-- 40b. Geography: reference data readable by everyone
CREATE POLICY "provinces_read_all" ON provinces FOR SELECT USING (true);
CREATE POLICY "districts_read_all" ON districts FOR SELECT USING (true);

-- 40c. Municipalities: superadmin sees/manages all; others see own tenant
CREATE POLICY "municipalities_select" ON municipalities FOR SELECT USING (
  auth_role() = 'superadmin' OR id = auth_municipality_id()
);
CREATE POLICY "municipalities_write_superadmin" ON municipalities FOR ALL USING (auth_role() = 'superadmin');
CREATE POLICY "municipalities_update_own" ON municipalities FOR UPDATE USING (
  auth_role() = 'municipality_head' AND id = auth_municipality_id()
);

-- 40d. Wards: visible to everyone (needed for signup lookups); writable by muni head/superadmin
CREATE POLICY "wards_read_all" ON wards FOR SELECT USING (true);
CREATE POLICY "wards_write_municipality" ON wards FOR ALL USING (
  auth_role() = 'superadmin' OR (auth_role() = 'municipality_head' AND municipality_id = auth_municipality_id())
);

-- 40e. Departments: scoped to municipality
CREATE POLICY "departments_select" ON departments FOR SELECT USING (
  auth_role() = 'superadmin' OR municipality_id = auth_municipality_id()
);
CREATE POLICY "departments_write_municipality" ON departments FOR ALL USING (
  auth_role() = 'superadmin' OR (auth_role() = 'municipality_head' AND municipality_id = auth_municipality_id())
);
CREATE POLICY "departments_update_own" ON departments FOR UPDATE USING (
  auth_role() = 'department_head' AND id = auth_department_id()
);

-- 40f. Profiles: self + tenant admins
CREATE POLICY "profiles_select_self" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_select_tenant" ON profiles FOR SELECT USING (
  auth_role() = 'superadmin'
  OR (auth_role() = 'municipality_head' AND municipality_id = auth_municipality_id())
  OR (auth_role() = 'department_head' AND department_id = auth_department_id())
);
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- 40g. Staff: scoped to municipality
CREATE POLICY "staff_select_tenant" ON staff FOR SELECT USING (
  auth_role() = 'superadmin' OR municipality_id = auth_municipality_id()
);
CREATE POLICY "staff_write_admins" ON staff FOR ALL USING (
  auth_role() = 'superadmin'
  OR (auth_role() = 'municipality_head' AND municipality_id = auth_municipality_id())
  OR (auth_role() = 'department_head' AND primary_department_id = auth_department_id())
);

-- 40h. Citizens: self + staff/admins
CREATE POLICY "citizens_select_self" ON citizens FOR SELECT USING (id = auth.uid());
CREATE POLICY "citizens_update_self" ON citizens FOR UPDATE USING (id = auth.uid());
CREATE POLICY "citizens_insert_self" ON citizens FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "citizens_select_staff" ON citizens FOR SELECT USING (
  auth_role() IN ('superadmin', 'municipality_head', 'department_head', 'staff')
);

-- 40i. Complaint categories: global reference data
CREATE POLICY "categories_read_all" ON complaint_categories FOR SELECT USING (true);
CREATE POLICY "categories_write_superadmin" ON complaint_categories FOR ALL USING (auth_role() = 'superadmin');

-- 40j. Complaints: citizen sees own; staff sees municipality queue
CREATE POLICY "complaints_select_citizen" ON complaints FOR SELECT USING (citizen_id = auth.uid());
CREATE POLICY "complaints_insert_citizen" ON complaints FOR INSERT WITH CHECK (citizen_id = auth.uid());
CREATE POLICY "complaints_select_municipality" ON complaints FOR SELECT USING (
  auth_role() = 'superadmin' OR municipality_id = auth_municipality_id()
);
CREATE POLICY "complaints_update_municipality" ON complaints FOR UPDATE USING (
  auth_role() = 'superadmin' OR municipality_id = auth_municipality_id()
);

-- 40k. Media: visible to authenticated users
CREATE POLICY "media_select_all_authenticated" ON media FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "media_insert_own" ON media FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- 40l. Teams & members: scoped to department/municipality
CREATE POLICY "teams_select" ON teams FOR SELECT USING (
  auth_role() = 'superadmin'
  OR municipality_id = auth_municipality_id()
  OR department_id = auth_department_id()
  OR department_id IN (SELECT id FROM departments WHERE municipality_id = auth_municipality_id())
);
CREATE POLICY "teams_write" ON teams FOR ALL USING (
  auth_role() = 'superadmin'
  OR (auth_role() IN ('municipality_head', 'department_head') AND municipality_id = auth_municipality_id())
);
CREATE POLICY "team_members_select" ON team_members FOR SELECT USING (
  team_id IN (SELECT id FROM teams WHERE municipality_id = auth_municipality_id() OR department_id = auth_department_id())
);
CREATE POLICY "team_members_write" ON team_members FOR ALL USING (
  auth_role() = 'superadmin'
  OR team_id IN (SELECT id FROM teams WHERE department_id = auth_department_id())
);

-- 40m. Staff assignments: scoped to department/municipality
CREATE POLICY "staff_assignments_select" ON staff_assignments FOR SELECT USING (
  auth_role() = 'superadmin'
  OR staff_id = auth_staff_id()
  OR team_id IN (SELECT id FROM teams WHERE municipality_id = auth_municipality_id())
);
CREATE POLICY "staff_assignments_write" ON staff_assignments FOR ALL USING (
  auth_role() = 'superadmin'
  OR (auth_role() IN ('municipality_head', 'department_head')
      AND team_id IN (SELECT id FROM teams WHERE municipality_id = auth_municipality_id()))
);

-- 40n. Complaint assignments: visible to involved parties
CREATE POLICY "assignments_select" ON complaint_assignments FOR SELECT USING (
  auth_role() = 'superadmin'
  OR staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
  OR complaint_id IN (SELECT co_uid FROM complaints WHERE municipality_id = auth_municipality_id())
  OR complaint_id IN (SELECT co_uid FROM complaints WHERE citizen_id = auth.uid())
);
CREATE POLICY "assignments_write_department" ON complaint_assignments FOR ALL USING (
  auth_role() = 'superadmin' OR auth_role() IN ('municipality_head', 'department_head')
);

-- 40o. Complaint updates: internal hidden from citizens
CREATE POLICY "updates_select_public" ON complaint_updates FOR SELECT USING (
  NOT is_internal AND complaint_id IN (SELECT co_uid FROM complaints WHERE citizen_id = auth.uid())
);
CREATE POLICY "updates_select_staff" ON complaint_updates FOR SELECT USING (
  auth_role() IN ('superadmin', 'municipality_head', 'department_head', 'staff')
);
CREATE POLICY "updates_insert_staff" ON complaint_updates FOR INSERT WITH CHECK (author_id = auth.uid());

-- 40p. Complaint handoffs: staff/admins in the municipality
CREATE POLICY "handoffs_select" ON complaint_handoffs FOR SELECT USING (
  auth_role() = 'superadmin'
  OR complaint_id IN (SELECT co_uid FROM complaints WHERE municipality_id = auth_municipality_id())
);
CREATE POLICY "handoffs_insert" ON complaint_handoffs FOR INSERT WITH CHECK (
  auth_role() IN ('superadmin', 'municipality_head', 'department_head')
);

-- 40q. Collaborations & sign-offs: involved departments
CREATE POLICY "collaborations_select" ON complaint_collaborations FOR SELECT USING (
  auth_role() = 'superadmin'
  OR primary_dept_id = auth_department_id()
  OR supporting_dept_id = auth_department_id()
  OR complaint_id IN (SELECT co_uid FROM complaints WHERE municipality_id = auth_municipality_id())
);
CREATE POLICY "collaborations_write" ON complaint_collaborations FOR ALL USING (
  auth_role() IN ('superadmin', 'municipality_head', 'department_head')
);
CREATE POLICY "sign_offs_select" ON complaint_sign_offs FOR SELECT USING (
  auth_role() = 'superadmin'
  OR department_id = auth_department_id()
  OR complaint_id IN (SELECT co_uid FROM complaints WHERE municipality_id = auth_municipality_id())
);
CREATE POLICY "sign_offs_insert" ON complaint_sign_offs FOR INSERT WITH CHECK (
  auth_role() IN ('superadmin', 'municipality_head', 'department_head')
);

-- 40r. SLA events: visible within municipality
CREATE POLICY "sla_events_select" ON sla_events FOR SELECT USING (
  auth_role() = 'superadmin'
  OR complaint_id IN (SELECT co_uid FROM complaints WHERE municipality_id = auth_municipality_id())
);

-- 40s. Feedback: citizen writes own; staff reads
CREATE POLICY "feedback_select_citizen" ON feedback FOR SELECT USING (citizen_id = auth.uid());
CREATE POLICY "feedback_insert_citizen" ON feedback FOR INSERT WITH CHECK (citizen_id = auth.uid());
CREATE POLICY "feedback_select_staff" ON feedback FOR SELECT USING (
  auth_role() IN ('superadmin', 'municipality_head', 'department_head')
);

-- 40t. Announcements: scoped to municipality
CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (
  auth_role() = 'superadmin' OR municipality_id = auth_municipality_id() OR NOT is_deleted
);
CREATE POLICY "announcements_write_admins" ON announcements FOR ALL USING (
  auth_role() IN ('superadmin', 'municipality_head', 'department_head')
);

-- 40u. Notifications: targeted recipients
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (
  target_profile_id = auth.uid()
  OR target_department_id = auth_department_id()
  OR target_municipality_id = auth_municipality_id()
  OR target_team_id IN (SELECT id FROM teams WHERE department_id = auth_department_id())
  OR auth_role() = 'superadmin'
);
CREATE POLICY "notifications_insert_admins" ON notifications FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "notification_reads_own" ON notification_reads FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "notification_logs_own" ON notification_logs FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "notification_preferences_own" ON notification_preferences FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "push_tokens_own" ON push_tokens FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "notification_templates_read" ON notification_templates FOR SELECT USING (true);
CREATE POLICY "notification_templates_write" ON notification_templates FOR ALL USING (auth_role() = 'superadmin');

-- 40v. Security tables: superadmin only or own profile
CREATE POLICY "superadmin_invites_superadmin" ON superadmin_invites FOR ALL USING (auth_role() = 'superadmin');
CREATE POLICY "role_invites_select" ON role_invites FOR SELECT USING (
  auth_role() = 'superadmin'
  OR municipality_id = auth_municipality_id()
);
CREATE POLICY "role_invites_write" ON role_invites FOR INSERT WITH CHECK (
  auth_role() IN ('superadmin', 'municipality_head')
);
CREATE POLICY "onboarding_wizard_own" ON onboarding_wizard_progress FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "mfa_tokens_own" ON mfa_tokens FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "ip_whitelist_superadmin" ON ip_whitelist FOR ALL USING (auth_role() = 'superadmin');
CREATE POLICY "dual_control_requests_select" ON dual_control_requests FOR SELECT USING (
  requested_by = auth.uid()
  OR approved_by = auth.uid()
  OR auth_role() = 'superadmin'
);
CREATE POLICY "dual_control_requests_insert" ON dual_control_requests FOR INSERT WITH CHECK (requested_by = auth.uid());
CREATE POLICY "dual_control_requests_update" ON dual_control_requests FOR UPDATE USING (
  auth_role() = 'superadmin' OR approved_by = auth.uid()
);
CREATE POLICY "password_policy_read" ON password_policy FOR SELECT USING (true);
CREATE POLICY "password_policy_write" ON password_policy FOR ALL USING (auth_role() = 'superadmin');

-- 40w. OTP codes: system-only (function-based access)
CREATE POLICY "otp_codes_system" ON otp_codes FOR ALL USING (FALSE);

-- 40x. System settings: superadmin only
CREATE POLICY "system_settings_superadmin" ON system_settings FOR ALL USING (auth_role() = 'superadmin');

-- 40y. Audit logs: superadmin sees everything; muni head sees own
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (
  auth_role() = 'superadmin' OR municipality_id = auth_municipality_id()
);
CREATE POLICY "audit_logs_insert_system" ON audit_logs FOR INSERT WITH CHECK (true);

-- 40z. Refresh tokens: own only
CREATE POLICY "refresh_tokens_own" ON refresh_tokens FOR ALL USING (profile_id = auth.uid());

-- 40aa. Analytics: role-scoped
CREATE POLICY "dashboard_cache_superadmin" ON dashboard_metrics_cache FOR ALL USING (auth_role() = 'superadmin');
CREATE POLICY "dashboard_cache_read" ON dashboard_metrics_cache FOR SELECT USING (
  scope_id = auth_municipality_id()
);
CREATE POLICY "monthly_stats_read" ON monthly_aggregated_stats FOR SELECT USING (
  auth_role() = 'superadmin' OR municipality_id = auth_municipality_id()
);
CREATE POLICY "executive_reports_read" ON executive_reports FOR SELECT USING (
  auth_role() = 'superadmin' OR scope_id = auth_municipality_id()
);
CREATE POLICY "dept_perf_read" ON department_performance_scores FOR SELECT USING (
  auth_role() = 'superadmin' OR municipality_id = auth_municipality_id()
);

-- ============================================================================================
-- 41. SEED DATA — Nepal's 7 provinces and 77 districts
-- ============================================================================================
DO $$
DECLARE
  v_koshi UUID; v_madhesh UUID; v_bagmati UUID; v_gandaki UUID;
  v_lumbini UUID; v_karnali UUID; v_sudurpashchim UUID;
BEGIN
  INSERT INTO provinces (name, capital) VALUES ('Koshi', 'Biratnagar') RETURNING id INTO v_koshi;
  INSERT INTO provinces (name, capital) VALUES ('Madhesh', 'Janakpur') RETURNING id INTO v_madhesh;
  INSERT INTO provinces (name, capital) VALUES ('Bagmati', 'Hetauda') RETURNING id INTO v_bagmati;
  INSERT INTO provinces (name, capital) VALUES ('Gandaki', 'Pokhara') RETURNING id INTO v_gandaki;
  INSERT INTO provinces (name, capital) VALUES ('Lumbini', 'Deukhuri') RETURNING id INTO v_lumbini;
  INSERT INTO provinces (name, capital) VALUES ('Karnali', 'Birendranagar') RETURNING id INTO v_karnali;
  INSERT INTO provinces (name, capital) VALUES ('Sudurpashchim', 'Godawari') RETURNING id INTO v_sudurpashchim;

  INSERT INTO districts (province_id, name) VALUES
    (v_koshi, 'Bhojpur'), (v_koshi, 'Dhankuta'), (v_koshi, 'Ilam'), (v_koshi, 'Jhapa'),
    (v_koshi, 'Khotang'), (v_koshi, 'Morang'), (v_koshi, 'Okhaldhunga'), (v_koshi, 'Panchthar'),
    (v_koshi, 'Sankhuwasabha'), (v_koshi, 'Solukhumbu'), (v_koshi, 'Sunsari'), (v_koshi, 'Taplejung'),
    (v_koshi, 'Tehrathum'), (v_koshi, 'Udayapur'),
    (v_madhesh, 'Parsa'), (v_madhesh, 'Bara'), (v_madhesh, 'Rautahat'), (v_madhesh, 'Sarlahi'),
    (v_madhesh, 'Dhanusha'), (v_madhesh, 'Siraha'), (v_madhesh, 'Mahottari'), (v_madhesh, 'Saptari'),
    (v_bagmati, 'Sindhuli'), (v_bagmati, 'Ramechhap'), (v_bagmati, 'Dolakha'), (v_bagmati, 'Bhaktapur'),
    (v_bagmati, 'Dhading'), (v_bagmati, 'Kathmandu'), (v_bagmati, 'Kavrepalanchok'), (v_bagmati, 'Lalitpur'),
    (v_bagmati, 'Nuwakot'), (v_bagmati, 'Rasuwa'), (v_bagmati, 'Sindhupalchok'), (v_bagmati, 'Chitwan'),
    (v_bagmati, 'Makwanpur'),
    (v_gandaki, 'Baglung'), (v_gandaki, 'Gorkha'), (v_gandaki, 'Kaski'), (v_gandaki, 'Lamjung'),
    (v_gandaki, 'Manang'), (v_gandaki, 'Mustang'), (v_gandaki, 'Myagdi'), (v_gandaki, 'Nawalpur'),
    (v_gandaki, 'Parbat'), (v_gandaki, 'Syangja'), (v_gandaki, 'Tanahun'),
    (v_lumbini, 'Kapilvastu'), (v_lumbini, 'Parasi'), (v_lumbini, 'Rupandehi'), (v_lumbini, 'Arghakhanchi'),
    (v_lumbini, 'Gulmi'), (v_lumbini, 'Palpa'), (v_lumbini, 'Dang'), (v_lumbini, 'Pyuthan'),
    (v_lumbini, 'Rolpa'), (v_lumbini, 'Eastern Rukum'), (v_lumbini, 'Banke'), (v_lumbini, 'Bardiya'),
    (v_karnali, 'Western Rukum'), (v_karnali, 'Salyan'), (v_karnali, 'Dolpa'), (v_karnali, 'Humla'),
    (v_karnali, 'Jumla'), (v_karnali, 'Kalikot'), (v_karnali, 'Mugu'), (v_karnali, 'Surkhet'),
    (v_karnali, 'Dailekh'), (v_karnali, 'Jajarkot'),
    (v_sudurpashchim, 'Kailali'), (v_sudurpashchim, 'Achham'), (v_sudurpashchim, 'Doti'),
    (v_sudurpashchim, 'Bajhang'), (v_sudurpashchim, 'Bajura'), (v_sudurpashchim, 'Kanchanpur'),
    (v_sudurpashchim, 'Dadeldhura'), (v_sudurpashchim, 'Baitadi'), (v_sudurpashchim, 'Darchula');
END $$;

-- ============================================================================================
-- 42. SEED DATA — Starter complaint categories
-- ============================================================================================
INSERT INTO complaint_categories (category_name, department_category, default_priority, default_sla_hours) VALUES
  ('Drinking Water Shortage', 'water_supply', 'high', 48),
  ('Water Pipe Leakage', 'water_supply', 'medium', 72),
  ('Power Outage', 'electricity', 'high', 24),
  ('Streetlight Not Working', 'electricity', 'low', 120),
  ('Pothole / Road Damage', 'road_transport', 'medium', 168),
  ('Garbage Not Collected', 'sanitation', 'medium', 48),
  ('Public Bin Overflow', 'sanitation', 'low', 72),
  ('Health Post Service Issue', 'health', 'high', 48),
  ('School Infrastructure Issue', 'education', 'medium', 168),
  ('Land Revenue / Tax Query', 'revenue_tax', 'low', 120),
  ('Disaster Relief Request', 'disaster_management', 'urgent', 12),
  ('General Administrative Request', 'administration', 'medium', 96);

-- ============================================================================================
-- 43. SEED DATA — System settings
-- ============================================================================================
INSERT INTO system_settings (key, value, description) VALUES
  ('maintenance_mode', '{"enabled": false, "message": ""}', 'Global maintenance mode toggle and banner message shown platform-wide'),
  ('platform_name', '{"name": "Smart Civic Platform"}', 'Platform display name');

-- ============================================================================================
-- 44. SEED DATA — Default password policy
-- ============================================================================================
INSERT INTO password_policy (min_length, require_uppercase, require_lowercase, require_number, require_special, max_age_days, prevent_reuse_count)
VALUES (16, TRUE, TRUE, TRUE, TRUE, 90, 5);

-- ============================================================================================
-- 45. SEED DATA — Notification templates for automated triggers
-- ============================================================================================
INSERT INTO notification_templates (trigger_event, title_template, body_template, channels) VALUES
  ('staff_onboarded', 'Welcome to the team', 'Hi {{full_name}}, you have been onboarded as {{role}} in {{department_name}}, {{municipality_name}}.', '{in_app,sms,email}'),
  ('team_assigned', 'Team assignment', 'You have been assigned to team {{team_name}} from {{start_date}} to {{end_date}}.', '{in_app,push}'),
  ('complaint_registered', 'Complaint received', 'Your complaint #{{tracking_id}} has been registered. Track it at {{tracking_url}}.', '{in_app,sms}'),
  ('ticket_assigned', 'New ticket assigned', 'Ticket #{{tracking_id}} has been assigned to you. Priority: {{priority}}, SLA: {{sla_due_at}}.', '{in_app,push,sms}'),
  ('ticket_resolved', 'Ticket resolved', 'Your complaint #{{tracking_id}} has been resolved. Please provide feedback at {{feedback_url}}.', '{in_app,sms}'),
  ('sla_warning', 'SLA warning', 'Ticket #{{tracking_id}} is approaching SLA deadline. Due: {{sla_due_at}}.', '{in_app,push}'),
  ('sla_escalation', 'SLA escalation', 'Ticket #{{tracking_id}} has been escalated to municipality head due to SLA breach.', '{in_app,email}'),
  ('handoff_initiated', 'Ticket handed off', 'Ticket #{{tracking_id}} has been handed off from {{from_staff}} to {{to_staff}}. Reason: {{reason}}.', '{in_app,push}');

-- ============================================================================================
-- 46. VIEWS FOR SUPERADMIN & MUNICIPALITY MANAGEMENT
-- ============================================================================================

DROP VIEW IF EXISTS v_active_municipalities CASCADE;
CREATE VIEW v_active_municipalities AS
SELECT 
    m.*,
    d.name AS district_name,
    p.name AS province_name,
    p.id AS province_id
FROM municipalities m
JOIN districts d ON m.district_id = d.id
JOIN provinces p ON d.province_id = p.id
WHERE m.is_active = TRUE;

DROP VIEW IF EXISTS v_inactive_municipalities CASCADE;
CREATE VIEW v_inactive_municipalities AS
SELECT 
    m.*,
    d.name AS district_name,
    p.name AS province_name,
    p.id AS province_id
FROM municipalities m
JOIN districts d ON m.district_id = d.id
JOIN provinces p ON d.province_id = p.id
WHERE m.is_active = FALSE;

DROP VIEW IF EXISTS v_municipality_detail CASCADE;
CREATE VIEW v_municipality_detail AS
SELECT 
    m.*,
    d.name AS district_name,
    p.name AS province_name,
    p.id AS province_id
FROM municipalities m
JOIN districts d ON m.district_id = d.id
JOIN provinces p ON d.province_id = p.id;

DROP VIEW IF EXISTS v_superadmin_analytics CASCADE;
CREATE VIEW v_superadmin_analytics AS
SELECT
    (SELECT COUNT(*) FROM municipalities WHERE is_active = TRUE)::BIGINT AS total_municipalities,
    (SELECT COUNT(*) FROM departments WHERE is_active = TRUE)::BIGINT AS total_departments,
    (SELECT COUNT(*) FROM staff WHERE employee_status = 'active' AND is_deleted = FALSE)::BIGINT AS total_staff,
    (SELECT COUNT(*) FROM profiles WHERE role = 'citizen' AND is_deleted = FALSE)::BIGINT AS total_citizens,
    (SELECT COUNT(*) FROM profiles WHERE account_status = 'active' AND is_deleted = FALSE)::BIGINT AS total_active_users,
    (SELECT COUNT(*) FROM profiles WHERE account_status = 'suspended' AND is_deleted = FALSE)::BIGINT AS total_suspended_users,
    (SELECT COUNT(*) FROM complaints WHERE status IN ('pending', 'under_review', 'in_progress', 'assigned'))::BIGINT AS total_pending_complaints,
    (SELECT COUNT(*) FROM complaints WHERE status = 'resolved')::BIGINT AS total_resolved_complaints;

NOTIFY pgrst, 'reload schema';

-- 1. Create the buckets with limits + allowed MIME types
-- 5 MB for documents, 2 MB for images; enforce allowed types at the bucket level
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('identity-documents', 'identity-documents', true, 5242880,
    array['image/png','image/jpeg','image/jpg','application/pdf']),
  ('complaint-media',    'complaint-media',    true, 5242880,
    array['image/png','image/jpeg','image/jpg','image/webp']),
  ('avatars',            'avatars',            true, 2097152,
    array['image/png','image/jpeg','image/jpg']),
  ('logos',              'logos',              true, 2097152,
    array['image/png','image/jpeg','image/jpg','image/svg+xml'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Storage RLS policies
-- Public read on all four buckets
create policy "objects_read_public" on storage.objects
  for select using (bucket_id in ('identity-documents','complaint-media','avatars','logos'));

-- avatars: users may manage only their own avatar
create policy "avatars_write_own" on storage.objects for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- logos: superadmin all; municipality head only their own municipality's logo
create policy "logos_write_municipality" on storage.objects for all
  using (bucket_id = 'logos'
    and (storage.foldername(name))[1] = 'municipalities'
    and (storage.foldername(name))[2] = auth_municipality_id()::text)
  with check (bucket_id = 'logos'
    and (storage.foldername(name))[1] = 'municipalities'
    and (storage.foldername(name))[2] = auth_municipality_id()::text);

create policy "logos_write_department" on storage.objects for all
  using (bucket_id = 'logos'
    and (storage.foldername(name))[1] = 'departments'
    and (storage.foldername(name))[2] = auth_department_id()::text)
  with check (bucket_id = 'logos'
    and (storage.foldername(name))[1] = 'departments'
    and (storage.foldername(name))[2] = auth_department_id()::text);

create policy "logos_write_superadmin" on storage.objects for all
  using (bucket_id = 'logos' and auth_role() = 'superadmin')
  with check (bucket_id = 'logos' and auth_role() = 'superadmin');

-- identity-documents + complaint-media: users manage files under their own folder
create policy "docs_write_own" on storage.objects for all
  using (bucket_id in ('identity-documents','complaint-media')
    and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('identity-documents','complaint-media')
    and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Add the missing avatar column for admin/staff/muni profiles
alter table profiles add column if not exists profile_picture text;
