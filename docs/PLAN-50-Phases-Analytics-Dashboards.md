# Admin Analytics & Performance Dashboards — 50-Phase Plan

## Blueprint Overview: 5-Tier Dashboard Architecture

```text
                      [ CENTRAL ANALYTICS ENGINE ]
                                   │
      ┌────────────────────────────┼────────────────────────────┐
      ▼                            ▼                            ▼
[ SUPER ADMIN ]          [ MUNICIPALITY HEAD ]         [ DEPARTMENT HEAD ]
• Platform-Wide Metrics  • Executive Oversight         • Departmental Operations
• Multi-Muni Audit       • Ward-Level Heatmaps         • Workforce Efficiency
                         • SLA Escalation Feed         • Team Capacity & Load
                                                                  │
                                  ┌───────────────────────────────┘
                                  ▼
                   ┌──────────────┴──────────────┐
                   ▼                             ▼
            [ FIELD STAFF ]                 [ CITIZEN ]
            • Task Execution               • Grievance Ledger
            • Active Memberships           • Staff Accountability
            • Personal Performance         • Verification Proof
```

### 3 Advanced Analytics Capabilities
- **A. Re-Open Rate**: `(Reopened / Marked Resolved) × 100` — detects false resolutions
- **B. Geo-Spatial Heatmap**: Correlate complaint clusters with infrastructure deficits
- **C. Executive Report Generator**: 1-click PDF/Excel export for council meetings

---

## WHAT EXISTS (current state)

| Tier | Component | Status |
|------|-----------|--------|
| Super Admin | No dashboard page | ❌ Missing |
| Munic Head | Homepage.tsx (basic stats), ReportAnalytics.tsx (KPIs + dept overview) | ⚠️ Basic |
| Dept Head | Dept_Dashboard.tsx (status breakdown + recent complaints) | ⚠️ Basic |
| Staff | Homepage.tsx (basic) | ⚠️ Minimal |
| Citizen | Dashboard.tsx (KPI cards + recent complaints + notifications) | ⚠️ Basic |

**Missing entirely**: Ward heatmaps, dept leaderboard, re-open rate, geo-spatial analytics, staff workload, duty toggle, executive report export, super admin dashboard, multi-muni audit.

---

## DOMAIN A — Database: Analytics Schema & Aggregation Tables (Phases 1–5)

### Phase 1: Create `dashboard_metrics_cache` Table
```sql
CREATE TABLE dashboard_metrics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope TEXT NOT NULL, -- 'superadmin' | 'municipality' | 'department' | 'staff' | 'citizen'
    scope_id UUID, -- municipality_id / department_id / staff_id / citizen_id
    metrics JSONB NOT NULL,
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
    UNIQUE (scope, scope_id)
);
```
- Caches computed dashboard data to avoid expensive real-time queries
- TTL: 5 minutes for active dashboards

Files:
- `supabase/migrations/v6-analytics-cache.sql` (NEW)

### Phase 2: Create `monthly_aggregated_stats` Table
```sql
CREATE TABLE monthly_aggregated_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipality_id UUID REFERENCES municipalities(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    year_month DATE NOT NULL, -- first day of month
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
CREATE INDEX idx_monthly_stats_muni ON monthly_aggregated_stats(municipality_id, year_month);
CREATE INDEX idx_monthly_stats_dept ON monthly_aggregated_stats(department_id, year_month);
```

Files:
- `supabase/migrations/v6-monthly-stats.sql` (NEW)

### Phase 3: Create `ward_monthly_stats` View
```sql
CREATE MATERIALIZED VIEW ward_monthly_stats AS
SELECT
    c.municipality_id,
    cw.ward_id,
    DATE_TRUNC('month', c.submitted_date) AS year_month,
    COUNT(*) AS total_complaints,
    COUNT(*) FILTER (WHERE c.status = 'resolved' OR c.status = 'closed') AS resolved_count,
    COUNT(*) FILTER (WHERE c.status = 'reopened') AS reopened_count,
    COUNT(*) FILTER (WHERE c.sla_breached = TRUE) AS sla_breach_count,
    AVG(EXTRACT(EPOCH FROM (c.resolution_date - c.submitted_date))/3600) AS avg_resolution_hours
FROM complaints c
JOIN citizens cw ON c.citizen_id = cw.id
GROUP BY c.municipality_id, cw.ward_id, DATE_TRUNC('month', c.submitted_date)
WITH DATA;
```
- Refreshed daily via cron
- Powers ward heatmaps and per-ward analytics

