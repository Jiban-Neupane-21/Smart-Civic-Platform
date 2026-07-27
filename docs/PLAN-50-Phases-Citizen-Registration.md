# Citizen Registration & Verification — 50-Phase Implementation Plan

## Vision Overview
**Three-Layer Verification Model:**

1. **Mobile OTP** — Verify phone is real, prevent bot registrations
2. **Identity (KYC)** — Document upload + verification for trust level
3. **Duplicate Protection** — Unique mobile + unique identity number

**Quick Registration First:** Name + Mobile + OTP + Password. KYC can be completed later from Profile or on first complaint.

```text
Citizen Registration Flow
        │
        ▼
[Basic Info: Name, Mobile, DOB, Gender]
        │
        ▼
[Mobile OTP Verification]
        │
        ▼
[Create Account + Structured Address]
        │
        ▼
[(Optional) Upload Identity Documents]
        │
        ▼
[KYC Verification by Municipality Staff]
        │
        ▼
[Verified Citizen → Auto-Routed Complaints]
```

---

## DOMAIN A — Database: Schema Changes for Citizen Registration (Phases 1–5)

### Phase 1: Add Structured Address Columns to `citizens` Table
- Current: `current_address TEXT`, `permanent_address TEXT` (flat strings)
- New columns:
  - `permanent_province_id UUID REFERENCES provinces(id)`
  - `permanent_district_id UUID REFERENCES districts(id)`
  - `permanent_municipality_id UUID REFERENCES municipalities(id)`
  - `permanent_ward_id UUID REFERENCES wards(id)`
  - `permanent_tole TEXT`
  - `current_province_id UUID REFERENCES provinces(id)`
  - `current_district_id UUID REFERENCES districts(id)`
  - `current_municipality_id UUID REFERENCES municipalities(id)`
  - `current_ward_id UUID NOT NULL REFERENCES wards(id)` — mandatory for routing
  - `current_tole TEXT`

Files:
- `supabase/migrations/add-structured-address.sql` (NEW)
- `Smart_Civic_Platform_Backend/src/types/database.type.ts`

### Phase 2: Add Identity Verification Columns to `citizens` Table
- `identity_type TEXT` — enum: citizenship | national_id | passport | driving_license | voter_id
- `identity_number TEXT UNIQUE` — unique document number
- `identity_front_image_url TEXT` — uploaded front image
- `identity_back_image_url TEXT` — uploaded back image
- `kyc_status TEXT NOT NULL DEFAULT 'unverified'` — enum: unverified | pending | verified | rejected
- `kyc_verified_by UUID REFERENCES profiles(id)` — who verified
- `kyc_verified_at TIMESTAMPTZ`
- `kyc_rejection_reason TEXT`

Files:
- `supabase/migrations/add-identity-kyc-columns.sql` (NEW)
- `Smart_Civic_Platform_Backend/src/types/database.type.ts`

### Phase 3: Add OTP Verification Infrastructure
- New table: `otp_codes`
  ```sql
  CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'registration', -- registration | login | reset_password
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX idx_otp_codes_phone ON otp_codes(phone, purpose, is_used);
  ```
- Add `phone TEXT UNIQUE NOT NULL` to `profiles` table — phone becomes primary identifier
- Add `email_optional` — make email nullable in profiles

Files:
- `supabase/migrations/add-otp-system.sql` (NEW)
- `Smart_Civic_Platform_Backend/src/types/database.type.ts`

### Phase 4: Add Date of Birth & Gender to Citizens
- Current: `date_of_birth DATE`, `gender gender` already exist in citizens table
- Verify they are present and correctly typed
- Add age validation constraint: `CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '16 years')` for minimum age
- Index on `identity_number` for duplicate detection

Files:
- `supabase/migrations/add-age-constraint.sql` (NEW)

