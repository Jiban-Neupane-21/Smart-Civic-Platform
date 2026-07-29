# Citizen Registration — Frontend OLD → NEW Transition Plan

## Context: Backend Complete

All 50 backend phases are implemented:
- **Auth**: OTP send/verify, register (mobile-first), login (email + passwordless mobile), refresh, logout, change/forgot password
- **Address**: 4-tier structured (province → district → municipality → ward + tole) with cascade reference endpoints
- **KYC**: Identity upload (type + number + front/back images), municipality review (approve/reject), SMS notification
- **Auto-Routing**: Ward-based complaint routing with SLA, collaboration, escalation
- **Storage**: Supabase bucket `identity-documents` for KYC and complaint media

---

## Comparison: OLD Frontend vs NEW Frontend Requirements

| Area | OLD (Current State) | NEW (Required) | Backend Ready? |
|---|---|---|---|
| **Auth API helpers** | Only `REGISTER`, `LOGIN`, `ME` endpoints | Add `SEND_OTP`, `VERIFY_OTP`, `LOGIN_MOBILE`, `REGISTER_MOBILE`, address & identity endpoints | ✅ Done — api endpoints and types exist |
| **Registration flow** | Single flat form: email + password + confirmPassword + flat address | 5-step wizard: (1) Name + Phone + DOB + Gender, (2) OTP input, (3) Password, (4) Structured address, (5) Success + optional KYC | ✅ Done |
| **OTP input** | None | Phone input (+977), "Send OTP" with 60s cooldown, 6-digit box input, auto-submit, resend | ✅ Done |
| **Address selection** | Static data from `@data/lists/provinces` + `@data/lists/municipalities` → flat text | API-backed cascade: provinces → districts → municipalities → wards (no static data) | ✅ Done |
| **Email requirement** | Required, used as primary identifier | Optional — phone is primary; email nullable | ✅ Done |
| **Confirm password** | Required field | Removed — single password field | ✅ Done |
| **Date of Birth** | Not collected on register | Required field with age validation (16+) | ✅ Done |
| **KYC upload** | None | Optional step: identity type selector, number input, front/back image upload + preview, "Skip" option | ✅ Done |
| **Login page** | Email + Password only | Add "Login with Mobile OTP" tab/option; role-based redirect | ✅ Done |
| **Mobile login page** | None | New page: phone → OTP → auto-login | ✅ Done |
| **Profile — address** | Flat text (permanent_address, current_address) | Structured editing with cascade dropdowns for both permanent & current; "same as permanent" checkbox | ✅ Done |
| **Profile — KYC** | None | KYC status badge (verified/pending/unverified); upload section if unverified; pending/rejected messages | ✅ Done |
| **Profile — notification prefs** | Stored but not configurable via UI | Toggle SMS/Email/Both | ✅ Done |
| **Dashboard — KYC status** | None | "Welcome, [Name] — [KYC Status]" header; banner if unverified "Complete KYC to unlock" | ✅ Done |
| **Dashboard — complaint limits** | None | Warning "X of 3 remaining" if unverified; disable submit if limit hit | ✅ Done |
| **Complaint form — auto-fill** | User picks municipality manually | Pre-fill municipality + ward from profile (read-only); prompt if address not set | ✅ Done |
| **KYC review page** | None | New page for munic_head: pending list → detail view → approve/reject | ✅ Done |
| **Notifications list** | None | Notification types: complaint update, KYC status, announcements; unread badge | ✅ Done |

---

## Implementation Phases — Frontend Only (17 Phases)

### Phase F1: Update API Helpers & Types
- Add `API_ENDPOINTS.AUTH.SEND_OTP`, `VERIFY_OTP`, `REGISTER_MOBILE`, `LOGIN_MOBILE`
- Add `API_ENDPOINTS.CITIZEN.ADDRESS`, `CITIZEN.IDENTITY`, `CITIZEN.PROVINCES`, `CITIZEN.DISTRICTS`, `CITIZEN.MUNICIPALITIES`, `CITIZEN.WARDS`
- Import aliases for `@data/lists/provinces` and `@data/lists/municipalities` → remove or deprecate static data
- Update `RegisterRequest` type: phone required, email optional, no confirmPassword
- Add `AuthResponseData` mapping (backend returns `{ user, tokens }`, frontend uses `access_token`)

