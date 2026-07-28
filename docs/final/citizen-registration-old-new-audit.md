# Citizen Registration & Verification — Old vs New Audit

> Based on `docs/PLAN-50-Phases-Citizen-Registration.md` (50 phases) and `supabase/Supabase_Schema.sql`.

---

## Critical Issues Summary

| # | Severity | Issue | Affected Component |
|---|----------|-------|--------------------|
| 1 | **Critical** | No OTP infrastructure — no `otp_codes` table types, no OTPService, no send/verify OTP endpoints | Entire auth module |
| 2 | **No Change** | Register endpoint stays email+password — no rewrite needed | `auth.routes.ts:42`, `auth.service.ts:12-63` |
| 3 | **Critical** | `CitizenRow` missing 14 structured address + KYC columns from schema | `database.type.ts:190-206` |
| 4 | **Critical** | No structured address endpoints (no `POST /api/citizen/address`) | Citizen routes |
| 5 | **Critical** | No KYC endpoints on municipality routes (no pending list, no approve/reject) | Municipality routes |
| 6 | **High** | No OTP-based login (`POST /api/auth/login-mobile`) | Auth routes |
| 7 | **High** | No identity document upload endpoint (`POST /api/citizen/identity`) | Citizen routes |
| 8 | **High** | No cascade address API (`GET /api/citizen/provinces`, `districts`, `municipalities`, `wards`) | Citizen routes |
| 9 | **High** | No KYC-based complaint submission gating | `citizen.service.ts:14-41` |
| 10 | **High** | No duplicate phone/identity detection checks | `auth.service.ts:12-63`, `citizen.service.ts` |
| 11 | **High** | No OTP validation schemas (`sendOtpSchema`, `verifyOtpSchema`) | `auth.validation.ts` |
| 12 | **High** | `getMe` returns flat text address, no `kyc_status` in citizen_details | `auth.controller.ts:59-69` |
| 13 | **Medium** | Frontend uses static data (`@data/lists/provinces`) instead of API-backed cascade | `CitizenRegister.tsx:20-21` |
| 14 | **Medium** | No identity-upload address schema/validation in `citizen.validation.ts` | `citizen.validation.ts` |
| 15 | **Medium** | No storage service for identity documents (`storage.service.ts`) | Missing file |
| 16 | **Medium** | No OTP cleanup cron job or cleanup logic | Missing file |
| 17 | **Medium** | No age validation constraint in citizens table | `database.type.ts` |
| 18 | **No Change** | Email stays required for register — no change needed | `auth.validation.ts:7` |
| 19 | **No Change** | `confirmPassword` stays — no change needed | `CitizenRegister.tsx:433-453` |
| 20 | **Low** | Profile update doesn't handle structured address fields | `citizen.service.ts:257-298` |

---

## Old Code vs New Target

### Issue 1: OTP Infrastructure Missing (Critical)

**Old (Current):** No `otp_codes` table in types, no `OTPService`, no `SmsService`, no send-otp/verify-otp endpoints.

**Affected files:**
- Missing: `src/service/otp.service.ts`
- Missing: `src/service/sms.service.ts`
- Missing: `src/config/sms.ts`

**New (Target):** `supabase/Supabase_Schema.sql:276-284` defines `otp_codes` table. PLAN-50 Phases 6-10 specify:
- `OTPService` with `generateOTP()`, `verifyOTP()`, `resendOTP()`, `cleanupExpiredOTPs()`
- SMS service with Nepal-compatible provider + console fallback

### Issue 2: Register Endpoint Email-First (No Change)

**Current:** `auth.routes.ts:42` — `POST /api/auth/register` with `email`+`password` required
- `auth.service.ts:12-63` — `registerService` creates auth user via `email`, accepts flat `full_address`/`current_address`
- `auth.validation.ts:3-17` — `registerSchema` requires `email`, `password`

