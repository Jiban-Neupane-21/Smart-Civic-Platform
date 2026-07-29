# LocationPicker Component — API-Backed Cascade

## OLD (Current State)

- Static data files: `src/data/nepal-provinces.ts`, `src/data/nepal-municipalities.ts`
- Province names as keys, district strings, municipality objects with name+type
- Drilled directly in `CitizenRegister.tsx` and nowhere else
- No reusable component
- Profile page shows flat address text (no cascade editing)

## NEW (Target State)

### Component Interface

```typescript
// src/components/LocationPicker.tsx
interface LocationPickerProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  disabled?: boolean;
  label?: string;  // "Permanent" or "Current"
  error?: string;
}

interface AddressValue {
  province_id: string;
  district_id: string;
  municipality_id: string;
  ward_id: string;
  tole: string;
}
```

### Cascade Logic

```
Province selected
  → fetch GET /api/citizen/districts?province_id=
  → enable District dropdown, reset Municipality + Ward + Tole

District selected
  → fetch GET /api/citizen/municipalities?district_id=
  → enable Municipality dropdown, reset Ward + Tole

Municipality selected
  → fetch GET /api/citizen/wards?municipality_id=
  → enable Ward dropdown, reset Tole

Ward selected
  → enable Tole text field (optional)
```

### States Per Dropdown

| State | Behavior |
|-------|----------|
| Loading | Show spinner/skeleton in dropdown |
| Empty (no parent selected) | "Select [parent] first" placeholder, disabled |
| Empty (parent selected, no data) | "No options available", disabled |
| Error | Show error alert, retry button |
| Populated | Normal select with items |

### Usage

```tsx
<LocationPicker
  value={currentAddress}
  onChange={(val) => setCurrentAddress(val)}
  label="Current"
/>
```

### Reuse Locations

| Page | Usage |
|------|-------|
| `CitizenRegister.tsx` (Step 2) | Permanent address + optional current address |
| `ProfilePage.tsx` (Address tab) | Edit permanent + current with save |

### Files

**New:** `src/components/LocationPicker.tsx`
**Modified:** `src/pages/auth/CitizenRegister.tsx`, `src/pages/citizen/ProfilePage.tsx`
**Deprecated (maybe remove):** `src/data/nepal-provinces.ts`, `src/data/nepal-municipalities.ts`
