-- ============================================================================================
-- Smart Civic Platform — Supabase SQL Schema (v2, fixed)
-- ============================================================================================
-- Run this in the Supabase SQL Editor (or `psql -f`) on a fresh database.
-- Designed around Nepal's federal local-government structure:
--   Province -> District -> Local Level (Municipality / Rural Municipality) -> Ward
-- ============================================================================================

-- ============================================================================================
-- 1. EXTENSIONS
-- ============================================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================================
-- 2. ENUMS
-- ============================================================================================
CREATE TYPE user_role AS ENUM ('superadmin', 'municipality_head', 'department_head', 'staff', 'citizen');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'suspended', 'terminated');
CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE notification_pref AS ENUM ('email', 'sms', 'both', 'none');

-- Nepal's four official categories of local government (Local Government Operation Act, 2074)
CREATE TYPE local_level_type AS ENUM ('metropolitan_city', 'sub_metropolitan_city', 'municipality', 'rural_municipality');

-- Municipal department categories (replaces the unused `department_type` enum + free-text routing field)
CREATE TYPE department_category AS ENUM (
  'water_supply', 'electricity', 'road_transport', 'sanitation', 'health',
  'education', 'public_works', 'revenue_tax', 'agriculture', 'disaster_management',
  'administration', 'other'
);

CREATE TYPE record_type AS ENUM ('complaint', 'request', 'inquiry');
CREATE TYPE complaint_status AS ENUM ('pending', 'under_review', 'in_progress', 'resolved', 'rejected', 'closed');
CREATE TYPE assignment_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'reassigned');
CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- One consolidated targeting enum (replaces the old broadcast_type / announcement_audience / notification_audience trio)
CREATE TYPE audience_scope AS ENUM ('individual', 'team', 'department', 'all_staff', 'all_citizens', 'everyone');

CREATE TYPE audit_action AS ENUM ('LOGIN', 'LOGOUT', 'INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'ROLE_CHANGE', 'ASSIGN', 'EXPORT');
CREATE TYPE severity AS ENUM ('info', 'warning', 'critical');

-- Generic multi-photo attachments only (logos / profile pictures stay as simple URL columns)
CREATE TYPE media_context AS ENUM ('complaint', 'assignment_proof', 'announcement');

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
-- NOTE: head_profile_id is declared WITHOUT a foreign key here on purpose. It points at
-- `profiles`, which does not exist yet, and `profiles` itself points back at `municipalities`.
-- That circular dependency is what made the original script fail. We add the constraint with
-- ALTER TABLE once `profiles` exists below (see section 7).
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
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 5. WARDS — every Nepali local level is formally subdivided into numbered wards
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
-- Same circular-FK situation as municipalities: head_profile_id constraint added later.
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
-- 7. PROFILES — one row per auth.users; this is where tenant scoping (municipality/department)
--    lives for every non-citizen role.
-- ============================================================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'citizen',
    account_status account_status NOT NULL DEFAULT 'active',
    municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    force_password_reset BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    last_login_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dept_head_has_department CHECK (role <> 'department_head' OR department_id IS NOT NULL),
    CONSTRAINT chk_tenant_roles_have_municipality CHECK (role NOT IN ('municipality_head', 'department_head', 'staff') OR municipality_id IS NOT NULL)
);

-- Now that `profiles` exists, close the loop on the two circular references.
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
    onboarded_at TIMESTAMPTZ DEFAULT NOW(),
    employee_status employee_status NOT NULL DEFAULT 'active',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, municipality_id)
);

