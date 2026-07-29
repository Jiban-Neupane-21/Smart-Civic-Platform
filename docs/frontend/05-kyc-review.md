# KYC Review Page — Municipality Staff

## OLD (Current State)

Does not exist. No KYC review UI anywhere in the frontend.

## NEW (Target State)

### New Page: `src/pages/munic_head/KycReview.tsx`

Protected route for `municipality_head` role at `/municipality_head/kyc-review`.

### Layout

**List View** (default):
- Table of pending KYC applications
- Columns: S.No, Citizen Name, Phone, Identity Type, Submitted Date
- Search bar: filter by name, phone, identity number
- Click row → expand or navigate to detail view
- Pagination if >20 records

**Detail View** (on row click):
- Citizen information card:
  - Name, Phone, Email, DOB, Gender
  - Registered Address (permanent + current)
- Identity documents card:
  - Identity type label (e.g., "Citizenship")
  - Identity number
  - Front image (displayed inline, click to enlarge)
  - Back image (displayed inline, click to enlarge)
- Action buttons:
  - "Approve" (green) → confirmation dialog → `PATCH` with `{ action: 'approve' }`
  - "Reject" (red) → dialog with reason textarea → `PATCH` with `{ action: 'reject', rejection_reason }`
  - "Cancel" → back to list

### API Calls

| Action | Endpoint |
|--------|----------|
| Fetch pending list | `GET /api/municipality/kyc-pending` |
| Fetch citizen detail + images | `GET /api/municipality/kyc-pending/:citizenId` |
| Approve | `PATCH /api/municipality/kyc-pending/:citizenId` `{ action: 'approve' }` |
| Reject | `PATCH /api/municipality/kyc-pending/:citizenId` `{ action: 'reject', rejection_reason }` |

### States

| State | Behavior |
|-------|----------|
| Loading | Skeleton table |
| Empty | "No pending KYC applications" with illustration |
| Error | Error alert with retry button |
| Approving | Disable buttons, show spinner |
| Approve success | Toast, refresh list, remove item |
| Reject success | Toast, refresh list, remove item |
| Reject error | Show error, keep dialog open |

### Files

**New:** `src/pages/munic_head/KycReview.tsx`
**Modified:** `src/routes/AppRoutes.tsx` (add route), `src/config/navbar.config.tsx` (add nav item)
**Depends on:** `08-api-helpers`
