# Citizen Grievance Submission, Auto-Routing & Multi-Department Collaboration — 50-Phase Plan

## High-Level Flow (per your blueprint)

```text
                      [ Citizen Submits Grievance ]
                                   │
                                   ▼
                [ Automated Location & Category Engine ]
               (Maps Municipality ID + Ward + Category ID)
                                   │
          ┌────────────────────────┴────────────────────────┐
          ▼                                                 ▼
[ Single-Department Ticket ]                    [ Multi-Department Ticket ]
• Auto-routed directly to                      • Triggered at submission OR
  specific Department Head                        escalated during field inspection
• Assigned to Dept Staff                        • Shared view & joint sign-off

```

**4-Step Submission:**
1. Location Resolution (registered address / GPS / manual ward)
2. Category Selection (primary + optional secondary)
3. Grievance Details (title, description, severity Low/Med/High, media evidence)
4. Ticket Generation (tracking ID: KTM-WARD4-SWM-2026-0892)

**Routing Logic:**
- `complaint_categories.department_category` → matches `departments.department_category`
- Primary Category → Lead Department Owner
- Secondary Category → Supporting Department (visible on both dashboards)

**Multi-Department Collaboration:**
- Method A: Citizen tags secondary category at submission
- Method B: Dept Head clicks "Request Collaboration" post-inspection
- Status `CROSS_DEPT_PENDING` until both departments sign off
- Joint sign-off required for RESOLVED

---

## DOMAIN A — Database: Blueprint-Aligned Schema (Phases 1–5)

### Phase 1: Add Blueprint Columns to `complaints` Table
- `tracking_id TEXT UNIQUE` — format: `MUNI_CODE-WARD{N}-CAT_CODE-YYYY-NNNNNN`
- `severity_level TEXT NOT NULL DEFAULT 'medium'` — enum: `low | medium | high`
- `secondary_category_id UUID REFERENCES complaint_categories(id)` — for multi-dept tagging
- `lead_department_id UUID REFERENCES departments(id)` — primary owner dept
- `cross_dept_status TEXT` — enum: `none | pending_collaboration | in_collaboration | joint_signoff`
- `location_source TEXT` — enum: `registered_address | gps | manual`
- `latitude DECIMAL(10,7)`, `longitude DECIMAL(10,7)` — GPS coordinates
- `ward_number SMALLINT` — denormalized from wards table for display
- `submission_step_completed INTEGER DEFAULT 0` — track 4-step progress

Files:
- `supabase/migrations/v3-complaint-blueprint-columns.sql` (NEW)

### Phase 2: Create `complaint_collaborations` Table (Multi-Dept Backbone)
```sql
CREATE TABLE complaint_collaborations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(co_uid) ON DELETE CASCADE,
    primary_dept_id UUID NOT NULL REFERENCES departments(id),
    supporting_dept_id UUID NOT NULL REFERENCES departments(id),
    initiated_by UUID NOT NULL REFERENCES profiles(id),
    initiation_method TEXT NOT NULL, -- 'citizen_tagging' | 'staff_escalation'
    inspection_note TEXT,
    primary_sign_off BOOLEAN NOT NULL DEFAULT FALSE,
    supporting_sign_off BOOLEAN NOT NULL DEFAULT FALSE,
    primary_signed_at TIMESTAMPTZ,
    supporting_signed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active', -- active | completed | cancelled
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Files:
- `supabase/migrations/v3-complaint-collaborations.sql` (NEW)

### Phase 3: Create `complaint_sign_offs` Table (Audit Trail)
```sql
CREATE TABLE complaint_sign_offs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(co_uid) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id),
    signed_by UUID NOT NULL REFERENCES profiles(id),
    role_at_time user_role NOT NULL,
    decision TEXT NOT NULL, -- 'approved' | 'rejected'
    note TEXT,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Files:
- `supabase/migrations/v3-complaint-signoffs.sql` (NEW)

### Phase 4: Update Complaint Status Enum for Blueprint
- Add to `complaint_status`: `cross_dept_pending`, `reopened`
- Update DB: `ALTER TYPE complaint_status ADD VALUE 'cross_dept_pending'`
- Update DB: `ALTER TYPE complaint_status ADD VALUE 'reopened'`

Files:
- `supabase/migrations/v3-update-complaint-status-enum.sql` (NEW)