### Phase F2: Create OTP Input Component
- New: `src/components/OtpInput.tsx`
- Phone field with `+977` prefix (readonly or selectable)
- "Send OTP" button with 60-second cooldown countdown
- 6-digit OTP input (6 individual `<input>` boxes)
- Auto-submit on 6 digits entered
- "Resend OTP" link after timer expires
- Loading, error, and success states per step

### Phase F3: Create Location Picker Component
- New: `src/components/LocationPicker.tsx`
- Props: `value`, `onChange`, `disabled`, `label` (permanent/current)
- Province dropdown → fetch `GET /api/citizen/provinces`
- District dropdown → fetch `GET /api/citizen/districts?province_id=`
- Municipality dropdown → fetch `GET /api/citizen/municipalities?district_id=`
- Ward dropdown → fetch `GET /api/citizen/wards?municipality_id=`
- Tole text field
- Handle cascade reset when parent changes
- "Same as permanent" checkbox for current address (moved to parent)

### Phase F4: Create Identity Upload Component
- New: `src/components/IdentityUpload.tsx`
- Identity type selector (dropdown or card select): citizenship, national_id, passport, driving_license, voter_id
- Identity number input
- Front image upload: file picker → preview thumbnail → clear button
- Back image upload: same pattern
- File restrictions: jpg/png/pdf, max 5MB per image
- "Skip for now" button → navigates away without uploading
- Submit → calls `POST /api/citizen/identity`

### Phase F5: Rewrite CitizenRegister.tsx — Multi-Step Wizard
**Layout**: Stepper (MUI Stepper) at top, content below, Back/Next buttons at bottom

**Step 1 — Basic Info**:
- Full Name (required), Phone (+977, required), DOB (date picker, min age 16), Gender (select)
- On phone blur → format as Nepali mobile (98XXXXXXXX or 97XXXXXXXX)

**Step 2 — OTP Verification**:
- Show masked phone (`+977-98XXXXXX12`)
- Embed OtpInput component
- On successful verify → advance to Step 3
- On error → show error, allow resend

**Step 3 — Set Password**:
- Single password field (no confirm)
- Strength indicator
- Password requirements text

**Step 4 — Address**:
- Embed LocationPicker for permanent address
- "Same as permanent" checkbox for current address
- If unchecked → show second LocationPicker for current address
- Tole fields for both

**Step 5 — Success + Optional KYC**:
- Success message with account info
- "Verify Your Identity" button → show IdentityUpload inline
- "Skip for now" → go to citizen dashboard

**Submission logic**:
- On Step 2 OTP success → store temp token in state
- On final submit → call `POST /api/auth/register` with `{ phone, full_name, password, otp_code, date_of_birth, gender }`
- Then call `POST /api/citizen/address` with structured address payload
- Then optionally call `POST /api/citizen/identity`
- Set JWT + profile in auth context
- Redirect to `/citizen/dashboard`

### Phase F6: Create Mobile Login Page
- New: `src/pages/auth/MobileLogin.tsx`
- Enter phone → "Send OTP" → Enter OTP → auto-login
- Calls `POST /api/auth/send-otp` → then `POST /api/auth/login-mobile`
- On success: store tokens + profile, redirect based on role
- Fallback link: "Login with Email/Password"

### Phase F7: Update Login.tsx — Add OTP Tab + Role Redirect
- Add tab or toggle: "Email Login" | "Mobile OTP Login"
- Email tab: existing form
- Mobile tab: phone + OTP input (reuse OtpInput)
- On login → read `user.role` from response → redirect:
  - citizen → `/citizen/dashboard`
  - municipality_head → `/municipality_head/dashboard`
  - department_head → `/department_head/dashboard`
  - staff → `/staff/dashboard`
  - superadmin → `/superadmin/dashboard`

### Phase F8: Update AppRoutes.tsx
- Add route: `/login/mobile` → `<MobileLogin />`
- Add route: `/municipality_head/kyc-review` → `<KycReview />` (protected, municipality_head)
- Ensure register route still works

### Phase F9: Update ProfilePage.tsx — Structured Address Tab
- Replace "Address" tab flat text with editable cascade dropdowns
- Use LocationPicker for permanent address
- "Same as permanent" checkbox for current
- Save button calls `POST /api/citizen/address`
- Load current structured address from `GET /api/auth/me` → `citizen_details.permanent_province_id` etc.