### Phase 5: Add Storage Bucket for Identity Documents
- Create Supabase storage bucket: `identity-documents`
- Policies: citizen can upload own documents, municipality staff can read
- Add RLS policy for bucket access
- Max file size: 5MB per image
- Accepted formats: jpg, png, pdf

Files:
- `supabase/migrations/add-identity-storage-bucket.sql` (NEW)

---

## DOMAIN B — Backend: OTP Service & Verification (Phases 6–10)

### Phase 6: Create OTP Service
- New service: `OTPService`
- Methods:
  - `generateOTP(phone, purpose)` — generate 6-digit code, store in DB, return code (for dev) or send via SMS (for production)
  - `verifyOTP(phone, code, purpose)` — check code exists, not expired, not used → mark as used
  - `resendOTP(phone, purpose)` — invalidate old codes, generate new one
  - `cleanupExpiredOTPs()` — remove expired codes older than 24h

Files:
- `Smart_Civic_Platform_Backend/src/service/otp.service.ts` (NEW)

### Phase 7: Add SMS Service Integration
- Create SMS service interface
- Integrate with Nepal-compatible SMS provider (e.g., Sparrow SMS, NTC SMS)
- Methods:
  - `sendSMS(phone, message)` — send SMS
  - `sendOTP(phone, otpCode)` — send formatted OTP message
- Use environment variables for API keys
- Fallback: log OTP to console when SMS provider is not configured

Files:
- `Smart_Civic_Platform_Backend/src/config/sms.ts` (NEW)
- `Smart_Civic_Platform_Backend/src/service/sms.service.ts` (NEW)

### Phase 8: Add POST /api/auth/send-otp Endpoint
- Accept: `{ phone }`
- Validate: phone format (Nepal: 98XXXXXXXX or 97XXXXXXXX)
- Generate 6-digit OTP
- Store in `otp_codes` table
- Send via SMS (or console log for dev)
- Return: `{ success: true, message: "OTP sent" }` (never return the code in production)

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/routes/auth.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/auth/controller/auth.controller.ts`

### Phase 9: Add POST /api/auth/verify-otp Endpoint
- Accept: `{ phone, otp_code }`
- Verify against `otp_codes` table
- If valid: mark as used, return `{ verified: true, token (temp) }`
- If invalid/expired: return error with retry count
- Rate limit: max 5 attempts per phone per 15 minutes

Files:
- Same as Phase 8

### Phase 10: Add OTP Cleanup Cron Job
- Run every hour: delete OTP codes older than 24h
- Or clean up on each new OTP generation for the same phone
- Add to server startup or as a separate scheduled task

Files:
- `Smart_Civic_Platform_Backend/src/service/otp.service.ts`

---

## DOMAIN C — Backend: Registration Rewrite (Phases 11–15)

### Phase 11: Rewrite Register Endpoint — Mobile-First
- Current: `POST /api/auth/register` accepts email + password
- New flow:
  1. Accept: `{ phone, full_name, password, otp_code }`
  2. Verify OTP first (phone must be verified)
  3. Create auth user with `phone` as identifier (email optional)
  4. Create profile with `phone`, `role = 'citizen'`
  5. Create citizens row with basic fields
  6. Return: profile data + temp token (auto-login)

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/auth/controller/auth.controller.ts`
- `Smart_Civic_Platform_Backend/src/validation/auth.validation.ts`

### Phase 12: Add Login with Mobile/OTP
- Add: `POST /api/auth/login-mobile` — accept `{ phone, otp_code }`
- Send OTP to phone → user enters OTP → system verifies → returns JWT
- This replaces email+password for citizens (keep email login for staff/admin)
- Add: `POST /api/auth/login` still works with email for backward compatibility

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/routes/auth.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/auth/controller/auth.controller.ts`

### Phase 13: Add Structured Address Endpoint
- New endpoint: `POST /api/citizen/address` — set permanent + current address
- Accept: structured address object (province_id, district_id, municipality_id, ward_id, tole)
- Validate: ward_id belongs to municipality_id, municipality exists and is_active
- Store in citizens table structured columns
- Auto-maps citizen to municipality via `current_municipality_id`

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/routes/citizen.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/controller/citizen.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`

