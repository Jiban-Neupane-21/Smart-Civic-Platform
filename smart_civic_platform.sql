-- ================================================================
--  SMART CIVIC PLATFORM — COMPLETE SCHEMA (v2.0)
--  Written from scratch. Clean, production-ready, Supabase-ready.
--
--  TABLE OF CONTENTS
--  -----------------
--  00. Extensions
--  01. Enums
--  02. Utility function (updated_at trigger)
--  03. Core identity
--      3a. municipalities
--      3b. profiles          (all users — staff + citizens)
--      3c. citizens          (citizen-specific profile extension)
--      3d. staff             (staff-specific profile extension)
--  04. Org structure
--      4a. departments
--      4b. teams
--      4c. team_members
--  05. Deferred FK resolution (municipalities.head_id)
--  06. Complaint management
--      6a. complaint_categories
--      6b. sla_rules
--      6c. complaints
--      6d. complaint_media    (replaces ad-hoc media_url columns)
--  07. Assignment & dispatch
--      7a. vehicles
--      7b. assignments
--      7c. assignment_media
--  08. Garbage collection
--      8a. garbage_routes
--      8b. route_stops
--  09. Finance
--      9a. budgets
--      9b. spending_log
-- 10. Communication
--      10a. announcements
--      10b. notifications
--      10c. notification_reads
-- 11. Feedback
-- 12. Audit
-- 13. Indexes
-- 14. Views
-- 15. Row-Level Security
-- ================================================================


-- ================================================================
--  00. EXTENSIONS
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "postgis";    -- GEOMETRY types


-- ================================================================
--  01. ENUMS
--  Centralised here so they're easy to find and extend.
-- ================================================================

CREATE TYPE user_role AS ENUM (
  'superadmin',
  'municipality_head',
  'department_head',
  'staff',
  'citizen'
);

CREATE TYPE account_status AS ENUM (
  'active', 'inactive', 'suspended'
);

CREATE TYPE employee_status AS ENUM (
  'active', 'inactive', 'suspended', 'terminated'
);

CREATE TYPE team_role AS ENUM (
  'member', 'assistant_head'
);

CREATE TYPE complaint_status AS ENUM (
  'pending', 'in_progress', 'resolved', 'rejected', 'reopened'
);

CREATE TYPE record_type AS ENUM (
  'complaint', 'request', 'inquiry'
);

CREATE TYPE priority AS ENUM (
  'low', 'medium', 'high', 'urgent'
);

CREATE TYPE assignment_status AS ENUM (
  'pending', 'in_progress', 'completed', 'cancelled'
);

CREATE TYPE vehicle_status AS ENUM (
  'available', 'in_use', 'maintenance', 'retired'
);

CREATE TYPE route_status AS ENUM (
  'scheduled', 'in_progress', 'completed', 'cancelled'
);

CREATE TYPE stop_status AS ENUM (
  'pending', 'visited', 'skipped'
);

CREATE TYPE budget_status AS ENUM (
  'draft', 'active', 'completed', 'closed'
);

CREATE TYPE transaction_type AS ENUM (
  'purchase', 'payment', 'salary', 'refund', 'misc'
);

CREATE TYPE transaction_status AS ENUM (
  'pending', 'completed', 'cancelled'
);

CREATE TYPE broadcast_scope AS ENUM (
  'individual', 'department', 'team', 'municipality', 'all'
);

CREATE TYPE announcement_audience AS ENUM (
  'all_citizens', 'department', 'team', 'municipality'
);

CREATE TYPE audit_action AS ENUM (
  'INSERT', 'UPDATE', 'DELETE',
  'LOGIN', 'LOGOUT',
  'ASSIGN', 'REASSIGN',
  'STATUS_CHANGE',
  'APPROVE', 'REJECT',
  'EXPORT'
);

CREATE TYPE severity AS ENUM (
  'info', 'warning', 'critical'
);

CREATE TYPE media_context AS ENUM (
  'complaint',         -- photo/video attached to a complaint
  'assignment_proof',  -- completion proof on an assignment
  'route_stop_proof',  -- photo at a garbage route stop
  'announcement',      -- media attached to an announcement
  'profile_picture'    -- user avatar
);


-- ================================================================
--  02. UTILITY — auto-update updated_at
-- ================================================================

