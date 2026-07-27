# Smart Civic Platform — Consolidated Schema Design Plan

## 1. Purpose

This document maps every database entity, relationship, column, enum, constraint, index, and design decision derived from all 11 module plans into a single coherent schema design. The final output is `Supabase_Schema.sql` (v3), which replaces the current v2 schema.

---

## 2. Enum Catalog

### 2.1 Existing Enums (preserved from v2)

| Enum | Values | Used By |
|------|--------|---------|
| `user_role` | `superadmin`, `municipality_head`, `department_head`, `staff`, `citizen` | profiles |
| `account_status` | `active`, `inactive`, `suspended` | profiles |
| `employee_status` | `active`, `inactive`, `suspended`, `terminated` | staff |
| `gender` | `male`, `female`, `other`, `prefer_not_to_say` | staff, citizens |
| `notification_pref` | `email`, `sms`, `both`, `none` | citizens |
| `local_level_type` | `metropolitan_city`, `sub_metropolitan_city`, `municipality`, `rural_municipality` | municipalities |
| `department_category` | `water_supply`, `electricity`, `road_transport`, `sanitation`, `health`, `education`, `public_works`, `revenue_tax`, `agriculture`, `disaster_management`, `administration`, `other` | departments |
| `record_type` | `complaint`, `request`, `inquiry` | complaints |
| `complaint_status` | `pending`, `under_review`, `in_progress`, `resolved`, `rejected`, `closed` | complaints |
| `assignment_status` | `pending`, `accepted`, `in_progress`, `completed`, `cancelled`, `reassigned` | complaint_assignments |
| `priority` | `low`, `medium`, `high`, `urgent` | complaints, complaint_categories |
| `audience_scope` | `individual`, `team`, `department`, `all_staff`, `all_citizens`, `everyone` | announcements, notifications |
| `audit_action` | `LOGIN`, `LOGOUT`, `INSERT`, `UPDATE`, `DELETE`, `STATUS_CHANGE`, `ROLE_CHANGE`, `ASSIGN`, `EXPORT` | audit_logs |
| `severity` | `info`, `warning`, `critical` | audit_logs |
| `media_context` | `complaint`, `assignment_proof`, `announcement` | media |

### 2.2 New Enums

| Enum | Values | Used By |
|------|--------|---------|
| `onboarding_status` | `invited`, `pending_onboarding`, `active`, `expired`, `suspended` | profiles (replaces account_status for non-citizen roles) |
| `complaint_status_ext` | **ADD**: `assigned`, `escalated`, `reopened`, `cross_dept_pending` | complaints (extended status set) |
| `sla_level` | `none`, `warning_level_1`, `escalation_level_2` | sla_events |
| `handoff_type` | `peer_reassign`, `return_to_dept_head` | complaint_handoffs |
| `dual_control_status` | `pending`, `approved`, `rejected`, `expired` | dual_control_requests |
| `kyc_status` | `unverified`, `pending`, `verified`, `rejected` | citizens |
| `team_type` | `single_department`, `cross_departmental` | teams |
| `notification_type` | `system`, `complaint_update`, `team_assignment`, `handoff`, `sla_warning`, `sla_escalation`, `broadcast` | notifications |
| `notification_channel` | `in_app`, `push`, `sms`, `email` | notification_logs, notification_preferences |
| `invite_purpose` | `staff_onboarding`, `department_head_onboarding`, `municipality_head_onboarding` | role_invites |

---

## 3. Table Specifications

### 3.1 Geography & Administration (unchanged from v2)

#### `provinces`
- `id UUID PK DEFAULT uuid_generate_v4()`
- `name TEXT NOT NULL UNIQUE`
- `capital TEXT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `districts`
- `id UUID PK DEFAULT uuid_generate_v4()`
- `province_id UUID NOT NULL → provinces(id) ON DELETE RESTRICT`
- `name TEXT NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE(province_id, name)`

#### `municipalities`
- `id UUID PK DEFAULT uuid_generate_v4()`
- `district_id UUID NOT NULL → districts(id) ON DELETE RESTRICT`
- `official_name TEXT NOT NULL`
- `official_email TEXT NOT NULL UNIQUE`
- `official_contact_no TEXT`
- `local_level_type local_level_type NOT NULL DEFAULT 'municipality'`
- `total_wards INTEGER NOT NULL DEFAULT 1 CHECK (total_wards > 0)`
- `official_logo TEXT`
- `about_description TEXT`
- `mayor_chairperson_name TEXT`
- `deputy_mayor_vice_chairperson_name TEXT`
- `head_profile_id UUID → profiles(id) ON DELETE SET NULL` (ADDED LATER via ALTER)
- `head_name TEXT`
- `head_email TEXT`
- `head_contact_no TEXT`
- **`is_active BOOLEAN NOT NULL DEFAULT FALSE`** (CHANGED from v2's DEFAULT TRUE — all 753 municipalities pre-seeded inactive)
- `registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `wards`
- `id UUID PK DEFAULT uuid_generate_v4()`
- `municipality_id UUID NOT NULL → municipalities(id) ON DELETE CASCADE`
- `ward_no INTEGER NOT NULL CHECK (ward_no > 0)`
- `ward_office_name TEXT`
- `ward_chairperson_name TEXT`
- `contact_number TEXT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE(municipality_id, ward_no)`

