# Frontend Implementation Plan — Overview

Backend is fully implemented. Frontend needs to catch up.

## Key Decision: Registration with Email+Password (No OTP)

The signup flow stays email+password (not OTP-based). OTP features are **optional** for login only.

## Feature Files

| File | Area | Priority | Effort |
|------|------|----------|--------|
| `01-registration-wizard.md` | Multi-step registration (email+password, DOB, gender, structured address, optional KYC) | High | Large |
| `02-location-picker.md` | Reusable API-backed cascade address component | High | Medium |
| `03-profile-page.md` | Structured address editing, KYC section, notification prefs | High | Medium |
| `04-kyc-upload.md` | Identity document upload component | High | Medium |
| `05-kyc-review.md` | Municipality staff KYC review page | High | Large |
| `06-login-redirect.md` | Role-based redirect, optional mobile login | High | Medium |
| `07-dashboard-complaint.md` | Dashboard KYC banner, complaint form limits & auto-fill | Medium | Medium |
| `08-api-helpers.md` | API endpoint helpers, types, client updates | Critical | Small |
| `09-validation.md` | Updated validation schemas | High | Small |

## Dependency Order

```
08-api-helpers (prerequisite)
  → 02-location-picker + 04-kyc-upload (components)
    → 01-registration-wizard + 03-profile-page + 05-kyc-review
      → 06-login-redirect + 07-dashboard-complaint + 09-validation
```

## File Inventory Summary

| | Count |
|---|---|
| New components | 3 (`LocationPicker`, `IdentityUpload`, `KycReview` page) |
| New pages | 1 (`MobileLogin` — optional) |
| Rewritten pages | 2 (`CitizenRegister`, `ProfilePage`) |
| Modified pages | 3 (`Login`, `Dashboard`, `SubmitComplain`) |
| Modified config | 2 (`api/index.ts`, `api/types/*`, `validation/`, `routes/`) |