### Phase 5: Add Category→Department Direct Mapping
- Add `department_id UUID REFERENCES departments(id)` to `complaint_categories`
- Migration: populate from existing `department_category` enum mapping
- This gives explicit FK routing instead of relying solely on the enum

Files:
- `supabase/migrations/v3-category-department-mapping.sql` (NEW)

---

## DOMAIN B — Backend: Location Resolution Service (Phases 6–10)

### Phase 6: Create Location Resolution Service
- New service: `LocationResolver`
- Methods:
  - `resolveFromRegisteredAddress(citizenId)` — read `citizens.ward_id`, join to `wards.municipality_id`, return `{ municipality_id, ward_id, ward_number }`
  - `resolveFromGPS(lat, lng)` — reverse-geocode (future), return nearest ward
  - `resolveFromManualSelection(wardId)` — direct selection, validate ward exists
- Return: `{ source, municipality_id, ward_id, ward_number, lat, lng }`

Files:
- `Smart_Civic_Platform_Backend/src/service/location-resolver.service.ts` (NEW)

### Phase 7: Add Ward Lookup by Municipality Endpoint
- `GET /api/citizen/wards?municipality_id=` — public, no auth
- Returns: `[{ id, ward_number, ward_office_name }]`
- Used in Step 1 manual ward selection dropdown

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/routes/citizen.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/controller/citizen.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`

### Phase 8: Add Province→District→Municipality Cascade (Public)
- `GET /api/public/provinces` — all provinces
- `GET /api/public/districts?province_id=` — districts by province
- `GET /api/public/municipalities?district_id=` — active municipalities
- Used for manual location selection when registered address is wrong

Files:
- `Smart_Civic_Platform_Backend/src/modules/public/routes/public.routes.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/modules/public/controller/public.controller.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/modules/public/services/public.service.ts` (NEW)

### Phase 9: Add GPS Location Capture Endpoint
- `POST /api/citizen/location` — save GPS point to citizens table
- Accept: `{ latitude, longitude }`
- Future: reverse-geocode to find nearest ward
- Store on citizen profile for auto-fill on submission

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/routes/citizen.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/controller/citizen.controller.ts`

### Phase 10: Add Location Validation Middleware
- Validate: ward belongs to municipality, municipality is active
- Validate: if GPS, coordinates are within Nepal bounds
- Return clear error messages for invalid location selections
- Used by submission endpoint

Files:
- `Smart_Civic_Platform_Backend/src/middleware/location-validation.ts` (NEW)

---

## DOMAIN C — Backend: Category→Department Auto-Routing Engine (Phases 11–15)

### Phase 11: Create Auto-Routing Engine Service
- `RoutingEngine` service:
  - `mapCategoryToDepartment(categoryId, municipalityId)` — look up `complaint_categories.department_id` (Phase 5), then find the department in that municipality with matching `department_category`
  - `resolvePrimaryDepartment(primaryCategoryId, municipalityId)` — returns lead dept
  - `resolveSupportingDepartment(secondaryCategoryId, municipalityId)` — returns supporting dept
  - `validateMultiDeptEligibility(primaryDeptId, secondaryDeptId)` — must be different depts

Files:
- `Smart_Civic_Platform_Backend/src/service/routing-engine.service.ts` (NEW)

### Phase 12: Implement Single-Department Auto-Route
- When citizen submits with only primary category:
  - Look up category → department → set `assigned_department_id`
  - Set `lead_department_id = assigned_department_id`
  - Set `cross_dept_status = 'none'`
  - Complaint lands directly on Department Head dashboard as `PENDING`

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`

### Phase 13: Implement Multi-Department Auto-Route (Method A)
- When citizen submits with primary + secondary category:
  - Primary → `lead_department_id` (owner)
  - Secondary → create `complaint_collaborations` row
  - Set `cross_dept_status = 'in_collaboration'`
  - Complaint visible on BOTH department head dashboards
  - Lead department owns progression

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`
- `Smart_Civic_Platform_Backend/src/service/routing-engine.service.ts`

### Phase 14: Add Routing Audit Logging
- Log every routing decision to `audit_logs`:
  - `action = 'ASSIGN'`, `table_name = 'complaints'`
  - Record: category_id, department_id, routing_method (auto/manual)
  - Include ward_number, municipality_id for traceability