#### `departments`
- `id UUID PK DEFAULT uuid_generate_v4()`
- `municipality_id UUID NOT NULL → municipalities(id) ON DELETE CASCADE`
- `department_name TEXT NOT NULL`
- `department_category department_category NOT NULL DEFAULT 'other'`
- `official_email TEXT NOT NULL`
- `department_logo TEXT`
- `head_profile_id UUID → profiles(id) ON DELETE SET NULL` (ADDED LATER via ALTER)
- `head_name TEXT`
- `head_email TEXT`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE(municipality_id, department_name)`

### 3.2 Identity & Access

#### `profiles` (ENHANCED — 12 new columns)
- `id UUID PK → auth.users(id) ON DELETE CASCADE`
- `full_name TEXT NOT NULL`
- `email TEXT UNIQUE` (nullable — citizens use phone)
- `phone TEXT UNIQUE NOT NULL` (was nullable, now NOT NULL for citizen auth)
- `role user_role NOT NULL DEFAULT 'citizen'`
- `account_status onboarding_status NOT NULL DEFAULT 'invited'` (CHANGED to use onboarding_status enum)
- `municipality_id UUID → municipalities(id) ON DELETE SET NULL`
- `department_id UUID → departments(id) ON DELETE SET NULL`
- `force_password_reset BOOLEAN NOT NULL DEFAULT FALSE`
- `created_by UUID → profiles(id) ON DELETE SET NULL`
- `last_login_at TIMESTAMPTZ`
- `last_login_ip INET` (NEW — security audit)
- `mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE` (NEW)
- `password_updated_at TIMESTAMPTZ` (NEW)
- `force_mfa BOOLEAN NOT NULL DEFAULT FALSE` (NEW — superadmin/muni/dept head forced)
- `alternate_phone TEXT` (NEW)
- `designation TEXT` (NEW — job title for staff/dept head)
- `employee_id TEXT` (NEW — organizational employee ID)
- `onboarding_wizard_completed BOOLEAN NOT NULL DEFAULT FALSE` (NEW)
- `onboarding_completed_at TIMESTAMPTZ` (NEW)
- `identity_type TEXT` (NEW — citizenship, passport, driver_license)
- `identity_number TEXT` (NEW)
- `identity_document_url TEXT` (NEW)
- `identity_verified_at TIMESTAMPTZ` (NEW)
- `is_deleted BOOLEAN NOT NULL DEFAULT FALSE`
- `deleted_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- **Constraints:**
  - `CHECK (role <> 'department_head' OR department_id IS NOT NULL)`
  - `CHECK (role NOT IN ('municipality_head', 'department_head', 'staff') OR municipality_id IS NOT NULL)`
  - `UNIQUE(identity_number)` WHERE identity_number IS NOT NULL
  - `CHECK (phone IS NOT NULL OR email IS NOT NULL)` — at least one contact method

#### `staff` (minor additions)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `profile_id UUID NOT NULL UNIQUE → profiles(id) ON DELETE CASCADE`
- `municipality_id UUID NOT NULL → municipalities(id) ON DELETE CASCADE`
- `primary_department_id UUID NOT NULL → departments(id) ON DELETE CASCADE`
- `employee_id TEXT`
- `expertise TEXT`
- `contact_number TEXT`
- `gender gender`
- `date_of_birth DATE`
- `personal_address TEXT`
- `onboarded_at TIMESTAMPTZ DEFAULT NOW()`
- `employee_status employee_status NOT NULL DEFAULT 'active'`
- `is_deleted BOOLEAN NOT NULL DEFAULT FALSE`
- `deleted_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE(employee_id, municipality_id)`

#### `deleted_staff` (archive, unchanged from v2)