**Decision:** Keep as-is. Register remains email+password based. No rewrite to phone-first flow.

### Issue 3: CitizenRow Missing Schema Columns (Critical)

**Old (Current):** `database.type.ts:190-206`:
```typescript
export interface CitizenRow {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  citizenship_id: string | null;
  gender: Gender | null;
  date_of_birth: string | null;
  profile_picture: string | null;
  current_address: string | null;
  permanent_address: string | null;
  ward_id: string | null;
  contact_number: string | null;
  notification_pref: NotificationPref;
  registered_at: string;
  updated_at: string;
}
```

**New (Target):** `Supabase_Schema.sql:233-271` adds:
- `permanent_province_id UUID`, `permanent_district_id UUID`, `permanent_municipality_id UUID`, `permanent_ward_id UUID`, `permanent_tole TEXT`
- `current_province_id UUID`, `current_district_id UUID`, `current_municipality_id UUID`, `current_ward_id UUID`, `current_tole TEXT`
- `identity_type TEXT`, `identity_number TEXT UNIQUE`, `identity_front_image_url TEXT`, `identity_back_image_url TEXT`
- `kyc_status kyc_status NOT NULL DEFAULT 'unverified'`
- `kyc_verified_by UUID`, `kyc_verified_at TIMESTAMPTZ`, `kyc_rejection_reason TEXT`

### Issue 4: No Structured Address Endpoints (Critical)

**Old (Current):** `citizen.routes.ts:240-244` — Only `PUT /api/citizen/profile` with flat text `current_address`/`permanent_address`. No structured address endpoint.

**New (Target):** PLAN-50 Phase 13: `POST /api/citizen/address` accepting:
```typescript
{
  permanent: { province_id, district_id, municipality_id, ward_id, tole },
  current: { province_id, district_id, municipality_id, ward_id, tole }
}
```

### Issue 5: No KYC Endpoints on Municipality Routes (Critical)

**Old (Current):** `municipality.routes.ts:1-83` — No KYC-related routes. No pending list, no approve/reject.

**New (Target):** PLAN-50 Phase 16:
- `GET /api/municipality/:mid/kyc-pending` — list pending KYC citizens
- `GET /api/municipality/:mid/kyc-pending/:citizenId` — detail with documents
- `PATCH /api/municipality/:mid/kyc-pending/:citizenId` — approve/reject

### Issue 6: No OTP-Based Login (High)

**Old (Current):** `auth.routes.ts:70` — Only `POST /api/auth/login` with `email`+`password`.

**New (Target):** PLAN-50 Phase 12: `POST /api/auth/login-mobile` — accept `{ phone, otp_code }`, verify OTP, return JWT.

### Issue 7: No Identity Document Upload (High)

**Old (Current):** `citizen.routes.ts:1-246` — No identity upload endpoint.

**New (Target):** PLAN-50 Phase 14: `POST /api/citizen/identity` — multipart upload with `identity_type`, `identity_number`, `front_image`, `back_image`.

### Issue 8: No Cascade Address API (High)

**Old (Current):** `citizen.routes.ts:27-49` — Only `GET /api/citizen/municipalities` and categories.

**New (Target):** PLAN-50 Phases 23-24:
- `GET /api/citizen/provinces` — public
- `GET /api/citizen/districts?province_id=` — public
- `GET /api/citizen/municipalities?district_id=` — public
- `GET /api/citizen/wards?municipality_id=` — public

### Issue 9: No KYC-Based Complaint Gating (High)

**Old (Current):** `citizen.service.ts:14-41` — `submitComplaint` has no KYC check. Any citizen can submit unlimited complaints.

**New (Target):** PLAN-50 Phase 18: Unverified citizens limited to 3 pending complaints. Check `kyc_status` before insert.

### Issue 10: No Duplicate Phone/Identity Detection (High)

**Old (Current):** `auth.service.ts:12-63` — No duplicate phone check before registration. `registerSchema` doesn't validate phone uniqueness.

