# Grievance Status Lifecycle, Staff Handoff & SLA Auto-Escalation — 50-Phase Plan

## High-Level Flow (per your blueprint)

```text
              [ Citizen Submits Grievance ] ──► [ Status: PENDING ]
                                                         │
                                                         ▼
                                        [ Dept Head Assigns Staff / Team ]
                                                         │
                                                         ▼
                                            [ Status: IN_PROGRESS ]
                                                         │
        ┌────────────────────────────────────────────────┼────────────────────────────────────────────────┐
        │ (Work delayed > 48 Hours)                      │ (Staff needs reassignment)                     │ (Work completed)
        ▼                                                ▼                                                ▼
[ SLA AUTO-ESCALATED ]                          [ STAFF HANDOFF / REASSIGN ]                     [ Status: RESOLVED ]
• Triggered automatically by timer              • Reassigned to secondary staff                  • Evidence photos uploaded
• Priority Alert to Municipality Head           • Audit reason logged in timeline                • Rating request sent to Citizen
```

### Citizen Transparency Views per Status

| Status | Citizen Sees |
|--------|-------------|
| PENDING | "Grievance received and routed to [Department Name] (Ward No. X)." |
| ASSIGNED | "Assigned to Field Inspector [Staff Name] ([Department Name]). Scheduled for inspection." |
| IN_PROGRESS | "Staff is currently working on-site. Initial inspection photo attached." |
| RESOLVED | "Work completed! View resolution proof photo. Please rate our service." |
| CLOSED | (After feedback) Ticket closed. |
| REOPENED | "You have reopened this grievance." |

### SLA Escalation Rules

| Level | Trigger | Action |
|-------|---------|--------|
| **Level 1** | 24h in ASSIGNED without moving to IN_PROGRESS | SMS/alert to assigned staff + Dept Head |
| **Level 2** | >48h without IN_PROGRESS or RESOLVED | Status → `ESCALATED`, moved to Municipality Head's high-priority feed |

### Staff Handoff Protocol

1. Staff clicks "Transfer / Reassign" on active ticket
2. Mandatory structured reason (equipment failure, shift change, expertise required)
3. Target: Peer Reassignment (same dept) OR Department Head Return
4. Audit event logged: `[Timestamp] Ticket transferred from Inspector A to Inspector B. Reason: ...`

---

## DOMAIN A — Database: Lifecycle, Handoff & Escalation Schema (Phases 1–5)

### Phase 1: Add Blueprint Statuses to Complaint Status Enum
- Current enum: `pending | under_review | in_progress | resolved | rejected | closed`
- New enum values: `assigned`, `escalated`, `reopened`
- Migration: `ALTER TYPE complaint_status ADD VALUE 'assigned'`
- Migration: `ALTER TYPE complaint_status ADD VALUE 'escalated'`
- Migration: `ALTER TYPE complaint_status ADD VALUE 'reopened'`

Files:
- `supabase/migrations/v4-lifecycle-status-enum.sql` (NEW)
- `Smart_Civic_Platform_Backend/src/types/database.type.ts`

### Phase 2: Create `complaint_handoffs` Table (Staff Transfer Audit)
```sql
CREATE TABLE complaint_handoffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(co_uid) ON DELETE CASCADE,
    from_staff_id UUID NOT NULL REFERENCES staff(id),
    to_staff_id UUID REFERENCES staff(id), -- NULL if returning to Dept Head
    to_department_head BOOLEAN NOT NULL DEFAULT FALSE,
    handoff_reason TEXT NOT NULL, -- structured: equipment_failure | shift_change | medical_leave | expertise_required | other
    handoff_note TEXT,
    initiated_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_handoffs_complaint ON complaint_handoffs(complaint_id);
```

Files:
- `supabase/migrations/v4-complaint-handoffs.sql` (NEW)
- `Smart_Civic_Platform_Backend/src/types/database.type.ts`

### Phase 3: Create `sla_events` Table (Escalation Audit)
```sql
CREATE TABLE sla_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(co_uid) ON DELETE CASCADE,
    sla_level INTEGER NOT NULL, -- 1 = warning, 2 = escalated
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status_at_time complaint_status NOT NULL,
    notified_staff BOOLEAN NOT NULL DEFAULT FALSE,
    notified_dept_head BOOLEAN NOT NULL DEFAULT FALSE,
    notified_munic_head BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_sla_events_complaint ON sla_events(complaint_id);
```

Files:
- `supabase/migrations/v4-sla-events.sql` (NEW)
- `Smart_Civic_Platform_Backend/src/types/database.type.ts`