#### `superadmin_invites` (NEW — zero-trust admin onboarding)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `token TEXT NOT NULL UNIQUE`
- `email TEXT NOT NULL`
- `inviter_id UUID → profiles(id) ON DELETE SET NULL`
- `designation TEXT`
- `expires_at TIMESTAMPTZ NOT NULL`
- `used_at TIMESTAMPTZ`
- `is_used BOOLEAN NOT NULL DEFAULT FALSE`
- `is_revoked BOOLEAN NOT NULL DEFAULT FALSE`
- `revoked_at TIMESTAMPTZ`
- `revoked_by UUID → profiles(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `role_invites` (NEW — unified invite for staff/dept head/muni head)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `email TEXT`
- `phone TEXT`
- `token TEXT NOT NULL UNIQUE`
- `role user_role NOT NULL`
- `municipality_id UUID → municipalities(id) ON DELETE CASCADE`
- `department_id UUID → departments(id) ON DELETE SET NULL`
- `staff_role TEXT` (NEW — optional designation within department)
- `additional_data JSONB`
- `invited_by UUID → profiles(id) ON DELETE SET NULL`
- `expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')`
- `used_at TIMESTAMPTZ`
- `is_used BOOLEAN NOT NULL DEFAULT FALSE`
- `is_revoked BOOLEAN NOT NULL DEFAULT FALSE`
- `revoked_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `onboarding_wizard_progress` (NEW — first-login wizard state)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `profile_id UUID NOT NULL UNIQUE → profiles(id) ON DELETE CASCADE`
- `current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 4)`
- `step1_completed BOOLEAN NOT NULL DEFAULT FALSE` (password + MFA setup)
- `step2_completed BOOLEAN NOT NULL DEFAULT FALSE` (profile details)
- `step3_completed BOOLEAN NOT NULL DEFAULT FALSE` (identity document upload)
- `step4_completed BOOLEAN NOT NULL DEFAULT FALSE` (review & confirm)
- `wizard_completed_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `mfa_tokens` (NEW)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `profile_id UUID NOT NULL → profiles(id) ON DELETE CASCADE`
- `secret TEXT NOT NULL`
- `method TEXT NOT NULL DEFAULT 'totp'`
- `is_enabled BOOLEAN NOT NULL DEFAULT FALSE`
- `is_primary BOOLEAN NOT NULL DEFAULT FALSE`
- `verified_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE(profile_id, method)`

#### `ip_whitelist` (NEW — superadmin security)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `cidr TEXT NOT NULL`
- `label TEXT`
- `created_by UUID → profiles(id) ON DELETE SET NULL`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `dual_control_requests` (NEW — two-person approval)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `action TEXT NOT NULL`
- `target_id UUID`
- `payload JSONB`
- `requested_by UUID NOT NULL → profiles(id) ON DELETE CASCADE`
- `approved_by UUID → profiles(id) ON DELETE SET NULL`
- `status dual_control_status NOT NULL DEFAULT 'pending'`
- `requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `responded_at TIMESTAMPTZ`
- `rejection_reason TEXT`

#### `password_policy` (NEW — global security config)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `min_length INTEGER NOT NULL DEFAULT 16`
- `require_uppercase BOOLEAN NOT NULL DEFAULT TRUE`
- `require_lowercase BOOLEAN NOT NULL DEFAULT TRUE`
- `require_number BOOLEAN NOT NULL DEFAULT TRUE`
- `require_special BOOLEAN NOT NULL DEFAULT TRUE`
- `max_age_days INTEGER NOT NULL DEFAULT 90`
- `prevent_reuse_count INTEGER NOT NULL DEFAULT 5`
- `updated_by UUID → profiles(id) ON DELETE SET NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### 3.3 Citizens (ENHANCED)

#### `citizens` (18 new columns for structured address + KYC)
- `id UUID PK → profiles(id) ON DELETE CASCADE`
- `first_name TEXT`
- `middle_name TEXT`
- `last_name TEXT`
- `citizenship_id TEXT UNIQUE`
- `gender gender`
- `date_of_birth DATE` **CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '16 years')**
- `profile_picture TEXT`
- `current_address TEXT` (legacy free-text — kept for backward compat)
- `permanent_address TEXT` (legacy free-text — kept for backward compat)
- **Structured permanent address (NEW):**
  - `permanent_province_id UUID → provinces(id) ON DELETE SET NULL`
  - `permanent_district_id UUID → districts(id) ON DELETE SET NULL`
  - `permanent_municipality_id UUID → municipalities(id) ON DELETE SET NULL`
  - `permanent_ward_id UUID → wards(id) ON DELETE SET NULL`
  - `permanent_tole TEXT`
- **Structured current address (NEW):**
  - `current_province_id UUID → provinces(id) ON DELETE SET NULL`
  - `current_district_id UUID → districts(id) ON DELETE SET NULL`
  - `current_municipality_id UUID → municipalities(id) ON DELETE SET NULL`
  - `current_ward_id UUID → wards(id) ON DELETE SET NULL`
  - `current_tole TEXT`
- **KYC fields (NEW):**
  - `identity_type TEXT`
  - `identity_number TEXT UNIQUE`
  - `identity_front_image_url TEXT`
  - `identity_back_image_url TEXT`
  - `kyc_status kyc_status NOT NULL DEFAULT 'unverified'`
  - `kyc_verified_by UUID → profiles(id) ON DELETE SET NULL`
  - `kyc_verified_at TIMESTAMPTZ`
  - `kyc_rejection_reason TEXT`