**New (Target):** PLAN-50 Phase 15: Check `profiles.phone` before registration (unique constraint on DB). Check `citizens.identity_number` before identity upload.

### Issue 11: Missing OTP Validation Schemas (High)

**Old (Current):** `auth.validation.ts:1-71` — No OTP-related schemas.

**New (Target):** PLAN-50 Phase 43:
```typescript
sendOtpSchema = z.object({ phone: z.string().regex(/^98\d{8}$|^97\d{8}$/) })
verifyOtpSchema = z.object({ phone: z.string(), otp_code: z.string().length(6) })
addressSchema = z.object({ province_id, district_id, municipality_id, ward_id, ... })
identityUploadSchema = z.object({ identity_type, identity_number })
```

### Issue 12: getMe Missing kyc_status (High)

**Old (Current):** `auth.controller.ts:59-69` — Returns only: `first_name, middle_name, last_name, date_of_birth, gender, current_address, permanent_address, ward_id, notification_pref`. No `kyc_status`.

**New (Target):** PLAN-50 Phase 17: Include `kyc_status` in citizen_details response.

### Issue 13: Frontend Static Data Dependency (Medium)

**Old (Current):** `CitizenRegister.tsx:20-21`:
```typescript
import { PROVINCES } from "@data/lists/provinces";
import { MUNICIPALITIES_BY_DISTRICT } from "@data/lists/municipalities";
```
District data is flat string names (not UUIDs), municipality data comes from static JSON with name strings only.

**New (Target):** PLAN-50 Phase 25: Replace all static data imports with API calls to cascade endpoints.

### Issue 14: Missing identity/address Validation Schemas (Medium)

**Old (Current):** `citizen.validation.ts:1-26` — No `addressSchema`, no `identityUploadSchema`.

**New (Target):** PLAN-50 Phase 43: Add `addressSchema`, `identityUploadSchema` with proper UUID validation.

### Issue 15: No Storage Service (Medium)

**Old (Current):** Missing `src/service/storage.service.ts`.

**New (Target):** PLAN-50 Phase 44: Upload to `identity-documents` bucket with path `{userId}/{type}-{side}.{ext}`, validate file type/size, generate public/signed URLs.

### Issue 16: No OTP Cleanup Logic (Medium)

**Old (Current):** Missing — no cleanup of expired OTP codes.

**New (Target):** PLAN-50 Phase 10: Cron job or inline cleanup on new OTP generation for same phone.

### Issue 17: No Age Validation Constraint (Medium)

**Old (Current):** `database.type.ts` — `date_of_birth` has no minimum age check.

**New (Target):** `Supabase_Schema.sql:240` — `CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE - INTERVAL '16 years')`.

### Issue 18: Email Required in Register Validation (No Change)

**Current:** `auth.validation.ts:7` — `email: z.string().email("Invalid email address")` (required).

**Decision:** Keep as-is. Email stays required for registration.

### Issue 19: Frontend Has confirmPassword (No Change)

**Current:** `CitizenRegister.tsx:433-453` — `confirmPassword` field with password match check.

**Decision:** Keep as-is. `confirmPassword` stays in the frontend form.

### Issue 20: Profile Update No Structured Address (Low)

**Old (Current):** `citizen.service.ts:257-298` — `updateProfile` only handles flat `current_address`/`permanent_address` strings.

**New (Target):** Add structured address fields to update handler: `permanent_province_id`, `permanent_district_id`, `permanent_municipality_id`, `permanent_ward_id`, `permanent_tole`, `current_province_id`, etc.

---

## Target Implementation Summary

### New Files Required

