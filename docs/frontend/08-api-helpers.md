# API Helpers & Types — Prerequisite Phase

## OLD (Current State)

**`src/api/index.ts`** — Has `API_ENDPOINTS` with AUTH (REGISTER, LOGIN, ME, etc.) and other modules. Missing:
- No endpoints for address/identity/provinces/districts/municipalities/wards on citizen module
- `citizen.api.ts` only has `getProfile()`, `updateProfile()`, `getMyComplaints()`
- No `sendOtp`, `verifyOtp`, `loginMobile` endpoint URLs in `API_ENDPOINTS`

**`src/api/types/auth.types.ts`** — Types exist for OTP (`SendOtpRequest`, `VerifyOtpRequest`, `MobileLoginRequest`) but not used. `RegisterRequest` has `email` required, `phoneNumber` optional — correct for email+password flow.

**`src/api/types/citizen.types.ts`** — `CitizenDetails` uses flat fields: `citizenshipNo`, `homeAddress`, `permanentAddress`, `wardNumber`. Missing all new structured fields.

## NEW (Required Changes)

### 1. Add endpoint URLs to `API_ENDPOINTS`

```typescript
// In API_ENDPOINTS.AUTH:
SEND_OTP: `${BASE_URL}/auth/send-otp`,
VERIFY_OTP: `${BASE_URL}/auth/verify-otp`,
LOGIN_MOBILE: `${BASE_URL}/auth/login-mobile`,

// New section:
CITIZEN: {
  PROFILE: `${BASE_URL}/citizen/profile`,
  ADDRESS: `${BASE_URL}/citizen/address`,
  IDENTITY: `${BASE_URL}/citizen/identity`,
  PROVINCES: `${BASE_URL}/citizen/provinces`,
  DISTRICTS: `${BASE_URL}/citizen/districts`,
  MUNICIPALITIES: `${BASE_URL}/citizen/municipalities`,
  WARDS: `${BASE_URL}/citizen/wards`,
  DASHBOARD: `${BASE_URL}/citizen/dashboard`,
},
```

### 2. Update `citizen.api.ts` — Add methods

```typescript
// New methods to add:
getProvinces: async () => ApiResponse<Province[]>
getDistricts: async (provinceId: string) => ApiResponse<District[]>
getMunicipalities: async (districtId: string) => ApiResponse<Municipality[]>
getWards: async (municipalityId: string) => ApiResponse<Ward[]>
updateAddress: async (data: AddressPayload) => ApiResponse<void>
uploadIdentity: async (data: IdentityPayload) => ApiResponse<void>
```

### 3. Update `citizen.types.ts` — New types

```typescript
// Structured address types
interface Province { id: string; name: string; }
interface District { id: string; name: string; }
interface Municipality { id: string; official_name: string; type: string; }
interface Ward { id: string; ward_no: number; ward_office_name?: string; }

// Address payload
interface AddressPayload {
  permanent: {
    province_id: string;
    district_id: string;
    municipality_id: string;
    ward_id: string;
    tole?: string;
  };
  current: {
    province_id: string;
    district_id: string;
    municipality_id: string;
    ward_id: string;
    tole?: string;
  };
}

// Identity payload
interface IdentityPayload {
  identity_type: 'citizenship' | 'national_id' | 'passport' | 'driving_license' | 'voter_id';
  identity_number: string;
  front_image: string; // base64 or File
  back_image: string;  // base64 or File
}

// Extended citizen details
interface CitizenDetails {
  // ...existing fields...
  kyc_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  kyc_verified_at?: string;
  kyc_rejection_reason?: string;
  identity_type?: string;
  identity_number?: string;
  identity_front_image_url?: string;
  identity_back_image_url?: string;
  permanent_province_id?: string;
  permanent_district_id?: string;
  permanent_municipality_id?: string;
  permanent_ward_id?: string;
  permanent_tole?: string;
  current_province_id?: string;
  current_district_id?: string;
  current_municipality_id?: string;
  current_ward_id?: string;
  current_tole?: string;
}
```

**Files to modify:**
- `src/api/index.ts`
- `src/api/modules/citizen.api.ts`
- `src/api/types/citizen.types.ts`
- `src/api/types/auth.types.ts` (minor — ensure `RegisterRequest.email` stays required)