- Log multi-dept collaboration creation

Files:
- `Smart_Civic_Platform_Backend/src/middleware/auditlogger.ts`

### Phase 15: Add Fallback Routing for Unmatched Categories
- If no department matches the category in that municipality:
  - Assign to municipality's default/general department (create if needed)
  - Set flag `routing_warning = true`
  - Notify municipality head via notification
  - Municipality head can reassign manually

Files:
- `Smart_Civic_Platform_Backend/src/service/routing-engine.service.ts`

---

## DOMAIN D — Backend: 4-Step Submission API (Phases 16–20)

### Phase 16: Rewrite Submission Endpoint — 4-Step Support
- New endpoint: `POST /api/citizen/complaints/submit` (replaces old)
- Accept structured body matching 4-step flow:
```json
{
  "location": {
    "source": "registered_address|gps|manual",
    "ward_id": "uuid",
    "latitude": 27.1234567,
    "longitude": 85.1234567
  },
  "category": {
    "primary_category_id": "uuid",
    "secondary_category_id": "uuid?"  // optional
  },
  "details": {
    "title": "string",
    "description": "string",
    "severity_level": "low|medium|high"
  },
  "step_completed": 4
}
```

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/controller/citizen.controller.ts`
- `Smart_Civic_Platform_Backend/src/validation/citizen.validation.ts`

### Phase 17: Generate Blueprint Tracking ID
- Format: `{MUNICIPALITY_CODE}-WARD{WARD_NUMBER}-{CATEGORY_CODE}-{YEAR}-{SEQUENCE}`
- Example: `KTM-WARD4-SWM-2026-0892`
- `MUNICIPALITY_CODE` from `municipalities.code` column
- `CATEGORY_CODE` — first 3 uppercase letters of category_name
- `SEQUENCE` — 6-digit zero-padded daily counter
- Generated in a transaction to avoid race conditions

Files:
- `Smart_Civic_Platform_Backend/src/service/tracking-id.service.ts` (NEW)

### Phase 18: Add Media Upload for Complaint Evidence
- `POST /api/citizen/complaints/:id/media` — upload photo/video
- Store in Supabase storage: `complaint-media/{trackingId}/{uuid}-{filename}`
- Max 5 files, max 10MB each (video), 5MB (photo)
- Accept: `image/*`, `video/*`
- Insert records in `media` table with `context = 'complaint'`

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/routes/citizen.routes.ts`
- `Smart_Civic_Platform_Backend/src/service/storage.service.ts`

### Phase 19: Add Severity-Level Validation & SLA Calculation
- `severity_level` maps to SLA hours:
  - `low` → 120 hours (5 days)
  - `medium` → 72 hours (3 days) — existing default
  - `high` → 24 hours (1 day)
- Set `sla_due_at` on complaint creation
- Override via `complaint_categories.default_sla_hours` if specified

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`

### Phase 20: Add KYC Gate & Submission Limits
- Unverified KYC citizen: max 3 pending complaints (from Citizen Registration plan)
- Verified KYC citizen: unlimited
- Rate limit: max 5 submissions per citizen per 24 hours
- Duplicate detection: same title + category within 7 days → warn + allow

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`
- `Smart_Civic_Platform_Backend/src/middleware/rate-limit.ts`

---

## DOMAIN E — Backend: Single-Department Lifecycle (Phases 21–25)

### Phase 21: Define Single-Dept Status State Machine
```
PENDING → ACCEPTED → IN_PROGRESS → RESOLVED → CLOSED
  │          │            │
  └→ REJECTED └→ REJECTED  └→ REJECTED
                              RESOLVED → REOPENED → IN_PROGRESS
```
- Only Department Head can move PENDING→ACCEPTED
- Only assigned Staff can move ACCEPTED→IN_PROGRESS→RESOLVED
- Department Head can reject at any stage
- Municipality Head can override any status

Files:
- `Smart_Civic_Platform_Backend/src/service/complaint-workflow.service.ts` (NEW)

### Phase 22: Add Status Update Endpoint (Department Head)
- `PATCH /api/v1/department/complaints/:id/status`
- Accept: `{ status, note?, is_internal? }`
- Validate state transition
- Auto-create `complaint_updates` row
- Notify citizen on status change
- If RESOLVED: notify citizen to provide feedback

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`

### Phase 23: Add Status Update Endpoint (Staff)
- `PATCH /api/v1/staff/assignments/:id/status`
- Accept: `{ status, note?, media? }`
- Staff can set: ACCEPTED, IN_PROGRESS, RESOLVED
- Auto-update parent complaint status
- Add proof/media upload on RESOLVED

Files:
- `Smart_Civic_Platform_Backend/src/modules/staff/controller/staff.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/services/staff.service.ts`

### Phase 24: Add Complaint Updates/Notes Endpoint
- `POST /api/citizen/complaints/:id/updates` — citizen notes (always public)
- `POST /api/v1/department/complaints/:id/updates` — dept notes (internal/external)
- `GET /api/citizen/complaints/:id/updates` — citizen sees public only
- `GET /api/v1/department/complaints/:id/updates` — staff sees all

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/routes/citizen.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/routes/department.routes.ts`

### Phase 25: Add Reopen Complaint Endpoint (Citizen)
- `POST /api/citizen/complaints/:id/reopen`
- Accept: `{ reason }`
- Validate: complaint is RESOLVED or CLOSED, within 7 days of resolution
- Set status to REOPENED, increment `reopen_count`
- Notify lead department
- Department head must re-assign or close permanently

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`

---

## DOMAIN F — Backend: Multi-Department Collaboration (Phases 26–30)

### Phase 26: Create Collaboration Service
- `CollaborationService`:
  - `initiateCitizenTagging(complaintId, primaryDeptId, secondaryDeptId)` — Method A
  - `initiateStaffEscalation(complaintId, primaryDeptId, secondaryDeptId, initiatedBy, inspectionNote)` — Method B
  - `submitSignOff(complaintId, departmentId, signedBy, decision, note)` — record sign-off
  - `checkJointSignOff(complaintId)` — returns true if both depts signed off
  - `autoResolveIfSignedOff(complaintId)` — if both signed, set status to RESOLVED

Files:
- `Smart_Civic_Platform_Backend/src/service/collaboration.service.ts` (NEW)

### Phase 27: Implement Method B — Staff Escalation / Request Collaboration
- Endpoint: `POST /api/v1/department/complaints/:id/request-collaboration`
- Accept: `{ supporting_dept_id, inspection_note }`
- Validate: complaint must be in `IN_PROGRESS` or `UNDER_REVIEW` status
- Create `complaint_collaborations` row with `initiation_method = 'staff_escalation'`
- Set complaint `cross_dept_status = 'pending_collaboration'`
- Notify supporting department head
- Supporting department gets read access to complaint

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`

### Phase 28: Implement Joint Sign-Off Endpoints
- `POST /api/v1/department/complaints/:id/sign-off`
- Accept: `{ decision: 'approved' | 'rejected', note? }`
- If approved: record sign-off in `complaint_sign_offs`, mark `complaint_collaborations.{primary|supporting}_sign_off = TRUE`
- If both signed: auto-set complaint status to `RESOLVED`, `cross_dept_status = 'joint_signoff'`
- If rejected: set complaint status to `REJECTED`, notify lead department

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/service/collaboration.service.ts`

### Phase 29: Add Multi-Dept Visibility Middleware
- When a complaint is cross-department:
  - Both department heads see it on their dashboards
  - Staff from both departments can view (but only lead dept staff can update)
  - Add `GET /api/v1/department/complaints/collaborations` — list complaints where this dept is a supporting partner
- Update department queue queries to include collaborations

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/middleware/department.middleware.ts`

### Phase 30: Add Multi-Dept Dashboard Stats
- For Department Head dashboard:
  - `activeCollaborations` — count of complaints where dept is supporting
  - `pendingSignOffs` — count where sign-off is needed from this dept
- For each collaboration: show partner department name, status, days since request

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

---

## DOMAIN G — Backend: Tracking, Notifications & Escalation (Phases 31–35)

### Phase 31: Create Notification Service (Blueprint-Aligned)
- `NotificationService`:
  - `sendToProfile(profileId, title, message, type, complaintId?)`
  - `sendToRole(municipalityId, role, title, message, complaintId?)`
  - `sendToDepartment(departmentId, title, message, complaintId?)`
- Auto-trigger on:
  - Complaint submitted → notify lead department head
  - Status change → notify citizen
  - Collaboration requested → notify supporting dept head
  - Sign-off needed → notify department head
  - Reopen → notify department head

Files:
- `Smart_Civic_Platform_Backend/src/service/notification.service.ts` (NEW)

### Phase 32: Add Notification Endpoints
- `GET /api/notifications` — paginated list for current user
- `GET /api/notifications/unread-count` — unread badge count
- `PATCH /api/notifications/:id/read` — mark single as read
- `PATCH /api/notifications/read-all` — mark all as read
- Integrate with existing `notifications` + `notification_reads` tables

Files:
- `Smart_Civic_Platform_Backend/src/modules/notifications/routes/notification.routes.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/modules/notifications/controller/notification.controller.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/modules/notifications/services/notification.service.ts` (NEW)

### Phase 33: Add Tracking ID Public Lookup
- `GET /api/public/complaints/track/:trackingId` — no auth required
- Returns: status, title, category, department, submitted date, current status
- Does NOT expose citizen personal info
- Used for: "Track Your Complaint" on landing page

Files:
- `Smart_Civic_Platform_Backend/src/modules/public/routes/public.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/public/controller/public.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/public/services/public.service.ts`

### Phase 34: SLA Monitoring Cron Job
- Service: `SlaMonitorService`
- Runs every hour: query complaints where `status NOT IN ('resolved','closed','rejected') AND sla_due_at < NOW()`
- Set `sla_breached = TRUE`
- Notify: lead department head, municipality head
- Escalate if breach persists > 24h: notify municipality head

Files:
- `Smart_Civic_Platform_Backend/src/service/sla-monitor.service.ts` (NEW)

### Phase 35: Export & Analytics Endpoints
- `GET /api/v1/department/complaints/export?format=csv` — dept-level export
- `GET /api/v1/department/analytics` — dept stats: daily trends, staff perf, category breakdown
- `GET /api/municipality/:mid/analytics` — municipality-wide: by ward, by dept, resolution rate
- All analytics include multi-dept collaboration breakdown

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`
- `Smart_Civic_Platform_Backend/src/service/export.service.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

---

## DOMAIN H — Frontend: 4-Step Citizen Submission Wizard (Phases 36–40)

### Phase 36: Create Step 1 — Location Resolution UI
- Default: show citizen's registered address (Municipality + Ward)
- Options:
  - "Use Registered Address" (default)
  - "Use Current Location" (GPS button → browser geolocation)
  - "Select Manually" (province → district → municipality → ward cascade)
- Show selected location with map preview
- If no registered address: auto-prompt manual or GPS

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/SubmitComplain.tsx`
- `Smart_Civic_Platform_Frontend/src/components/LocationPickerMap.tsx`

### Phase 37: Create Step 2 — Category Selection UI
- Primary category dropdown (required) — grouped by department
- Secondary category dropdown (optional) — "This issue involves another department?"
- Show: "Primary: Roads → Roads Department (Lead)"
- Show: "Secondary: Water Supply → Water Department (Supporting)"
- Fetch categories from `GET /api/public/categories`
- Visual badge: "Multi-Department" if secondary selected

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/SubmitComplain.tsx`

### Phase 38: Create Step 3 — Grievance Details UI
- Title input
- Description textarea (rich text optional)
- Severity Level selector: Low / Medium / High (with visual cards)
- Photo/Video upload zone (drag & drop, max 5 files, preview thumbnails)
- Location text field (manual address fallback)
- Map pin placement for precise location

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/SubmitComplain.tsx`

### Phase 39: Create Step 4 — Review & Submit UI
- Review all entered data in a summary card:
  - Location: Municipality, Ward (source badge)
  - Category: Primary (Lead Dept) + Secondary (if any)
  - Title, Description, Severity
  - Media count
- "Edit" buttons for each step
- "Submit" button → POST to `/api/citizen/complaints/submit`
- Success screen: tracking ID prominently displayed
- "Track Status" button → `/citizen/complaints/:id`
- "Share" button to copy tracking link

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/SubmitComplain.tsx`

### Phase 40: Create Citizen Complaint Detail Page
- New page: `CitizenComplaintDetail.tsx`
- Path: `/citizen/complaints/:trackingId` (use tracking ID, not UUID)
- Sections:
  - **Header**: Tracking ID (large, copyable), status badge, severity badge
  - **Status Timeline**: vertical stepper showing all status changes
  - **Details**: title, description, category, department, location
  - **Media Gallery**: image/video thumbnails, click to enlarge
  - **Updates Feed**: public notes from staff + citizen
  - **Collaboration Info**: if multi-dept, show both departments + sign-off status
  - **Feedback Form**: if resolved, show rating + comment
  - **Reopen Button**: if resolved/closed within 7 days

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/CitizenComplaintDetail.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

---

## DOMAIN I — Frontend: Department Head Collaboration & Sign-Off Panel (Phases 41–45)

### Phase 41: Build Department Head Complaint Queue
- Replace empty `ComplainDetails.tsx` with full page:
  - Table: tracking ID, title, citizen ward, severity, status, SLA countdown, collaboration badge
  - Filters: status, severity, date range, collaboration type
  - Search: by tracking ID, title, citizen name
  - Click row → open detail view
- Color-coded rows: red (SLA breached), yellow (SLA due < 24h)
- Badge on `CROSS_DEPT_PENDING` complaints

Files:
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/ComplainDetails.tsx`

### Phase 42: Build Department Head Complaint Detail View
- Full complaint detail page with tabs:
  - **Overview**: complaint info, citizen (anonymous), location, media
  - **Timeline**: status changes + notes feed
  - **Collaboration**: if multi-dept, show partner dept, sign-off status, sign-off button
  - **Assignment**: current team/staff assignment, reassign option
- Actions: Update Status dropdown, "Request Collaboration" button, "Sign Off" button
- Sign-off dialog: approve/reject + note

Files:
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/ComplaintDetail.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 43: Build "Request Collaboration" UI (Method B)
- Button on complaint detail: "Request Collaboration"
- Opens dialog with:
  - Department dropdown (filtered to different depts in same municipality)
  - Inspection note textarea
  - Optional: photo evidence upload
- On submit: POST to `/api/v1/department/complaints/:id/request-collaboration`
- Success: status changes to CROSS_DEPT_PENDING, badge appears
- Supporting dept notified

Files:
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/ComplaintDetail.tsx`

### Phase 44: Build Sign-Off UI & Collaboration Status Tracker
- For multi-dept complaints, show "Collaboration Status" card:
  - Lead Department: ✅ / ❌ sign-off status + date
  - Supporting Department: ✅ / ❌ sign-off status + date
  - Progress bar: 0/2 → 2/2
- Sign-off button for the current department head
- If both signed: auto-transition to RESOLVED (visual countdown)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/ComplaintDetail.tsx`
- `Smart_Civic_Platform_Frontend/src/components/CollaborationStatusCard.tsx` (NEW)

### Phase 45: Build Staff Assignment & Update UI
- Staff homepage: list of assigned complaints
- Each card: tracking ID, title, status, priority, due date
- Action buttons: Accept, Start Work, Mark Resolved
- Notes input: add update + upload proof photo
- Status update dropdown
- Performance stats: resolved today, active assignments, avg resolution time

Files:
- `Smart_Civic_Platform_Frontend/src/pages/staff/Homepage.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/staff/Assignments.tsx` (NEW)

---

## DOMAIN J — Testing, Documentation & Deployment (Phases 46–50)

### Phase 46: Backend Tests — Location Resolution & Auto-Routing
- Test: resolveFromRegisteredAddress → correct ward + municipality
- Test: single-category → maps to correct department
- Test: multi-category → creates collaboration record
- Test: unmatched category → fallback routing
- Test: GPS location saved correctly
- Test: tracking ID format validation

Files:
- `Smart_Civic_Platform_Backend/tests/complaint-routing.test.ts` (NEW)

### Phase 47: Backend Tests — Lifecycle & Collaboration
- Test: single-dept status transitions (valid + invalid)
- Test: multi-dept collaboration lifecycle (create → pending → sign-off → resolved)
- Test: staff escalation (Method B) creates collaboration
- Test: joint sign-off both depts → auto-resolved
- Test: reopen within 7 days
- Test: reopen after 7 days → rejected
- Test: SLA breach detection

Files:
- `Smart_Civic_Platform_Backend/tests/complaint-collaboration.test.ts` (NEW)

### Phase 48: Frontend Tests — 4-Step Submission Wizard
- Test: Step 1 location resolution (registered, GPS, manual)
- Test: Step 2 category selection with secondary
- Test: Step 3 form validation (title required, severity required)
- Test: Step 4 review & submit
- Test: full 4-step flow submission
- Test: file upload validation (size, type limits)
- Test: tracking ID display on success

Files:
- `Smart_Civic_Platform_Frontend/src/__tests__/SubmitComplain.test.tsx` (NEW)

### Phase 49: Frontend Tests — Department Head Panels
- Test: complaint queue renders with API data
- Test: filters (status, severity, search) work correctly
- Test: complaint detail view with all tabs
- Test: Request Collaboration dialog
- Test: Sign-off flow (approve/reject)
- Test: Status update transitions
- Test: Collaboration status card shows correctly

Files:
- `Smart_Civic_Platform_Frontend/src/__tests__/DeptHeadComplaints.test.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/__tests__/Collaboration.test.tsx` (NEW)

### Phase 50: Documentation & Cleanup
- Create `docs/complaint-flow-blueprint.md`:
  - 4-step submission flow diagram
  - Auto-routing logic (location + category → department)
  - Multi-department collaboration (Method A + B)
  - Joint sign-off workflow
  - SLA severity mapping table
  - Role responsibilities matrix
- Remove old static data dependencies
- Update `Supabase_Schema.sql` with all new tables/columns
- Update `AGENT.md` and `CLAUDE.md`
- Remove old mock data files
- Lint + typecheck all changed code

Files:
- `Smart_Civic_Platform/docs/complaint-flow-blueprint.md` (NEW)
- `Supabase_Schema.sql`
- `AGENT.md`
- `Smart_Civic_Platform_Backend/CLAUDE.md`

---

## Summary: 10 Domains × 5 Phases = 50 Phases

| Domain | Phases | Focus |
|--------|--------|-------|
| **A** | 1–5 | Database: Blueprint Schema (tracking ID, severity, collaborations, sign-offs, category→dept FK) |
| **B** | 6–10 | Backend: Location Resolution (registered address, GPS, manual, cascade API, validation) |
| **C** | 11–15 | Backend: Auto-Routing Engine (single-dept, multi-dept Method A, fallback, audit logging) |
| **D** | 16–20 | Backend: 4-Step Submission (rewrite endpoint, tracking ID, media, severity SLA, KYC gate) |
| **E** | 21–25 | Backend: Single-Dept Lifecycle (state machine, status updates, notes, reopen) |
| **F** | 26–30 | Backend: Multi-Dept Collaboration (service, Method B escalation, sign-off, visibility) |
| **G** | 31–35 | Backend: Notifications, Public Tracking, SLA, Export & Analytics |
| **H** | 36–40 | Frontend: 4-Step Submission Wizard (location, category, details, review/review, detail page) |
| **I** | 41–45 | Frontend: Dept Head Panels (queue, detail, request collaboration, sign-off, staff update) |
| **J** | 46–50 | Testing, Documentation & Deployment |

---

## Key Architecture Decisions

### Routing Logic (No Municipality Head Triage)
```
Category → complaint_categories.department_id (or department_category enum)
        → departments in same municipality with matching category
        → complaint.assigned_department_id = matched department
        → complaint.lead_department_id = matched department (single)
        → complaint.lead_department_id = primary dept (multi)
```

### Multi-Department Status Flow
```
Method A (Citizen tags secondary category at submission):
  Primary Category → Lead Department
  Secondary Category → Supporting Department
  Status: PENDING (visible on both dashboards)
  Resolution: BOTH departments must sign off

Method B (Staff escalates during inspection):
  Single-dept complaint in IN_PROGRESS
  Dept Head clicks "Request Collaboration"
  Selects supporting dept + inspection note
  Status: CROSS_DEPT_PENDING
  Supporting dept gets read access + can add notes
  Resolution: BOTH departments must sign off
```

### Tracking ID Format
```
{MUNI_CODE}-WARD{NO}-{CAT_CODE}-{YEAR}-{6-DIGIT SEQ}

Examples:
KTM-WARD4-SWM-2026-000001  (Kathmandu, Ward 4, Solid Waste Management)
POK-WARD2-RD-2026-000042   (Pokhara, Ward 2, Roads)
```