-- ============================================================================================
-- 8b. DELETED_STAFF — archive table for soft-deleted staff records (preserves full snapshot)
-- ============================================================================================
CREATE TABLE deleted_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_staff_id UUID NOT NULL,
    original_profile_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
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
-- Trimmed the three redundant address fields down to current/permanent (Nepali government forms
-- distinguish "हालको ठेगाना" from "स्थायी ठेगाना"), and ward is now a real FK instead of free text.
CREATE TABLE citizens (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    citizenship_id TEXT UNIQUE,
    gender gender,
    date_of_birth DATE,
    profile_picture TEXT,
    current_address TEXT,
    permanent_address TEXT,
    ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
    contact_number TEXT,
    notification_pref notification_pref NOT NULL DEFAULT 'both',
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 10. COMPLAINT CATEGORIES — now drives both routing and SLA, instead of a free-text department name
-- ============================================================================================
CREATE TABLE complaint_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_name TEXT NOT NULL UNIQUE,
    department_category department_category NOT NULL,
    default_priority priority NOT NULL DEFAULT 'medium',
    default_sla_hours INTEGER NOT NULL DEFAULT 72 CHECK (default_sla_hours > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 11. COMPLAINTS
-- ============================================================================================
CREATE TABLE complaints (
    co_uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES complaint_categories(id),
    assigned_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    ticket_type record_type NOT NULL DEFAULT 'complaint',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority priority NOT NULL DEFAULT 'medium',
    status complaint_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    resolution_note TEXT,
    sla_due_at TIMESTAMPTZ,
    submitted_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolution_date TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 12. MEDIA — generic multi-attachment table (one complaint can have many photos; the old schema
--     only allowed a single attachment_url)
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
-- 13. TEAMS — persistent squads within a department. (The old schema bolted a complaint_id
--     directly onto teams, which meant a team could only ever exist for one complaint. The
--     PRD's own "Team Grid View" and member-count cards assume teams persist across many tickets,
--     so that column is gone — assignment now lives in complaint_assignments below.)
-- ============================================================================================
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (department_id, team_name)
);

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    is_leader BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, staff_id)
);

-- ============================================================================================
-- 14. COMPLAINT ASSIGNMENTS — dispatch history. Every time a department admin assigns or
--     reassigns a ticket to a team/staff member, a new row is added here, so the full routing
--     history survives even after a reassignment (auditability the PRD's audit log depends on).
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
-- 15. COMPLAINT UPDATES — the citizen-visible "updates or comments left by officials" timeline,
--     plus internal-only staff notes. The old schema had no home for this at all.
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
-- 16. FEEDBACK
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
-- 17. ANNOUNCEMENTS
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
-- 18. NOTIFICATIONS — the broadcast message itself. Per-recipient read state is tracked
--     separately in notification_reads below, because a single `is_read` boolean on a message
--     sent to "all_staff" can't represent who has actually read it.
-- ============================================================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    audience audience_scope NOT NULL,
    target_municipality_id UUID REFERENCES municipalities(id) ON DELETE CASCADE,
    target_department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    target_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    target_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (notification_id, profile_id)
);

