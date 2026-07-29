# Validation Schemas — Update

## OLD (Current State)

File: `src/validation/auth.schema.ts`

- `loginSchema`: email required, password min 8 chars
- `registerSchema`: fullName, email required, phone optional, password + confirmPassword required, firstName/middleName/lastName derived, gender required, address fields (flat) required, acceptTerms

## NEW (Target State)

### Updates to `registerSchema`

```typescript
registerSchema = Yup.object().shape({
  fullName: Yup.string().min(3).required('Full Name is required'),
  email: Yup.string().email().required('Email is required'),
  phone: Yup.string()
    .matches(/^(?:\+977-?)?(98|97)\d{8}$/, 'Invalid Nepal phone number')
    .optional(),
  dateOfBirth: Yup.date()
    .max(new Date(Date.now() - 16 * 365 * 24 * 60 * 60 * 1000), 'Must be at least 16 years old')
    .required('Date of birth is required'),
  gender: Yup.string()
    .oneOf(['male', 'female', 'other', 'prefer_not_to_say'])
    .required('Gender is required'),
  password: Yup.string()
    .min(8)
    .matches(/[A-Z]/, 'Must contain uppercase')
    .matches(/[a-z]/, 'Must contain lowercase')
    .matches(/[0-9]/, 'Must contain a number')
    .required('Password is required'),
  registrationCode: Yup.string().optional(),
  acceptTerms: Yup.boolean().oneOf([true]).required(),
})
```

### Changed from current schema:

| Field | OLD | NEW |
|-------|-----|-----|
| `confirmPassword` | Required | **Removed** |
| `firstName`/`middleName`/`lastName` | Required (derived) | **Removed** — send `fullName` directly |
| `permanentProvince/District/Municipality/Ward` | Required (static IDs) | **Removed** — validated in `addressSchema` |
| `tempSameAsPermanent`, `tempProvince`, etc. | Required conditionally | **Removed** — handled in `addressSchema` |
| `dateOfBirth` | Not present | **Added** (required, min 16 years) |

### New Schemas to Add

```typescript
addressSchema = Yup.object().shape({
  permanent: Yup.object().shape({
    province_id: Yup.string().uuid().required(),
    district_id: Yup.string().uuid().required(),
    municipality_id: Yup.string().uuid().required(),
    ward_id: Yup.string().uuid().required(),
    tole: Yup.string().optional(),
  }),
  current: Yup.object().shape({
    province_id: Yup.string().uuid().required(),
    district_id: Yup.string().uuid().required(),
    municipality_id: Yup.string().uuid().required(),
    ward_id: Yup.string().uuid().required(),
    tole: Yup.string().optional(),
  }),
})

identitySchema = Yup.object().shape({
  identity_type: Yup.string()
    .oneOf(['citizenship', 'national_id', 'passport', 'driving_license', 'voter_id'])
    .required(),
  identity_number: Yup.string().min(3).required(),
  front_image: Yup.mixed().required('Front image is required'),
  back_image: Yup.mixed().required('Back image is required'),
})

sendOtpSchema = Yup.object().shape({
  phone: Yup.string()
    .matches(/^(?:\+977-?)?(98|97)\d{8}$/, 'Invalid Nepal phone number')
    .required(),
})

verifyOtpSchema = Yup.object().shape({
  phone: Yup.string().required(),
  code: Yup.string().length(6).required(),
})
```

### Files

**Modified:** `src/validation/auth.schema.ts`
**Depends on:** `08-api-helpers` (field names match API contracts)