- `ward_id UUID → wards(id) ON DELETE SET NULL` (legacy FK)
- `contact_number TEXT`
- `notification_pref notification_pref NOT NULL DEFAULT 'both'`
- `registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `otp_codes` (NEW — phone verification)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `phone TEXT NOT NULL`
- `otp_code TEXT NOT NULL`
- `purpose TEXT NOT NULL DEFAULT 'registration'`
- `is_used BOOLEAN NOT NULL DEFAULT FALSE`
- `expires_at TIMESTAMPTZ NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Index: `(phone, purpose, is_used)`

### 3.4 Complaints & Grievance (ENHANCED)

#### `complaint_categories` (minor addition)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `category_name TEXT NOT NULL UNIQUE`
- `department_category department_category NOT NULL`
- `department_id UUID → departments(id) ON DELETE SET NULL` (NEW — explicit FK routing)
- `default_priority priority NOT NULL DEFAULT 'medium'`
- `default_sla_hours INTEGER NOT NULL DEFAULT 72 CHECK (default_sla_hours > 0)`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `complaints` (18 new columns for tracking, geo, SLA, handoff)
- `co_uid UUID PK DEFAULT uuid_generate_v4()`
- **`tracking_id TEXT NOT NULL UNIQUE`** (NEW — human-readable reference)
- `citizen_id UUID NOT NULL → citizens(id) ON DELETE CASCADE`
- `municipality_id UUID NOT NULL → municipalities(id) ON DELETE CASCADE`
- `category_id UUID NOT NULL → complaint_categories(id)`
- **`secondary_category_id UUID → complaint_categories(id) ON DELETE SET NULL`** (NEW — multi-department routing)
- `assigned_department_id UUID → departments(id) ON DELETE SET NULL`
- **`lead_department_id UUID → departments(id) ON DELETE SET NULL`** (NEW — cross-dept lead)
- **`current_staff_id UUID → staff(id) ON DELETE SET NULL`** (NEW — current assignee)
- **`current_team_id UUID → teams(id) ON DELETE SET NULL`** (NEW — current team)
- `ticket_type record_type NOT NULL DEFAULT 'complaint'`
- `title TEXT NOT NULL`
- `description TEXT NOT NULL`
- `priority priority NOT NULL DEFAULT 'medium'`
- **`severity_level TEXT NOT NULL DEFAULT 'medium'`** (NEW — low/medium/high/critical)
- `status complaint_status NOT NULL DEFAULT 'pending'`
- **`cross_dept_status TEXT`** (NEW — active/completed/pending_sign_off)
- **Geo-location fields (NEW):**
  - `location_source TEXT` (gps/manual/ward_only)
  - `latitude DECIMAL(10,7)`
  - `longitude DECIMAL(10,7)`
  - `ward_number SMALLINT`
- `rejection_reason TEXT`
- `resolution_note TEXT`
- **SLA tracking fields (NEW):**
  - `sla_level INTEGER NOT NULL DEFAULT 0` (0=none, 1=warning, 2=escalated)
  - `sla_breached BOOLEAN NOT NULL DEFAULT FALSE`
  - `sla_breached_at TIMESTAMPTZ`
  - `escalated_to_munic_head BOOLEAN NOT NULL DEFAULT FALSE`
  - `escalated_at TIMESTAMPTZ`
- `sla_due_at TIMESTAMPTZ`
- **`handoff_count INTEGER NOT NULL DEFAULT 0`** (NEW)
- **`submission_step_completed INTEGER NOT NULL DEFAULT 0`** (NEW — multi-step submission)
- `submitted_date TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `resolution_date TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `media` (unchanged from v2)
#### `complaint_updates` (unchanged from v2)

#### `complaint_assignments` (unchanged from v2)