| # | File | Purpose | PLAN Phase |
|---|------|---------|------------|
| 1 | `src/service/otp.service.ts` | OTP generation, verification, cleanup | 6 |
| 2 | `src/config/sms.ts` | SMS provider config (env vars) | 7 |
| 3 | `src/service/sms.service.ts` | SMS sending with Nepal provider + fallback | 7 |
| 4 | `src/service/storage.service.ts` | Identity document upload to Supabase storage | 44 |
| 5 | `supabase/migrations/add-structured-address.sql` | Add structured address columns to citizens | 1 |
| 6 | `supabase/migrations/add-identity-kyc-columns.sql` | Add KYC/identity columns to citizens | 2 |
| 7 | `supabase/migrations/add-otp-system.sql` | Create otp_codes table, add phone to profiles | 3 |
| 8 | `supabase/migrations/add-age-constraint.sql` | Age validation constraint | 4 |
| 9 | `supabase/migrations/add-identity-storage-bucket.sql` | Storage bucket for identity docs | 5 |
| 10 | `scripts/migrate-citizen-addresses.ts` | Migrate existing flat addresses to structured | 41 |
| 11 | `tests/citizen-otp.test.ts` | OTP unit tests | 46 |
| 12 | `tests/citizen-registration.test.ts` | Registration flow tests | 46 |
| 13 | `tests/citizen-kyc.test.ts` | KYC workflow tests | 47 |
| 14 | `tests/citizen-routing.test.ts` | Address/auto-routing tests | 48 |

### Existing Files to Modify

| # | File | Changes | PLAN Phase |
|---|------|---------|------------|
| 1 | `src/types/database.type.ts` | Add 14 fields to `CitizenRow`, add OTP types | 1-3 |
| 2 | `src/modules/auth/routes/auth.routes.ts` | Add `send-otp`, `verify-otp`, `login-mobile` | 8-9, 12 |
| 3 | `src/modules/auth/controller/auth.controller.ts` | Add OTP + mobile login handlers | 8-9, 12 |
| 4 | `src/modules/auth/services/auth.service.ts` | Add OTP verification service, support phone login | 6, 12, 42 |
| 5 | `src/validation/auth.validation.ts` | Add `sendOtpSchema`, `verifyOtpSchema` | 43 |
| 6 | `src/validation/citizen.validation.ts` | Add `addressSchema`, `identityUploadSchema` | 43 |
| 7 | `src/modules/citizen/routes/citizen.routes.ts` | Add address, identity, cascade API, KYC-status routes | 13-14, 23-24 |
| 8 | `src/modules/citizen/controller/citizen.controller.ts` | Add handlers for address, identity, cascade endpoints | 13-14, 23-24 |
| 9 | `src/modules/citizen/services/citizen.service.ts` | Add address save, identity upload, auto-routing, KYC gating | 13-15, 18, 21-22 |
| 10 | `src/modules/municipality/routes/municipality.routes.ts` | Add KYC pending/approve/reject routes | 16 |
| 11 | `src/modules/municipality/controller/municipality.controller.ts` | Add KYC review handlers + SMS notification | 16, 19 |
| 12 | `src/modules/auth/controller/auth.controller.ts:59-69` | Include `kyc_status` in getMe response | 17 |
| 13 | `src/middleware/auditlogger.ts` | Add audit events for registration, KYC, OTP | 45 |
| 14 | `Smart_Civic_Platform_Frontend/src/pages/auth/CitizenRegister.tsx` | Rewrite: API-backed cascade dropdowns, optional KYC upload | 25, 28-29 |
| 15 | `Smart_Civic_Platform_Frontend/src/api/index.ts` | Add new API endpoints for OTP/login-mobile | 30 |
| 16 | `supabase/Supabase_Schema.sql` | Update if migrations are applied separately | 50 |

---

## Sprint Plan (4 Sprints)

