# Registration Form — Multi-Step Wizard (Email+Password)

## OLD (Current State)

File: `src/pages/auth/CitizenRegister.tsx`

- Single flat form with all fields visible
- Email **required** (primary identifier), phone **optional**
- Password + ConfirmPassword fields
- Static address data from `@data/lists/provinces` + `@data/lists/municipalities`
- Address stored as flat text: `"Municipality, District, Province - Ward"`
- No Date of Birth, no Gender
- Direct `fetch()` to `POST /api/auth/register` (old flat format)
- Success page says "check your inbox to verify"

## NEW (Target State)

**Keep:** Email required, password, phone optional, gender, acceptTerms, registrationCode
**Remove:** confirmPassword, static address imports
**Add:** DOB, structured address (API-backed), optional KYC step, progress stepper

### Multi-Step Layout

Use MUI Stepper with 4 steps:

```
Step 1: Personal Info  →  Step 2: Address  →  Step 3: Credentials  →  Step 4: Success + Optional KYC
```

### Step 1 — Personal Information

| Field | Type | Notes |
|-------|------|-------|
| Full Name | Text | Required, min 3 chars |
| Email | Email | Required, validated |
| Phone | Text | Optional, Nepal format if provided |
| Date of Birth | Date | Required, min age 16 (validate client-side: `<= current - 16 years`) |
| Gender | Select | male / female / other / prefer_not_to_say |

### Step 2 — Structured Address

- Embed `LocationPicker` component for Permanent Address
- "Same as permanent" checkbox for Current Address
- If unchecked → show second `LocationPicker` for Current Address
- Tole text fields for both

### Step 3 — Account Credentials

| Field | Type | Notes |
|-------|------|-------|
| Password | Password | Min 8 chars, uppercase + lowercase + number |
| Registration Code | Text | Optional municipality code |
| Accept Terms | Checkbox | Required |

### Step 4 — Success + Optional KYC

- Success message with account info
- "Verify Your Identity" button → show `IdentityUpload` inline
- "Skip for now" → redirect to `/citizen/dashboard`

### Submission Flow

1. **Step 3 Next** → call `POST /api/auth/register`
   ```json
   {
     "email": "...",
     "password": "...",
     "full_name": "...",
     "phone": "...",
     "date_of_birth": "...",
     "gender": "..."
   }
   ```
2. On success → store JWT + profile in auth context
3. **Then** call `POST /api/citizen/address` with structured address
4. **Then** if KYC was submitted → call `POST /api/citizen/identity`
5. Redirect to `/citizen/dashboard`

### Key Changes from Current Code

| Aspect | OLD | NEW |
|--------|-----|-----|
| Layout | Single scroll form | 4-step Stepper |
| Address source | Static `@data/lists/*` | API `GET /api/citizen/provinces` etc. |
| Address format | Flat text `"x, y, z - w"` | Structured UUID references |
| Password | Password + ConfirmPassword | Single password only |
| DOB | Not collected | Required with age validation |
| Email | Required, for verification | Required (still primary) |
| API call | Old flat payload | New structured registration + address + identity |
| KYC | Not available | Optional step 4 |
| HTTP client | Direct `fetch()` | Use `apiClient` from `src/api/client` |

### Files

**Modified:** `src/pages/auth/CitizenRegister.tsx` (full rewrite)
**Depends on:** `08-api-helpers`, `02-location-picker`, `04-kyc-upload`, `09-validation`