-- ============================================================================================
-- 19. SYSTEM SETTINGS — global maintenance mode, API keys, etc. (superadmin only). The old
--     schema had no table backing this at all despite the PRD's "Global Maintenance Mode" page.
-- ============================================================================================
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================================
-- 20. AUDIT LOGS
-- ============================================================================================
-- Added municipality_id: the Global Super-Admin audit log explicitly filters "by specific
-- municipality", which the old schema had no column to support.
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
-- 21. REFRESH TOKENS
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
-- 22. INDEXES
-- ============================================================================================
CREATE INDEX idx_districts_province ON districts(province_id);
CREATE INDEX idx_municipalities_district ON municipalities(district_id);
CREATE INDEX idx_wards_municipality ON wards(municipality_id);
CREATE INDEX idx_departments_municipality ON departments(municipality_id);
CREATE INDEX idx_profiles_municipality ON profiles(municipality_id);
CREATE INDEX idx_profiles_department ON profiles(department_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_staff_municipality ON staff(municipality_id);
CREATE INDEX idx_staff_department ON staff(primary_department_id);
CREATE INDEX idx_citizens_ward ON citizens(ward_id);
CREATE INDEX idx_complaints_municipality ON complaints(municipality_id);
CREATE INDEX idx_complaints_department ON complaints(assigned_department_id);
CREATE INDEX idx_complaints_citizen ON complaints(citizen_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_category ON complaints(category_id);
CREATE INDEX idx_media_context ON media(context, context_id);
CREATE INDEX idx_teams_department ON teams(department_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_staff ON team_members(staff_id);
CREATE INDEX idx_assignments_complaint ON complaint_assignments(complaint_id);
CREATE INDEX idx_assignments_team ON complaint_assignments(team_id);
CREATE INDEX idx_assignments_staff ON complaint_assignments(staff_id);
CREATE INDEX idx_assignments_current ON complaint_assignments(complaint_id) WHERE is_current = TRUE;
CREATE INDEX idx_updates_complaint ON complaint_updates(complaint_id);
CREATE INDEX idx_announcements_municipality ON announcements(municipality_id);
CREATE INDEX idx_notifications_municipality ON notifications(target_municipality_id);
CREATE INDEX idx_notifications_department ON notifications(target_department_id);
CREATE INDEX idx_notifications_profile ON notifications(target_profile_id);
CREATE INDEX idx_notification_reads_profile ON notification_reads(profile_id);
CREATE INDEX idx_audit_logs_municipality ON audit_logs(municipality_id);
CREATE INDEX idx_audit_logs_action_by ON audit_logs(action_by);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================================
-- 23. TRIGGERS & FUNCTIONS
-- ============================================================================================

-- Generic updated_at maintenance
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

-- Auto-create a profile (and citizen/staff record) when a new auth.users row appears
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'citizen'::public.user_role);

  INSERT INTO public.profiles (id, email, full_name, phone, role, municipality_id, department_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    NEW.raw_user_meta_data->>'phone',
    v_role,
    NULLIF(NEW.raw_user_meta_data->>'municipality_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'department_id', '')::uuid
  );

  IF v_role = 'citizen' THEN
    INSERT INTO public.citizens (id, first_name, last_name, current_address, gender)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'full_address',
      (NEW.raw_user_meta_data->>'gender')::public.gender
    );
  ELSIF v_role = 'staff' THEN
    INSERT INTO public.staff (profile_id, municipality_id, primary_department_id, contact_number, gender)
    VALUES (
      NEW.id,
      NULLIF(NEW.raw_user_meta_data->>'municipality_id', '')::uuid,
      NULLIF(NEW.raw_user_meta_data->>'department_id', '')::uuid,
      NEW.raw_user_meta_data->>'phone',
      (NEW.raw_user_meta_data->>'gender')::public.gender
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-fill SLA deadline from the complaint's category when not explicitly set
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

-- Keep exactly one "current" assignment per complaint when it's reassigned
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

-- ============================================================================================
-- 24. RPCs
-- ============================================================================================
CREATE OR REPLACE FUNCTION admin_set_user_role(target_user_id UUID, new_role user_role)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
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

-- ============================================================================================
-- 25. RLS HELPER FUNCTIONS
-- ============================================================================================
-- SECURITY DEFINER + STABLE so these can be called inside policies on `profiles` itself
-- without triggering infinite recursion, and so Postgres can cache the result per statement.
CREATE OR REPLACE FUNCTION auth_role() RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_municipality_id() RETURNS UUID AS $$
  SELECT municipality_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_department_id() RETURNS UUID AS $$
  SELECT department_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================================
-- 26. ROW LEVEL SECURITY
-- ============================================================================================
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
ALTER TABLE complaint_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Reference geography: readable by everyone (needed for citizen signup dropdowns)
CREATE POLICY "provinces_read_all" ON provinces FOR SELECT USING (true);
CREATE POLICY "districts_read_all" ON districts FOR SELECT USING (true);

-- Municipalities: superadmin sees/manages all; everyone else only sees their own tenant
CREATE POLICY "municipalities_select" ON municipalities FOR SELECT USING (
  auth_role() = 'superadmin' OR id = auth_municipality_id()
);
CREATE POLICY "municipalities_write_superadmin" ON municipalities FOR ALL USING (auth_role() = 'superadmin');
CREATE POLICY "municipalities_update_own" ON municipalities FOR UPDATE USING (
  auth_role() = 'municipality_head' AND id = auth_municipality_id()
);

-- Wards: visible within the owning municipality, or to anyone (signup needs ward lookups)
CREATE POLICY "wards_read_all" ON wards FOR SELECT USING (true);
CREATE POLICY "wards_write_municipality" ON wards FOR ALL USING (
  auth_role() = 'superadmin' OR (auth_role() = 'municipality_head' AND municipality_id = auth_municipality_id())
);

-- Departments: scoped to municipality; department_head can update their own department
CREATE POLICY "departments_select" ON departments FOR SELECT USING (
  auth_role() = 'superadmin' OR municipality_id = auth_municipality_id()
);
CREATE POLICY "departments_write_municipality" ON departments FOR ALL USING (
  auth_role() = 'superadmin' OR (auth_role() = 'municipality_head' AND municipality_id = auth_municipality_id())
);
CREATE POLICY "departments_update_own" ON departments FOR UPDATE USING (
  auth_role() = 'department_head' AND id = auth_department_id()
);

-- Profiles: a user can always read/update their own row; admins can see their tenant's people
CREATE POLICY "profiles_select_self" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_select_tenant" ON profiles FOR SELECT USING (
  auth_role() = 'superadmin'
  OR (auth_role() = 'municipality_head' AND municipality_id = auth_municipality_id())
  OR (auth_role() = 'department_head' AND department_id = auth_department_id())
);
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Staff: visible within the same municipality (department-level UIs filter client-side / via view)
CREATE POLICY "staff_select_tenant" ON staff FOR SELECT USING (
  auth_role() = 'superadmin' OR municipality_id = auth_municipality_id()
);
CREATE POLICY "staff_write_admins" ON staff FOR ALL USING (
  auth_role() = 'superadmin'
  OR (auth_role() = 'municipality_head' AND municipality_id = auth_municipality_id())
  OR (auth_role() = 'department_head' AND primary_department_id = auth_department_id())
);

-- Citizens: citizens see only themselves; staff/admins in the same municipality can look citizens up
-- (e.g. resolving a complaint) via a join through complaints, handled at the complaints policy level.
CREATE POLICY "citizens_select_self" ON citizens FOR SELECT USING (id = auth.uid());
CREATE POLICY "citizens_update_self" ON citizens FOR UPDATE USING (id = auth.uid());
CREATE POLICY "citizens_insert_self" ON citizens FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "citizens_select_staff" ON citizens FOR SELECT USING (
  auth_role() IN ('superadmin', 'municipality_head', 'department_head', 'staff')
);

-- Complaint categories: global reference data, readable by everyone, writable by superadmin only
CREATE POLICY "categories_read_all" ON complaint_categories FOR SELECT USING (true);
CREATE POLICY "categories_write_superadmin" ON complaint_categories FOR ALL USING (auth_role() = 'superadmin');

-- Complaints: citizen sees their own; staff/admins see their municipality's queue
CREATE POLICY "complaints_select_citizen" ON complaints FOR SELECT USING (citizen_id = auth.uid());
CREATE POLICY "complaints_insert_citizen" ON complaints FOR INSERT WITH CHECK (citizen_id = auth.uid());
CREATE POLICY "complaints_select_municipality" ON complaints FOR SELECT USING (
  auth_role() = 'superadmin' OR municipality_id = auth_municipality_id()
);
CREATE POLICY "complaints_update_municipality" ON complaints FOR UPDATE USING (
  auth_role() = 'superadmin' OR municipality_id = auth_municipality_id()
);

-- Media: visible to whoever can see the parent complaint/announcement; insert by authenticated staff/citizen
CREATE POLICY "media_select_all_authenticated" ON media FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "media_insert_own" ON media FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- Teams & members: scoped to department
CREATE POLICY "teams_select_department" ON teams FOR SELECT USING (
  auth_role() = 'superadmin' OR department_id = auth_department_id() OR
  department_id IN (SELECT id FROM departments WHERE municipality_id = auth_municipality_id())
);
CREATE POLICY "teams_write_department" ON teams FOR ALL USING (
  auth_role() = 'superadmin' OR department_id = auth_department_id()
);
CREATE POLICY "team_members_select" ON team_members FOR SELECT USING (
  team_id IN (SELECT id FROM teams)
);
CREATE POLICY "team_members_write_department" ON team_members FOR ALL USING (
  auth_role() = 'superadmin' OR
  team_id IN (SELECT id FROM teams WHERE department_id = auth_department_id())
);

-- Complaint assignments: visible to the assigned staff member, their department, and the citizen
CREATE POLICY "assignments_select" ON complaint_assignments FOR SELECT USING (
  auth_role() = 'superadmin'
  OR staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
  OR complaint_id IN (SELECT co_uid FROM complaints WHERE municipality_id = auth_municipality_id())
  OR complaint_id IN (SELECT co_uid FROM complaints WHERE citizen_id = auth.uid())
);
CREATE POLICY "assignments_write_department" ON complaint_assignments FOR ALL USING (
  auth_role() = 'superadmin' OR auth_role() IN ('municipality_head', 'department_head')
);

-- Complaint updates: internal notes hidden from citizens; public updates visible to all parties
CREATE POLICY "updates_select_internal" ON complaint_updates FOR SELECT USING (
  NOT is_internal AND complaint_id IN (SELECT co_uid FROM complaints WHERE citizen_id = auth.uid())
);
CREATE POLICY "updates_select_staff" ON complaint_updates FOR SELECT USING (
  auth_role() IN ('superadmin', 'municipality_head', 'department_head', 'staff')
);
CREATE POLICY "updates_insert_staff" ON complaint_updates FOR INSERT WITH CHECK (author_id = auth.uid());

-- Feedback: citizen writes their own; staff/admins in the municipality can read it
CREATE POLICY "feedback_select_citizen" ON feedback FOR SELECT USING (citizen_id = auth.uid());
CREATE POLICY "feedback_insert_citizen" ON feedback FOR INSERT WITH CHECK (citizen_id = auth.uid());
CREATE POLICY "feedback_select_staff" ON feedback FOR SELECT USING (
  auth_role() IN ('superadmin', 'municipality_head', 'department_head')
);

-- Announcements: scoped to municipality, visible to whoever the audience implies
CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (
  auth_role() = 'superadmin' OR municipality_id = auth_municipality_id() OR NOT is_deleted
);
CREATE POLICY "announcements_write_admins" ON announcements FOR ALL USING (
  auth_role() IN ('superadmin', 'municipality_head', 'department_head')
);

-- Notifications: visible to the targeted profile, department, or municipality
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (
  target_profile_id = auth.uid()
  OR target_department_id = auth_department_id()
  OR target_municipality_id = auth_municipality_id()
  OR auth_role() = 'superadmin'
);
CREATE POLICY "notifications_insert_admins" ON notifications FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "notification_reads_own" ON notification_reads FOR ALL USING (profile_id = auth.uid());

-- System settings: superadmin only
CREATE POLICY "system_settings_superadmin" ON system_settings FOR ALL USING (auth_role() = 'superadmin');

-- Audit logs: superadmin sees everything; municipality_head sees their own municipality's log
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (
  auth_role() = 'superadmin' OR municipality_id = auth_municipality_id()
);
CREATE POLICY "audit_logs_insert_system" ON audit_logs FOR INSERT WITH CHECK (true);

-- Refresh tokens: a user can only see/manage their own
CREATE POLICY "refresh_tokens_own" ON refresh_tokens FOR ALL USING (profile_id = auth.uid());

-- ============================================================================================
-- 27. SEED DATA — Nepal's 7 provinces and 77 districts (Constitution of Nepal, Schedule 4)
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

-- Starter complaint categories (extend freely per municipality's needs)
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

-- Global maintenance-mode default
INSERT INTO system_settings (key, value, description) VALUES
  ('maintenance_mode', '{"enabled": false, "message": ""}', 'Global maintenance mode toggle and banner message shown platform-wide');
  
  DO $$
BEGIN
    CREATE TYPE department_category AS ENUM (
        'infrastructure_public_work',
        'water_supply',
        'sanitation_waste_Management',
        'sewerage_drainage',
        'Electricity',
        'parks_environment',
        'health',
        'building_urban_planning',
        'traffic_parking',
        'disaster_management',
        'animal_control',
        'revenue_tax',
        'administration',
        'information_technology',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.departments
ADD COLUMN IF NOT EXISTS department_category department_category
DEFAULT 'other';

NOTIFY pgrst, 'reload schema';

-- RPC Function to get department categories
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