Files:
- `supabase/migrations/v6-ward-monthly-stats.sql` (NEW)

### Phase 4: Create `executive_reports` Table
```sql
CREATE TABLE executive_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope TEXT NOT NULL, -- 'municipality' | 'department'
    scope_id UUID NOT NULL,
    title TEXT NOT NULL,
    report_type TEXT NOT NULL, -- 'monthly_summary' | 'quarterly_review' | 'custom'
    format TEXT NOT NULL, -- 'pdf' | 'excel'
    file_url TEXT,
    parameters JSONB, -- filters used to generate
    generated_by UUID NOT NULL REFERENCES profiles(id),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
- Stores generated report files and metadata
- Allows re-download of past reports

Files:
- `supabase/migrations/v6-executive-reports.sql` (NEW)

### Phase 5: Add Indexes for Analytics Queries
- `idx_complaints_resolution_date` on `(resolution_date)` — time-based aggregations
- `idx_complaints_muni_status_date` on `(municipality_id, status, submitted_date)` — daily stats
- `idx_complaints_dept_status_date` on `(assigned_department_id, status, submitted_date)` — dept stats
- `idx_complaints_ward_lookup` on `(citizen_id, submitted_date)` — ward heatmaps
- `idx_feedback_avg_rating` on `(complaint_id, rating)` — rating aggregation

Files:
- `supabase/migrations/v6-analytics-indexes.sql` (NEW)

---

## DOMAIN B — Backend: Super Admin Analytics (Phases 6–10)

### Phase 6: Create Super Admin Dashboard Service
- `SuperAdminAnalyticsService`:
  - `getPlatformOverview()` — total municipalities (active/total), total users by role, total complaints across all platforms, storage usage
  - `getMultiMunicipalityComparison()` — complaints per municipality, resolution rate per municipality, SLA compliance per municipality
  - `getSystemHealth()` — API latency p50/p95/p99, database connections, storage load, auth users
  - `getRecentActivity()` — last 50 actions across platform (audit log)

Files:
- `Smart_Civic_Platform_Backend/src/service/superadmin-analytics.service.ts` (NEW)

### Phase 7: Add Super Admin Dashboard Endpoints
- `GET /api/superadmin/dashboard` — platform overview metrics
- `GET /api/superadmin/dashboard/municipalities` — per-municipality comparison table
- `GET /api/superadmin/dashboard/system-health` — system performance metrics
- `GET /api/superadmin/dashboard/recent-activity` — latest audit log entries
- `GET /api/superadmin/dashboard/trends?months=12` — monthly growth trends

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/routes/superadmin.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`

### Phase 8: Add Multi-Municipality Comparison
- Table: municipality name, total complaints, resolved, pending, SLA breach rate, avg resolution time, active staff count, citizen count
- Sortable by any column
- "Health" indicator: green (all ok), yellow (some SLA breaches), red (critical issues)
- Export comparison as CSV

Files:
- `Smart_Civic_Platform_Backend/src/service/superadmin-analytics.service.ts`

### Phase 9: Add System Audit Trail Viewer
- `GET /api/superadmin/audit-log` — paginated audit log
- Filters: action type, date range, municipality, user role, target user
- Columns: timestamp, actor, role, action, target, municipality, details
- Click row → expand detail (old_value → new_value diff)
- Export as CSV

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`

### Phase 10: Add Super Admin Storage Analytics
- `GET /api/superadmin/storage` — storage breakdown:
  - Total storage used across all buckets
  - Per-bucket breakdown (identity-documents, complaint-media, complaint-proof)
  - Top 5 municipalities by storage usage
  - Storage growth trend (last 6 months)

Files:
- `Smart_Civic_Platform_Backend/src/modules/superadmin/controller/superadmin.controller.ts`

---

## DOMAIN C — Backend: Municipality Head Analytics (Phases 11–15)

### Phase 11: Enhance Municipality Head Dashboard Service
- Expand `MunicipalityAnalyticsService`:
  - `getExecutiveOverview(municipalityId)` — total complaints, resolved, pending, SLA breach %, avg resolution time, avg rating
  - `getDepartmentLeaderboard(municipalityId)` — rank departments by: resolution rate, SLA compliance, avg rating, re-open rate
  - `getWardHeatmap(municipalityId, month?)` — complaints per ward, top categories per ward
  - `getPipelineBreakdown(municipalityId)` — funnel: submitted → assigned → in_progress → resolved → closed

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/services/municipality.service.ts`

