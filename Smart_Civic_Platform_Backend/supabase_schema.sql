-- ========================================================================================
-- Smart Civic Platform - Supabase SQL Schema
-- ========================================================================================
-- Copy and paste this script into your Supabase SQL Editor to initialize the database.
-- It creates all ENUMs, Tables, Foreign Key relationships, and necessary Triggers.
-- ========================================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================================================
-- 2. ENUMS
-- ========================================================================================
CREATE TYPE user_role AS ENUM ('superadmin', 'municipality_head', 'department_head', 'staff', 'citizen');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'suspended', 'terminated');
CREATE TYPE team_role AS ENUM ('assistant_head', 'member');
CREATE TYPE complaint_status AS ENUM ('pending', 'ongoing', 'resolved', 'rejected');
CREATE TYPE record_type AS ENUM ('complaint', 'request', 'inquiry');
CREATE TYPE assignment_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE budget_status AS ENUM ('draft', 'proposed', 'approved', 'rejected', 'closed');
CREATE TYPE transaction_type AS ENUM ('purchase', 'payment', 'refund', 'salary', 'misc');
CREATE TYPE payment_type AS ENUM ('online', 'cash', 'cheque');
CREATE TYPE transaction_status AS ENUM ('pending', 'successful', 'failed');
CREATE TYPE broadcast_type AS ENUM ('individual', 'department', 'municipality', 'all', 'team');
CREATE TYPE department_type AS ENUM ('electricity', 'water', 'road', 'plumbing', 'health', 'education', 'public_works');
CREATE TYPE announcement_audience AS ENUM ('all', 'citizen', 'staff', 'all_staff', 'all_citizen', 'all_department', 'department', 'all_team', 'team');
CREATE TYPE notification_audience AS ENUM ('all_departments', 'all_staff', 'particular_department', 'particular_staff', 'department_internal_staff');
CREATE TYPE audit_action AS ENUM ('LOGIN', 'LOGOUT', 'INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'ROLE_CHANGE');
CREATE TYPE severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE media_context AS ENUM ('complaint', 'assignment_proof', 'announcement', 'profile_picture');
CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE notification_pref AS ENUM ('email', 'sms', 'both', 'none');


-- ========================================================================================
-- 3. TABLES
-- ========================================================================================

-- PROFILES
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'citizen',
    account_status account_status NOT NULL DEFAULT 'active',
    municipality_id UUID REFERENCES municipalities(m_uid) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(d_uid) ON DELETE SET NULL,
    force_password_reset BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    last_login_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MUNICIPALITIES
CREATE TABLE municipalities (
    m_uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    official_name TEXT NOT NULL,
    official_email TEXT NOT NULL,
    head_name TEXT NOT NULL,
    head_email TEXT NOT NULL,
    head_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    official_contact_no TEXT,
    head_contact_no TEXT,
    province TEXT,
    district TEXT,
    municipality_type TEXT,
    total_wards INTEGER NOT NULL DEFAULT 1,
    official_logo TEXT,
    about_description TEXT,
    mayor_chairperson_name TEXT,
    deputy_mayor_vice_chairperson_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DEPARTMENTS
CREATE TABLE departments (
    d_uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipality_id UUID NOT NULL REFERENCES municipalities(m_uid) ON DELETE CASCADE,
    department_name TEXT NOT NULL,
    official_email TEXT NOT NULL,
    head_name TEXT NOT NULL,
    head_email TEXT NOT NULL,
    head_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    department_logo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STAFF
CREATE TABLE staff (
    s_uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    municipality_id UUID NOT NULL REFERENCES municipalities(m_uid) ON DELETE CASCADE,
    primary_department_id UUID NOT NULL REFERENCES departments(d_uid) ON DELETE CASCADE,
    employee_id TEXT,
    expertise TEXT,
    contact_number TEXT,
    gender gender,
    date_of_birth DATE,
    personal_address TEXT,
    onboarded_at TIMESTAMPTZ,
    employee_status employee_status NOT NULL DEFAULT 'active',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, municipality_id)
);

-- CITIZENS
CREATE TABLE citizens (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    current_address TEXT,
    permanent_address TEXT,
    home_address TEXT,
    contact_number TEXT,
    citizenship_id TEXT UNIQUE,
    gender gender,
    date_of_birth DATE,
    profile_picture TEXT,
    notification_pref notification_pref NOT NULL DEFAULT 'both',
    ward_number TEXT,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COMPLAINT CATEGORIES
CREATE TABLE complaint_categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_name TEXT NOT NULL,
    target_department_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COMPLAINTS
CREATE TABLE complaints (
    co_uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id UUID NOT NULL REFERENCES citizens(profile_id) ON DELETE CASCADE,
    municipality_id UUID NOT NULL REFERENCES municipalities(m_uid) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES complaint_categories(category_id),
    assigned_department_id UUID REFERENCES departments(d_uid) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    attachment_url TEXT,
    status complaint_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    resolution_note TEXT,
    submitted_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolution_date TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TEAMS
CREATE TABLE teams (
    team_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(d_uid) ON DELETE CASCADE,
    complaint_id UUID REFERENCES complaints(co_uid) ON DELETE SET NULL,
    team_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TEAM MEMBERS
CREATE TABLE team_members (
    tm_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(s_uid) ON DELETE CASCADE,
    is_leader BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, staff_id)
);

-- NOTIFICATIONS
CREATE TABLE notifications (
    n_uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    audience_type notification_audience NOT NULL,
    target_municipality_id UUID REFERENCES municipalities(m_uid) ON DELETE CASCADE,
    target_department_id UUID REFERENCES departments(d_uid) ON DELETE CASCADE,
    target_staff_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ANNOUNCEMENTS
CREATE TABLE announcements (
    ann_uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipality_id UUID NOT NULL REFERENCES municipalities(m_uid) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(d_uid) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    audience announcement_audience NOT NULL,
    target_department_id UUID REFERENCES departments(d_uid),
    target_team_id UUID REFERENCES teams(team_id),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FEEDBACK
CREATE TABLE feedback (
    f_uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(co_uid) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES citizens(profile_id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(team_id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff(s_uid) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- REFRESH TOKENS
CREATE TABLE refresh_tokens (
    rt_uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT
);

-- AUDIT LOGS
CREATE TABLE audit_logs (
    al_uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action_by_role user_role NOT NULL,
    target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    severity severity NOT NULL DEFAULT 'info',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ========================================================================================
-- 4. TRIGGERS & FUNCTIONS
-- ========================================================================================

-- Trigger to automatically create a profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the profile with phone number
  INSERT INTO public.profiles (id, email, full_name, phone, role, municipality_id, department_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'citizen'::public.user_role),
    NULLIF(NEW.raw_user_meta_data->>'municipality_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'department_id', '')::uuid
  );

  -- Insert complete citizen record
  IF COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'citizen'::public.user_role) = 'citizen' THEN
    INSERT INTO public.citizens (profile_id, first_name, last_name, home_address, gender)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'full_address',
      (NEW.raw_user_meta_data->>'gender')::public.gender
    );
  
  -- Insert complete staff record
  ELSIF (NEW.raw_user_meta_data->>'role') = 'staff' THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for automatically updating updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_municipalities_updated_at BEFORE UPDATE ON municipalities FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_citizens_updated_at BEFORE UPDATE ON citizens FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ========================================================================================
-- 5. RPC (Remote Procedure Calls)
-- ========================================================================================

-- RPC to allow superadmins to change a user's role securely
CREATE OR REPLACE FUNCTION admin_set_user_role(target_user_id UUID, new_role user_role)
RETURNS VOID AS $$
BEGIN
  -- Validate the caller is a superadmin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only superadmins can change roles.';
  END IF;

  -- Update the profiles table
  UPDATE profiles
  SET role = new_role
  WHERE id = target_user_id;

  -- Update the auth.users metadata to match
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(new_role)
  )
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================================
-- 6. SECURITY / RLS
-- ========================================================================================
-- Note: Enable RLS on all tables and configure policies based on your exact app requirements.
-- For example:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
-- CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
