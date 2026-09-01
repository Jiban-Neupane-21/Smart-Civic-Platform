# Smart Civic Platform - Frontend API Integration Guide & Reference

This directory (`src/api`) contains the centralized, fully-typed API service layer for the **Smart Civic Platform Frontend**. It interfaces directly with the Express + Supabase Backend (`http://localhost:3000/api`).

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Environment Configuration](#environment-configuration)
3. [Authentication & Auto-Token Lifecycle](#authentication--auto-token-lifecycle)
4. [Full API Endpoint Directory Reference](#full-api-endpoint-directory-reference)
5. [Frontend Developer Integration Code Examples](#frontend-developer-integration-code-examples)

---

## 1. Architecture Overview

```
src/api/
├── client.ts             # Axios instance with request/response interceptors (JWT injection & 401 token refresh)
├── index.ts              # Central entry point re-exporting all APIs, types, and client
├── types/                # TypeScript interfaces and data contracts
│   ├── api.types.ts           # Standard ApiResponse, PaginatedResponse, ApiError wrappers
│   ├── auth.types.ts          # Auth DTOs (Login, Register, UserProfile, Tokens)
│   ├── citizen.types.ts       # Citizen profile & address details
│   ├── complaints.types.ts    # Complaint tickets, statuses, comments, filters
│   ├── department.types.ts    # Department DTOs
│   ├── municipality.types.ts  # Municipality provisioning, stats
│   ├── notifications.types.ts # User notifications & unread counts
│   ├── onboarding.types.ts    # Citizen onboarding progress & submissions
│   ├── public.types.ts       # Public stats & announcements
│   ├── staff.types.ts         # Staff users & department assignments
│   └── superadmin.types.ts    # System stats, audit logs, feature flags
└── modules/              # Typed API handler functions per module
    ├── auth.api.ts
    ├── citizen.api.ts
    ├── complaints.api.ts
    ├── department.api.ts
    ├── municipality.api.ts
    ├── notifications.api.ts
    ├── onboarding.api.ts
    ├── public.api.ts
    ├── staff.api.ts
    └── superadmin.api.ts
```

---

## 2. Environment Configuration

Define the backend API URL in your `.env` or `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

If `VITE_API_BASE_URL` is omitted, `client.ts` defaults to `http://localhost:3000/api`.

---

## 3. Authentication & Auto-Token Lifecycle

All outgoing requests automatically attach your JWT token stored in `localStorage`:
- `access_token` is attached as `Authorization: Bearer <access_token>`.
- If an API returns `401 Unauthorized`, `client.ts` automatically attempts to call `/auth/refresh` using `refresh_token`.
- If refresh succeeds, the new token is saved and the original request is retried seamlessly.
- If refresh fails or no token exists, session data is cleared and the user is redirected to `/login`.

---

## 4. Full API Endpoint Directory Reference

### 🔐 Authentication Module (`authApi`)

| Method | Endpoint | Auth | Description | Request Body | Response Data |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `POST` | `/auth/register` | ❌ | Citizen registration | `RegisterRequest` | `{ user, tokens }` |
| `POST` | `/auth/login` | ❌ | Email/password login | `LoginRequest` | `{ user, tokens }` |
| `POST` | `/auth/send-otp` | ❌ | Request SMS OTP | `SendOtpRequest` | `{ message }` |
| `POST` | `/auth/verify-otp` | ❌ | Verify SMS OTP | `VerifyOtpRequest` | `{ verified: boolean }` |
| `POST` | `/auth/login-mobile` | ❌ | Passwordless mobile OTP login | `MobileLoginRequest` | `{ user, tokens }` |
| `POST` | `/auth/refresh` | ❌ | Refresh access token | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| `GET` | `/auth/me` | 🔒 | Get profile of logged-in user | None | `UserProfile` |
| `POST` | `/auth/logout` | 🔒 | Revoke refresh token & log out | `{ refreshToken }` | void |
| `PATCH` | `/auth/change-password` | 🔒 | Update user password | `ChangePasswordRequest` | void |
| `POST` | `/auth/forgot-password` | ❌ | Request password reset link | `ForgotPasswordRequest` | void |

---

### 📝 Complaints Module (`complaintsApi`)

| Method | Endpoint | Auth | Roles | Description | Request Payload |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/complaints` | 🔒 | All | List complaints (with filters/pagination) | Query params: `ComplaintFilterQuery` |
| `GET` | `/complaints/:id` | 🔒 | All | Get complaint details | Path param: `id` |
| `POST` | `/complaints` | 🔒 | Citizen | Submit new complaint | `CreateComplaintDto` |
| `PATCH` | `/complaints/:id/status` | 🔒 | Staff / Dept Head | Update complaint status | `UpdateComplaintStatusDto` |
| `POST` | `/complaints/:id/assign` | 🔒 | Dept Head | Assign complaint to staff | `AssignStaffDto` |
| `POST` | `/complaints/:id/comments` | 🔒 | All | Add comment to complaint | `{ content: string }` |

---

### 🏛️ Department Module (`departmentApi`)

| Method | Endpoint | Auth | Roles | Description |
| :--- | :--- | :---: | :--- | :--- |
| `GET` | `/department` | 🔒 | All | Get department list for municipality |
| `GET` | `/department/:id` | 🔒 | All | Get department details |
| `POST` | `/department` | 🔒 | Municipality Head / Admin | Create new department |
| `PUT` | `/department/:id` | 🔒 | Municipality Head / Admin | Update department details |
| `DELETE` | `/department/:id` | 🔒 | Municipality Head / Admin | Remove department |

---

### 🏢 Municipality Module (`municipalityApi`)

| Method | Endpoint | Auth | Roles | Description |
| :--- | :--- | :---: | :--- | :--- |
| `GET` | `/municipality` | 🔒 | All | List all municipalities |
| `GET` | `/municipality/:id` | 🔒 | All | Get municipality details |
| `POST` | `/municipality/provision` | 🔒 | Superadmin | Provision new municipality & admin |
| `PUT` | `/municipality/:id` | 🔒 | Superadmin / Munic Head | Update municipality metadata |
| `GET` | `/municipality/:id/stats` | 🔒 | Munic Head / Admin | Get municipality analytics stats |

---

### 👤 Citizen Module (`citizenApi`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/citizen/profile` | 🔒 | Fetch citizen profile & address details |
| `PUT` | `/citizen/profile` | 🔒 | Update citizen profile & address details |
| `GET` | `/citizen/complaints` | 🔒 | Get all complaints filed by the current citizen |

---

### 🔔 Notifications Module (`notificationsApi`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/notifications` | 🔒 | Get list of user notifications |
| `GET` | `/notifications/unread-count` | 🔒 | Get count of unread notifications |
| `PATCH` | `/notifications/:id/read` | 🔒 | Mark notification as read |
| `POST` | `/notifications/read-all` | 🔒 | Mark all notifications as read |

---

### 📋 Onboarding Module (`onboardingApi`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/onboarding/status` | 🔒 | Check onboarding completion progress |
| `POST` | `/onboarding/submit` | 🔒 | Submit citizen onboarding details |

---

### 👥 Staff Module (`staffApi`)

| Method | Endpoint | Auth | Roles | Description |
| :--- | :--- | :---: | :--- | :--- |
| `GET` | `/staff` | 🔒 | Munic Head / Dept Head | List staff members |
| `GET` | `/staff/:id` | 🔒 | Munic Head / Dept Head | Get staff member details |
| `POST` | `/staff` | 🔒 | Munic Head | Invite/create new staff member |
| `PUT` | `/staff/:id` | 🔒 | Munic Head / Dept Head | Update staff member profile |
| `PATCH` | `/staff/:id/assign-department` | 🔒 | Munic Head | Reassign staff member to department |

---

### 👑 Superadmin Module (`superadminApi`)

| Method | Endpoint | Auth | Roles | Description |
| :--- | :--- | :---: | :--- | :--- |
| `GET` | `/superadmin/stats` | 🔒 | Superadmin | Get overall system health & stats |
| `GET` | `/superadmin/users` | 🔒 | Superadmin | Get platform user directory |
| `GET` | `/superadmin/audit-logs` | 🔒 | Superadmin | Fetch security audit logs |
| `GET` | `/superadmin/feature-flags` | 🔒 | Superadmin | List feature flags |
| `PATCH` | `/superadmin/feature-flags/:id/toggle` | 🔒 | Superadmin | Toggle feature flag state |
| `POST` | `/superadmin/admins/invite` | 🔒 | Superadmin | Invite municipality admin |

---

### 🌐 Public Module (`publicApi`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/public/stats` | ❌ | Get platform public counter statistics |
| `GET` | `/public/announcements` | ❌ | Get public civic announcements |

---

## 5. Frontend Developer Integration Code Examples

### Example 1: Fetching Data in React (`useState` + `useEffect`)

```tsx
import React, { useEffect, useState } from 'react';
import { complaintsApi, Complaint, ApiError } from '@/api';

export const CitizenComplaintsList = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setLoading(true);
        const response = await complaintsApi.getComplaints({ limit: 10 });
        if (response.success) {
          setComplaints(response.data);
        }
      } catch (err: any) {
        const apiErr: ApiError = err.response?.data;
        setError(apiErr?.message || 'Failed to load complaints');
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  if (loading) return <div>Loading complaints...</div>;
  if (error) return <div className="error-badge">{error}</div>;

  return (
    <ul className="complaints-list">
      {complaints.map((item) => (
        <li key={item.id} className="p-4 border rounded shadow-sm">
          <h4 className="font-bold">{item.title}</h4>
          <span className={`badge status-${item.status}`}>{item.status}</span>
          <p>{item.description}</p>
        </li>
      ))}
    </ul>
  );
};
```

---

### Example 2: Submitting Forms (Submit Complaint)

```tsx
import React, { useState } from 'react';
import { complaintsApi, CreateComplaintDto } from '@/api';

export const SubmitComplaintForm = () => {
  const [formData, setFormData] = useState<CreateComplaintDto>({
    title: '',
    description: '',
    category: 'Infrastructure',
    priority: 'medium',
    wardNumber: 1,
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await complaintsApi.createComplaint(formData);
      if (res.success) {
        alert(`Complaint created successfully! Ticket #${res.data.ticketNumber}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Complaint Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />
      <textarea
        placeholder="Describe the issue..."
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        required
      />
      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Complaint'}
      </button>
    </form>
  );
};
```

---

### Example 3: Using Master `api` Object

```tsx
import api from '@/api';

// Call any API via the consolidated api object
const loginUser = async (email: string, pass: string) => {
  const response = await api.auth.login({ email, password: pass });
  localStorage.setItem('access_token', response.data.tokens.accessToken);
  localStorage.setItem('refresh_token', response.data.tokens.refreshToken);
  return response.data.user;
};
```