### Phase 12: Add Ward Heatmap Endpoint
- `GET /api/municipality/:mid/analytics/ward-heatmap` — per-ward complaint data
  - Response: `[{ ward_number, total, pending, resolved, top_category, sla_breaches, avg_resolution_hours }]`
- `GET /api/municipality/:mid/analytics/ward-heatmap/:wardId/categories` — category breakdown for a ward
- Supports month filter: `?month=2026-01`

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 13: Add Department Leaderboard Endpoint
- `GET /api/municipality/:mid/analytics/dept-leaderboard` — ranked list
  - Sort by: resolution_rate | sla_compliance | avg_rating | re_open_rate | handoff_efficiency
  - Each dept: score 0-100, rank change (↑↓ vs last month)
- `GET /api/municipality/:mid/analytics/dept-leaderboard/:deptId/trend` — monthly score history

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 14: Add SLA Escalation Analytics
- `GET /api/municipality/:mid/analytics/sla` — SLA overview:
  - `sla_compliance_rate` — % resolved within SLA
  - `avg_breach_response_time` — avg time from breach to intervention
  - `breaches_by_department` — breakdown per dept
  - `trend` — monthly compliance for past 6 months
- `GET /api/municipality/:mid/analytics/sla/breaches` — list of all SLA breaches with details

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 15: Add Pipeline & Funnel Analytics
- `GET /api/municipality/:mid/analytics/pipeline` — funnel stages:
  - `pending`, `assigned`, `in_progress`, `resolved`, `closed`, `reopened`, `escalated`
  - Counts + conversion rates between stages
  - "Stuck" complaints: >7 days in current non-terminal status
- `GET /api/municipality/:mid/analytics/trends` — daily/weekly/monthly submission trends

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

---

## DOMAIN D — Backend: Department Head Analytics (Phases 16–20)

### Phase 16: Enhance Department Head Dashboard Service
- Expand `DepartmentAnalyticsService`:
  - `getOperationalOverview(departmentId)` — total complaints, active staff, active teams, workload distribution
  - `getStaffAvailability(departmentId)` — active staff count, currently busy, available, on leave
  - `getTeamCapacity(departmentId)` — per team: members, active assignments, capacity %

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`

### Phase 17: Add Staff Workload & Availability Endpoint
- `GET /api/v1/department/analytics/staff-workload` — per-staff breakdown:
  - `staff_id`, `name`, `active_assignments`, `completed_today`, `completed_this_week`, `avg_resolution_hours`, `avg_rating`, `current_status` (available/busy/offline)
- `GET /api/v1/department/analytics/staff-availability` — summary:
  - `total_staff`, `available`, `busy`, `on_leave`, `unassigned`

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 18: Add Team Capacity Analytics
- `GET /api/v1/department/analytics/teams` — per-team:
  - `team_name`, `member_count`, `active_assignments`, `max_capacity`, `utilization_rate`, `avg_resolution_time`
- `GET /api/v1/department/analytics/teams/:teamId/workload` — detailed workload history

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 19: Add SLA Watchlist for Department Head
- `GET /api/v1/department/analytics/sla-watchlist` — complaints at risk:
  - `sla_warning` — in ASSIGNED > 18h (6h before Level 1 warning)
  - `sla_critical` — in ASSIGNED > 36h (12h before Level 2 escalation)
  - `sla_breached` — already escalated
- `GET /api/v1/department/analytics/sla-compliance` — monthly compliance rate, trend

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 20: Add Re-Open Rate Endpoint (Blueprint QA Metric)
- `GET /api/v1/department/analytics/reopen-rate` — calculates:
  - `reopen_rate` = (reopened / resolved) × 100
  - `high_reopen_staff` — staff with >20% reopen rate (flag for review)
  - `reopen_by_category` — which categories have most reopens
  - `trend` — monthly reopen rate for past 6 months
- Threshold: >15% triggers alert to department head

Files:
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

---

## DOMAIN E — Backend: Staff & Citizen Analytics (Phases 21–25)

### Phase 21: Create Staff Workstation Dashboard Service
- `StaffDashboardService`:
  - `getWorkstationOverview(staffId)` — active assignments count, completed today, completed this week, overdue tasks, avg rating
  - `getActiveAssignments(staffId)` — detailed list with SLA timers
  - `getTeamMemberships(staffId)` — teams with member count and leader status
  - `getPersonalPerformance(staffId, month?)` — resolved count, avg time, rating, reopen rate
  - `getDutyStatus(staffId)` — current duty status (on_duty / off_duty / on_leave)

Files:
- `Smart_Civic_Platform_Backend/src/service/staff-dashboard.service.ts` (NEW)

### Phase 22: Add Staff Workstation Endpoints
- `GET /api/v1/staff/dashboard` — workstation overview
- `GET /api/v1/staff/dashboard/assignments` — active task list
- `GET /api/v1/staff/dashboard/teams` — team memberships
- `GET /api/v1/staff/dashboard/performance` — personal performance
- `POST /api/v1/staff/dashboard/duty-toggle` — toggle on_duty / off_duty

Files:
- `Smart_Civic_Platform_Backend/src/modules/staff/routes/staff.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/controller/staff.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/services/staff.service.ts`

### Phase 23: Enhance Citizen Dashboard Service
- `getPersonalGrievanceLedger(citizenId)` — full complaint history with status, assigned staff, tracking IDs
- `getAssignedStaffInfo(complaintId)` — staff name, department, contact (for IN_PROGRESS complaints)
- `getProgressTimeline(complaintId)` — full status history with dates and staff names
- `getVerificationProof(complaintId)` — "after work" photos, resolution note
- `getAccountabilityMetrics(citizenId)` — total complaints, resolved, reopened, avg resolution time for citizen's complaints

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`

