# Complaint Submission — Frontend OLD → NEW Plan

## OLD (Current State)

File: `src/pages/citizen/SubmitComplain.tsx`

- Single flat form, all fields on one page
- Municipality dropdown (fetches `GET /api/citizen/municipalities`)
- Category dropdown (fetches `GET /api/municipality/departments/categories` — requires auth)
- Title + Description + Location text + single file attachment
- No ward selection, no severity level, no secondary category
- Flat submit payload: `{ municipality_id, title, description, category_id }`
- Uses raw `fetchWithAuth` instead of `apiClient`
- No KYC limit check, no auto-fill of registered address
- Success: Swal toast → navigate to `/citizen/complaints`
- LocationPickerMap component for optional map pin

## NEW (Target State)

Backend is fully implemented and supports **two body formats**:

**Flat (backward-compatible):** `{ municipality_id, title, description, category_id, severity_level }`
**4-Step Structured:** `{ location: { source, ward_id, lat, lng }, category: { primary_category_id, secondary_category_id? }, details: { title, description, severity_level }, step_completed: 4 }`

The new frontend should use the **structured 4-step format** for better UX.

---

## Phase C1: 4-Step Submission Wizard

### Step 1 — Location Resolution

**Goal**: Determine where the issue is located.

**Sub-options** (radio/card select):

| Option | Behavior | Backend Source |
|--------|----------|----------------|
| "Use Registered Address" | Auto-fills from `GET /api/auth/me` → `citizen_details.current_ward_id` + municipality. Shows read-only "Municipality: X, Ward: Y" | `location_source: 'registered_address'` |
| "Select Manually" | Province → District → Municipality → Ward cascade dropdown (reuse LocationPicker from registration) | `location_source: 'manual'`, send `ward_id` |
| "Use Current Location" | Browser geolocation → capture lat/lng, optionally reverse-geocode to find nearest ward | `location_source: 'gps'`, send `lat`, `lng` |

**Guard**: If no registered address, auto-default to "Select Manually" and show info banner.

**API calls:**
- `citizenApi.getProvinces()` (public)
- `citizenApi.getDistricts(provinceId)` (public)
- `citizenApi.getMunicipalities(districtId)` (public)
- `citizenApi.getWards(municipalityId)` (public)

### Step 2 — Category Selection

**Goal**: Choose what type of issue (primary required, secondary optional).

**Primary Category** (required):
- Dropdown/radio list fetched from `GET /api/citizen/municipalities/{municipalityId}/categories`
- After selection, show: **"Primary: [Category Name] → [Department Name] (Lead)"**

**Secondary Category** (optional):
- Dropdown with toggle checkbox: "This issue involves another department?"
- Same source, filter out the already-selected primary
- After selection, show: **"Secondary: [Category Name] → [Department Name] (Supporting)"**
- Visual badge: "Multi-Department" when selected

### Step 3 — Grievance Details

**Goal**: Enter the actual complaint information.

| Field | Type | Validation |
|-------|------|------------|
| Title | Text (required) | Min 5 chars, max 200 |
| Description | Textarea (required) | Min 20 chars |
| Severity Level | Card select (required) | Low / Medium / High — visual cards with icons |
| Media Evidence | File upload (optional) | Max 5 files, jpg/png/pdf, max 5MB each |
| Location details | Text (optional) | Free-text fallback address |

**Severity visual cards:**
- Low 🟢 (green) — "Minor issue, no urgency"
- Medium 🟡 (amber) — "Requires attention" (default)
- High 🔴 (red) — "Urgent, needs immediate action"

**Media upload:**
- Drag-and-drop zone or click to select
- File preview thumbnails with remove button
- Upload as base64 via `POST /api/citizen/complaints/:id/media` after complaint is created
- Or pass to endpoint separately

### Step 4 — Review & Submit

**Goal**: Show summary of all entered data before final submission.

**Review Card:**
```
Location: Kathmandu, Ward 5 (Registered Address)
Category: Roads → Roads Department (Lead)
           + Water Supply → Water Department (Supporting)
Title: Broken street light near Ward 3 office
Severity: Medium
Media: 2 files attached
```

**Buttons:**
- "Edit" links for each step
- "Submit Complaint" → `POST /api/citizen/complaints` with structured body
- "Cancel" → go back

**Success Screen:**
```
✅ Complaint Submitted!
Tracking ID: KTM-WARD5-RD-2026-000042
[Track Status] → /citizen/complaints/:trackingId
[Submit Another] → reset form
```

---

## Phase C2: Update Citizen API & Types

### Update `complaints.types.ts`

```typescript
// Add these types for the backend response format
export interface ComplaintResponse {
  co_uid: string;
  tracking_id: string;
  title: string;
  description: string;
  status: string;
  severity_level: string;
  location_source: string;
  ward_number: number;
  latitude: number | null;
  longitude: number | null;
  cross_dept_status: string | null;
  submitted_date: string;
  resolution_date: string | null;
  resolution_note: string | null;
  rejection_reason: string | null;
  sla_due_at: string | null;
  sla_breached: boolean;
  complaint_categories?: { category_name: string };
  departments?: { department_name: string };
}

export interface ComplaintUpdate {
  id: string;
  note: string;
  is_internal: boolean;
  created_at: string;
  author: { full_name: string; role: string };
}

export interface ComplaintHistoryEntry {
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

// Structured submit payload (4-step format)
export interface SubmitComplaintPayload {
  location: {
    source: 'registered_address' | 'gps' | 'manual';
    ward_id?: string;
    latitude?: number;
    longitude?: number;
    municipality_id?: string;
  };
  category: {
    primary_category_id: string;
    secondary_category_id?: string;
  };
  details: {
    title: string;
    description: string;
    severity_level: 'low' | 'medium' | 'high';
  };
  step_completed: number;
}

export interface ComplaintCategory {
  id: string;
  category_name: string;
  department_category?: string;
  department_id?: string;
}
```

