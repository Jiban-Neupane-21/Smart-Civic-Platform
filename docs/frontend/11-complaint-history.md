# Complaint History Page — OLD → NEW Plan

## OLD (Current State)

File: `src/pages/citizen/ComplainHistory.tsx`

- **Mock data only** — 3 hardcoded records, no API calls
- Import: `Search` icon, `TextField`, `MenuItem` for filter
- Interface `ReportData` with local types: `id`, `title`, `category`, `date`, `status` (string union)
- Status values: `"Pending" | "In Progress" | "Resolved"` — do NOT match backend enum
- Filter: search by title/id, dropdown by status
- Columns: Ticket ID, Issue Title, Category, Submission Date, Status
- No routing — rows are not clickable
- No tracking ID, no severity, no department, no SLA info
- No pagination

## NEW (Target State)

### What backend returns (`GET /api/citizen/complaints?status=`)

```json
[
  {
    "co_uid": "uuid",
    "tracking_id": "KTM-WARD5-RD-2026-000042",
    "title": "Broken street light",
    "status": "pending",
    "severity_level": "medium",
    "submitted_date": "2026-07-28T10:30:00Z",
    "resolution_date": null,
    "resolution_note": null,
    "complaint_categories": { "category_name": "Roads & Infrastructure" },
    "departments": { "department_name": "Roads Department" }
  }
]
```

**Backend status enum:** `pending | assigned | under_review | in_progress | resolved | rejected | closed | escalated | reopened | cross_dept_pending`
**Backend severity enum:** `low | medium | high | urgent`

### Phase H1: Rewrite with Real API Data

**Replace mock data** with `citizenApi.getMyComplaints(status?)` calling `GET /api/citizen/complaints`.

### Phase H2: UI Enhancements

#### Table Columns (updated)

| Column | Source | Notes |
|--------|--------|-------|
| Tracking ID | `tracking_id` | Blue/monospace, clickable → detail page |
| Title | `title` | Truncate if > 60 chars |
| Category | `complaint_categories.category_name` | From joined category |
| Department | `departments.department_name` | From joined department |
| Severity | `severity_level` | Color-coded chip |
| Status | `status` | Color-coded chip (see below) |
| Submitted | `submitted_date` | Relative time ("2 days ago") + full date on hover |
| Resolution | `resolution_date` | Show only if resolved/closed |

#### Status Chips — Color Mapping

| Status | Color | Icon/Visual |
|--------|-------|-------------|
| `pending` | Warning (amber) | ⏳ Pending |
| `assigned` | Info (blue) | 👤 Assigned |
| `under_review` | Info (light blue) | 🔍 Under Review |
| `in_progress` | Primary (blue) | 🛠 In Progress |
| `resolved` | Success (green) | ✅ Resolved |
| `rejected` | Error (red) | ❌ Rejected |
| `closed` | Default (gray) | 🔒 Closed |
| `escalated` | Error (dark red) | 🚨 Escalated |
| `reopened` | Warning (orange) | 🔄 Reopened |
| `cross_dept_pending` | Secondary (purple) | 🤝 Multi-Dept |

#### Severity Chips

| Severity | Color |
|----------|-------|
| `low` | Success (green outline) |
| `medium` | Warning (amber) |
| `high` | Error (red) |
| `urgent` | Error (dark red, filled) |

#### Status Filter Dropdown

Populate dynamically from the backend enum values (show human-readable labels):

```
All Statuses
⏳ Pending
👤 Assigned
🔍 Under Review
🛠 In Progress
✅ Resolved
❌ Rejected
🔒 Closed
🚨 Escalated
🔄 Reopened
🤝 Multi-Department
```

#### Click Row → Navigate to Detail

```typescript
const handleRowClick = (coUid: string) => {
  navigate(`/citizen/complaints/${coUid}`);
};
```

### Phase H3: Search & Filter

- **Search**: By `tracking_id` or `title` (client-side filter on loaded data, or pass to API if backend supports)
- **Status filter**: Pass `?status=` to API for server-side filtering
- **Sort**: By `submitted_date` descending (handled by backend)
- **Empty state**: "No complaints found" illustration + "Submit a Complaint" button
- **Loading state**: Skeleton rows
- **Error state**: Alert with retry button

### Phase H4: Pagination

If complaint count grows, add pagination. Backend doesn't return pagination meta currently, so either:
- Fetch all (reasonable for most citizens)
- Add client-side pagination (10-20 per page)
- Later: request backend add `?page=&limit=` support

### Phase H5: SLA / Time Indicators

Show time-sensitive indicators:
- If `status` is active (not resolved/closed/rejected) and submitted > 5 days ago → show "⏰ Overdue" chip
- If resolved → show "Resolved X days ago"
- If `severity === 'high'` and still pending → show red urgency indicator

---

## Files Changed

| File | Action | Phase |
|------|--------|-------|
| `src/pages/citizen/ComplainHistory.tsx` | **Rewrite** — real API, new columns, clickable rows | H1-H5 |
| `src/api/types/complaints.types.ts` | Add `ComplaintResponse` type (if not already from wizard plan) | H1 |
| `src/api/modules/complaints.api.ts` | Ensure `getMyComplaints` method exists | H1 |
| `src/routes/AppRoutes.tsx` | Ensure detail route exists (if not already) | H2 |

## Backend API Contract

```
GET /api/citizen/complaints?status=pending
Authorization: Bearer <token>

Response:
{
  success: true,
  data: [
    {
      co_uid: "uuid",
      tracking_id: "KTM-WARD5-RD-2026-000042",
      title: "string",
      status: "pending | assigned | under_review | in_progress | resolved | rejected | closed | escalated | reopened | cross_dept_pending",
      severity_level: "low | medium | high | urgent",
      submitted_date: "ISO string",
      resolution_date: "ISO string | null",
      resolution_note: "string | null",
      complaint_categories: { category_name: "string" },
      departments: { department_name: "string" }
    }
  ]
}
```