### Phase 4: Add Escalation & SLA Columns to `complaints`
- Add to `complaints`:
  - `sla_level INTEGER NOT NULL DEFAULT 0` — 0=normal, 1=warning, 2=escalated
  - `sla_breached BOOLEAN NOT NULL DEFAULT FALSE`
  - `sla_breached_at TIMESTAMPTZ`
  - `escalated_to_munic_head BOOLEAN NOT NULL DEFAULT FALSE`
  - `escalated_at TIMESTAMPTZ`
  - `current_staff_id UUID REFERENCES staff(id)` — denormalized for quick lookup
  - `current_team_id UUID REFERENCES teams(id)` — denormalized for quick lookup
  - `handoff_count INTEGER NOT NULL DEFAULT 0`

Files:
- `supabase/migrations/v4-complaint-sla-columns.sql` (NEW)
- `Smart_Civic_Platform_Backend/src/types/database.type.ts`

### Phase 5: Create `department_performance_scores` Table
```sql
CREATE TABLE department_performance_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- first day of month
    total_complaints INTEGER NOT NULL DEFAULT 0,
    resolved_count INTEGER NOT NULL DEFAULT 0,
    sla_breach_count INTEGER NOT NULL DEFAULT 0,
    avg_resolution_hours DECIMAL(10,2),
    avg_rating DECIMAL(3,2),
    handoff_count INTEGER NOT NULL DEFAULT 0,
    escalation_count INTEGER NOT NULL DEFAULT 0,
    performance_score DECIMAL(5,2), -- computed: 0-100
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (department_id, month)
);
```

Files:
- `supabase/migrations/v4-performance-scores.sql` (NEW)

---

## DOMAIN B — Backend: Status Lifecycle Engine & State Machine (Phases 6–10)

### Phase 6: Define Blueprint State Machine
```
PENDING → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
  │          │            │            │
  └→ REJECTED└→ REJECTED  └→ REJECTED  └→ REOPENED → IN_PROGRESS
               ASSIGNED → (24h no action) → SLA_LEVEL_1_WARNING
               ASSIGNED → (48h no action) → ESCALATED (Munic Head)
               IN_PROGRESS → (handoff) → remains IN_PROGRESS (new staff)
               RESOLVED → (citizen feedback) → CLOSED
               RESOLVED → (citizen dissatisfied) → REOPENED
```

Files:
- `Smart_Civic_Platform_Backend/src/service/complaint-workflow.service.ts` (NEW)

### Phase 7: Create Lifecycle Service
- `LifecycleService`:
  - `transition(complaintId, fromStatus, toStatus, actorId, note?)` — validate + execute
  - `validateTransition(currentStatus, targetStatus, actorRole)` — state machine rules
  - `onTransition(complaintId, newStatus, actorId)` — side effects (notifications, timestamps, audit)
- Each transition logs to `complaint_updates` with citizen-friendly message
- Returns citizen transparency message for each status (see blueprint table)

Files:
- `Smart_Civic_Platform_Backend/src/service/lifecycle.service.ts` (NEW)

### Phase 8: Add Status Change Endpoints (All Roles)
- `PATCH /api/v1/department/complaints/:id/status` — Dept Head (assign, reject, close)
- `PATCH /api/v1/staff/assignments/:id/status` — Staff (accept → in_progress → resolved)
- `POST /api/citizen/complaints/:id/reopen` — Citizen (reopen within 7 days)
- `PATCH /api/municipality/:mid/complaints/:id/status` — Munic Head (override, escalate)
- All endpoints call `LifecycleService.transition()`

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/routes/department.route.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/routes/staff.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/controller/staff.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/routes/citizen.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/routes/municipality.routes.ts`

### Phase 9: Add Citizen Transparency Messages API
- `GET /api/citizen/complaints/:id/timeline` — returns status history with citizen-friendly messages
- Each entry: `{ status, message, timestamp, actor_name?, media? }`
- Messages per status (from blueprint):
  - PENDING: "Grievance received and routed to [Dept Name] (Ward No. X)."
  - ASSIGNED: "Assigned to Field Inspector [Staff Name] ([Dept Name]). Scheduled for inspection."
  - IN_PROGRESS: "Staff is currently working on-site. Initial inspection photo attached."
  - RESOLVED: "Work completed! View resolution proof photo."
  - CLOSED: "Ticket closed. Thank you for your feedback."
  - REOPENED: "You have reopened this grievance."

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`

### Phase 10: Add Assignment Status Acceptance Flow
- `POST /api/v1/staff/assignments/:id/accept` — staff accepts → complaint status → ASSIGNED
- `POST /api/v1/staff/assignments/:id/start` — staff starts work → complaint status → IN_PROGRESS
- `POST /api/v1/staff/assignments/:id/complete` — staff completes → complaint status → RESOLVED
- Update `complaint_assignments` timestamps (accepted_at, started_at, completed_at)
- Update denormalized `current_staff_id` on complaints table