### Phase F10: Update ProfilePage.tsx — Add KYC Section
- New tab or section: "Identity Verification"
- Fetch KYC status from `GET /api/auth/me` → `citizen_details.kyc_status`
- Display status badge:
  - `verified` → green checkmark + verified date
  - `pending` → yellow clock + "Under review" message
  - `unverified` → gray + "Verify Now" button
  - `rejected` → red + rejection reason + "Re-upload" button
- Upload form: embed IdentityUpload component
- Show already-uploaded identity type + number + image previews if present

### Phase F11: Update ProfilePage.tsx — Notification Preferences
- Add notification preference toggle in "About" tab (or new tab)
- Radio/select: Email Only, SMS Only, Both, None
- Save to backend via `PUT /api/citizen/profile`

### Phase F12: Update Dashboard.tsx — KYC Banner
- Fetch KYC status from citizen_details
- Header shows: "Welcome, [Name]" + KYC badge
- If `kyc_status = 'unverified'`: show banner "Complete your KYC to unlock full features" with "Verify Now" button
- If `kyc_status = 'pending'`: show info banner "Your documents are under review"
- If `kyc_status = 'verified'`: green verified badge

### Phase F13: Update SubmitComplaint.tsx — KYC Limits + Auto-Fill
- Fetch citizen profile on mount to get `current_ward_id` + `current_municipality_id` + `kyc_status`
- If `kyc_status = 'unverified'`: show warning "You have X of 3 pending complaints remaining"
- If pending ≥ 3 and unverified: disable submit, prompt for KYC
- Pre-fill municipality selector with citizen's registered municipality (if available)
- Show read-only: "Municipality: [name], Ward: [ward_no]" if address set
- If no address set: prompt "Please set your address first" with link to profile

### Phase F14: Update Citizen Dashboard — Notifications List
- Add notifications section (or new page)
- Fetch from notification API
- Show types: complaint updates, KYC status changes, announcements
- Unread count badge on nav/dashboard
- Click → navigate to relevant detail

### Phase F15: Create KYC Review Page (Municipality Staff)
- New: `src/pages/munic_head/KycReview.tsx`
- Route: `/municipality_head/kyc-review`
- Protected for `municipality_head` role
- **List view**: table of pending KYC applications
  - Citizen name, phone, identity type, submitted date
  - Search/filter by name, phone, identity number
  - Click row → detail view
- **Detail view**:
  - Citizen info (name, phone, DOB, gender, address)
  - Identity document images (front + back) displayed inline
  - Identity type + number
  - Approve button → calls PATCH `/api/municipality/kyc-pending/:id` with `{ action: 'approve' }`
  - Reject button → opens dialog for reason → calls PATCH with `{ action: 'reject', rejection_reason }`
  - Success → refresh list, show toast

### Phase F16: Remove Static Data Dependencies
- Delete or archive `@data/lists/provinces` and `@data/lists/municipalities`
- Remove static data imports from `CitizenRegister.tsx`
- Remove path alias `@data/lists/*` from tsconfig/vite config if unused elsewhere

### Phase F17: Form Validation Schema Update
- Update `auth.schema.ts`:
  - `registerSchema` → phone required, email optional, remove confirmPassword, add DOB
  - Add `sendOtpSchema` → phone required (Nepal format)
  - Add `verifyOtpSchema` → phone + 6-digit code
  - Add `addressSchema` → province_id, district_id, municipality_id, ward_id (all UUID)
  - Add `identitySchema` → identity_type enum, identity_number, accept-terms

---

## Dependency Graph

```
Phase F1 (API helpers)
  ├── Phase F2 (OtpInput)
  ├── Phase F3 (LocationPicker)
  ├── Phase F4 (IdentityUpload)
  │
  ├── Phase F5 (CitizenRegister rewrite) — depends on F1, F2, F3, F4
  ├── Phase F6 (MobileLogin) — depends on F1, F2
  ├── Phase F7 (Login update) — depends on F1, F2
  ├── Phase F8 (Routes) — depends on F6, F15
  │
  ├── Phase F9 (Profile address) — depends on F1, F3
  ├── Phase F10 (Profile KYC) — depends on F1, F4
  ├── Phase F11 (Profile prefs) — depends on F1
  │
  ├── Phase F12 (Dashboard KYC) — depends on F1
  ├── Phase F13 (Complaint limits) — depends on F1
  ├── Phase F14 (Notifications) — depends on F1
  │
  ├── Phase F15 (KycReview page) — depends on F1
  ├── Phase F16 (Cleanup static data)
  └── Phase F17 (Validation schemas)
```