### Phase 24: Add Citizen Dashboard Enhancement Endpoints
- `GET /api/citizen/dashboard` — enhance with:
  - `assigned_staff` for each active complaint (name, department)
  - `sla_countdown` for each complaint
  - `resolution_proof_available` — boolean if complaint is resolved
- `GET /api/citizen/dashboard/complaint/:id/timeline` — detailed timeline
- `GET /api/citizen/dashboard/complaint/:id/proof` — resolution proof media

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/controller/citizen.controller.ts`

### Phase 25: Add Staff Duty Status Tracking
- `staff_duty_log` table: staff_id, status (on_duty/off_duty/on_leave), changed_at, changed_by
- `POST /api/v1/staff/duty/toggle` — toggle between on_duty/off_duty
- `POST /api/v1/staff/duty/break` — start/end break (auto-return after 30 min)
- `GET /api/v1/staff/duty/status` — current duty status
- Department head can view all staff duty statuses in real-time

Files:
- `Smart_Civic_Platform_Backend/src/modules/staff/controller/staff.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/staff/repository/staff.repository.ts`

---

## DOMAIN F — Backend: Advanced Analytics Engine (Phases 26–30)

### Phase 26: Create Re-Open Rate Analytics Service (Blueprint QA)
- `ReopenRateService`:
  - `calculateRate(departmentId, month)` — reopen rate formula
  - `identifyHighRiskStaff(departmentId, threshold)` — staff with > threshold reopen rate
  - `getReopenTrend(departmentId, months)` — monthly trend
  - `getReopenByCategory(departmentId, month)` — which categories have most reopens
- Auto-alert: if department reopen rate > 15% → notify department head
- Auto-alert: if staff reopen rate > 20% → flag for review

Files:
- `Smart_Civic_Platform_Backend/src/service/reopen-rate.service.ts` (NEW)

### Phase 27: Create Geo-Spatial Analytics Service (Blueprint)
- `GeoSpatialService`:
  - `getComplaintClusters(municipalityId, month)` — group complaints by proximity (lat/lng clustering)
  - `getWardHeatmapData(municipalityId, month)` — complaints per ward for heatmap visualization
  - `getTopCategoriesByWard(municipalityId)` — per ward, most frequent category
  - `getInfrastructureDeficitScore(wardId)` — score based on recurring complaint density
- `GET /api/municipality/:mid/analytics/geo/clusters` — cluster data for map overlay
- `GET /api/municipality/:mid/analytics/geo/deficit-report` — infrastructure deficit analysis

Files:
- `Smart_Civic_Platform_Backend/src/service/geo-spatial.service.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 28: Create Trend & Forecasting Service
- `TrendService`:
  - `getDailySubmissionTrend(municipalityId, days)` — daily complaint counts for charting
  - `getResolutionTrend(municipalityId, days)` — daily resolved counts
  - `getMonthlyComparison(municipalityId, months)` — MoM comparison
  - `getForecast(municipalityId, months)` — simple linear forecast for expected complaints