### Sprint 1: Database & OTP Backend (Phases 1-10, 12)
- Phase 1: Add structured address columns migration + types
- Phase 2: Add KYC/identity columns migration + types
- Phase 3: Create `otp_codes` table, add `phone` to profiles
- Phase 4: Add age validation constraint
- Phase 5: Create `identity-documents` storage bucket
- Phase 6: Create `OTPService` (generate, verify, resend, cleanup)
- Phase 7: Create SMS service with Nepal provider + console fallback
- Phase 8: Add `POST /api/auth/send-otp` endpoint
- Phase 9: Add `POST /api/auth/verify-otp` endpoint
- Phase 10: Add OTP cleanup logic
- Phase 12: Add `POST /api/auth/login-mobile` (OTP-based, keep email+password register)

### Sprint 2: Address, Identity & KYC Backend (Phases 13-20)
- Phase 13: Add `POST /api/citizen/address` structured endpoint
- Phase 14: Add `POST /api/citizen/identity` document upload
- Phase 15: Add duplicate detection for phone + identity_number
- Phase 16: Add KYC admin endpoints on municipality routes
- Phase 17: Include `kyc_status` in `GET /api/auth/me`
- Phase 18: Add KYC-based complaint gating (max 3 pending for unverified)
- Phase 19: Add SMS notification on KYC status change
- Phase 20: Add KYC audit trail logging

### Sprint 3: Auto-Routing, Validation & Storage (Phases 21-25, 41-45)
- Phase 21: Ward-based auto-route on complaint submit
- Phase 22: Add `getMunicipalityFromWard`, `getDepartmentForCategory` helpers
- Phase 23: Add ward selector API
- Phase 24: Add province/district/municipality cascade API (public)
- Phase 25: *(Frontend)* Replace static data with API calls
- Phase 41: Migration script for existing flat addresses
- Phase 42: Fix auth service for phone-based login
- Phase 43: Add all Zod validation schemas
- Phase 44: Create storage service for identity documents
- Phase 45: Add audit logging for registration & KYC

### Sprint 4: Frontend Rewrite, Testing & Docs (Phases 26-40, 46-50)
- Phase 26: Update `CitizenRegister.tsx` — API-backed cascade dropdowns, KYC upload step
- Phase 27: Add OTP input UI for mobile login (60s cooldown, 6-digit input)
- Phase 28: Add cascading address selection (API-backed)
- Phase 29: Add KYC document upload UI (optional registration step)
- Phase 30: Add auth API helpers for new OTP endpoints
- Phase 31-35: Citizen profile, KYC section, review page, mobile login
- Phase 36-40: Dashboard updates, KYC status, auto-fill, notifications
- Phase 46-48: Backend tests (OTP, registration, KYC, routing)
- Phase 49: Frontend tests (CitizenRegister component)
- Phase 50: Documentation, cleanup, update AGENT.md/CLAUDE.md

---

## Summary of Changes

| Metric | Current | Target |
|--------|---------|--------|
| Auth endpoints | 6 (register, login, refresh, logout, me, forgot-password, change-password) | 9 (+ send-otp, verify-otp, login-mobile) |
| Citizen endpoints | 8 (municipalities, categories, dashboard, complaints CRUD, feedback, profile) | 15 (+ address, identity, provinces, districts, wards, KYC-status) |
| Municipality endpoints | ~20 dept/staff/complaint | ~23 (+ 3 KYC routes) |
| CitizenRow fields | 16 | 30 (+14 structured address + KYC) |
| Types files | 1 (database.type.ts) | 1 (updated) |
| Service files | 2 (otp missing, sms missing, storage missing) | 5 (+ otp.service, sms.service, storage.service) |
| Validation schemas | 2 files, ~10 schemas | 2 files, ~16 schemas |
| Migration files | 0 for this module | 5 new SQL migrations |
| Frontend static data | Yes (provinces.ts, municipalities.ts) | No (API-backed cascade) |
| Frontend form updates | 1 form (static data, email+password, flat address) | API-backed cascade dropdowns + optional KYC step (register stays email+password) |
| KYC enforcement | None | Identity upload + KYC verification (with duplicate check) |