## Recommended Order

| Phase | Priority | Effort | Why this order |
|-------|----------|--------|----------------|
| F1 | Critical | Small | Prerequisite for everything |
| F2 | Critical | Medium | Needed by register + login |
| F3 | Critical | Medium | Needed by register + profile |
| F4 | Critical | Medium | Needed by register + profile |
| F5 | High | Large | Core feature, depends on F1-F4 |
| F17 | High | Small | Must be done alongside F5 |
| F7 | High | Medium | Login UX improvement |
| F6 | High | Medium | New auth method |
| F8 | High | Small | Wire up routes |
| F9 | High | Medium | Profile address editing |
| F10 | High | Medium | Profile KYC section |
| F15 | High | Large | Staff KYC workflow |
| F12 | Medium | Small | Dashboard polish |
| F13 | Medium | Medium | Complaint form polish |
| F11 | Medium | Small | Setting toggle |
| F14 | Medium | Medium | Notification UI |
| F16 | Low | Small | Cleanup after migration |

---

## File Inventory — All Changes

### New Files
| File | Phase |
|------|-------|
| `src/components/OtpInput.tsx` | F2 |
| `src/components/LocationPicker.tsx` | F3 |
| `src/components/IdentityUpload.tsx` | F4 |
| `src/pages/auth/MobileLogin.tsx` | F6 |
| `src/pages/munic_head/KycReview.tsx` | F15 |

### Modified Files
| File | Phase |
|------|-------|
| `src/api/index.ts` — add new endpoints | F1 |
| `src/api/types/auth.types.ts` — update types | F1 |
| `src/api/types/citizen.types.ts` — update types | F1 |
| `src/api/modules/auth.api.ts` — uses existing (minor if any) | F1 |
| `src/api/modules/citizen.api.ts` — add address/identity/provinces/districts/municipalities/wards methods | F1 |
| `src/pages/auth/CitizenRegister.tsx` — full rewrite | F5 |
| `src/validation/auth.schema.ts` — update schemas | F17 |
| `src/pages/auth/Login.tsx` — add OTP tab + role redirect | F7 |
| `src/routes/AppRoutes.tsx` — add mobile login + KYC review routes | F8 |
| `src/pages/citizen/ProfilePage.tsx` — structured address + KYC + prefs | F9, F10, F11 |
| `src/pages/citizen/Dashboard.tsx` — KYC banner | F12 |
| `src/pages/citizen/SubmitComplain.tsx` — limits + auto-fill | F13 |
| `src/pages/citizen/Notification.tsx` — notification list | F14 |
| `src/components/LocationPickerMap.tsx` — minor if any | — |
| `src/config/navbar.config.tsx` — add KYC review nav item | F15 |

### Removed Files
| File | Phase |
|------|-------|
| `src/data/lists/provinces` (if exists) | F16 |
| `src/data/lists/municipalities` (if exists) | F16 |

---

## Key Backend API Contracts (Reference)

### Registration (Mobile-First)
```
POST /api/auth/register
Body: { phone, full_name, password, otp_code, date_of_birth?, gender? }
Response: { success, data: { user, tokens } }
```

### Structured Address
```
POST /api/citizen/address
Body: {
  permanent: { province_id, district_id, municipality_id, ward_id, tole },
  current: { province_id, district_id, municipality_id, ward_id, tole }
}
```

### Identity Upload
```
POST /api/citizen/identity
Body: { identity_type, identity_number, front_image (base64), back_image (base64) }
Note: If backend uses multipart, adjust to FormData
```

### Reference Data (Public)
```
GET /api/citizen/provinces                → [{ id, name }]
GET /api/citizen/districts?province_id=   → [{ id, name }]
GET /api/citizen/municipalities?district_id= → [{ id, official_name, type }]
GET /api/citizen/wards?municipality_id=   → [{ id, ward_no, ward_office_name }]
```

### Current User (KYC Status)
```
GET /api/auth/me → { data: { citizen_details: { kyc_status, kyc_verified_at, ... } } }
```

### KYC Review
```
GET  /api/municipality/kyc-pending          → list
GET  /api/municipality/kyc-pending/:id      → detail + images
PATCH /api/municipality/kyc-pending/:id     → { action: 'approve' | 'reject', rejection_reason? }
```