#### `complaint_handoffs` (NEW — staff handoff audit trail)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `complaint_id UUID NOT NULL → complaints(co_uid) ON DELETE CASCADE`
- `from_staff_id UUID → staff(id) ON DELETE SET NULL`
- `to_staff_id UUID → staff(id) ON DELETE SET NULL`
- `to_department_head BOOLEAN NOT NULL DEFAULT FALSE`
- `handoff_type handoff_type NOT NULL DEFAULT 'peer_reassign'`
- `handoff_reason TEXT NOT NULL`
- `handoff_note TEXT`
- `initiated_by UUID → profiles(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `complaint_collaborations` (NEW — multi-department collaboration)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `complaint_id UUID NOT NULL → complaints(co_uid) ON DELETE CASCADE`
- `primary_dept_id UUID NOT NULL → departments(id) ON DELETE CASCADE`
- `supporting_dept_id UUID NOT NULL → departments(id) ON DELETE CASCADE`
- `initiated_by UUID → profiles(id) ON DELETE SET NULL`
- `initiation_method TEXT NOT NULL` (auto_routed / manual_add)
- `inspection_note TEXT`
- `primary_sign_off BOOLEAN NOT NULL DEFAULT FALSE`
- `supporting_sign_off BOOLEAN NOT NULL DEFAULT FALSE`
- `primary_signed_at TIMESTAMPTZ`
- `supporting_signed_at TIMESTAMPTZ`
- `status TEXT NOT NULL DEFAULT 'active'` (active / completed)
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `complaint_sign_offs` (NEW — joint resolution audit)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `complaint_id UUID NOT NULL → complaints(co_uid) ON DELETE CASCADE`
- `department_id UUID NOT NULL → departments(id) ON DELETE CASCADE`
- `signed_by UUID NOT NULL → profiles(id) ON DELETE CASCADE`
- `role_at_time user_role NOT NULL`
- `decision TEXT NOT NULL` (approve / reject)
- `note TEXT`
- `signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `sla_events` (NEW — SLA escalation history)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `complaint_id UUID NOT NULL → complaints(co_uid) ON DELETE CASCADE`
- `sla_level INTEGER NOT NULL` (1=warning, 2=escalation)
- `triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `status_at_time complaint_status NOT NULL`
- `notified_staff BOOLEAN NOT NULL DEFAULT FALSE`
- `notified_dept_head BOOLEAN NOT NULL DEFAULT FALSE`
- `notified_munic_head BOOLEAN NOT NULL DEFAULT FALSE`
- `resolved_at TIMESTAMPTZ`

### 3.5 Teams (ENHANCED)

#### `teams` (5 new columns for cross-departmental + scheduling)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `department_id UUID → departments(id) ON DELETE CASCADE` (nullable — cross-dept teams reference municipality)
- **`municipality_id UUID → municipalities(id) ON DELETE CASCADE`** (NEW — parent for cross-dept teams)
- `team_name TEXT NOT NULL`
- `description TEXT`
- **`team_type team_type NOT NULL DEFAULT 'single_department'`** (NEW)
- **`start_date TIMESTAMPTZ`** (NEW — time-bound team)
- **`end_date TIMESTAMPTZ`** (NEW)
- **`created_by UUID → profiles(id) ON DELETE SET NULL`** (NEW)
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE(department_id, team_name)` — unique per dept (nullable department_id requires handling)
- **CHECK constraints:**
  - `CHECK (team_type = 'single_department' OR municipality_id IS NOT NULL)` — cross-dept needs muni
  - `CHECK (team_type <> 'single_department' OR department_id IS NOT NULL)` — single-dept needs dept
  - `CHECK (start_date IS NULL OR end_date IS NULL OR start_date < end_date)`

#### `team_members` (unchanged from v2)

#### `staff_assignments` (NEW — time-bound team membership with conflict detection)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `staff_id UUID NOT NULL → staff(id) ON DELETE CASCADE`
- `team_id UUID NOT NULL → teams(id) ON DELETE CASCADE`
- `assigned_by UUID → profiles(id) ON DELETE SET NULL`
- `start_date TIMESTAMPTZ NOT NULL`
- `end_date TIMESTAMPTZ NOT NULL`
- `is_emergency_override BOOLEAN NOT NULL DEFAULT FALSE`
- `override_reason TEXT`
- `released_at TIMESTAMPTZ`
- `release_reason TEXT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE(staff_id, team_id)`
- `CHECK (start_date < end_date)`

### 3.6 Notifications (ENHANCED)

#### `notification_templates` (NEW)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `trigger_event TEXT NOT NULL UNIQUE`
- `title_template TEXT NOT NULL`
- `body_template TEXT NOT NULL`
- `channels notification_channel[] NOT NULL DEFAULT '{in_app}'`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `notifications` (8 new columns)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `sender_id UUID NOT NULL → profiles(id) ON DELETE CASCADE`
- `type notification_type NOT NULL DEFAULT 'system'` (NEW)
- `audience audience_scope NOT NULL`
- `target_municipality_id UUID → municipalities(id) ON DELETE CASCADE`
- `target_department_id UUID → departments(id) ON DELETE CASCADE`
- `target_team_id UUID → teams(id) ON DELETE CASCADE`
- `target_profile_id UUID → profiles(id) ON DELETE CASCADE`
- `target_ward_id UUID → wards(id) ON DELETE SET NULL` (NEW — ward-level targeting)
- `complaint_id UUID → complaints(co_uid) ON DELETE CASCADE` (NEW — link to ticket)
- `title TEXT NOT NULL`
- `body TEXT NOT NULL`
- `channels notification_channel[] NOT NULL DEFAULT '{in_app}'` (NEW)
- `is_urgent BOOLEAN NOT NULL DEFAULT FALSE` (NEW)
- `scheduled_for TIMESTAMPTZ` (NEW — scheduled delivery)
- `sent_at TIMESTAMPTZ` (NEW)
- `delivery_status JSONB` (NEW — per-channel delivery result)
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `notification_reads` (2 new columns)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `notification_id UUID NOT NULL → notifications(id) ON DELETE CASCADE`
- `profile_id UUID NOT NULL → profiles(id) ON DELETE CASCADE`
- `is_seen BOOLEAN NOT NULL DEFAULT FALSE` (NEW)
- `is_clicked BOOLEAN NOT NULL DEFAULT FALSE` (NEW)
- `read_at TIMESTAMPTZ` (becomes nullable — read = seen + clicked)
- `UNIQUE(notification_id, profile_id)`