- `GET /api/municipality/:mid/analytics/trends` — unified trend endpoint
  - Accept: `?period=7d|30d|90d|12m&metric=submissions|resolved|sla_breaches`

Files:
- `Smart_Civic_Platform_Backend/src/service/trend.service.ts` (NEW)

### Phase 29: Create Citizen Satisfaction Analytics
- `SatisfactionService`:
  - `getOverallSatisfaction(municipalityId, month)` — avg rating, distribution (1-5 stars)
  - `getSatisfactionByDepartment(municipalityId, month)` — dept-wise avg rating
  - `getSatisfactionByCategory(municipalityId, month)` — category-wise avg rating
  - `getSatisfactionTrend(municipalityId, months)` — monthly avg rating trend
- `GET /api/municipality/:mid/analytics/satisfaction` — satisfaction dashboard data
- `GET /api/v1/department/analytics/satisfaction` — dept-level satisfaction

Files:
- `Smart_Civic_Platform_Backend/src/service/satisfaction.service.ts` (NEW)

### Phase 30: Create Cache Invalidation System
- Whenever a complaint status changes: invalidate affected dashboard caches
- Whenever a staff assignment changes: invalidate dept dashboard cache
- Cache invalidation via event emitter:
  - `complaint.updated` → invalidate munic + dept + citizen cache for that scope
  - `staff.assigned` → invalidate dept cache
  - `ward.stats_changed` → invalidate ward_monthly_stats view
- Manual refresh endpoint: `POST /api/admin/analytics/refresh`

Files:
- `Smart_Civic_Platform_Backend/src/service/cache-invalidator.service.ts` (NEW)

---

## DOMAIN G — Backend: Executive Report Generator (Phases 31–35)

### Phase 31: Create Report Generator Service
- `ReportGeneratorService`:
  - `generateMonthlySummary(scope, scopeId, month)` — compile all metrics into structured data
  - `generateQuarterlyReview(scope, scopeId, quarter)` — quarterly aggregation
  - `generateCustomReport(scope, scopeId, dateFrom, dateTo, metrics)` — custom date range
- Data compiled:
  - Executive summary (text paragraph with key numbers)
  - KPI table (total, resolved, pending, SLA%, avg rating, reopen rate)
  - Department breakdown (if municipality scope)
  - Ward breakdown (if municipality scope)
  - Trend chart data (last 12 months)
  - Top categories, top performing departments/staff

Files:
- `Smart_Civic_Platform_Backend/src/service/report-generator.service.ts` (NEW)

### Phase 32: Add PDF Export Endpoint
- `POST /api/municipality/:mid/reports/generate` — generate and return report
  - Accept: `{ type: 'monthly_summary' | 'quarterly_review' | 'custom', month?, date_from?, date_to? }`
  - Generate PDF using a library (pdfkit, puppeteer, or similar)
  - PDF includes: header with municipality logo, date, title, tables, charts (simple), footer
- `POST /api/v1/department/reports/generate` — dept-level report
- Store generated file in storage, record in `executive_reports` table

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/controller/department.controller.ts`
- `Smart_Civic_Platform_Backend/src/service/pdf-generator.service.ts` (NEW)

### Phase 33: Add Excel Export Endpoint
- `POST /api/municipality/:mid/reports/export-excel` — export as Excel
  - Accept: same parameters as PDF
  - Generate .xlsx with multiple sheets:
    - Sheet 1: Executive Summary
    - Sheet 2: Department Breakdown
    - Sheet 3: Ward Breakdown
    - Sheet 4: Daily Trend Data
    - Sheet 5: Staff Performance
  - Use exceljs or similar library

Files:
- `Smart_Civic_Platform_Backend/src/service/excel-generator.service.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`

### Phase 34: Add Report History & Download Endpoints
- `GET /api/municipality/:mid/reports` — list generated reports
  - Filter by type, date range
  - Columns: title, type, format, generated date, generated by
- `GET /api/municipality/:mid/reports/:id/download` — download report file
- `DELETE /api/municipality/:mid/reports/:id` — delete report
- `GET /api/v1/department/reports` — dept-level report history

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`
- `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`

