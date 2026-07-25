# Plan: Reconcile `complaints` primary key to `co_uid`

## Context

The department dashboard returns HTTP 500 with
`column complaints.id does not exist`. The live Supabase `complaints` table
uses **`co_uid`** as its primary key (confirmed by the user), but the codebase
was partially written against `id`:

- `department.repository.ts:50` already filters by `co_uid`.
- `department.repository.ts:85` (`getDepartmentSummary`) selects `id` → **500**.
- `Supabase_Schema.sql`, `database.type.ts`, and most backend repositories
  select `.eq("id", ...)` on `complaints`.
- The frontend reads `complaint.id` in several components.

Decision (user): **keep `co_uid` as the canonical name** in the live DB and do a
**full end-to-end rename to `co_uid`** (do NOT migrate/rename the live column).

## Backend changes — repository/service selects & filters on `complaints`

Rename the selected/filtered column from `id` to `co_uid` in every query against
the `complaints` table:

1. `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`
   - Line 85: `.select("id, title, status, priority, submitted_date, category_id")`
     → `.select("co_uid, title, status, priority, submitted_date, category_id")`
   - Line 50 already uses `co_uid` (no change).

2. `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`
   - Line 36: `.select("id, title, status, submitted_date")` → `co_uid`
   - Line 54: `id, title, status, submitted_date, resolution_date, resolution_note,` → `co_uid`
   - Line 80: `id, title, description, status,` → `co_uid`
   - Line 86: `.eq("id", complaintId)` → `.eq("co_uid", complaintId)`
   - Line 103: `.select("id")` → `.select("co_uid")`
   - Line 104: `.eq("id", complaintId)` → `.eq("co_uid", complaintId)`
   - Line 152: `.eq("id", complaintId)` → `.eq("co_uid", complaintId)`
   - Line 203: `.select("id, status, title, submitted_date")` → `co_uid`
   - **Leave unchanged**: lines 135, 187, 223 (these select `id` from
     `complaint_categories` / `feedback`, not `complaints`).

3. `Smart_Civic_Platform_Backend/src/modules/complaints/repository/complaints.repository.ts`
   - Line 27: `id, title, description, status, submitted_date, assigned_department_id, resolution_note, rejection_reason` → `co_uid`.

4. `Smart_Civic_Platform_Backend/src/modules/staff/repository/staff.repository.ts`
   - Line 42: `id, title, description, status, submitted_date` → `co_uid`.

5. `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`
   - Line 129: `id, title, status, submitted_date, assigned_department_id, category_id` → `co_uid`.

## Schema & type definition changes

6. `Supabase_Schema.sql`
   - Line 218: `id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),` → `co_uid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),`
   - Lines 282, 303, 315: `REFERENCES complaints(id)` → `REFERENCES complaints(co_uid)`
   - Lines 728, 729, 737: `SELECT id FROM complaints` → `SELECT co_uid FROM complaints`
     (inside `complaint_assignments` / `complaint_updates` RLS policies).

7. `Smart_Civic_Platform_Backend/src/types/database.type.ts`
   - `ComplaintRow` (line 196): `id: string;` → `co_uid: string;`
   - (Regenerate the Supabase types if a generator is configured; otherwise edit by hand.)

## Frontend changes — complaint `id` → `co_uid`

Update the complaint object shape and all reads of a complaint's id:

8. `Smart_Civic_Platform_Frontend/src/types/dashboard.type.ts`
   - `DepartmentRecentComplaint.id` (line 34) → `co_uid`.
   - Where `ListItem.id` is populated from a complaint (recentComplaints), map
     `co_uid` instead of `id`. (`ListItem.id` itself may stay for notifications/incidents.)

9. `Smart_Civic_Platform_Frontend/src/pages/dept_head/Dept_Dashboard.tsx`
   - Line 591: `key={complaint.id}` → `key={complaint.co_uid}`, and map the API
     `co_uid` field into the `DepartmentRecentComplaint` objects.

10. `Smart_Civic_Platform_Frontend/src/pages/citizen/Dashboard.tsx`
    - Line 309: `key={complaint.id}` → `key={complaint.co_uid}`; map `co_uid`
      when building `ListItem` for `recentComplaints`.

11. `Smart_Civic_Platform_Frontend/src/pages/munic_head/ComplainDetails.tsx`
    - Lines 152 & 160: `selected.id` / `c.id` → `co_uid` (these complaints come
      from the municipality `/complaints` endpoint, which now returns `co_uid`).
    - Update the local complaint type used here to `co_uid`.

12. Any other frontend component that reads a complaint object's `id`
    (e.g. `citizen/ComplainHistory.tsx` if it consumes real API data rather than
    the existing mock `CMP-xxxx` ids). Search for `complaint.id` / `c.id` /
    `row.id` against real complaint responses and rename to `co_uid`.
    - Note: `citizen/ComplainHistory.tsx` currently uses static mock data
      (`"CMP-1024"`), so it needs no DB change unless switched to live data.

Frontend URL params (e.g. `/complaints/${id}`, `getComplaintById`) pass the
value only — after the backend filter rename they resolve correctly, no change
needed beyond ensuring the passed value is the `co_uid`.

## Out of scope / no change

- Live Supabase DB column (stays `co_uid`).
- `complaint_assignments.complaint_id`, `complaint_updates.complaint_id` (these
  FK columns keep their existing name; only the referenced `complaints(id)` in
  SQL/RLS text changes).
- `id` columns on other tables (`staff`, `departments`, `municipalities`,
  `complaint_categories`, `feedback`, etc.).

## Validation

1. Backend: run typecheck/lint (e.g. `npm run build` / `tsc --noEmit` in
   `Smart_Civic_Platform_Backend`).
2. Start backend, call `GET /api/v1/department/dashboard` with a department
   head token → expect 200 and `recentComplaints` items carrying `co_uid`.
3. Exercise citizen dashboard, citizen complaint detail, municipality complaints
   list, and staff department-complaints log → confirm no `column ...id does not
   exist` errors.
4. Frontend: run `npm run build` / typecheck in `Smart_Civic_Platform_Frontend`;
   manually verify dept_head & citizen dashboards and munic_head complaint
   details render with correct keys.

## Open questions / risks

- If a Supabase type generator is wired up, prefer regenerating
  `database.type.ts` over hand-editing to avoid drift.
- Confirm `munic_head` complaint list type also renamed to `co_uid` so TS passes.