### Phase 14: Add Identity Document Upload Endpoint
- New endpoint: `POST /api/citizen/identity` — upload identity documents
- Accept multipart: `identity_type`, `identity_number`, `front_image`, `back_image`
- Upload images to Supabase storage
- Store URLs + identity info in citizens table
- Set `kyc_status = 'pending'` — triggers KYC review workflow

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/routes/citizen.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/controller/citizen.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`

### Phase 15: Add Duplicate Detection for Phone & Identity
- Before registration: check `profiles.phone` is unique
- Before identity upload: check `citizens.identity_number` is unique
- Return 409 Conflict with clear message on duplicate
- Add proper database unique constraints

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`

---

## DOMAIN D — Backend: KYC Verification Workflow (Phases 16–20)

### Phase 16: Create KYC Admin Endpoints (Municipality Staff)
- `GET /api/municipality/:mid/kyc-pending` — list citizens with `kyc_status = 'pending'`
- `GET /api/municipality/:mid/kyc-pending/:citizenId` — get citizen KYC details + document images
- `PATCH /api/municipality/:mid/kyc-pending/:citizenId` — approve/reject
  - Accept: `{ action: 'approve' | 'reject', rejection_reason? }`
  - Sets `kyc_status`, `kyc_verified_by`, `kyc_verified_at`
  - If approved: citizen gets full access

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/routes/municipality.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

### Phase 17: Add KYC Status to Citizen Profile Response
- `GET /api/auth/me` — include `kyc_status` in citizen_details response
- Frontend uses this to show verification badge
- Show: "Verified Citizen" vs "Unverified" vs "Pending Review"

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/controller/auth.controller.ts`

### Phase 18: Add KYC-Based Feature Gating
- Unverified citizens: limited complaint submission (max 3 pending complaints)
- Verified citizens: unlimited complaints
- Add check in complaint submission endpoint
- Return error if unverified citizen exceeds limit

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`

### Phase 19: Add KYC Notification
- When KYC status changes: send SMS notification to citizen
- "Your KYC has been approved. You now have full access."
- Or: "Your KYC has been rejected. Reason: [reason]. Please re-upload documents."
- Use SMS service from Phase 7

Files:
- `Smart_Civic_Platform_Backend/src/modules/municipality/controller/municipality.controller.ts`
- `Smart_Civic_Platform_Backend/src/config/sms.ts`

### Phase 20: Add KYC Audit Trail
- Log all KYC status changes in `audit_logs` table
- Track: who verified, when, previous status, new status, reason
- Endpoint for municipality to view KYC history per citizen

Files:
- `Smart_Civic_Platform_Backend/src/middleware/auditlogger.ts`
- `Smart_Civic_Platform_Backend/src/modules/municipality/repository/municipality.repository.ts`

---

## DOMAIN E — Backend: Ward-Based Auto-Routing (Phases 21–25)

### Phase 21: Add Auto-Route on Complaint Submit
- When citizen submits complaint, read `current_ward_id` from their profile
- Look up `wards.municipality_id` from the ward
- Check `complaint_categories` for `department_category` match
- Auto-set: `municipality_id`, `assigned_department_id` based on category
- If no matching department, set to municipality's general department

Files:
- `Smart_Civic-Platform_Backend/src/modules/citizen/services/citizen.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/controller/citizen.controller.ts`