### Update `complaints.api.ts`

```typescript
// Add methods (keep existing ones):
getComplaintHistory: async (id: string) => ApiResponse<ComplaintHistoryEntry[]>
getComplaintUpdates: async (id: string) => ApiResponse<ComplaintUpdate[]>
addComplaintNote: async (id: string, note: string) => ApiResponse<ComplaintUpdate>
uploadMedia: async (id: string, mediaBase64: string, fileName: string) => ApiResponse<any>
reopenComplaint: async (id: string, reason: string) => ApiResponse<any>
submitFeedback: async (id: string, rating: number, comment?: string) => ApiResponse<any>
getCategories: async (municipalityId: string) => ApiResponse<ComplaintCategory[]>
```

---

## Phase C3: Complaint Detail Page (New)

New file: `src/pages/citizen/ComplaintDetail.tsx`

Route: `/citizen/complaints/:id`

**Sections:**

1. **Header**: Tracking ID (large, copyable), Status badge (color-coded), Severity badge (color-coded)
2. **Status Timeline**: Vertical stepper from `GET /api/citizen/complaints/:id/history`
3. **Details Card**: Title, Description, Category, Department, Location (municipality + ward), Source badge
4. **SLA Status**: Due date, breached indicator, remaining time countdown
5. **Updates Feed**: List from `GET /api/citizen/complaints/:id/updates`, show author name + timestamp
6. **Add Note**: Text input + submit → `POST /api/citizen/complaints/:id/updates`
7. **Media Gallery**: If media exists, show thumbnails (click to enlarge)
8. **Reopen Button**: If status is `resolved` or `closed`, show "Reopen" button with reason dialog → `POST /api/citizen/complaints/:id/reopen`
9. **Feedback Form**: If status is `resolved`/`closed` and no feedback given, show rating (1-5 stars) + optional comment → `POST /api/citizen/complaints/:id/feedback`
10. **Collaboration Info**: If multi-dept, show both departments + sign-off status

---

## Phase C4: Complaint History Page Rewrite

File: `src/pages/citizen/ComplainHistory.tsx`

Replace mock data with actual API call to `GET /api/citizen/complaints?status=`

**Table Columns:**
- Tracking ID (clickable → detail page)
- Title
- Category name
- Status (chip, color-coded)
- Severity (chip, color-coded)
- Submitted date
- SLA status (breached/ok)

**Features:**
- Status filter dropdown
- Search by tracking ID or title
- Click row → navigate to `/citizen/complaints/:co_uid`

---

## Phase C5: Dashboard Integration

File: `src/pages/citizen/SubmitComplain.tsx` (update alongside wizard)

- **Auto-fill registered municipality + ward** from `GET /api/auth/me` → `citizen_details`
- **KYC limit check**: If `kyc_status = 'unverified'`, show "X of 3 pending complaints used" warning
- **Disable submit** if pending >= 3 for unverified citizens

---

## Files Changed Summary

| File | Action | Phase |
|------|--------|-------|
| `src/pages/citizen/SubmitComplain.tsx` | **Rewrite** — 4-step wizard | C1 |
| `src/pages/citizen/ComplaintDetail.tsx` | **New** — detail view | C3 |
| `src/pages/citizen/ComplainHistory.tsx` | **Rewrite** — real API data | C4 |
| `src/api/types/complaints.types.ts` | **Update** — add new types | C2 |
| `src/api/modules/complaints.api.ts` | **Update** — add new methods | C2 |
| `src/routes/AppRoutes.tsx` | **Update** — add detail route | C3 |

## Backend API Contracts

| Method | Endpoint | Body / Params | Response |
|--------|----------|---------------|----------|
| POST | `/api/citizen/complaints` | `{ location, category, details, step_completed }` or flat `{ municipality_id, title, description, category_id }` | `{ success, data: complaint }` |
| GET | `/api/citizen/complaints` | `?status=` | `{ success, data: complaint[] }` |
| GET | `/api/citizen/complaints/:id` | — | `{ success, data: complaint }` |
| GET | `/api/citizen/complaints/:id/history` | — | `{ success, data: history[] }` |
| POST | `/api/citizen/complaints/:id/reopen` | `{ reopen_reason }` | `{ success, data }` |
| POST | `/api/citizen/complaints/:id/updates` | `{ note }` | `{ success, data }` |
| GET | `/api/citizen/complaints/:id/updates` | — | `{ success, data: updates[] }` |
| POST | `/api/citizen/complaints/:id/media` | `{ media_base64, file_name }` | `{ success, data }` |
| POST | `/api/citizen/complaints/:id/feedback` | `{ rating, comment?, is_anonymous? }` | `{ success, data }` |
| GET | `/api/citizen/municipalities/:municipalityId/categories` | — | `{ success, data: categories[] }` |

## Dependency Order

```
C2 (API types + methods)
  → C1 (Submission wizard) — depends on API types, LocationPicker
  → C3 (Detail page) — depends on API types
  → C4 (History rewrite) — depends on API types
  → C5 (Dashboard integration) — minor updates
```