Files:
- `Smart_Civic_Platform_Backend/src/modules/staff/services/staff.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/repository/staff.repository.ts`

---

## DOMAIN C — Backend: Staff Assignment & Handoff Protocol (Phases 11–15)

### Phase 11: Create Handoff Service
- `HandoffService`:
  - `initiateHandoff(complaintId, fromStaffId, reason, note)` — begin transfer
  - `transferToPeer(complaintId, fromStaffId, toStaffId, reason, note)` — direct peer handoff
  - `returnToDepartmentHead(complaintId, fromStaffId, reason, note)` — return to dept head
  - `acceptHandoff(handoffId, toStaffId)` — receiving staff accepts
  - `rejectHandoff(handoffId, toStaffId, reason)` — receiving staff rejects (goes to dept head)

Files:
- `Smart_Civic_Platform_Backend/src/service/handoff.service.ts` (NEW)

### Phase 12: Implement Peer Reassignment (Staff→Staff)
- Endpoint: `POST /api/v1/staff/assignments/:id/transfer`
- Accept: `{ to_staff_id, reason, note }`
- Validate: `to_staff_id` is in same department, not the same person
- Create `complaint_handoffs` row
- Update `current_staff_id` on complaint
- Deactivate old assignment, create new assignment for receiving staff
- Log audit event: "[Timestamp] Ticket transferred from Inspector A to Inspector B. Reason: [reason]"

Files:
- `Smart_Civic_Platform_Backend/src/modules/staff/controller/staff.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/services/staff.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/repository/staff.repository.ts`

### Phase 13: Implement Department Head Return
- Endpoint: `POST /api/v1/staff/assignments/:id/return-to-dept`
- Accept: `{ reason, note }`
- Create `complaint_handoffs` row with `to_department_head = TRUE`
- Set complaint status to ASSIGNED (unassigned, waiting for dept head)
- Clear `current_staff_id` on complaint
- Notify department head: "Staff [Name] has returned Ticket #[ID]. Reason: [reason]"
- Show on dept head dashboard as "Reassignment Required"

Files:
- `Smart_Civic_Platform_Backend/src/modules/staff/controller/staff.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/services/staff.service.ts`

### Phase 14: Add Department Head Reassignment Dashboard
- `GET /api/v1/department/complaints/reassignment-required` — tickets returned by staff
- `POST /api/v1/department/complaints/:id/reassign` — dept head reassigns to new staff/team
- Accept: `{ staff_id?, team_id?, note? }`
- Show handoff history for each ticket
- Include handoff reason + originating staff name

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 15: Add Handoff Audit Trail
- `GET /api/v1/department/complaints/:id/handoffs` — full handoff history
- Response: `[{ from_staff_name, to_staff_name, reason, note, timestamp }]`
- All handoffs visible to citizen on timeline (with staff names)
- Handoff reasons structured: `equipment_failure | shift_change | medical_leave | expertise_required | other`

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

---

## DOMAIN D — Backend: SLA Auto-Escalation Engine (Phases 16–20)

### Phase 16: Create SLA Monitor Service
- `SlaMonitorService`:
  - `checkAndEscalate()` — main cron entry point
  - `checkLevel1Warnings()` — queries complaints in ASSIGNED > 24h
  - `checkLevel2Escalations()` — queries complaints in ASSIGNED > 48h
  - `sendWarning(complaintId)` — Level 1: notify staff + dept head
  - `escalateComplaint(complaintId)` — Level 2: set ESCALATED status, notify munic head
- Runs every 15 minutes (configurable interval)

Files:
- `Smart_Civic_Platform_Backend/src/service/sla-monitor.service.ts` (NEW)

### Phase 17: Implement Level 1 SLA Warning (24h)
- Query: `SELECT FROM complaints WHERE status = 'assigned' AND submitted_date < NOW() - INTERVAL '24 hours' AND sla_level = 0`
- For each: set `sla_level = 1`, insert `sla_events` row
- Send SMS/alert: "Warning: 24 hours remaining to initiate action on Ticket #[TrackingID]."
- Recipients: assigned staff + department head
- Log to `complaint_updates` as internal note

Files:
- `Smart_Civic_Platform_Backend/src/service/sla-monitor.service.ts`

### Phase 18: Implement Level 2 Auto-Escalation (48h)
- Query: `SELECT FROM complaints WHERE status IN ('assigned', 'in_progress') AND submitted_date < NOW() - INTERVAL '48 hours' AND sla_level < 2`
- For each: set `sla_level = 2`, `sla_breached = TRUE`, `status = 'escaped'`
- Insert `sla_events` row with level 2
- Move ticket into municipality head's high-priority escalation feed
- Send high-priority alert to municipality head
- Penalize department performance score (Phase 26)