#### `notification_logs` (NEW — delivery audit)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `notification_id UUID NOT NULL → notifications(id) ON DELETE CASCADE`
- `profile_id UUID NOT NULL → profiles(id) ON DELETE CASCADE`
- `channel notification_channel NOT NULL`
- `status TEXT NOT NULL DEFAULT 'pending'` (pending / sent / delivered / failed)
- `error_message TEXT`
- `sent_at TIMESTAMPTZ`
- `delivered_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `notification_preferences` (NEW — per-user channel opt-in/out)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `profile_id UUID NOT NULL → profiles(id) ON DELETE CASCADE`
- `channel notification_channel NOT NULL`
- `is_enabled BOOLEAN NOT NULL DEFAULT TRUE`
- `disabled_types notification_type[]`
- `quiet_hours_start TIME`
- `quiet_hours_end TIME`
- `UNIQUE(profile_id, channel)`

#### `push_tokens` (NEW — push notification device registry)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `profile_id UUID NOT NULL → profiles(id) ON DELETE CASCADE`
- `token TEXT NOT NULL`
- `platform TEXT` (ios / android / web)
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE(profile_id, token)`

### 3.7 Feedback (unchanged from v2)

### 3.8 Announcements (unchanged from v2)

### 3.9 Analytics & Reporting

#### `dashboard_metrics_cache` (NEW)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `scope TEXT NOT NULL` (superadmin / municipality / department / staff)
- `scope_id UUID NOT NULL`
- `metrics JSONB NOT NULL`
- `cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes')`
- `UNIQUE(scope, scope_id)`