### Phase 22: Add Municipality Detection from Ward
- New helper: `getMunicipalityFromWard(wardId)` — reads `wards.municipality_id`
- New helper: `getDepartmentForCategory(municipalityId, categoryId)` — finds matching dept
- Used in auto-routing logic

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`

### Phase 23: Add Ward Selector API
- `GET /api/citizen/wards?municipality_id=` — list wards for a municipality
- Used in frontend address dropdown cascade
- Returns: `[{ id, ward_no, ward_office_name }]`

Files:
- `Smart_Civic_Platform_Backend/src/modules/citizen/routes/citizen.routes.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/controller/citizen.controller.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`

### Phase 24: Add Province/District/Municipality Cascade API (Public)
- `GET /api/citizen/provinces` — list all provinces
- `GET /api/citizen/districts?province_id=` — list districts
- `GET /api/citizen/municipalities?district_id=` — list active municipalities
- Public endpoints (no auth required) for registration form

Files:
- Same as Phase 23

### Phase 25: Remove Static Data Dependency for Citizen Forms
- Frontend CitizenRegister.tsx currently uses `@data/lists/provinces`
- Replace all static data imports with API calls to new endpoints
- Ensure cascading dropdowns work with API data

Files:
- `Smart_Civic_Platform_Frontend/src/pages/auth/CitizenRegister.tsx`

---

## DOMAIN F — Frontend: CitizenRegister.tsx Rewrite (Phases 26–30)

### Phase 26: Rewrite Registration Form — Mobile-First Design
- Step 1: Enter Full Name + Mobile Number + Date of Birth + Gender
- Step 2: OTP Verification (enter 6-digit code)
- Step 3: Set Password
- Step 4: Address (Province → District → Municipality → Ward → Tole)
- Step 5: Success + Option to upload KYC documents
- Remove email as required field (make optional)
- Remove confirmPassword (single password field)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/auth/CitizenRegister.tsx`

### Phase 27: Add OTP Input UI
- Phone input with country code (+977 for Nepal)
- "Send OTP" button with 60-second cooldown timer
- 6-digit OTP input (6 individual boxes or single masked input)
- Auto-submit on all 6 digits entered
- "Resend OTP" option after 60 seconds

Files:
- `Smart_Civic_Platform_Frontend/src/pages/auth/CitizenRegister.tsx`
- `Smart_Civic_Platform_Frontend/src/components/OtpInput.tsx` (NEW)

### Phase 28: Add Cascading Address Selection (API-Backed)
- Replace static data imports with API calls
- Province dropdown → calls `GET /api/citizen/provinces`
- District dropdown → calls `GET /api/citizen/districts?province_id=`
- Municipality dropdown → calls `GET /api/citizen/municipalities?district_id=`
- Ward dropdown → calls `GET /api/citizen/wards?municipality_id=`
- "Same as permanent" checkbox for current address

Files:
- `Smart_Civic_Platform_Frontend/src/pages/auth/CitizenRegister.tsx`
- `Smart_Civic_Platform_Frontend/src/components/LocationPicker.tsx` (reuse from earlier plan)

### Phase 29: Add KYC Document Upload UI (Optional Step)
- Step after registration: "Would you like to verify your identity?"
- Identity type selector: Citizenship, National ID, Passport, Driving License, Voter ID
- Identity number input
- Front image upload (drag & drop or file picker)
- Back image upload
- Preview uploaded images
- "Skip for now" option → KYC later from profile

Files:
- `Smart_Civic_Platform_Frontend/src/pages/auth/CitizenRegister.tsx`
- `Smart_Civic_Platform_Frontend/src/components/IdentityUpload.tsx` (NEW)

### Phase 30: Add Auth API Helpers for New Flow
- `API_ENDPOINTS.AUTH.SEND_OTP`, `API_ENDPOINTS.AUTH.VERIFY_OTP`
- `API_ENDPOINTS.AUTH.REGISTER_MOBILE` (new register endpoint)
- `API_ENDPOINTS.AUTH.LOGIN_MOBILE` (OTP-based login)
- Update `fetchWithAuth` or add dedicated API functions

Files:
- `Smart_Civic_Platform_Frontend/src/api/index.ts`

---

## DOMAIN G — Frontend: Citizen Profile & KYC (Phases 31–35)