Files:
- `Smart_Civic_Platform_Backend/src/service/sla-monitor.service.ts`

### Phase 19: Add Municipality Head Escalation Feed Endpoint
- `GET /api/municipality/:mid/complaints/escalated` — list all ESCALATED complaints
- Sort by: SLA breach time (oldest first)
- Include: department name, staff name, days since submission, SLA breach duration
- `POST /api/municipality/:mid/complaints/:id/intervene` — munic head intervenes
  - Accept: `{ action: 'reassign_dept' | 'demand_explanation' | 'close', note? }`
  - Options: reassign to different dept, demand explanation from dept head, or force-close

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/routes/municipality.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 20: Add SLA Dashboard Stats
- `GET /api/v1/department/dashboard` — add:
  - `sla_warnings` — count of Level 1 warnings this month
  - `sla_breaches` — count of Level 2 escalations this month
  - `avg_response_time_hours` — avg time from ASSIGNED to IN_PROGRESS
  - `avg_resolution_time_hours` — avg time from submission to RESOLVED
- `GET /api/municipality/:mid/dashboard` — add:
  - `total_escalated` — count of currently ESCALATED complaints
  - `escalated_by_department` — breakdown per dept
  - `sla_compliance_rate` — % of complaints resolved within SLA

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

---

## DOMAIN E — Backend: Resolution Proof & Citizen Validation (Phases 21–25)

### Phase 21: Add Mandatory "After Work" Photo Upload
- Before marking RESOLVED: staff must upload at least 1 "after work" photo
- Endpoint: `POST /api/v1/staff/assignments/:id/resolve-with-proof`
- Accept: multipart — `{ photos: File[], note?, resolution_note? }`
- Validate: at least 1 photo required
- Upload to storage: `complaint-proof/{trackingId}/{uuid}-after.jpg`
- Create media records with `context = 'assignment_proof'`
- Then set status to RESOLVED

Files:
- `Smart_Civic_Platform_Backend/src/modules/staff/controller/staff.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/services/staff.service.ts`
- `Smart_Civic_Platform_Backend/src/service/storage.service.ts`

### Phase 22: Add "Before Work" Photo (Initial Inspection)
- When staff accepts assignment and starts work: upload initial inspection photo
- Endpoint: `POST /api/v1/staff/assignments/:id/start-with-photo`
- Optional: captures site condition before work begins
- Stored with `context = 'assignment_proof'` in media table

Files:
- `Smart_Civic_Platform_Backend/src/modules/staff/controller/staff.controller.ts`

### Phase 23: Add Citizen Resolution Review Endpoint
- `GET /api/citizen/complaints/:id/proof` — return all resolution proof media
- Citizen can view all "after work" photos before providing feedback
- `POST /api/citizen/complaints/:id/confirm-resolution` — citizen confirms
  - Accept: `{ satisfied: boolean, rating?, comment? }`
  - If satisfied: set status to CLOSED, trigger feedback creation
  - If not satisfied: auto-trigger reopen flow
- Time window: citizen has 7 days to review, otherwise auto-close

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/controller/citizen.controller.ts`

### Phase 24: Add Reopen Flow (with Citizen Reason)
- `POST /api/citizen/complaints/:id/reopen`
- Accept: `{ reason }` — citizen explains why they're unsatisfied
- Validate: complaint is RESOLVED, within 7 days of resolution
- Set status to REOPENED, increment `reopen_count`
- Notify department head: "Citizen has reopened Ticket #[ID]. Reason: [reason]"
- Department head must re-assign or schedule re-inspection
- Limit: max 2 reopens per complaint

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/routes/citizen.routes.ts`