#### `monthly_aggregated_stats` (NEW)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `municipality_id UUID → municipalities(id) ON DELETE CASCADE`
- `department_id UUID → departments(id) ON DELETE CASCADE`
- `year_month DATE NOT NULL` (first day of month)
- `total_complaints INTEGER NOT NULL DEFAULT 0`
- `resolved_count INTEGER NOT NULL DEFAULT 0`
- `rejected_count INTEGER NOT NULL DEFAULT 0`
- `reopened_count INTEGER NOT NULL DEFAULT 0`
- `sla_breach_count INTEGER NOT NULL DEFAULT 0`
- `avg_resolution_hours DECIMAL(10,2)`
- `avg_rating DECIMAL(3,2)`
- `total_handoffs INTEGER NOT NULL DEFAULT 0`
- `total_escalations INTEGER NOT NULL DEFAULT 0`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `executive_reports` (NEW — generated PDF/Excel reports)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `scope TEXT NOT NULL`
- `scope_id UUID NOT NULL`
- `title TEXT NOT NULL`
- `report_type TEXT NOT NULL` (monthly / quarterly / annual / adhoc)
- `format TEXT NOT NULL` (pdf / xlsx)
- `file_url TEXT NOT NULL`
- `parameters JSONB`
- `generated_by UUID → profiles(id) ON DELETE SET NULL`
- `generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `department_performance_scores` (NEW — monthly scoring)
- `id UUID PK DEFAULT uuid_generate_v4()`
- `department_id UUID NOT NULL → departments(id) ON DELETE CASCADE`
- `municipality_id UUID NOT NULL → municipalities(id) ON DELETE CASCADE`
- `month DATE NOT NULL`
- `total_complaints INTEGER NOT NULL DEFAULT 0`
- `resolved_count INTEGER NOT NULL DEFAULT 0`
- `sla_breach_count INTEGER NOT NULL DEFAULT 0`
- `avg_resolution_hours DECIMAL(10,2)`
- `avg_rating DECIMAL(3,2)`
- `handoff_count INTEGER NOT NULL DEFAULT 0`
- `escalation_count INTEGER NOT NULL DEFAULT 0`
- `performance_score DECIMAL(5,2)` — weighted composite
- `computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE(department_id, month)`

### 3.10 System & Audit (unchanged from v2)

#### `system_settings`
#### `audit_logs`
#### `refresh_tokens`

---

## 4. Views

| View | Definition |
|------|-----------|
| `v_inactive_municipalities` | municipalities WHERE is_active = FALSE, joined with district + province |
| `v_active_municipalities` | municipalities WHERE is_active = TRUE, joined with district + province |
| `v_municipality_detail` | municipalities + districts + provinces + head profile info |
| `ward_monthly_stats` (MATERIALIZED) | complaints grouped by ward + month — resolution rate, avg time, SLA breach count |

---

## 5. Index Strategy

### 5.1 Existing Indexes (to preserve from v2)
All 32 indexes from v2 are preserved.

### 5.2 New Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_sa_invites_token` | superadmin_invites | token | Invite lookup by token |
| `idx_sa_invites_email` | superadmin_invites | email | Admin email search |
| `idx_role_invites_token` | role_invites | token | Invite lookup |
| `idx_role_invites_email` | role_invites | email | Email search |
| `idx_otp_codes_phone_purpose` | otp_codes | phone, purpose, is_used | OTP verification lookup |
| `idx_staff_assignments_staff` | staff_assignments | staff_id | Staff schedule lookup |
| `idx_staff_assignments_team` | staff_assignments | team_id | Team membership lookup |
| `idx_staff_assignments_dates` | staff_assignments | staff_id, start_date, end_date | Availability conflict check |
| `idx_teams_municipality` | teams | municipality_id | Cross-dept team scope |
| `idx_teams_created_by` | teams | created_by | Team creator lookup |
| `idx_handoffs_complaint` | complaint_handoffs | complaint_id | Handoff history |
| `idx_sla_events_complaint` | sla_events | complaint_id | SLA timeline |
| `idx_notif_logs_profile` | notification_logs | profile_id, status | User delivery status |
| `idx_notif_logs_notification` | notification_logs | notification_id | Notification delivery audit |
| `idx_notif_logs_channel_status` | notification_logs | channel, status | Channel delivery summary |
| `idx_notifications_type_sent` | notifications | type, sent_at | Dashboard unfiltered count |
| `idx_notifications_created_at` | notifications | created_at | Message ordering |
| `idx_notifications_audience_ward` | notifications | audience, target_ward_id | Ward targeting |
| `idx_complaints_tracking` | complaints | tracking_id | Citizen lookup by ref |
| `idx_complaints_resolution_date` | complaints | resolution_date | Resolution trends |
| `idx_complaints_muni_status_date` | complaints | municipality_id, status, submitted_date | Muni dashboard drill-down |
| `idx_complaints_dept_status_date` | complaints | assigned_department_id, status, submitted_date | Dept dashboard |
| `idx_complaints_current_assignee` | complaints | current_staff_id | Staff workload |
| `idx_complaints_sla_breached` | complaints | municipality_id, sla_breached | SLA breach monitoring |
| `idx_feedback_rating` | feedback | complaint_id, rating | Rating analytics |
| `idx_monthly_stats_muni` | monthly_aggregated_stats | municipality_id, year_month | Muni stats |
| `idx_monthly_stats_dept` | monthly_aggregated_stats | department_id, year_month | Dept stats |
| `idx_dual_control_status` | dual_control_requests | status, requested_by | Pending approvals |
| `idx_profiles_onboarding` | profiles | onboarding_wizard_completed, account_status | Pending wizard completion |
| `idx_collaborations_complaint` | complaint_collaborations | complaint_id | Active collaborations |
| `idx_sign_offs_complaint` | complaint_sign_offs | complaint_id | Sign-off audit |

---

## 6. Storage Buckets

| Bucket | Path Pattern | Access |
|--------|-------------|--------|
| `complaint-media` | `complaint-media/{trackingId}/{uuid}-{filename}` | Authenticated users |
| `complaint-proof` | `complaint-proof/{trackingId}/{uuid}-after.jpg` | Staff + citizens (own) |
| `identity-documents` | `identity-documents/{userId}/{type}-{side}.{ext}` | Own + admins |
| `staff-identity-documents` | `staff-identity-documents/{municipalityId}/{profileId}/{type}-{uuid}.{ext}` | Municipal admins |

---

## 7. Key Design Decisions

### 7.1 Extension of `complaint_status` vs. New Enum
**Decision**: Extend `complaint_status` with `'assigned'`, `'escalated'`, `'reopened'`, `'cross_dept_pending'` rather than creating a new enum. This avoids migration complexity and keeps status filtering unified.

### 7.2 `onboarding_status` replaces `account_status` for Non-Citizen Roles
**Decision**: Create new enum `onboarding_status` with `'invited'`, `'pending_onboarding'`, `'active'`, `'expired'`, `'suspended'`. The `profiles.account_status` column uses this new enum. Citizens always use `'active'` after OTP verification.

### 7.3 Phone as Primary Identifier for Citizens
**Decision**: `profiles.phone` becomes `UNIQUE NOT NULL`. `profiles.email` becomes nullable (citizens may not have email). Constraint: at least one of phone or email must be non-null.

### 7.4 Cross-Departmental Teams
**Decision**: `teams.department_id` becomes nullable. Cross-departmental teams set `department_id = NULL` and `municipality_id = {id}`. Single-department teams set `department_id = {id}` and `municipality_id = NULL` (derived from department). CHECK constraints enforce this.