### Phase 31: Create Citizen Profile Page — Edit Address
- View/Edit structured address (province, district, municipality, ward, tole)
- Both permanent and current address
- Save via `PUT /api/citizen/profile`
- Use cascading dropdown selectors

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/ProfilePage.tsx` (rewrite)

### Phase 32: Add KYC Section in Profile
- Show current KYC status badge: Verified ✅, Pending ⏳, Unverified ➕
- If unverified: "Verify Your Identity" button → upload form
- If pending: "Your documents are under review" message
- If verified: green badge + verified date
- Upload form: identity type, number, front/back images

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/ProfilePage.tsx`

### Phase 33: Create KYC Review Page for Municipality Staff
- New page: `pages/munic_head/KycReview.tsx`
- List: pending KYC applications with citizen name, phone, date
- Click → detail view: identity document images, number, type
- Actions: Approve / Reject with reason
- Search by name, phone, identity number

Files:
- `Smart_Civic_Platform_Frontend/src/pages/munic_head/KycReview.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`
- `Smart_Civic_Platform_Frontend/src/config/navbar.config.tsx`

### Phase 34: Add Mobile Login Page
- New page: `pages/auth/MobileLogin.tsx`
- Enter phone number → Send OTP → Enter OTP → Auto-login
- Fallback: "Login with Email/Password" link for staff
- Auto-redirect to dashboard on success

Files:
- `Smart_Civic_Platform_Frontend/src/pages/auth/MobileLogin.tsx` (NEW)
- `Smart_Civic_Platform_Frontend/src/routes/AppRoutes.tsx`

### Phase 35: Update Login Page — Role-Based Redirect
- If user logs in with email → check role:
  - citizen → redirect to citizen dashboard
  - municipality_head → redirect to municipality dashboard
  - department_head → redirect to department dashboard
  - staff → redirect to staff dashboard
  - superadmin → redirect to superadmin dashboard
- Add phone/OTP option on login page

Files:
- `Smart_Civic_Platform_Frontend/src/pages/auth/Login.tsx`
- `Smart_Civic_Platform_Frontend/src/pages/auth/withRoleRedirect.tsx`

---

## DOMAIN H — Frontend: Citizen Dashboard Updates (Phases 36–40)

### Phase 36: Update Citizen Dashboard — Show KYC Status
- Dashboard header: "Welcome, [Name] — [KYC Status]"
- If unverified: banner "Complete your KYC to unlock full features"
- Show: total complaints, resolved, pending
- Show: current registered ward/municipality

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/Dashboard.tsx`

### Phase 37: Add KYC-Based Complaint Limits
- If unverified: show warning "You have X of 3 pending complaints remaining"
- If limit reached: disable submit button, prompt for KYC
- If verified: no limit shown
- Backend already enforces this (Phase 18)

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/SubmitComplain.tsx`

### Phase 38: Update Complaint Form — Auto-Fill Municipality & Ward
- Pre-fill: citizen's current municipality and ward from profile
- Show read-only: "Municipality: Kathmandu, Ward: 5"
- If no address set: prompt to set address first
- Category dropdown → auto-routes to correct department

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/SubmitComplain.tsx`

### Phase 39: Add Notification Preferences
- Citizen can set: SMS notifications, Email notifications, or both
- Toggle in Profile settings
- Save via `PUT /api/citizen/profile`
- Used for: complaint status changes, KYC updates, announcements

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/ProfilePage.tsx`

### Phase 40: Add Citizen Notification List
- Show notifications in dashboard
- Types: complaint update, KYC status change, announcement
- Click → navigate to relevant detail page
- Unread count badge

Files:
- `Smart_Civic_Platform_Frontend/src/pages/citizen/Notification.tsx`

---

## DOMAIN I — Backend: Fixes & Migration (Phases 41–45)

### Phase 41: Migrate Existing Citizens to Structured Address
- Script to parse existing `full_address` and `current_address` text fields
- Split by comma: "[Municipality], [District], [Province] - [Ward]"
- Match names to DB IDs for province, district, municipality
- Set `kyc_status = 'verified'` for existing citizens (grandfather)
- Report unmigratable records for manual review

