# Onboarding & KYC API Testing Documentation

## Overview
This document outlines the testing and validation of the First Login Password Change, Profile Initialization (Onboarding Wizard), and KYC Document Upload APIs for internal roles (Municipality Heads, Department Heads, and Staff).

## Test Environment
- **Base URL:** `http://localhost:3000/api`
- **Roles:** `superadmin` (for provisioning), `municipality_head` (for testing onboarding)
- **Authentication:** JWT via Supabase Auth

## Tested Workflows

### 1. Forced Password Reset (First Login)
- **Logic:** When an admin provisions an account (e.g., via `/superadmin/users/create`), the user is given a temporary password and their `force_password_reset` flag is set to `true`.
- **Validation:** 
  - Logging in succeeds, but attempting to access protected routes like `GET /api/auth/me` is intercepted by the `forcePasswordReset` middleware.
  - The API correctly returns `403 Forbidden` with the code `FORCE_PASSWORD_RESET`.
  - The user successfully calls `PATCH /api/auth/change-password` (which bypasses the middleware) to set a new password.
  - Supabase Auth logs the user out of all other sessions automatically upon password change, so the client must re-login or use the new session.
  - After re-login, the `force_password_reset` flag is `false` and the middleware allows access.

### 2. Onboarding Wizard & KYC Update
Once the password reset is complete, the user must walk through the Onboarding wizard to activate their profile and submit KYC documents.

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/onboarding/status` | GET | 200 OK | Fetches current wizard progress (Step 1 to 4). Initializes a record in `onboarding_wizard_progress` if absent. |
| `/onboarding/step1` | POST | 200 OK | Marks Step 1 (MFA/Credentials) as complete. |
| `/onboarding/step2` | POST | 200 OK | Updates personal profile fields (`designation`, `alternate_phone`, `employee_id`) and advances to Step 3. |
| `/profile/identity` | PUT | 200 OK | Accepts a Base64 encoded string of an identity document, uploads it to Supabase Storage, and returns the public URL. *(Note: Used the `National ID.jpg` from the frontend public folder as a test payload.)* |
| `/onboarding/step3` | POST | 200 OK | Submits KYC details (`identity_type`, `identity_number`, `identity_document_url`). Updates the profile record and advances to Step 4. |
| `/onboarding/step4` | POST | 200 OK | Finalizes onboarding, marks `onboarding_wizard_completed` as `true`, and sets `account_status` to `active`. |

## Results
- The entire onboarding flow functioned flawlessly end-to-end.
- The KYC document was successfully converted from a local file, uploaded to the Supabase storage bucket, and recorded in the database profile.
- All database state transitions (from provisioned -> password reset -> onboarding -> active) were verified successfully.
