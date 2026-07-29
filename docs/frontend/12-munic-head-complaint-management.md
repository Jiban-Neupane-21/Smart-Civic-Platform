# Municipality Head Complaint Management — OLD → NEW Plan

## OLD (Current State)

**File:** `src/pages/munic_head/ComplainDetails.tsx` (396 lines)

### API & Data Issues
- **Wrong endpoint**: calls `/municipality/${municipalityId}/complaints` — correct endpoint is `GET /api/municipality/complaints` (municipalityId resolved from middleware via `req.municipalityId`)
- **Fragile response parsing**: `d?.data?.complaints ?? d?.data ?? d ?? []` — no guaranteed shape
- Uses raw `fetchWithAuth` instead of `municipalityApi` or `complaintsApi`
- Local `Complaint` interface with only: `co_uid, title, description, category, status, priority?, citizen_id?, department_id?, department?, created_at, updated_at`
- **No tracking_id, no severity_level, no ward_number, no citizen address info**

### Status & Filter Issues
- `STATUS_OPTIONS` only has 4 values: `["pending", "in_progress", "resolved", "closed"]`
- Missing: `assigned`, `under_review`, `rejected`, `escalated`, `reopened`, `cross_dept_pending`
- `STATUS_COLOR` map is incomplete (only 4 entries)
- Filters: status + department only — **no province/district scope filter**

### Display Issues
- Table columns: Title, Category, Department, Status, Submitted, Actions
- **No tracking ID** — citizens can't reference their ticket
- **No severity badge** — can't triage by urgency
- **No ward number** — can't see which ward the complaint is from
- **No citizen info** — can't know the complainant's location scope
- Dialog can only update status + department — **no intervention notes**

### Scope Issue
- No verification that the complaint's **citizen** is actually registered in the same province/district/municipality as the municipal head
- Only checks `complaints.municipality_id` which may not match citizen's registered address

---

## NEW (Target State)

### Phase M1: Fix API Endpoint & Data Types

**Fix the URL** — use `GET /api/municipality/complaints?status=` instead of the broken `/municipality/${municipalityId}/complaints`.

**Switch to `municipalityApi`** or add proper typed methods:

| Frontend | Backend | Description |
|----------|---------|-------------|
| `municipalityApi.getComplaints(status?)` | `GET /api/municipality/complaints?status=` | All complaints in municipality |
| `municipalityApi.getEscalatedComplaints()` | `GET /api/municipality/complaints/escalated` | SLA-breached complaints |
| `municipalityApi.interveneOnComplaint(id, action, note)` | `POST /api/municipality/complaints/:id/intervene` | Admin intervention |

**Extend `municipality.types.ts`** with a proper complaint shape matching the backend response:

```ts
interface MunicipComplaint {
  co_uid: string;
  tracking_id: string;                    // KTM-WARD5-RD-2026-000042
  title: string;
  description?: string;
  status: ComplaintStatus;                // full backend enum
  priority?: string;
  severity_level: SeverityLevel;          // low | medium | high | urgent
  ward_number?: number;
  citizen_id: string;
  municipality_id: string;
  assigned_department_id?: string;
  category_id?: string;
  submitted_date: string;
  updated_at?: string;
  resolution_date?: string | null;
  resolution_note?: string | null;
  sla_due_at?: string | null;
  sla_breached?: boolean;
  // Joined relations
  department?: { id: string; department_name: string };
  category?: { id: string; category_name: string };
  citizen?: {                           // scope verification data
    id: string;
    current_province_id?: string;
    current_district_id?: string;
    current_municipality_id?: string;
    permanent_province_id?: string;
    permanent_district_id?: string;
    permanent_municipality_id?: string;
  };
}
```

### Phase M2: Province-District-Municipality Scope Filter

**Concept:** A municipal head manages a specific municipality which belongs to a specific district and province. Only complaints from citizens whose **registered address** (permanent or current) matches the same province, district, and municipality should be visible.

**Implementation options (ordered by preference):**

| Option | Where | How |
|--------|-------|-----|
| **A (Recommended)** | Backend SQL | Add JOIN to `citizens` table in `getRegionalComplaints` query: filter by `citizens.current_municipality_id = complaints.municipality_id` AND `citizens.current_district_id = municipalities.district_id` AND `citizens.current_province_id = districts.province_id`. The municipal head's municipality already determines district/province via FK chain. |
| **B** | Frontend filter | Fetch all complaints + citizens, filter client-side. Bad for performance. |
| **C** | New endpoint | `GET /api/municipality/complaints/scoped` that includes the citizen address join. |