Files:
- `supabase/migrations/migrate-existing-addresses.sql` (NEW)
- `scripts/migrate-citizen-addresses.ts` (NEW)

### Phase 42: Fix Auth Service — Support Phone-Based Login
- `loginService`: accept email OR phone
- If phone provided: look up profile by phone, get email, login with email
- Or: create dedicated `loginWithPhone` service that uses OTP
- Ensure JWT carries correct role + municipality_id

Files:
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts`

### Phase 43: Update Zod Validation Schemas
- New schema: `registerMobileSchema` — phone (required), full_name, password, otp_code
- New schema: `sendOtpSchema` — phone (required, Nepal format)
- New schema: `verifyOtpSchema` — phone, otp_code
- New schema: `identityUploadSchema` — identity_type, identity_number
- New schema: `addressSchema` — province_id, district_id, municipality_id, ward_id

Files:
- `Smart_Civic_Platform_Backend/src/validation/auth.validation.ts`
- `Smart_Civic_Platform_Backend/src/validation/citizen.validation.ts`

### Phase 44: Add Document Storage Helper
- Upload to Supabase storage with path: `identity-documents/{userId}/{type}-{side}.{ext}`
- Validate file type (jpg, png, pdf) and size (max 5MB)
- Generate public URL or signed URL for access
- Delete old documents on re-upload

Files:
- `Smart_Civic_Platform_Backend/src/service/storage.service.ts` (NEW)

### Phase 45: Add Audit Logging for Registration & KYC
- Log: CITIZEN_REGISTERED, CITIZEN_ADDRESS_SET
- Log: IDENTITY_UPLOADED, KYC_APPROVED, KYC_REJECTED
- Log: OTP_SENT, OTP_VERIFIED, OTP_FAILED
- Track IP address and device info for fraud detection

Files:
- `Smart_Civic_Platform_Backend/src/middleware/auditlogger.ts`
- `Smart_Civic_Platform_Backend/src/modules/auth/services/auth.service.ts`
- `Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`

---

## DOMAIN J — Testing, Documentation & Deployment (Phases 46–50)

### Phase 46: Backend Tests — OTP & Registration
- Test: Send OTP → code stored in DB
- Test: Verify OTP with correct code → success
- Test: Verify OTP with wrong code → error
- Test: Verify OTP with expired code → error
- Test: Register with verified OTP → account created
- Test: Register with unverified OTP → error
- Test: Duplicate phone registration → 409

Files:
- `Smart_Civic_Platform_Backend/tests/citizen-otp.test.ts` (NEW)
- `Smart_Civic_Platform_Backend/tests/citizen-registration.test.ts` (NEW)

### Phase 47: Backend Tests — KYC & Identity
- Test: Upload identity documents → stored in storage + DB
- Test: KYC approve → status changes to verified
- Test: KYC reject → status changes to rejected with reason
- Test: Unverified citizen complaint limit (max 3) → 4th fails
- Test: Verified citizen complaint → no limit
- Test: Duplicate identity number → 409

Files:
- `Smart_Civic_Platform_Backend/tests/citizen-kyc.test.ts` (NEW)

### Phase 48: Backend Tests — Address & Auto-Routing
- Test: Set structured address → stored correctly
- Test: Submit complaint → auto-routes to correct municipality
- Test: Submit complaint → auto-routes to correct department based on category
- Test: Ward selector returns correct wards for municipality

Files:
- `Smart_Civic_Platform_Backend/tests/citizen-routing.test.ts` (NEW)

### Phase 49: Frontend Tests — CitizenRegister.tsx
- Component tests:
  - Step 1: renders name + phone + DOB + gender fields
  - Step 2: OTP input with 6-digit entry
  - Step 3: password entry
  - Step 4: cascading address dropdowns
  - Step 5: KYC upload option / skip
  - Full flow: complete registration
  - Validation: empty fields, invalid phone, OTP mismatch

Files:
- `Smart_Civic_Platform_Frontend/src/__tests__/CitizenRegister.test.tsx` (NEW)

### Phase 50: Documentation & Cleanup
- Create `docs/citizen-registration-flow.md` documenting:
  - Three-layer verification (OTP → Identity → Duplicate check)
  - Quick registration vs full KYC
  - Ward-based auto-routing
  - KYC review workflow for municipality staff
- Remove old static data dependencies
- Update `AGENT.md` and `CLAUDE.md`
- Update `Supabase_Schema.sql` with all new columns

Files:
- `Smart_Civic_Platform/docs/citizen-registration-flow.md` (NEW)
- `Smart_Civic_Platform/AGENT.md`
- `Smart_Civic_Platform_Backend/CLAUDE.md`
- `Supabase_Schema.sql`

---

## Summary: 10 Domains × 5 Phases = 50 Phases

| Domain | Phases | Focus |
|--------|--------|-------|
| **A** | 1–5 | Database: Schema Changes (structured address, KYC, OTP, storage) |
| **B** | 6–10 | Backend: OTP Service & Verification (generate, verify, SMS) |
| **C** | 11–15 | Backend: Registration Rewrite (mobile-first, address, identity) |
| **D** | 16–20 | Backend: KYC Workflow (review, gating, notifications, audit) |
| **E** | 21–25 | Backend: Ward-Based Auto-Routing (complaint routing cascade) |
| **F** | 26–30 | Frontend: CitizenRegister.tsx Rewrite (mobile OTP, cascading, KYC) |
| **G** | 31–35 | Frontend: Citizen Profile & KYC (profile edit, review page, mobile login) |
| **H** | 36–40 | Frontend: Citizen Dashboard Updates (KYC status, limits, routing) |
| **I** | 41–45 | Backend Fixes & Migration (legacy data, auth, validation, storage) |
| **J** | 46–50 | Testing, Documentation & Deployment |

---

## Key Architecture Changes

### Current State
```
Registration: Email + Password + Flat text address
Login: Email + Password
No OTP, no KYC, no identity verification
Static data files for province/district/municipality dropdowns
```

### New State
```
Registration: Phone + OTP → Name + Password → Structured Address → (Optional) KYC
Login: Phone + OTP  OR  Email + Password
OTP verification required for account creation
Identity upload for KYC: type, number, front/back images
KYC status: unverified → pending → verified/rejected
Ward-based auto-routing for complaints
API-backed cascading dropdowns (no static data)
```

### New DB Schema Additions
```
citizens (enhanced)
├── permanent_province_id UUID
├── permanent_district_id UUID
├── permanent_municipality_id UUID
├── permanent_ward_id UUID
├── permanent_tole TEXT
├── current_province_id UUID
├── current_district_id UUID
├── current_municipality_id UUID
├── current_ward_id UUID NOT NULL  ← mandatory
├── current_tole TEXT
├── identity_type TEXT
├── identity_number TEXT UNIQUE
├── identity_front_image_url TEXT
├── identity_back_image_url TEXT
├── kyc_status TEXT NOT NULL DEFAULT 'unverified'
├── kyc_verified_by UUID
├── kyc_verified_at TIMESTAMPTZ
├── kyc_rejection_reason TEXT

otp_codes (NEW)
├── phone TEXT NOT NULL
├── otp_code TEXT NOT NULL
├── purpose TEXT NOT NULL
├── is_used BOOLEAN
├── expires_at TIMESTAMPTZ

profiles (modified)
├── phone TEXT UNIQUE NOT NULL  ← now required
├── email TEXT  ← now optional
```

### Verification Flow
```
Tier 1: Mobile OTP ─── Instant, during registration
    ↓
Tier 2: Identity KYC ─── Optional at registration, can be done later
    ↓
Tier 3: Duplicate check ─── Enforced on phone + identity_number
```
