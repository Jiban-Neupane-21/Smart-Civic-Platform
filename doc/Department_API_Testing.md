# Department API Testing Documentation

This document records the results of testing Department API endpoints.

## Authentication & Authorization
To access these endpoints, use the `Bearer <token>` retrieved by logging into `POST /api/auth/login` with Department Head credentials.

> [!WARNING]
> On the first login, a Department Head may receive a `FORCE_PASSWORD_RESET` error. They must call `PATCH /api/auth/change-password` before proceeding.
> 
> Additionally, almost all department endpoints are protected by `KYC_REQUIRED`. The Department Head **must have an identity document uploaded** (i.e., `identity_document_url` must exist in their profile) before they can access operational data. Otherwise, the API will return `403 Forbidden: You must complete your KYC upload before accessing the platform.`

---

## 1. Dashboard & General
### `GET /api/department/dashboard`
- **Description:** Get department operational dashboard KPI metrics.
- **Success Case (200 OK):**
  ```json
  {
      "success": true,
      "data": {
          "department_name": "Water Department",
          "department_category": "water_supply",
          "totalComplaints": 1,
          "pending": 0,
          "under_review": 0,
          "in_progress": 0,
          "resolved": 0,
          "rejected": 0,
          "closed": 0,
          "resolutionRate": 0,
          "totalStaff": 2,
          "activeTeams": 1,
          "recentComplaints": [ ... ]
      }
  }
  ```

### `PUT /api/department/logo`
- **Description:** Update department logo.
- **Payload Example:** `{ "logo": "base64-string-here" }`
- **Success Case (200 OK):** Logo updated successfully.
- **Error Case (400 Bad Request):** `{ "success": false, "error": "logo base64 string is required" }`

---

## 2. Complaints & Triage Queue
### `GET /api/department/queue`
- **Description:** Get the department's complaint triage queue.
- **Success Case (200 OK):**
  ```json
  {
      "success": true,
      "data": [
          {
              "co_uid": "b7a5d6aa-d37c-4ce2-9c9a-acd07c81750a",
              "tracking_id": "519D-26-000001",
              "title": "This is complain title",
              "status": "assigned",
              "priority": "medium",
              "severity_level": "medium",
              "sla_breached": false
              // ...
          }
      ]
  }
  ```

### `GET /api/department/collaborations`
- **Description:** List cross-department collaboration requests.
- **Success Case (200 OK):** Returns an array of collaboration objects.

### `PATCH /api/department/complaints/:complaintId/state`
- **Description:** Process complaint status transition (`under_review`, `assigned`, `rejected`).
- **Success Case (200 OK):** Returns updated complaint state.

---

## 3. Staff Management
### `GET /api/department/staff-roster`
- **Description:** List department staff roster.
- **Success Case (200 OK):**
  ```json
  {
      "success": true,
      "data": [
          {
              "id": "729a652c-1fd3-4cb7-9c30-45eb42579acf",
              "profile_id": "6f7ca870-b4af-43a5-9141-8d0418d6c3ec",
              "contact_number": "+9779888877609",
              "employee_status": "active",
              "onboarded_at": "2026-07-28T14:01:18.01+00:00"
          }
      ]
  }
  ```

### `POST /api/department/staff/create`
- **Description:** Dispatch staff invitation token.
- **Payload:** `{ "email": "staff1@civic.gov.np", "full_name": "John Doe", "role": "staff" }`
- **Error Case (400 Bad Request):** `{ "success": false, "error": "Missing required fields: email, full_name." }`

### `PATCH /api/department/staff/:staffId`
- **Description:** Update staff details.
- **Success Case (200 OK):** Staff profile updated.

### `PATCH /api/department/staff/:staffId/status`
- **Description:** Change staff active/suspended status.
- **Payload:** `{ "status": "suspended" }`

---

## 4. Operational Teams Management
### `GET /api/department/teams`
- **Description:** List department operational teams.
- **Success Case (200 OK):**
  ```json
  {
      "success": true,
      "data": [
          {
              "id": "18f5a713-1a0a-4853-a584-840c96a94c05",
              "team_name": "Abc team",
              "description": "Team desc",
              "team_type": "single_department",
              "is_active": false,
              "member_count": 2
          }
      ]
  }
  ```

### `POST /api/department/teams/create`
- **Description:** Provision a new internal operational team.
- **Payload:** `{ "team_name": "Rapid Response", "start_date": "2026-08-14T00:00:00Z", "end_date": "2026-08-30T00:00:00Z" }`
- **Error Case (400 Bad Request):** `{ "success": false, "error": "team_name, start_date, and end_date are required fields." }`

### `POST /api/department/teams/:teamName/assign-complaint`
- **Description:** Assign a complaint ticket to an operational team.
- **Payload:** `{ "complaintId": "<uuid>" }`
- **Success Case (200 OK):** Complaint linked to team.