### Phase 35: Add Scheduled Report Cron
- `ScheduledReportCron` — runs on 1st of each month
  - Auto-generate monthly summary for each municipality
  - Auto-generate monthly summary for each department
  - Store in `executive_reports`
  - Send notification to municipality head + department head:
    - "Your monthly performance report for [Month] is ready. [Download link]"
- Configurable: enable/disable auto-generation per municipality

Files:
- `Smart_Civic_Platform_Backend/src/service/scheduled-report.service.ts` (NEW)

---

## DOMAIN H — Frontend: Super Admin & Municipality Head Dashboards (Phases 36–40)

### Phase 36: Build Super Admin Dashboard Page
- New: `pages/superadmin/Dashboard.tsx`:
  - **Top Row**: Total Municipalities, Total Users, Total Complaints (cross-platform), System Uptime
  - **Multi-Muni Table**: name, complaints, resolution rate, SLA%, staff count, citizen count, health indicator
  - **System Health**: API latency chart, storage usage gauge, auth user growth
  - **Recent Activity Feed**: live audit log (last 50 actions)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/superadmin/Dashboard.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 37: Enhance Municipality Head Dashboard
- Enhance `pages/munic_head/Homepage.tsx`:
  - **Executive Summary Row**: total complaints, resolved, pending, SLA compliance %, avg rating
  - **Department Leaderboard**: ranked cards with score, trend arrow, key metrics
  - **SLA Escalation Feed**: list of currently escalated complaints with "Intervene" button
  - **Pipeline Funnel**: visual funnel showing counts at each stage
  - **Quick Actions**: "Generate Monthly Report", "View Ward Heatmap", "View Department Rankings"

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/Homepage.tsx`

### Phase 38: Build Ward Heatmap Visualization
- New: `pages/munic_head/WardHeatmap.tsx`:
  - Municipality map overlay or grid of ward cards
  - Each ward: complaint count, color intensity (green→yellow→red)
  - Click ward → expand detail: top categories, trend, SLA breaches
  - Filters: month picker, category filter
  - If map library available: geo-plot complaints with cluster markers

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/WardHeatmap.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 39: Build Municipality Head Report & Analytics Page
- Enhance `pages/munic_head/ReportAnalytics.tsx`:
  - **Tab 1: Overview** — existing KPI cards + pipeline funnel + trend chart
  - **Tab 2: Departments** — leaderboard, per-dept detail drill-down
  - **Tab 3: Wards** — ward heatmap grid, category breakdown, deficit analysis
  - **Tab 4: SLA** — compliance rate, breach list, escalation timeline
  - **Tab 5: Satisfaction** — rating distribution, by-department, by-category, trend
  - **Generate Report** button → opens report dialog (type, month, format)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ReportAnalytics.tsx`

### Phase 40: Build Department Leaderboard Component
- Reusable: `DepartmentLeaderboard.tsx`:
  - Table: rank, department name, resolution rate, SLA%, avg rating, reopen rate, overall score
  - Sortable by any column
  - Color-coded rows: green (top 3), red (bottom 3)
  - Click row → navigate to department detail
  - Month selector to compare periods

Files:
- `Smart_Civic_Platform_Frontend/src/components/DepartmentLeaderboard.tsx` (NEW)

---

## DOMAIN I — Frontend: Department Head, Staff & Citizen Dashboard Enhancements (Phases 41–45)

### Phase 41: Enhance Department Head Dashboard
- Enhance `pages/dept_head/Dept_Dashboard.tsx`:
  - **Operational Overview**: total complaints, active staff, active teams, pending SLA warnings
  - **Staff Availability Bar**: horizontal bar showing available / busy / on-leave counts
  - **Team Capacity Cards**: per team: utilization % bar, active assignments, members
  - **SLA Watchlist**: cards for at-risk complaints (yellow for warning, red for critical)
  - **Re-Open Rate**: gauge showing current rate with trend arrow
  - **Quick Actions**: "View All Staff Workload", "Generate Department Report"

