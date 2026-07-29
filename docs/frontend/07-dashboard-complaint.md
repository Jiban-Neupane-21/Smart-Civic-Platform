# Dashboard KYC Banner & Complaint Form Limits

## OLD (Current State)

**Dashboard** (`src/pages/citizen/Dashboard.tsx`):
- Shows total complaints, pending, resolved, notifications
- No KYC status display
- No welcome name + status header

**Complaint Form** (`src/pages/citizen/SubmitComplain.tsx`):
- Municipality selector (user picks manually from dropdown)
- Category/department selector
- No KYC limit check
- No auto-fill of citizen's registered ward/municipality

## NEW (Target State)

### Dashboard Changes

**Header section:**
```
Welcome, [Full Name] — [KYC Status Badge]
```

**KYC Banner** (shown below header based on status):

| kyc_status | Banner |
|---|---|
| `unverified` | Warning banner: "Complete your KYC to unlock full features. [Verify Now] → /citizen/profile" |
| `pending` | Info banner: "Your identity documents are under review. We'll notify you once verified." |
| `verified` | Green chip: "Verified Citizen ✅" (no banner) |
| `rejected` | Error banner: "Your KYC was rejected. Reason: [reason]. [Re-upload] → /citizen/profile" |

**Data source:** `GET /api/auth/me` → `citizen_details.kyc_status`

### Complaint Form Changes

**Auto-fill Municipality & Ward:**
- On mount, fetch citizen profile → get `current_municipality_id` + `current_ward_id`
- If address is set: pre-select municipality in dropdown, show read-only "Ward: [ward_no]"
- If no address: show info "Please set your address in Profile first" with link

**KYC Limit Enforcement:**
- Fetch `kyc_status` and pending complaint count
- If `kyc_status = 'unverified'`:
  - Show warning: "You have X of 3 pending complaints remaining"
  - If pending >= 3: disable submit button, show "Verify your identity to submit more" with link to profile
- If `kyc_status = 'verified'`:
  - No limit shown, full access

### Files

**Modified:** `src/pages/citizen/Dashboard.tsx`
**Modified:** `src/pages/citizen/SubmitComplain.tsx`
**Depends on:** `08-api-helpers`
