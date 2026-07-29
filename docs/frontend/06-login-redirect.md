# Login Page — Role-Based Redirect & Optional Mobile Login

## OLD (Current State)

File: `src/pages/auth/Login.tsx`

- Email + Password only
- Redirects globally via `withRoleRedirect` HOC
- No mobile/OTP option
- `/register` link at bottom

## NEW (Target State)

### Change 1: Add Mobile OTP Option (Optional Feature)

Add a tab toggle above the form:

```
[ Email / Password ]  |  [ Mobile OTP ]
```

**Email tab**: Existing form unchanged.
**Mobile tab** (optional enhancement):
- Phone input with +977
- "Send OTP" button → calls `POST /api/auth/send-otp`
- 6-digit OTP input → calls `POST /api/auth/login-mobile`
- On success: store tokens + profile, redirect

### Change 2: Ensure Role-Based Redirect Works

The `withRoleRedirect` HOC currently wraps `LoginBase`. Verify it correctly reads `role` from profile and redirects:

| Role | Redirect to |
|------|-------------|
| `citizen` | `/citizen/dashboard` |
| `municipality_head` | `/municipality_head/dashboard` |
| `department_head` | `/department_head/dashboard` |
| `staff` | `/staff/dashboard` |
| `superadmin` | `/superadmin/dashboard` |

### API Calls

| Action | Endpoint |
|--------|----------|
| Email login (existing) | `POST /api/auth/login` |
| Send OTP | `POST /api/auth/send-otp` |
| Verify + login | `POST /api/auth/login-mobile` |

### Files

**Modified:** `src/pages/auth/Login.tsx` (add OTP tab)
**New (optional):** `src/pages/auth/MobileLogin.tsx` (standalone mobile login page)
**Modified:** `src/pages/auth/withRoleRedirect.tsx` (verify role mapping)
**Modified:** `src/routes/AppRoutes.tsx` (add `/login/mobile` route)
