# IdentityUpload Component — KYC Document Upload

## OLD (Current State)

Does not exist. No identity upload anywhere in the frontend.

## NEW (Target State)

### Component Interface

```typescript
// src/components/IdentityUpload.tsx
interface IdentityUploadProps {
  onSubmit: (data: IdentityPayload) => Promise<void>;
  onSkip?: () => void;
  initialValues?: Partial<IdentityPayload>; // for re-upload after rejection
  disabled?: boolean;
}
```

### Form Fields

| Field | Type | Notes |
|-------|------|-------|
| Identity Type | Select | citizenship, national_id, passport, driving_license, voter_id |
| Identity Number | Text | Required |
| Front Image | File upload | jpg/png/pdf, max 5MB, preview thumbnail |
| Back Image | File upload | jpg/png/pdf, max 5MB, preview thumbnail |

### Upload UX

- Drag-and-drop or click-to-upload for each image
- Show preview once selected (with remove button)
- Validate file type + size client-side before upload
- Progress indicator during upload
- Convert to base64 or FormData based on backend expectation

### States

| State | Display |
|-------|---------|
| Initial | Empty form with upload areas |
| Uploading | Progress spinner on each image |
| Success | Green check, "Documents submitted for review" |
| Error | Red alert with message, retry option |
| Validation error | Inline field errors (wrong type, too large) |

### Usage Locations

| Page | Context |
|------|---------|
| `CitizenRegister.tsx` (Step 4) | Optional KYC at end of registration |
| `ProfilePage.tsx` (KYC section) | Upload when KYC is unverified |
| `ProfilePage.tsx` (KYC section) | Re-upload when KYC was rejected |

### Flow

```
User fills form → selects images → clicks Submit
  → POST /api/citizen/identity  (base64 or FormData)
  → Success: show confirmation, set kyc_status = 'pending'
  → Error: show message
  → "Skip": navigate without uploading (KYC stays 'unverified')
```

### Files

**New:** `src/components/IdentityUpload.tsx`
**Modified:** `src/pages/auth/CitizenRegister.tsx`, `src/pages/citizen/ProfilePage.tsx`
