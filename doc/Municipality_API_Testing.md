# Municipality API Testing Documentation

This document records the results of testing Municipality API endpoints.

## Authentication
To access these endpoints, use the `Bearer <token>` retrieved by logging into `POST /api/auth/login` with Municipality Head credentials. Note that on first login, you may receive a `FORCE_PASSWORD_RESET` error, which requires calling `PATCH /api/auth/change-password` before proceeding.

> [!IMPORTANT]
> All endpoints beyond `/api/municipality/profile` require the municipality to have an **approved KYC status**. If KYC is not approved, the API will return `403 Forbidden: KYC verification is required`.

---

## 1. Profile & Analytics
### `GET /api/municipality/profile`
- **Description:** Get municipality's own full profile.
- **Success Case (200 OK):**
  ```json
  {
      "success": true,
      "data": {
          "id": "091d33bd-6e20-4b6a-965e-5dce0e37db01",
          "official_name": "Aamachhodingmo",
          "local_level_type": "rural_municipality",
          "kyc_status": "unverified",
          "is_active": true
      }
  }
  ```

### `PATCH /api/municipality/profile`
- **Description:** Update municipality profile.
- **Payload Example:** `{ "about_description": "A beautiful rural municipality." }`
- **Success Case (200 OK):** Returns updated profile data.

### `GET /api/municipality/departments/categories`
- **Description:** List system department categories.
- **Success Case (200 OK):** Returns array of strings (`["water_supply", "electricity", ...]`).

### `GET /api/municipality/analytics`
- **Description:** Municipality operational analytics dashboard metrics.
- **Error Case (403 Forbidden):** Requires KYC to be approved.

---

## 2. Department Management
### `GET /api/municipality/departments`
- **Description:** List departments in the municipality.
- **Success Case (200 OK):** Returns a list of department objects.

### `POST /api/municipality/departments`
- **Description:** Provision a new department and generate a department head invite.
- **Payload:**
  ```json
  {
      "category": "water_supply",
      "name": "Water Supply Department",
      "head_name": "Water Head",
      "head_email": "waterhead@civic.gov.np",
      "head_password": "WaterPassword@123!"
  }
  ```
- **Success Case (201 Created):** Returns the provisioned department ID and details.
- **Error Case (400 Bad Request):** Fails if a department in this category already exists or email is taken.

### `GET /api/municipality/departments/:id`
- **Description:** Get department details.
- **Success Case (200 OK):** Returns specific department object.

### `PATCH /api/municipality/departments/:id`
- **Description:** Update department configuration.
- **Payload:** `{ "name": "Updated Name" }`
- **Success Case (200 OK):** Returns updated department.

### `DELETE /api/municipality/departments/:id`
- **Description:** Delete department.
- **Success Case (200 OK):** Department removed.

### `POST /api/municipality/departments/:id/replace-head`
- **Description:** Replace the head of a department.
- **Payload:**
  ```json
  {
      "new_head_name": "New Water Head",
      "new_head_email": "newwaterhead@civic.gov.np",
      "new_head_password": "NewWaterPassword@123!"
  }
  ```
- **Success Case (200 OK):** Returns updated department with new head profile linked.

---

## 3. Staff Management
### `GET /api/municipality/staff`
- **Description:** List staff profiles in the municipality.
- **Success Case (200 OK):** Returns a list of staff objects.

### `POST /api/municipality/staff`
- **Description:** Dispatch a staff role invitation.
- **Payload Example:** `{ "email": "staff1@civic.gov.np", "role": "staff", "department_id": "<uuid>" }`
- **Success Case (201 Created):** Staff invited successfully.

### `PATCH /api/municipality/staff/:staffId`
- **Description:** Update staff details.
- **Success Case (200 OK):** Returns updated staff object.

### `PATCH /api/municipality/staff/:staffId/status`
- **Description:** Update staff status (e.g. suspend).
- **Payload Example:** `{ "status": "suspended" }`
- **Success Case (200 OK):** Staff status changed.

### `POST /api/municipality/staff/:staffId/reset-password`
- **Description:** Force a password reset for a staff member.
- **Success Case (200 OK):** Password reset link/token dispatched.

### `DELETE /api/municipality/staff/:staffId`
- **Description:** Delete staff account.
- **Success Case (200 OK):** Staff deleted.

---

## 4. KYC & Complaints Management
### `GET /api/municipality/kyc-pending`
- **Description:** List citizens awaiting identity verification.
- **Success Case (200 OK):** Returns array of pending KYC citizen applications.

### `PATCH /api/municipality/kyc-pending/:citizenId`
- **Description:** Review a citizen's KYC application.
- **Payload Example:** `{ "status": "approved" }` or `{ "status": "rejected", "rejection_reason": "Blurry photo" }`
- **Success Case (200 OK):** Citizen KYC status updated.

### `GET /api/municipality/complaints`
- **Description:** Get all complaints for the municipality.
- **Success Case (200 OK):** Returns a list of complaints.

### `GET /api/municipality/complaints/escalated`
- **Description:** Get SLA Level 2 escalated grievances feed.
- **Success Case (200 OK):** Returns escalated complaints.

### `POST /api/municipality/complaints/:id/intervene`
- **Description:** Municipality Head administrative intervention on an escalated complaint.
- **Success Case (200 OK):** Intervention recorded.

---

## 5. Emergency Teams
### `GET /api/municipality/teams`
- **Description:** List cross-department emergency task force teams.
- **Success Case (200 OK):** Returns teams list.

### `POST /api/municipality/teams`
- **Description:** Provision a cross-department emergency task force team.
- **Success Case (201 Created):** New team created.

### `POST /api/municipality/teams/:teamId/assign-complaint`
- **Description:** Assign a complaint to the team.
- **Success Case (200 OK):** Complaint linked to team.