CREATE OR REPLACE FUNCTION fn_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Macro-style helper: attach the trigger to any table that has updated_at.
-- Usage: SELECT fn_attach_updated_at_trigger('table_name');
CREATE OR REPLACE FUNCTION fn_attach_updated_at_trigger(p_table TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE FORMAT(
    'CREATE TRIGGER trg_%s_updated_at
     BEFORE UPDATE ON %I
     FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at()',
    p_table, p_table
  );
END;
$$;


-- ================================================================
--  03a. MUNICIPALITIES
--
--  NOTE: municipalities.head_id (FK → profiles) is added after
--  profiles is created to break the circular dependency.
--  See section 05.
-- ================================================================

CREATE TABLE municipalities (
  m_uid             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  official_name     VARCHAR     NOT NULL,
  slug              VARCHAR     UNIQUE,          -- URL-friendly identifier

  -- Geographic boundary stored as a proper PostGIS polygon
  boundary          GEOMETRY(MULTIPOLYGON, 4326),

  region_state      VARCHAR,
  country_code      CHAR(2)     NOT NULL DEFAULT 'IN',
  time_zone         VARCHAR     NOT NULL DEFAULT 'Asia/Kolkata',

  -- Contact
  office_address    TEXT,
  login_email       VARCHAR     NOT NULL UNIQUE,  -- municipality head auth email
  support_email     VARCHAR,
  emergency_contact VARCHAR,
  website_url       VARCHAR,

  -- head_id is added via ALTER TABLE in section 05

  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT fn_attach_updated_at_trigger('municipalities');


-- ================================================================
--  03b. PROFILES
--
--  Single source of truth for every authenticated user.
--  Extends auth.users (Supabase). All roles share this table.
--  Role-specific extras live in citizens / staff tables.
-- ================================================================

CREATE TABLE profiles (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  full_name         VARCHAR     NOT NULL,
  email             VARCHAR     NOT NULL UNIQUE,   -- mirrors auth.users.email
  phone             VARCHAR,

  role              user_role   NOT NULL,
  account_status    account_status NOT NULL DEFAULT 'active',

  -- Which municipality/department this user belongs to (role-dependent)
  municipality_id   UUID        REFERENCES municipalities(m_uid) ON DELETE SET NULL,
  -- department_id FK is added after departments is created (section 04a)

  profile_picture   VARCHAR,                       -- storage URL
  last_login_at     TIMESTAMPTZ,

  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT fn_attach_updated_at_trigger('profiles');

-- Partial index: fast lookup of active, non-deleted users by role
CREATE INDEX idx_profiles_role
  ON profiles(role)
  WHERE is_deleted = FALSE AND account_status = 'active';

CREATE INDEX idx_profiles_municipality
  ON profiles(municipality_id)
  WHERE is_deleted = FALSE;


-- ================================================================
--  03c. CITIZENS
--
--  Extends profiles for the 'citizen' role.
--  One row per citizen. id = profiles.id.
-- ================================================================

CREATE TABLE citizens (
  id                UUID        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  first_name        VARCHAR     NOT NULL,
  middle_name       VARCHAR,
  last_name         VARCHAR     NOT NULL,

  date_of_birth     DATE,
  gender            VARCHAR     CHECK (gender IN ('male','female','other','prefer_not_to_say')),

  home_address      TEXT,
  permanent_address TEXT,
  ward_number       VARCHAR,                       -- local administrative ward

  notification_pref VARCHAR     NOT NULL DEFAULT 'email'
                    CHECK (notification_pref IN ('email','sms','both','none')),

  last_active_at    TIMESTAMPTZ,

  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT fn_attach_updated_at_trigger('citizens');


-- ================================================================
--  03d. STAFF
--
--  Extends profiles for municipality_head / department_head / staff.
--  Contains ONLY staff-specific fields.
--  Personal info (name, email, phone, shift times) → JOIN profiles.
-- ================================================================

CREATE TABLE staff (
  s_uid             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 1-to-1 link to profiles
  profile_id        UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Org placement (both optional; staff may be muni-level or dept-level)
  municipality_id   UUID        REFERENCES municipalities(m_uid) ON DELETE SET NULL,
  department_id     UUID,       -- FK added after departments (section 04a)

  -- HR identifiers
  employee_id       VARCHAR     UNIQUE,            -- HR/payroll code
  designation       VARCHAR,                       -- e.g. "Sanitation Officer"

  -- Role within staff hierarchy
  staff_role        user_role   NOT NULL
                    CHECK (staff_role IN ('municipality_head','department_head','staff')),

  -- Shift schedule
  shift_start       TIME,
  shift_end         TIME,

  employee_status   employee_status NOT NULL DEFAULT 'active',
  joined_date       DATE,

  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT fn_attach_updated_at_trigger('staff');

CREATE INDEX idx_staff_profile      ON staff(profile_id)      WHERE is_deleted = FALSE;
CREATE INDEX idx_staff_municipality ON staff(municipality_id)  WHERE is_deleted = FALSE;


-- ================================================================
--  04a. DEPARTMENTS
-- ================================================================

CREATE TABLE departments (
  d_uid             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id   UUID        NOT NULL REFERENCES municipalities(m_uid) ON DELETE CASCADE,

  dept_name         VARCHAR     NOT NULL,
  dept_code         VARCHAR,                       -- short code e.g. "SAN", "HLTH"
  service_type      VARCHAR,                       -- e.g. "sanitation", "health"

  -- head assigned separately; nullable initially
  head_id           UUID        REFERENCES profiles(id) ON DELETE SET NULL,

  dept_contact      VARCHAR,
  dept_email        VARCHAR,
  operating_budget  NUMERIC     CHECK (operating_budget >= 0),

  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (municipality_id, dept_name)
);

SELECT fn_attach_updated_at_trigger('departments');

CREATE INDEX idx_departments_municipality
  ON departments(municipality_id) WHERE is_deleted = FALSE;

-- Now that departments exists, add the FK to profiles and staff
ALTER TABLE profiles
  ADD COLUMN department_id UUID REFERENCES departments(d_uid) ON DELETE SET NULL;

CREATE INDEX idx_profiles_department
  ON profiles(department_id) WHERE is_deleted = FALSE;

ALTER TABLE staff
  ADD CONSTRAINT fk_staff_department
  FOREIGN KEY (department_id) REFERENCES departments(d_uid) ON DELETE SET NULL;

CREATE INDEX idx_staff_department ON staff(department_id) WHERE is_deleted = FALSE;


-- ================================================================
--  04b. TEAMS
-- ================================================================

CREATE TABLE teams (
  t_uid             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id     UUID        NOT NULL REFERENCES departments(d_uid) ON DELETE CASCADE,

  team_name         VARCHAR     NOT NULL,
  specialty         VARCHAR,                       -- e.g. "drainage", "road repair"
  team_head_id      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  is_available      BOOLEAN     NOT NULL DEFAULT TRUE,

  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (department_id, team_name)
);

SELECT fn_attach_updated_at_trigger('teams');

CREATE INDEX idx_teams_department ON teams(department_id) WHERE is_deleted = FALSE;


-- ================================================================
--  04c. TEAM MEMBERS
-- ================================================================

CREATE TABLE team_members (
  tm_uid            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           UUID        NOT NULL REFERENCES teams(t_uid) ON DELETE CASCADE,
  staff_profile_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  role              team_role   NOT NULL DEFAULT 'member',
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A staff member can only be in a team once
  UNIQUE (team_id, staff_profile_id)
);

CREATE INDEX idx_team_members_team  ON team_members(team_id);
CREATE INDEX idx_team_members_staff ON team_members(staff_profile_id);


-- ================================================================
--  05. DEFERRED FK RESOLUTION
--
--  municipalities.head_id → profiles.id
--
--  Added here (after profiles) as a DEFERRABLE constraint so that
--  inserting a municipality and its head profile in a single
--  transaction doesn't fail on ordering.
-- ================================================================

ALTER TABLE municipalities
  ADD COLUMN head_id UUID REFERENCES profiles(id) ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_municipalities_head ON municipalities(head_id);


-- ================================================================
--  06a. COMPLAINT CATEGORIES
-- ================================================================

CREATE TABLE complaint_categories (
  category_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  municipality_id   UUID        REFERENCES municipalities(m_uid) ON DELETE CASCADE,
  -- NULL municipality_id = platform-wide default category

  name              VARCHAR     NOT NULL,
  description       TEXT,
  icon_name         VARCHAR,                       -- UI icon identifier
  color_hex         CHAR(7),                       -- e.g. "#FF5733"
  display_order     INT         NOT NULL DEFAULT 0,

  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (municipality_id, name)
);

SELECT fn_attach_updated_at_trigger('complaint_categories');


-- ================================================================
--  06b. SLA RULES
--
--  Defines response & resolution time targets per
--  municipality × category × priority combination.
--  The v_sla_breaches view uses this to flag overdue complaints.
-- ================================================================

CREATE TABLE sla_rules (
  sla_uid                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id        UUID    NOT NULL REFERENCES municipalities(m_uid) ON DELETE CASCADE,

  -- NULL category = applies to all categories (fallback rule)
  category_id            UUID    REFERENCES complaint_categories(category_id) ON DELETE CASCADE,
  priority               priority NOT NULL DEFAULT 'medium',

  -- Hours from reported_at until SLA breach
  first_response_hours   INT     NOT NULL CHECK (first_response_hours > 0),
  resolution_hours       INT     NOT NULL CHECK (resolution_hours > first_response_hours),

  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One rule per muni + category + priority combination
  UNIQUE (municipality_id, category_id, priority)
);

SELECT fn_attach_updated_at_trigger('sla_rules');


-- ================================================================
--  06c. COMPLAINTS
-- ================================================================

CREATE TABLE complaints (
  co_uid            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who submitted it
  citizen_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Where it belongs
  municipality_id   UUID        NOT NULL REFERENCES municipalities(m_uid) ON DELETE RESTRICT,
  department_id     UUID        REFERENCES departments(d_uid) ON DELETE SET NULL,

  -- Classification
  category_id       UUID        REFERENCES complaint_categories(category_id) ON DELETE SET NULL,
  record_type       record_type NOT NULL DEFAULT 'complaint',
  priority          priority    NOT NULL DEFAULT 'medium',

  -- Content
  title             VARCHAR     NOT NULL,
  description       TEXT,

  -- Status lifecycle
  status            complaint_status NOT NULL DEFAULT 'pending',
  resolved_at       TIMESTAMPTZ,
  resolution_note   TEXT,

  -- Location (stored as both raw coords and PostGIS point for geo queries)
  latitude          NUMERIC     CHECK (latitude  BETWEEN -90  AND  90),
  longitude         NUMERIC     CHECK (longitude BETWEEN -180 AND 180),
  location_point    GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (
                      CASE
                        WHEN latitude IS NOT NULL AND longitude IS NOT NULL
                        THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                      END
                    ) STORED,
  address_hint      VARCHAR,                       -- human-readable address hint

  -- Tracking
  reported_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_anonymous      BOOLEAN     NOT NULL DEFAULT FALSE,

  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT fn_attach_updated_at_trigger('complaints');

CREATE INDEX idx_complaints_citizen      ON complaints(citizen_id)      WHERE is_deleted = FALSE;
CREATE INDEX idx_complaints_municipality ON complaints(municipality_id)  WHERE is_deleted = FALSE;
CREATE INDEX idx_complaints_department   ON complaints(department_id)    WHERE is_deleted = FALSE;
CREATE INDEX idx_complaints_status       ON complaints(status)           WHERE is_deleted = FALSE;
CREATE INDEX idx_complaints_category     ON complaints(category_id)      WHERE is_deleted = FALSE;
CREATE INDEX idx_complaints_priority     ON complaints(priority)         WHERE is_deleted = FALSE;
CREATE INDEX idx_complaints_reported_at  ON complaints(reported_at DESC);
CREATE INDEX idx_complaints_geo          ON complaints USING GIST (location_point)
  WHERE location_point IS NOT NULL;


-- ================================================================
--  06d. COMPLAINT MEDIA
--
--  Stores photos/videos attached to complaints (and reused for
--  assignment proofs and route stop proofs via media_context).
--  Replaces scattered media_url / proof_image_url text columns.
-- ================================================================

CREATE TABLE media (
  media_uid         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by       UUID        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  context           media_context NOT NULL,
  entity_id         UUID        NOT NULL,   -- FK is logical; enforced at app layer

  storage_url       TEXT        NOT NULL,
  file_name         VARCHAR,
  mime_type         VARCHAR,
  size_bytes        BIGINT      CHECK (size_bytes > 0),
  thumbnail_url     TEXT,

  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_entity  ON media(context, entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_media_uploader ON media(uploaded_by)        WHERE is_deleted = FALSE;


-- ================================================================
--  07a. VEHICLES
--
--  Municipal fleet used for garbage collection and field assignments.
-- ================================================================

CREATE TABLE vehicles (
  v_uid             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id   UUID        NOT NULL REFERENCES municipalities(m_uid) ON DELETE CASCADE,
  department_id     UUID        REFERENCES departments(d_uid) ON DELETE SET NULL,

  registration_no   VARCHAR     NOT NULL UNIQUE,
  vehicle_type      VARCHAR     NOT NULL,           -- 'compactor', 'truck', 'van', etc.
  make_model        VARCHAR,
  capacity_kg       NUMERIC     CHECK (capacity_kg > 0),
  manufacture_year  SMALLINT,

  status            vehicle_status NOT NULL DEFAULT 'available',
  last_serviced_on  DATE,
  next_service_due  DATE,
  notes             TEXT,

  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT fn_attach_updated_at_trigger('vehicles');

CREATE INDEX idx_vehicles_municipality ON vehicles(municipality_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_vehicles_status       ON vehicles(status)          WHERE is_deleted = FALSE;


-- ================================================================
--  07b. ASSIGNMENTS
--
--  Links a complaint to the team/staff member handling it.
--  Multiple assignments per complaint are allowed
--  (e.g. reassignment after cancellation).
-- ================================================================

CREATE TABLE assignments (
  a_uid             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id      UUID        NOT NULL REFERENCES complaints(co_uid) ON DELETE RESTRICT,

  -- Assignee: team OR individual staff (at least one must be set)
  team_id           UUID        REFERENCES teams(t_uid) ON DELETE SET NULL,
  staff_id          UUID        REFERENCES profiles(id) ON DELETE SET NULL,

  -- Who authorised this assignment
  authorizer_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  priority          priority    NOT NULL DEFAULT 'medium',
  status            assignment_status NOT NULL DEFAULT 'pending',

  -- Scheduling
  scheduled_start   TIMESTAMPTZ,
  actual_start      TIMESTAMPTZ,
  actual_end        TIMESTAMPTZ,

  -- Field details
  labor_hours       NUMERIC     CHECK (labor_hours >= 0),
  materials_used    TEXT,
  equipment_used    TEXT,
  internal_note     TEXT,

  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- At least one of team or staff must be assigned
  CHECK (team_id IS NOT NULL OR staff_id IS NOT NULL),
  -- End cannot be before start
  CHECK (actual_end IS NULL OR actual_start IS NULL OR actual_end >= actual_start)
);

SELECT fn_attach_updated_at_trigger('assignments');

CREATE INDEX idx_assignments_complaint ON assignments(complaint_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_assignments_team      ON assignments(team_id)      WHERE is_deleted = FALSE;
CREATE INDEX idx_assignments_staff     ON assignments(staff_id)     WHERE is_deleted = FALSE;
CREATE INDEX idx_assignments_status    ON assignments(status)       WHERE is_deleted = FALSE;


-- ================================================================
--  08a. GARBAGE ROUTES
-- ================================================================

CREATE TABLE garbage_routes (
  gr_uid            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id   UUID        NOT NULL REFERENCES municipalities(m_uid) ON DELETE RESTRICT,
  department_id     UUID        REFERENCES departments(d_uid) ON DELETE SET NULL,
  team_id           UUID        REFERENCES teams(t_uid) ON DELETE SET NULL,
  vehicle_id        UUID        REFERENCES vehicles(v_uid) ON DELETE SET NULL,

  route_title       VARCHAR     NOT NULL,
  route_date        DATE        NOT NULL,
  status            route_status NOT NULL DEFAULT 'scheduled',

  -- GeoJSON route stored as JSONB (supports querying & indexing)
  optimized_path    JSONB,

  scheduled_start   TIMESTAMPTZ,
  actual_start      TIMESTAMPTZ,
  actual_end        TIMESTAMPTZ,
  total_distance_km NUMERIC     CHECK (total_distance_km >= 0),
  notes             TEXT,

  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (actual_end IS NULL OR actual_start IS NULL OR actual_end >= actual_start)
);

SELECT fn_attach_updated_at_trigger('garbage_routes');

CREATE INDEX idx_routes_municipality ON garbage_routes(municipality_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_routes_team         ON garbage_routes(team_id)         WHERE is_deleted = FALSE;
CREATE INDEX idx_routes_date         ON garbage_routes(route_date DESC);
CREATE INDEX idx_routes_status       ON garbage_routes(status)          WHERE is_deleted = FALSE;


-- ================================================================
--  08b. ROUTE STOPS
-- ================================================================

CREATE TABLE route_stops (
  stop_uid              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id              UUID        NOT NULL REFERENCES garbage_routes(gr_uid) ON DELETE CASCADE,

  -- Optional: this stop was created to address a specific complaint
  complaint_id          UUID        REFERENCES complaints(co_uid) ON DELETE SET NULL,

  stop_order            SMALLINT    NOT NULL CHECK (stop_order > 0),
  stop_label            VARCHAR,                   -- e.g. "Zone A - Block 3"

  -- Location
  latitude              NUMERIC     CHECK (latitude  BETWEEN -90  AND  90),
  longitude             NUMERIC     CHECK (longitude BETWEEN -180 AND 180),
  address               TEXT,

  status                stop_status NOT NULL DEFAULT 'pending',
  arrived_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  skip_reason           TEXT,

  -- One stop-order per route
  UNIQUE (route_id, stop_order)
);

CREATE INDEX idx_route_stops_route     ON route_stops(route_id);
CREATE INDEX idx_route_stops_complaint ON route_stops(complaint_id);


-- ================================================================
--  09a. BUDGETS
--
--  Hierarchical: a budget can have a parent budget (sub-budget).
-- ================================================================

CREATE TABLE budgets (
  b_uid             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_b_uid      UUID        REFERENCES budgets(b_uid) ON DELETE SET NULL,

  municipality_id   UUID        NOT NULL REFERENCES municipalities(m_uid) ON DELETE RESTRICT,
  department_id     UUID        REFERENCES departments(d_uid) ON DELETE SET NULL,

  title             VARCHAR     NOT NULL,
  fiscal_year       VARCHAR     NOT NULL,          -- e.g. "2025-26"
  currency_code     CHAR(3)     NOT NULL DEFAULT 'INR',

  total_allocated   NUMERIC     NOT NULL CHECK (total_allocated >= 0),
  status            budget_status NOT NULL DEFAULT 'draft',
  notes             TEXT,

  approved_by       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,

  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT fn_attach_updated_at_trigger('budgets');

CREATE INDEX idx_budgets_municipality ON budgets(municipality_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_budgets_department   ON budgets(department_id)   WHERE is_deleted = FALSE;
CREATE INDEX idx_budgets_fiscal_year  ON budgets(fiscal_year)     WHERE is_deleted = FALSE;


-- ================================================================
--  09b. SPENDING LOG
-- ================================================================

CREATE TABLE spending_log (
  sl_uid            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id         UUID        NOT NULL REFERENCES budgets(b_uid) ON DELETE RESTRICT,

  -- Optional links to what generated this spend
  assignment_id     UUID        REFERENCES assignments(a_uid) ON DELETE SET NULL,
  team_id           UUID        REFERENCES teams(t_uid) ON DELETE SET NULL,
  staff_id          UUID        REFERENCES profiles(id) ON DELETE SET NULL,

  vendor_name       VARCHAR,
  transaction_type  transaction_type NOT NULL DEFAULT 'misc',

  amount            NUMERIC     NOT NULL CHECK (amount > 0),
  currency_code     CHAR(3)     NOT NULL DEFAULT 'INR',

  payment_method    VARCHAR,                       -- 'cash', 'bank_transfer', 'cheque'
  reference_no      VARCHAR,                       -- bank/cheque reference
  invoice_url       TEXT,
  status            transaction_status NOT NULL DEFAULT 'pending',
  description       TEXT,

  transaction_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by       UUID        REFERENCES profiles(id) ON DELETE SET NULL,

  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT fn_attach_updated_at_trigger('spending_log');

CREATE INDEX idx_spending_budget     ON spending_log(budget_id)     WHERE is_deleted = FALSE;
CREATE INDEX idx_spending_assignment ON spending_log(assignment_id)  WHERE is_deleted = FALSE;
CREATE INDEX idx_spending_date       ON spending_log(transaction_date DESC);


-- ================================================================
--  10a. ANNOUNCEMENTS
--
--  Official public communications from municipalities/departments.
--  Separate from notifications (which are transactional messages).
-- ================================================================

CREATE TABLE announcements (
  ann_uid           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id   UUID        NOT NULL REFERENCES municipalities(m_uid) ON DELETE CASCADE,
  department_id     UUID        REFERENCES departments(d_uid) ON DELETE SET NULL,
  created_by        UUID        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  title             VARCHAR     NOT NULL,
  body              TEXT        NOT NULL,
  audience          announcement_audience NOT NULL DEFAULT 'all_citizens',

  -- For targeted audiences
  target_department_id UUID     REFERENCES departments(d_uid) ON DELETE SET NULL,
  target_team_id    UUID        REFERENCES teams(t_uid) ON DELETE SET NULL,

  is_pinned         BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at      TIMESTAMPTZ,                   -- NULL = draft
  expires_at        TIMESTAMPTZ,

  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT fn_attach_updated_at_trigger('announcements');

CREATE INDEX idx_announcements_municipality ON announcements(municipality_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_announcements_published    ON announcements(published_at DESC) WHERE is_deleted = FALSE;


-- ================================================================
--  10b. NOTIFICATIONS
--
--  Transactional messages: status updates, alerts, assignments.
--  Read state is tracked in notification_reads (one row per recipient).
-- ================================================================

CREATE TABLE notifications (
  n_uid             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Origin
  municipality_id   UUID        REFERENCES municipalities(m_uid) ON DELETE SET NULL,
  department_id     UUID        REFERENCES departments(d_uid) ON DELETE SET NULL,
  sender_id         UUID        REFERENCES profiles(id) ON DELETE SET NULL,

  -- Scope: who receives this?
  scope             broadcast_scope NOT NULL DEFAULT 'individual',

  -- Scope targets (used based on scope value)
  target_municipality_id UUID   REFERENCES municipalities(m_uid) ON DELETE SET NULL,
  target_department_id   UUID   REFERENCES departments(d_uid) ON DELETE SET NULL,
  target_team_id         UUID   REFERENCES teams(t_uid) ON DELETE SET NULL,
  target_profile_id      UUID   REFERENCES profiles(id) ON DELETE SET NULL,

  -- Content
  subject           VARCHAR     NOT NULL,
  body              TEXT        NOT NULL,
  deep_link         TEXT,                           -- e.g. /complaints/co_uid
  is_pinned         BOOLEAN     NOT NULL DEFAULT FALSE,
  expires_at        TIMESTAMPTZ,

  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at: notifications are immutable after send
);

CREATE INDEX idx_notifications_scope          ON notifications(scope);
CREATE INDEX idx_notifications_target_profile ON notifications(target_profile_id);
CREATE INDEX idx_notifications_target_dept    ON notifications(target_department_id);
CREATE INDEX idx_notifications_target_team    ON notifications(target_team_id);
CREATE INDEX idx_notifications_created        ON notifications(created_at DESC);


-- ================================================================
--  10c. NOTIFICATION READS
--
--  One row per (notification × recipient).
--  Fan-out: when a broadcast notification is sent to a dept/team,
--  the application layer inserts one row here per recipient.
--  This gives us per-user read/unread state and deletion.
-- ================================================================

CREATE TABLE notification_reads (
  nr_uid            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id   UUID        NOT NULL REFERENCES notifications(n_uid) ON DELETE CASCADE,
  recipient_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  read_at           TIMESTAMPTZ,                   -- NULL = unread

  -- Recipient can soft-delete from their inbox
  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate delivery rows
  UNIQUE (notification_id, recipient_id)
);

-- Core query: "show unread notifications for user X"
CREATE INDEX idx_notif_reads_unread
  ON notification_reads(recipient_id, created_at DESC)
  WHERE read_at IS NULL AND is_deleted = FALSE;

CREATE INDEX idx_notif_reads_recipient
  ON notification_reads(recipient_id)
  WHERE is_deleted = FALSE;


-- ================================================================
--  11. FEEDBACK
--
--  Citizens rate how a resolved complaint was handled.
--  One rating per citizen per complaint, enforced by UNIQUE.
-- ================================================================

CREATE TABLE feedback (
  f_uid             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id      UUID        NOT NULL REFERENCES complaints(co_uid) ON DELETE CASCADE,
  citizen_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Optionally rate the specific team/staff who handled it
  team_id           UUID        REFERENCES teams(t_uid) ON DELETE SET NULL,
  staff_id          UUID        REFERENCES profiles(id) ON DELETE SET NULL,

  rating            SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment           TEXT,
  is_anonymous      BOOLEAN     NOT NULL DEFAULT FALSE,

  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Enforce one rating per citizen per complaint
  UNIQUE (complaint_id, citizen_id)
);

SELECT fn_attach_updated_at_trigger('feedback');

CREATE INDEX idx_feedback_complaint ON feedback(complaint_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_feedback_team      ON feedback(team_id)      WHERE is_deleted = FALSE;


-- ================================================================
--  12. AUDIT LOG
--
--  Append-only record of every significant action.
--  Rows are NEVER updated or deleted.
-- ================================================================

CREATE TABLE audit_log (
  al_uid            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  action_by         UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  action_role       user_role   NOT NULL,

  -- Context
  municipality_id   UUID        REFERENCES municipalities(m_uid) ON DELETE SET NULL,
  department_id     UUID        REFERENCES departments(d_uid) ON DELETE SET NULL,

  -- What changed
  table_name        VARCHAR     NOT NULL,
  record_id         UUID        NOT NULL,
  action            audit_action NOT NULL,
  old_value         JSONB,
  new_value         JSONB,

  -- Request metadata
  ip_address        INET,
  user_agent        VARCHAR,
  request_id        VARCHAR,                        -- trace ID from API gateway

  severity          severity    NOT NULL DEFAULT 'info',
  note              TEXT,                            -- optional human note

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Intentionally: no updated_at. Audit rows are immutable.
);

CREATE INDEX idx_audit_action_by    ON audit_log(action_by);
CREATE INDEX idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_municipality ON audit_log(municipality_id);
CREATE INDEX idx_audit_created_at   ON audit_log(created_at DESC);
CREATE INDEX idx_audit_severity     ON audit_log(severity) WHERE severity != 'info';


-- ================================================================
--  13. COMPOSITE / EXTRA INDEXES
-- ================================================================

-- Fast dashboard query: open complaints per department
CREATE INDEX idx_complaints_dept_status
  ON complaints(department_id, status)
  WHERE is_deleted = FALSE AND status NOT IN ('resolved','rejected');

-- Fast lookup: complaints for a citizen that are still open
CREATE INDEX idx_complaints_citizen_open
  ON complaints(citizen_id, reported_at DESC)
  WHERE is_deleted = FALSE AND status NOT IN ('resolved','rejected');

-- Budget queries: active budgets for a fiscal year
CREATE INDEX idx_budgets_active_fy
  ON budgets(municipality_id, fiscal_year)
  WHERE status = 'active' AND is_deleted = FALSE;

-- Spending summary: sum by budget within a date range
CREATE INDEX idx_spending_budget_date
  ON spending_log(budget_id, transaction_date)
  WHERE is_deleted = FALSE AND status = 'completed';


-- ================================================================
--  14. VIEWS
-- ================================================================

-- ---- Active complaints with full context ----------------------
CREATE VIEW v_complaints AS
SELECT
  c.co_uid,
  c.title,
  c.description,
  c.record_type,
  c.status,
  c.priority,
  c.reported_at,
  c.resolved_at,
  c.latitude,
  c.longitude,
  c.address_hint,

  -- Citizen
  p.full_name       AS citizen_name,
  p.email           AS citizen_email,
  cit.ward_number,

  -- Classification
  cat.name          AS category_name,
  d.service_type    AS service_type,

  -- Org
  m.official_name   AS municipality_name,
  d.dept_name       AS department_name,

  -- SLA (first matching rule for this muni + category + priority)
  sla.first_response_hours,
  sla.resolution_hours,
  c.reported_at + (sla.first_response_hours || ' hours')::INTERVAL AS response_deadline,
  c.reported_at + (sla.resolution_hours     || ' hours')::INTERVAL AS resolution_deadline,
  NOW() > c.reported_at + (sla.resolution_hours || ' hours')::INTERVAL
    AND c.status NOT IN ('resolved','rejected','reopened')         AS is_sla_breached

FROM complaints c
JOIN profiles p          ON p.id             = c.citizen_id
LEFT JOIN citizens cit   ON cit.id           = c.citizen_id
LEFT JOIN complaint_categories cat
                         ON cat.category_id  = c.category_id
LEFT JOIN municipalities m ON m.m_uid        = c.municipality_id
LEFT JOIN departments d  ON d.d_uid          = c.department_id
LEFT JOIN sla_rules sla  ON sla.municipality_id = c.municipality_id
                        AND sla.category_id    = c.category_id
                        AND sla.priority       = c.priority
                        AND sla.is_active      = TRUE
WHERE c.is_deleted = FALSE;


-- ---- Budget utilisation summary --------------------------------
CREATE VIEW v_budget_utilisation AS
SELECT
  b.b_uid,
  b.title,
  b.fiscal_year,
  b.currency_code,
  b.total_allocated,
  b.status,
  m.official_name                                              AS municipality_name,
  d.dept_name                                                  AS department_name,

  COALESCE(SUM(sl.amount) FILTER (
    WHERE sl.status = 'completed' AND sl.is_deleted = FALSE
  ), 0)                                                        AS total_spent,

  b.total_allocated - COALESCE(SUM(sl.amount) FILTER (
    WHERE sl.status = 'completed' AND sl.is_deleted = FALSE
  ), 0)                                                        AS remaining,

  ROUND(
    COALESCE(SUM(sl.amount) FILTER (
      WHERE sl.status = 'completed' AND sl.is_deleted = FALSE
    ), 0) / NULLIF(b.total_allocated, 0) * 100, 2
  )                                                            AS utilisation_pct

FROM budgets b
LEFT JOIN municipalities m ON m.m_uid   = b.municipality_id
LEFT JOIN departments d    ON d.d_uid   = b.department_id
LEFT JOIN spending_log sl  ON sl.budget_id = b.b_uid
WHERE b.is_deleted = FALSE
GROUP BY b.b_uid, b.title, b.fiscal_year, b.currency_code,
         b.total_allocated, b.status, m.official_name, d.dept_name;


-- ---- Team workload view ----------------------------------------
CREATE VIEW v_team_workload AS
SELECT
  t.t_uid,
  t.team_name,
  t.specialty,
  t.is_available,
  d.dept_name,
  m.official_name                                              AS municipality_name,
  COUNT(a.a_uid) FILTER (WHERE a.status IN ('pending','in_progress')
                         AND a.is_deleted = FALSE)             AS active_assignments,
  COUNT(tm.tm_uid)                                             AS member_count,
  ROUND(AVG(f.rating) FILTER (
    WHERE f.is_deleted = FALSE
  ), 2)                                                        AS avg_rating
FROM teams t
LEFT JOIN departments d   ON d.d_uid      = t.department_id
LEFT JOIN municipalities m ON m.m_uid     = d.municipality_id
LEFT JOIN assignments a   ON a.team_id    = t.t_uid
LEFT JOIN feedback f      ON f.team_id    = t.t_uid
LEFT JOIN team_members tm ON tm.team_id   = t.t_uid
WHERE t.is_deleted = FALSE
GROUP BY t.t_uid, t.team_name, t.specialty, t.is_available,
         d.dept_name, m.official_name;


-- ---- SLA breach tracker ----------------------------------------
CREATE VIEW v_sla_breaches AS
SELECT
  c.co_uid,
  c.title,
  c.status,
  c.priority,
  c.municipality_id,
  c.department_id,
  c.reported_at,
  sla.resolution_hours,
  c.reported_at + (sla.resolution_hours || ' hours')::INTERVAL AS deadline,
  EXTRACT(EPOCH FROM (
    NOW() - (c.reported_at + (sla.resolution_hours || ' hours')::INTERVAL)
  )) / 3600                                                    AS hours_overdue
FROM complaints c
JOIN sla_rules sla
  ON  sla.municipality_id = c.municipality_id
  AND sla.category_id     = c.category_id
  AND sla.priority        = c.priority
  AND sla.is_active       = TRUE
WHERE c.is_deleted = FALSE
  AND c.status NOT IN ('resolved','rejected')
  AND NOW() > c.reported_at + (sla.resolution_hours || ' hours')::INTERVAL;


-- ================================================================
--  15. ROW-LEVEL SECURITY  (starter set for Supabase)
-- ================================================================

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints        ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- Superadmin bypass (set this role in Supabase Auth custom claims)
CREATE POLICY superadmin_all_profiles
  ON profiles FOR ALL
  USING (auth.jwt() ->> 'role' = 'superadmin');

-- Citizens see only their own profile
CREATE POLICY citizen_own_profile
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY citizen_update_own_profile
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Citizens see/manage only their own citizen record
CREATE POLICY citizen_own_citizen_row
  ON citizens FOR ALL
  USING (auth.uid() = id);

-- Citizens can read/create/update only their own complaints
CREATE POLICY citizen_own_complaints_read
  ON complaints FOR SELECT
  USING (
    auth.uid() = citizen_id
    OR auth.jwt() ->> 'role' IN ('superadmin','municipality_head','department_head','staff')
  );

CREATE POLICY citizen_own_complaints_insert
  ON complaints FOR INSERT
  WITH CHECK (auth.uid() = citizen_id);

CREATE POLICY citizen_own_complaints_update
  ON complaints FOR UPDATE
  USING (auth.uid() = citizen_id)
  WITH CHECK (
    -- Citizens can only change description; status changes go via staff
    auth.uid() = citizen_id
    AND status = 'pending'
  );

-- Feedback: citizens can only submit feedback on their own resolved complaints
CREATE POLICY citizen_own_feedback
  ON feedback FOR INSERT
  WITH CHECK (auth.uid() = citizen_id);

CREATE POLICY citizen_read_own_feedback
  ON feedback FOR SELECT
  USING (auth.uid() = citizen_id);

-- Notification reads: citizens manage only their own
CREATE POLICY citizen_own_notif_reads
  ON notification_reads FOR ALL
  USING (auth.uid() = recipient_id);

-- Notifications: citizens see only notifications addressed to them
CREATE POLICY citizen_own_notifications
  ON notifications FOR SELECT
  USING (
    target_profile_id = auth.uid()
    OR scope IN ('municipality','all')
    OR auth.jwt() ->> 'role' IN ('superadmin','municipality_head','department_head','staff')
  );