### 7.5 Time-Bound Team Scheduling
**Decision**: `teams.start_date` and `teams.end_date` are optional. When set, `staff_assignments` records the actual member scheduling with conflict detection via `check_staff_availability()` function.

### 7.6 Multi-Department Complaint Routing
**Decision**: `complaints.secondary_category_id` enables auto-routing to a second department. `complaint_collaborations` tracks the joint resolution workflow with sign-off tracking in `complaint_sign_offs`.

### 7.7 SLA Design
**Decision**: SLA deadlines stored in `complaints.sla_due_at` (set via trigger from category default). SLA tracking uses `sla_events` for history. The `complaints` table has denormalized `sla_level`, `sla_breached`, `escalated_to_munic_head` for dashboard query performance.

### 7.8 Staff Handoff
**Decision**: Full audit trail via `complaint_handoffs`. The `complaints.current_staff_id` is denormalized for quick lookup. Handoff types: `peer_reassign` or `return_to_dept_head`.

### 7.9 Notification Delivery
**Decision**: Runtime delivery status tracked in `notification_logs` (one row per recipient per channel). Notifications table has `channels[]` and `delivery_status JSONB` for aggregate view. Templates stored in `notification_templates` with `{{variable}}` substitution.

### 7.10 Analytics Caching
**Decision**: `dashboard_metrics_cache` with 5-minute TTL avoids recomputing heavy aggregation queries on every dashboard load. `monthly_aggregated_stats` and `department_performance_scores` are pre-computed monthly snapshots.

### 7.11 Soft Delete Pattern
**Decision**: All user-facing tables (`profiles`, `staff`, `citizens`, `complaints`, `feedback`, `announcements`, `teams`) use `is_deleted BOOLEAN DEFAULT FALSE` + `deleted_at TIMESTAMPTZ`. Actual rows are never hard-deleted. The `deleted_staff` table is an archive snapshot of the `staff` row at deletion time.

### 7.12 Municipality Pre-Seeding
**Decision**: All 753 municipalities exist at schema setup with `is_active = FALSE`. Activation occurs when a municipality head is assigned. This avoids runtime creation of municipalities.

### 7.13 Circular FK Resolution
**Decision**: The circular reference between `municipalities.head_profile_id → profiles` and `profiles.municipality_id → municipalities` is resolved via ALTER TABLE after both tables exist. Same pattern for `departments.head_profile_id`.

---

## 8. Database Functions & Triggers

### 8.1 Existing (preserved from v2)
- `update_updated_at_column()` — generic updated_at trigger
- `handle_new_user()` — auto-create profile from auth.users
- `set_complaint_sla()` — auto-set sla_due_at from category
- `deactivate_previous_assignments()` — maintain single current assignment
- `auth_role()` — RLS helper
- `auth_municipality_id()` — RLS helper
- `auth_department_id()` — RLS helper
- `admin_set_user_role()` — superadmin role assignment
- `get_department_categories()` — enum listing

### 8.2 New Functions

| Function | Description |
|----------|-------------|
| `check_staff_availability(p_staff_id, p_start, p_end)` | Returns TRUE/FALSE with conflicting assignment details |
| `auto_release_expired_assignments()` | Batch release staff_assignments WHERE end_date < NOW() |
| `handle_sla_escalation()` | Check all active complaints for SLA breaches, create sla_events |
| `generate_tracking_id(municipality_code, category_code)` | Generate human-readable complaint reference ID |
| `log_audit(p_action, p_table, p_record_id, p_old, p_new, p_severity)` | Centralized audit logging function |

---

## 9. RLS Policy Approach

All RLS policies from v2 are preserved with the following additions:

| Table | New Policy |
|-------|-----------|
| superadmin_invites | Superadmin R/W only |
| role_invites | Municipality head sees own invites; department head sees dept invites |
| onboarding_wizard_progress | Own profile only; department head can see own dept's pending |
| mfa_tokens | Own profile only |
| ip_whitelist | Superadmin only |
| dual_control_requests | Requestor sees own, approver sees pending, superadmin sees all |
| otp_codes | System-only (function-based access) |
| complaint_handoffs | Staff sees own handoffs, muni head sees all |
| complaint_collaborations | Staff of involved departments, muni head |
| complaint_sign_offs | Same as collaborations |
| sla_events | Staff sees own tickets, muni head sees all |
| staff_assignments | Staff sees own, dept head sees dept |
| notification_templates | Superadmin R/W, all read |
| notification_logs | Own profile |
| notification_preferences | Own profile |
| push_tokens | Own profile |
| dashboard_metrics_cache | Role-scoped |
| monthly_aggregated_stats | Role-scoped |
| executive_reports | Role-scoped |
| department_performance_scores | Role-scoped |