**For the frontend plan (this document):** Assume Option A is implemented on the backend. The frontend should:
- Display the scope info in UI: "Showing complaints from: {Province} > {District} > {Municipality}"
- Add scope indicators per complaint row (citizen's registered ward/tole)
- Show a scope mismatch warning if any complaint falls outside expected area

**Frontend scope display:**

```
┌─────────────────────────────────────────────────────┐
│  🏛 Complaint Management — Province / District / Muni │
│  Scope: Bagmati Province > Kathmandu District         │
│         > Kathmandu Metropolitan City (Ward 1-32)    │
│  [Complaints from citizens registered in this area]   │
└─────────────────────────────────────────────────────┘
```

Add to filter bar: read-only scope indicator (province > district > municipality name), fetched from `GET /api/public/provinces`, `GET /api/public/districts`, etc. using the municipal head's `municipality_id`.

### Phase M3: Enhanced Table & Status Display

**New columns:**

| Column | Source | Notes |
|--------|--------|-------|
| Tracking ID | `tracking_id` | Blue monospace, clickable |
| Title | `title` | Truncated |
| Category | `category.category_name` | Chip |
| Ward | `ward_number` | "Ward 5" badge |
| Severity | `severity_level` | Color-coded (see below) |
| Status | `status` | Full color-coded enum |
| Department | `department.department_name` | Or "—" if unassigned |
| Submitted | `submitted_date` | Relative time |
| SLA | `sla_due_at` | Countdown timer, red if breached |

**Full status color map:**

```ts
const STATUS_COLOR: Record<string, "default" | "warning" | "info" | "success" | "error" | "secondary"> = {
  pending:            "warning",
  assigned:           "info",
  under_review:       "info",
  in_progress:        "primary",
  resolved:           "success",
  rejected:           "error",
  closed:             "default",
  escalated:          "error",
  reopened:           "warning",
  cross_dept_pending: "secondary",
};
```

**Severity chips:**

| Severity | Color |
|----------|-------|
| `low` | Success (outlined) |
| `medium` | Warning |
| `high` | Error |
| `urgent` | Error (filled, bold) |

### Phase M4: Intervention Dialog Enhancements

**Current dialog:** Basic status update + department assignment.

**New dialog should include:**
- Full complaint detail view (tracking ID, description, severity, ward, citizen scope)
- Status update with **all** valid transitions (not just 4)
- Department reassignment
- **Intervention actions:** Reassign, Force Resolve, Force Reject (with required note)
- SLA status display (due date, breach indicator)
- Link to citizen profile (read-only info: ward, municipality)
- Activity timeline (recent status changes)

### Phase M5: Add Municipality API Methods

Add to `municipality.api.ts`:

```ts
const municipalityApi = {
  // ... existing methods ...
  
  getComplaints: (status?: string) =>
    apiClient.get("/municipality/complaints", { params: { status } }),
  
  getEscalatedComplaints: () =>
    apiClient.get("/municipality/complaints/escalated"),
  
  interveneOnComplaint: (complaintId: string, action: "reassign" | "resolve" | "reject", note?: string) =>
    apiClient.post(`/municipality/complaints/${complaintId}/intervene`, { action, note }),
  
  getMunicipalityScope: (municipalityId: string) =>
    apiClient.get(`/public/municipalities/${municipalityId}/scope`),
    // Returns { province: { id, name }, district: { id, name }, municipality: { id, official_name } }
};
```

### Phase M6: Scope Verification Flow

When the municipal head opens the page:

1. Read `user.municipalityId` from auth
2. Fetch municipality details (to get `district_id`)
3. Fetch district (to get `province_id`)
4. Fetch province name
5. Display scope header: "Bagmati > Kathmandu > Kathmandu Metro"
6. Fetch complaints — backend already filters by `municipality_id` + citizen's address match

---

## Files Changed

| File | Action | Phase |
|------|--------|-------|
| `src/pages/munic_head/ComplainDetails.tsx` | **Rewrite** — fix endpoint, add scope, full status enum, new columns, intervention dialog | M1–M4, M6 |
| `src/api/types/municipality.types.ts` | Add `MunicipComplaint` type (or reuse from `complaints.types.ts`) | M1 |
| `src/api/modules/municipality.api.ts` | Add `getComplaints`, `getEscalatedComplaints`, `interveneOnComplaint`, `getMunicipalityScope` | M5 |
| `src/hooks/useAuth.ts` | Ensure `municipalityId` is available (likely already is) | — |
| `src/pages/munic_head/Homepage.tsx` | Possibly update dashboard stats to use new scoped queries | M6 (optional) |

## Backend API Contract (for reference)

```
GET /api/municipality/complaints?status=pending
Authorization: Bearer <token>
→ req.municipalityId set by verifyMunicipalityHeadContext middleware

Response:
{
  success: true,
  data: [
    {
      co_uid: "uuid",
      tracking_id: "KTM-WARD5-RD-2026-000042",
      title: "Broken street light",
      description: "Street light has been broken for 2 weeks...",
      status: "pending",
      severity_level: "high",
      ward_number: 5,
      submitted_date: "2026-07-28T10:30:00Z",
      resolution_date: null,
      resolution_note: null,
      sla_due_at: "2026-07-29T10:30:00Z",
      sla_breached: false,
      assigned_department_id: "uuid",
      category_id: "uuid",
      department: { id: "uuid", department_name: "Roads Department" },
      category: { id: "uuid", category_name: "Roads & Infrastructure" },
      citizen: {
        id: "uuid",
        current_ward_id: "uuid",
        current_municipality_id: "uuid"
      }
    }
  ]
}
```