### Phase 25: Add Auto-Close Cron Job
- Service: `AutoCloseService`
- Query: `SELECT FROM complaints WHERE status = 'resolved' AND resolution_date < NOW() - INTERVAL '7 days'`
- For each: set status to CLOSED (auto-close if citizen didn't respond)
- Create internal note: "Auto-closed after 7-day review window."
- Runs daily

Files:
- `Smart_Civic_Platform_Backend/src/service/auto-close.service.ts` (NEW)

---

## DOMAIN F — Backend: Department Performance Scoring (Phases 26–30)

### Phase 26: Create Performance Score Calculator
- `PerformanceService`:
  - `calculateMonthlyScore(departmentId, month)` — compute score 0-100
  - Formula:
    - Resolution rate (40%): `(resolved / total) * 40`
    - SLA compliance (30%): `(1 - sla_breaches / total) * 30`
    - Avg rating (20%): `(avg_rating / 5) * 20`
    - Handoff efficiency (10%): `max(0, 10 - handoff_count)` (frequent handoffs reduce score)
  - `getDepartmentScore(departmentId, month)` — retrieve computed score
  - `getDepartmentRanking(municipalityId, month)` — rank all departments

Files:
- `Smart_Civic_Platform_Backend/src/service/performance.service.ts` (NEW)

### Phase 27: Add Performance Score Endpoints
- `GET /api/v1/department/performance` — current month score + trend
- `GET /api/v1/department/performance/history?months=6` — last 6 months
- `GET /api/municipality/:mid/performance/rankings` — all depts ranked
- `GET /api/municipality/:mid/performance/report?month=2026-01` — full report

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`

### Phase 28: Auto-Calculate Performance Monthly
- Cron job runs on 1st of each month
- For each department: aggregate previous month's data
- Insert/update `department_performance_scores` row
- Send performance report to department head + municipality head
- Highlight: SLA breaches, top/bottom performers

Files:
- `Smart_Civic_Platform_Backend/src/service/performance.service.ts`

### Phase 29: Add Performance Penalty for SLA Breaches
- When Level 2 escalation triggers (Phase 18):
  - Immediately deduct from current month score
  - Add `sla_breach_count += 1` to performance record
  - Notify department head: "Performance score penalized due to SLA breach on Ticket #[ID]"
- Display score impact on dashboard

Files:
- `Smart_Civic_Platform_Backend/src/service/sla-monitor.service.ts`
- `Smart_Civic_Platform_Backend/src/service/performance.service.ts`

### Phase 30: Add Performance Dashboard Views
- Dept Head sees: current score, historical trend, breakdown by metric
- Munic Head sees: all departments ranked, best/worst performers
- Color coding: green (>80), yellow (60-80), red (<60)
- Score gauge visualization

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

---

## DOMAIN G — Backend: Real-Time Notifications & Alerts (Phases 31–35)

### Phase 31: Create Alert Dispatcher Service
- `AlertDispatcher`:
  - `sendSms(phone, message)` — SMS alert via provider
  - `sendInAppNotification(profileId, title, message, type, complaintId?)`
  - `sendPushNotification(staffId, title, body)` — future: WebSocket/push
- Trigger points:
  - Ticket assigned → push to staff
  - SLA Level 1 warning → SMS to staff + dept head
  - SLA Level 2 escalation → high-priority alert to munic head
  - Handoff initiated → notify receiving staff
  - Reopen → notify dept head
  - Resolution proof uploaded → notify citizen

Files:
- `Smart_Civic_Platform_Backend/src/service/alert-dispatcher.service.ts` (NEW)

### Phase 32: Add Staff Push Notification on Assignment
- When Dept Head assigns ticket → push notification to staff
- Content: "New ticket assigned: [Title]. Location: [Ward]. Deadline: [SLA]."
- Includes: link to ticket detail, map pin, citizen evidence
- Store in `notifications` table with `audience = 'individual'`
- Staff sees on dashboard and can click to view

Files:
- `Smart_Civic_Platform_Backend/src/service/alert-dispatcher.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`

### Phase 33: Add SLA Warning SMS Integration
- On Level 1 warning: send SMS to assigned staff + department head
- SMS template: "SLA Warning: 24h remaining on Ticket #[ID] ([Title]). Act now to avoid escalation."
- On Level 2 escalation: send SMS to municipality head
- SMS template: "ESCALATED: Ticket #[ID] ([Title]) has breached SLA. Immediate attention required."
- Use SMS service from earlier plans (Sparrow SMS / NTC)

Files:
- `Smart_Civic_Platform_Backend/src/service/alert-dispatcher.service.ts`
- `Smart_Civic_Platform_Backend/src/config/sms.ts`

### Phase 34: Add In-App Notification Endpoints (All Roles)
- `GET /api/notifications` — paginated, filterable by type, is_read
- `GET /api/notifications/unread-count` — badge count
- `PATCH /api/notifications/:id/read` — mark read
- `PATCH /api/notifications/mark-all-read` — mark all read
- `DELETE /api/notifications/:id` — delete
- Return notifications for ALL user roles (citizen, staff, dept head, munic head)

Files:
- `Smart_Civic_Platform_Backend/src/modules/notifications/routes/notification.routes.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/modules/notifications/controller/notification.controller.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/modules/notifications/services/notification.service.ts` (NEW)

### Phase 35: Add Escalation Dashboard for Municipality Head
- `GET /api/municipality/:mid/escalation-dashboard` — consolidated view:
  - `activeEscalations` — currently ESCALATED complaints
  - `recentEscalations` — last 30 days
  - `slaComplianceTrend` — monthly compliance rate for past 6 months
  - `worstPerformingDept` — dept with most SLA breaches
  - `resolutionRateAfterEscalation` — % of escalated tickets resolved
- High-priority feed: escalate alerts sorted by severity + duration

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/services/municipality.service.ts`

---

## DOMAIN H — Frontend: Citizen Interactive Tracking Timeline (Phases 36–40)

### Phase 36: Create Interactive Status Timeline Component
- New component: `StatusTimeline.tsx`
- Vertical stepper with icons per status:
  - PENDING: clock icon
  - ASSIGNED: person icon
  - IN_PROGRESS: construction icon
  - RESOLVED: checkmark icon
  - CLOSED: lock icon
  - REOPENED: refresh icon
  - ESCALATED: warning icon
  - REJECTED: X icon
- Each step shows: status name, date, citizen-friendly message, actor name
- Color-coded: completed steps green, current step blue, future steps gray

Files:
- `Smart_Civic_Platform_Frontend/src/components/StatusTimeline.tsx` (NEW)

### Phase 37: Build Citizen Complaint Detail with Timeline
- New page: `pages/citizen/ComplaintDetail.tsx`
- Sections:
  - **Header**: tracking ID (large, copyable), status badge, severity badge
  - **Status Timeline** (Phase 36 component)
  - **Details**: title, description, category, department, ward, location map
  - **Staff Info**: assigned staff name, contact (if in ASSIGNED/IN_PROGRESS)
  - **Media Gallery**: citizen's evidence + staff's "after work" proof photos
  - **Handoff History**: list of transfers (if any) with reasons
  - **SLA Status**: countdown timer / breached badge
  - **Feedback Form**: if RESOLVED, show proof photos + rating + comment
  - **Reopen Button**: if RESOLVED/CLOSED within 7 days

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/ComplaintDetail.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 38: Add SLA Countdown Timer on Citizen Dashboard
- Show countdown on each complaint card in dashboard
- Color coded: green (>24h), yellow (<24h), red (breached)
- Format: "Due in 12h 30m" or "OVERDUE by 2d 5h"
- Tooltip: shows exact SLA deadline time
- Critical: if ESCALATED, show red badge with "Escalated to Municipality"

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/Dashboard.tsx`
- `Smart_Civic_Platform_Frontend/src/components/SlaCountdown.tsx` (NEW)

### Phase 39: Add Citizen Resolution Review Page
- When complaint is RESOLVED: show notification → citizen clicks "Review Resolution"
- Page shows:
  - "After work" proof photos (gallery view, click to enlarge)
  - Staff resolution note
  - Two buttons: "I'm Satisfied" (→ feedback form) / "Not Resolved" (→ reopen)
- Feedback form: rating (1-5 stars), comment (optional), anonymous toggle
- If no response in 7 days: show countdown "Auto-closing in X days"

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/ResolutionReview.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 40: Connect Notification.tsx to API with Real Data
- Replace mock data with API calls
- Notification types: complaint_assigned, status_change, sla_warning, handoff, reopen
- Click notification → navigate to relevant detail page
- Unread count badge in navbar (polling every 60s)
- "Mark all as read" button

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/Notification.tsx`
- `Smart_Civic_Platform_Frontend/src/components/layout/AppNavbar.tsx`
- `Smart_Civic_Platform_Frontend/src/hooks/useUnreadCount.ts` (NEW)

---

## DOMAIN I — Frontend: Staff Handoff & Dept Head Escalation Panel (Phases 41–45)

### Phase 41: Build Staff Assignment Screen with Handoff
- `pages/staff/Assignments.tsx`:
  - List: active assignments with status, SLA countdown, priority
  - Click → detail view
- Detail view:
  - Complaint info, citizen location (map pin), evidence photos
  - **Accept** button (if pending)
  - **Start Work** button (→ upload "before" photo)
  - **Mark Resolved** button (→ upload "after" photo, mandatory)
  - **Transfer / Reassign** button → opens handoff dialog
- Handoff dialog:
  - Reason dropdown: equipment_failure, shift_change, medical_leave, expertise_required, other
  - Note textarea
  - Two options: "Transfer to Peer" (staff selector) or "Return to Department Head"

Files:
- `Smart_Civic_Platform_Frontend/src/pages/staff/Assignments.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/pages/staff/Homepage.tsx`
- `Smart_Civic_Platform_Frontend/src/components/HandoffDialog.tsx` (NEW)

### Phase 42: Build Department Head Assignment & Reassignment Panel
- `pages/dept_head/ComplaintQueue.tsx` — full queue management:
  - Tabs: "All" | "Pending Assignment" | "Active" | "Reassignment Required" | "Escalated"
  - "Reassignment Required" tab: tickets returned by staff with handoff reason
  - **Reassign** button → staff/team selector dialog
- Assignment dialog:
  - Select target: individual staff OR team
  - Show staff workload (current assignments count)
  - Note textarea (optional)

Files:
- `Smart_Civic-Platform_Frontend/src/pages/dept_head/ComplaintQueue.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/ComplainDetails.tsx`
- `Smart_Civic_Platform_Frontend/src/components/AssignDialog.tsx` (NEW)

### Phase 43: Build Municipality Head Escalation Feed
- `pages/munic_head/EscalationFeed.tsx` — high-priority escalation view:
  - List: all ESCALATED complaints, sorted by breach duration
  - Each card: tracking ID, department, staff, days since submission, breach duration
  - Color: red background for critical, orange for warning
  - **Intervene** button → dialog with options:
    - "Reassign to Department" — select different dept
    - "Demand Explanation" — sends alert to dept head
    - "Force Close" — close ticket with note
  - Stats: total active escalations, avg resolution time post-escalation

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/EscalationFeed.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ComplainDetails.tsx`
- `Smart_Civic_Platform_Frontend/src/components/InterveneDialog.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 44: Build Department Performance Dashboard
- `pages/dept_head/Performance.tsx`:
  - Score gauge: current month score (0-100) with color
  - Metric breakdown: resolution rate, SLA compliance, avg rating, handoff efficiency
  - Trend chart: score over past 6 months
  - SLA breaches list: month-to-date breaches with ticket links
  - Staff ranking: best/worst performing staff by resolved count + rating
- `pages/munic_head/DeptRankings.tsx`:
  - All departments ranked by score
  - Color coded: green (>80), yellow (60-80), red (<60)
  - Expand row → detailed metrics per dept

Files:
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/Performance.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/DeptRankings.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 45: Add SLA Notification Badges & Alerts
- Notification bell in navbar: shows unread alert count
- Alert types get different colored badges:
  - Red: SLA breach / escalation
  - Yellow: SLA warning (24h)
  - Blue: new assignment / handoff
  - Green: resolution / feedback
- Toast popups for high-priority alerts (SLA breach)
- Pull-to-refresh for real-time updates

Files:
- `Smart_Civic_Platform_Frontend/src/components/layout/AppNavbar.tsx`
- `Smart_Civic_Platform_Frontend/src/components/AlertToast.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/hooks/useNotifications.ts`

---

## DOMAIN J — Testing, Documentation & Deployment (Phases 46–50)

### Phase 46: Backend Tests — Status Lifecycle & Transitions
- Test: PENDING → ASSIGNED (dept head assigns)
- Test: ASSIGNED → IN_PROGRESS (staff starts work)
- Test: IN_PROGRESS → RESOLVED (staff completes with proof photo)
- Test: RESOLVED → CLOSED (citizen confirms satisfaction)
- Test: RESOLVED → REOPENED (citizen dissatisfied)
- Test: REOPENED → IN_PROGRESS (dept head re-assigns)
- Test: Invalid transitions return errors (e.g., PENDING → RESOLVED)
- Test: Reopen after 7 days → rejected
- Test: Max 2 reopens → rejected

Files:
- `Smart_Civic_Platform_Backend/tests/lifecycle-status.test.ts` (NEW)

### Phase 47: Backend Tests — Handoff & SLA Escalation
- Test: Staff transfers to peer → assignment updated, handoff logged
- Test: Staff returns to dept head → status = ASSIGNED, dept head notified
- Test: Level 1 SLA warning triggers at 24h
- Test: Level 2 SLA escalation triggers at 48h
- Test: Escalated complaint appears in munic head feed
- Test: Munic head intervention
- Test: Handoff with invalid staff → error
- Test: Handoff audit history query

Files:
- `Smart_Civic_Platform_Backend/tests/handoff-sla.test.ts` (NEW)

### Phase 48: Backend Tests — Performance Scoring & Proof
- Test: Performance score calculation formula
- Test: Monthly score aggregation
- Test: SLA breach penalizes score
- Test: Resolution proof required before RESOLVED
- Test: Citizen confirmation flow
- Test: Auto-close after 7 days
- Test: Department ranking

Files:
- `Smart_Civic_Platform_Backend/tests/performance-scoring.test.ts` (NEW)

### Phase 49: Frontend Tests — Timeline & Handoff UI
- Test: StatusTimeline renders all statuses correctly
- Test: Citizen detail page loads with all sections
- Test: SLA countdown shows correct colors
- Test: Handoff dialog renders with reason dropdown
- Test: Staff can accept/start/complete assignment
- Test: Dept head reassignment dialog
- Test: Munic head escalation feed loads
- Test: Resolution review page shows proof photos

Files:
- `Smart_Civic_Platform_Frontend/src/__tests__/StatusTimeline.test.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/__tests__/HandoffDialog.test.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/__tests__/EscalationFeed.test.tsx` (NEW)

### Phase 50: Documentation & Cleanup
- Create `docs/grievance-lifecycle-sla-handoff.md`:
  - Status state machine diagram (text)
  - SLA escalation rules (Level 1 + Level 2)
  - Staff handoff protocol (peer vs dept head return)
  - Citizen transparency message table
  - Performance scoring formula
  - Role responsibilities matrix
- Update `Supabase_Schema.sql` with all new tables/columns/enums
- Update `AGENT.md` and `Smart_Civic_Platform_Backend/CLAUDE.md`
- Remove old status references in code
- Lint + typecheck all changed code

Files:
- `Smart_Civic_Platform/docs/grievance-lifecycle-sla-handoff.md` (NEW)
- `Supabase_Schema.sql`
- `AGENT.md`
- `Smart_Civic_Platform_Backend/CLAUDE.md`

---

## Summary: 10 Domains × 5 Phases = 50 Phases

| Domain | Phases | Focus |
|--------|--------|-------|
| **A** | 1–5 | Database: Lifecycle Schema (new statuses, handoffs, SLA events, performance scores) |
| **B** | 6–10 | Backend: Status Lifecycle Engine (state machine, transitions, citizen messages, acceptance flow) |
| **C** | 11–15 | Backend: Staff Handoff Protocol (peer transfer, dept head return, reassignment, audit trail) |
| **D** | 16–20 | Backend: SLA Auto-Escalation (24h Level 1, 48h Level 2, munic head feed, dashboard stats) |
| **E** | 21–25 | Backend: Resolution Proof & Validation (after-work photos, citizen review, reopen, auto-close) |
| **F** | 26–30 | Backend: Performance Scoring (score formula, monthly calc, penalties, ranking, trends) |
| **G** | 31–35 | Backend: Notifications & Alerts (SMS, push, in-app, escalation dashboard) |
| **H** | 36–40 | Frontend: Citizen Timeline (status stepper, detail page, SLA countdown, resolution review) |
| **I** | 41–45 | Frontend: Staff Handoff & Escalation Panel (staff screen, dept head queue, munic head feed, perf) |
| **J** | 46–50 | Testing, Documentation & Deployment |

---

## Key Architecture Decisions

### Status State Machine
```
PENDING ──► ASSIGNED ──► IN_PROGRESS ──► RESOLVED ──► CLOSED
  │            │              │               │
  │            │              │               └── REOPENED ──► IN_PROGRESS
  │            │              │                      (max 2x)
  │            │              └── REJECTED
  │            └── REJECTED
  └── REJECTED
  
ASSIGNED ──► (24h) ──► SLA_LEVEL_1_WARNING
ASSIGNED ──► (48h) ──► ESCALATED ──► (Munic Head intervenes)
```

### Citizen Transparency Messages
| Status | Message Template |
|--------|-----------------|
| PENDING | "Grievance received and routed to [Department] (Ward No. X)." |
| ASSIGNED | "Assigned to Field Inspector [Staff Name] ([Department]). Scheduled for inspection." |
| IN_PROGRESS | "Staff is currently working on-site. Initial inspection photo attached." |
| RESOLVED | "Work completed! View resolution proof photo. Please rate our service." |
| CLOSED | "Ticket closed. Thank you for your feedback." |
| REOPENED | "You have reopened this grievance. Department has been notified." |
| ESCALATED | "This grievance has been escalated to Municipality Head for urgent attention." |

### SLA Escalation Rules
- **Level 1 Warning** (24h in ASSIGNED): SMS to staff + dept head
- **Level 2 Auto-Escalation** (48h without progress): Status = ESCALATED, moved to Munic Head
- SLA timer pauses during handoff (continuation timer, not reset)

### Handoff Protocol
- **Peer Reassignment**: Staff A → Staff B (same dept), assignment transferred
- **Department Head Return**: Staff → Dept Head, ticket in "Reassignment Required" queue
- Mandatory structured reason: equipment_failure, shift_change, medical_leave, expertise_required, other
- Full audit trail: all transfers logged with timestamps

### Performance Scoring Formula
```
Score = (Resolution Rate × 0.40) + (SLA Compliance × 0.30) + (Avg Rating × 0.20) + (Handoff Efficiency × 0.10)
- Resolution Rate: resolved / total × 40
- SLA Compliance: (1 - breaches / total) × 30
- Avg Rating: (avg_rating / 5) × 20
- Handoff Efficiency: max(0, 10 - handoff_count)
```
