# Profile Page — Structured Address, KYC Section, Notification Prefs

## OLD (Current State)

File: `src/pages/citizen/ProfilePage.tsx`

- Flat text address display (permanent + current) — no structured editing
- No KYC status badge or upload section
- No notification preference toggle
- Uses `fetchWithAuth` directly instead of `citizenApi`
- Address tab shows raw UUID truncated as "Ward: abc12345..."
- `CitizenDetails` interface defines flat fields only

## NEW (Target State)

### Tabs Layout (keep existing 3 tabs structure)

**Tab 1: About** — Keep existing fields. Add:
- KYC Status badge next to name header
- Notification preference selector (Email / SMS / Both / None)

**Tab 2: Address** — Replace flat text with editable cascade:
- Permanent Address: embed `LocationPicker`
- Current Address: embed `LocationPicker` + "Same as permanent" checkbox
- "Save Address" button → calls `POST /api/citizen/address`

**Tab 3: Activity** — Keep existing (recent complaints list)

### KYC Section (new area, either in About tab or its own tab)

**Status Badge** (show in profile header + KYC section):

| kyc_status | Display |
|---|---|
| `verified` | Green badge "Verified ✅" + verified date |
| `pending` | Yellow badge "Pending Review ⏳" + message |
| `unverified` | Gray badge "Unverified" + "Verify Now" button |
| `rejected` | Red badge "Rejected" + reason + "Re-upload" button |

**KYC Upload** (when unverified/rejected):
- Show previously uploaded identity type + number (if any)
- Embed `IdentityUpload` component
- On success: update status to pending, show confirmation

### Notification Preferences

| Option | Value sent to backend |
|--------|----------------------|
| Email Only | `notification_pref: 'email'` |
| SMS Only | `notification_pref: 'sms'` |
| Both | `notification_pref: 'both'` |
| None | `notification_pref: 'none'` |

### Data Loading

Replace direct `fetchWithAuth` calls with `citizenApi.getProfile()` and `authApi.getMe()`. The `GET /api/auth/me` response now includes all KYC + structured address fields in `citizen_details`.

### API Calls

| Action | Endpoint | Method |
|--------|----------|--------|
| Load profile | `GET /api/auth/me` | — |
| Update basic info | `PUT /api/citizen/profile` | Existing |
| Update address | `POST /api/citizen/address` | New |
| Update notification pref | `PUT /api/citizen/profile` | Existing |
| Upload KYC | `POST /api/citizen/identity` | New |

### Files

**Modified:** `src/pages/citizen/ProfilePage.tsx` (major rewrite of Address tab, add KYC + prefs)
**Depends on:** `08-api-helpers`, `02-location-picker`, `04-kyc-upload`