Files:
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/Dept_Dashboard.tsx`

### Phase 42: Build Staff Workstation Dashboard
- New: `pages/staff/Dashboard.tsx` (rewrite current basic):
  - **Top Row**: active assignments count, completed today, overdue tasks, avg rating
  - **Active Tasks List**: cards with priority, SLA countdown, location, category
  - **Duty Toggle**: ON DUTY / OFF DUTY button with status indicator
  - **Team Memberships**: list of teams with member count
  - **Personal Performance**: mini chart showing resolved count per day for last 7 days

Files:
- `Smart_Civic_Platform_Frontend/src/pages/staff/Dashboard.tsx` (NEW, replaces basic Homepage)

### Phase 43: Build Staff Performance Page
- New: `pages/staff/Performance.tsx`:
  - **Score Gauge**: personal performance score (0-100)
  - **Metrics**: resolved this month, avg resolution time, avg rating, reopen rate
  - **Trend Chart**: resolved per day/week for past 30 days
  - **Recent Feedback**: list of citizen ratings and comments
  - **Compared to Dept Avg**: show how staff compares to department average

Files:
- `Smart_Civic_Platform_Frontend/src/pages/staff/Performance.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 44: Enhance Citizen Dashboard with Transparency
- Enhance `pages/citizen/Dashboard.tsx`:
  - **Grievance Ledger**: full complaint list with status, tracking ID, assigned staff name
  - **Active Complaint Card**: for each IN_PROGRESS complaint, show assigned staff info and SLA countdown
  - **Resolution Proof Available**: badge on RESOLVED complaints → click to view proof
  - **Progress Timeline**: mini timeline showing last 3 status changes
  - **Accountability Metrics**: "Your complaints: 5 total, 3 resolved, 1 reopened"
  - **Notification Badge**: unread count for complaint updates

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/Dashboard.tsx`

### Phase 45: Add Report Download & History UI
- `ReportDialog.tsx` — reusable component:
  - Step 1: Report type (Monthly Summary / Quarterly Review / Custom Range)
  - Step 2: Month/Quarter picker (or date range for custom)
  - Step 3: Format (PDF / Excel)
  - Step 4: Preview & Generate
- `ReportHistory.tsx` — list of previously generated reports:
  - Table: title, type, format, generated date, download button
  - "Delete" button for old reports
- Accessible from munic head and dept head dashboards

Files:
- `Smart_Civic_Platform_Frontend/src/components/ReportDialog.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/ReportHistory.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/pages/dept_head/ReportHistory.tsx` (NEW)

---

## DOMAIN J — Testing, Documentation & Deployment (Phases 46–50)

### Phase 46: Backend Tests — Dashboard Analytics APIs
- Test: Super admin dashboard returns correct platform totals
- Test: Municipality head dashboard returns all metric groups
- Test: Department head dashboard returns staff workload breakdown
- Test: Ward heatmap returns per-ward data
- Test: Department leaderboard ranks correctly
- Test: Pipeline funnel counts match actual data
- Test: SLA compliance calculation

Files:
- `Smart_Civic_Platform_Backend/tests/analytics-dashboard.test.ts` (NEW)

### Phase 47: Backend Tests — Advanced Analytics
- Test: Re-open rate calculation matches formula
- Test: Geo-spatial clustering returns grouped data
- Test: Trend forecasting returns expected format
- Test: Satisfaction analytics computes correct averages
- Test: Cache invalidation triggers on complaint update
- Test: Monthly stats aggregation

Files:
- `Smart_Civic_Platform_Backend/tests/analytics-advanced.test.ts` (NEW)

### Phase 48: Backend Tests — Report Generation
- Test: Monthly summary report compiles all metrics
- Test: PDF report generates without error
- Test: Excel report generates with multiple sheets
- Test: Report history stores and retrieves correctly
- Test: Scheduled report cron creates reports
- Test: Report download returns file

Files:
- `Smart_Civic_Platform_Backend/tests/analytics-reports.test.ts` (NEW)

### Phase 49: Frontend Tests — Dashboard Pages
- Test: Super admin dashboard renders all KPI cards
- Test: Municipality head dashboard loads department leaderboard
- Test: Ward heatmap renders correct number of wards
- Test: Department head dashboard shows staff availability
- Test: Staff workstation shows active assignments
- Test: Citizen dashboard shows complaint ledger
- Test: Report dialog generates correct request payload
- Test: Report history shows generated reports

Files:
- `Smart_Civic_Platform_Frontend/src/__tests__/SuperAdminDashboard.test.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/__tests__/MunicHeadDashboard.test.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/__tests__/StaffDashboard.test.tsx` (NEW)

### Phase 50: Documentation & Cleanup
- Create `docs/analytics-dashboards.md`:
  - 5-tier dashboard architecture overview
  - Re-open rate formula explanation
  - Geo-spatial heatmap methodology
  - Report generator usage guide
  - Cache strategy (TTL, invalidation)
  - Available endpoints reference table
- Update `Supabase_Schema.sql` with all new tables/views
- Update `AGENT.md` and `Smart_Civic_Platform_Backend/CLAUDE.md`
- Remove old mock data from dashboard pages
- Seed initial metric cache for fast first-load
- Lint + typecheck all changed code

Files:
- `Smart_Civic_Platform/docs/analytics-dashboards.md` (NEW)
- `Supabase_Schema.sql`
- `AGENT.md`
- `Smart_Civic_Platform_Backend/CLAUDE.md`

---

## Summary: 10 Domains × 5 Phases = 50 Phases

| Domain | Phases | Focus |
|--------|--------|-------|
| **A** | 1–5 | Database: Analytics Schema (metrics cache, monthly stats, ward MV, reports table, indexes) |
| **B** | 6–10 | Backend: Super Admin Analytics (platform overview, multi-muni comparison, audit viewer, storage analytics) |
| **C** | 11–15 | Backend: Municipality Head Analytics (exec overview, ward heatmap, dept leaderboard, SLA analytics, pipeline funnel) |
| **D** | 16–20 | Backend: Dept Head Analytics (staff workload, team capacity, SLA watchlist, reopen rate as QA metric) |
| **E** | 21–25 | Backend: Staff & Citizen Analytics (workstation dashboard, duty toggle, citizen ledger, verification proof, timeline) |
| **F** | 26–30 | Backend: Advanced Analytics (reopen rate QA service, geo-spatial clustering, trends/forecasting, satisfaction, cache invalidation) |
| **G** | 31–35 | Backend: Report Generator (monthly/quarterly/custom, PDF export, Excel export, report history, scheduled cron) |
| **H** | 36–40 | Frontend: Super Admin & Munic Head Dashboards (super admin page, enhanced homepage, ward heatmap, analytics tabs, leaderboard) |
| **I** | 41–45 | Frontend: Dept Head, Staff & Citizen Dashboards (dept dashboard, staff workstation, staff performance, citizen transparency, report UI) |
| **J** | 46–50 | Testing, Documentation & Deployment |

---

## Key Architecture Decisions

### 5-Tier Data Scope
```
Tier 1: Super Admin   → All municipalities aggregate
Tier 2: Munic Head    → Single municipality, all departments/wards
Tier 3: Dept Head     → Single department, all staff/teams
Tier 4: Staff         → Self, own assignments + team memberships
Tier 5: Citizen       → Self, own complaints + assigned staff info
```

### Cache Strategy
```
dashboard_metrics_cache (5 min TTL)
  ├── Invalidate on: complaint status change
  ├── Invalidate on: staff assignment change
  └── Manual: POST /api/admin/analytics/refresh

ward_monthly_stats (materialized view, daily refresh)
  └── Refresh via cron at 00:00 daily

monthly_aggregated_stats (computed on 1st of month)
  └── Insert via cron, updated on-demand if month not closed
```

### Re-Open Rate Formula (Blueprint QA Metric)
```
Re-Open Rate (%) = (Total Re-Opened Tickets / Total Marked Resolved Tickets) × 100

Thresholds:
  • < 5%  → Excellent
  • 5-10% → Normal
  • 10-15% → Monitor
  • > 15% → Alert Department Head
  • Staff with > 20% → Flagged for review
```

### Report Types & Schedule
| Type | Scope | Schedule | Contents |
|------|-------|----------|----------|
| Monthly Summary | Municipality + Department | 1st of month | KPIs, dept breakdown, ward breakdown, trends |
| Quarterly Review | Municipality | 1st of quarter | Same + YoY comparison, strategic insights |
| Custom | Any | On-demand | Date range, selectable metrics |
