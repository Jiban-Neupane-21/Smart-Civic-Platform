# Staff API Testing Documentation

This document records the results of testing Staff API endpoints.

## Authentication & Authorization
To access these endpoints, use the `Bearer <token>` retrieved by logging into `POST /api/auth/login` with Staff credentials (e.g., `sitaramneupane@gmail.com`).

> [!WARNING]
> On the first login, a Staff member may receive a `FORCE_PASSWORD_RESET` error. They must call `PATCH /api/auth/change-password` before proceeding.
> 
> Similar to Department Heads, Staff are protected by the `KYC_REQUIRED` middleware for most operational endpoints. The Staff member **must have an identity document uploaded** (i.e., `identity_document_url` must exist in their profile) before they can access operational data. Otherwise, the API will return `403 Forbidden`.

---

## 1. Profile & Department Info
### `GET /api/staff/profile`
- **Description:** Fetch staff employment profile & department metadata.
- **Success Case (200 OK):**
  ```json
  {
      "success": true,
      "data": {
          "id": "b7b89e52-9808-4cf9-83d8-d7028a7ddf96",
          "contact_number": "+9779879186619",
          "onboarded_at": "2026-08-14T02:48:28.448+00:00",
          "profile": {
              "id": "9b48a047-9aa5-4977-8367-198131bd59bd",
              "role": "staff",
              "email": "test_staff@civic.gov.np",
              "full_name": "Test Field Worker",
              "account_status": "active"
          },
          "department": {
              "id": "44720168-72b9-40e8-a2b0-889b67cbee43",
              "department_name": "Water Department",
              "department_category": "water_supply"
          },
          "municipality": {
              "id": "519d8eac-53ca-4b11-802d-548c484e867b",
              "official_name": "Paiyun"
          }
      }
  }
  ```

### `PATCH /api/staff/profile`
- **Description:** Update staff contact number or personal address.
- **Payload Example:** `{ "contact_number": "+9779812345678" }`
- **Success Case (200 OK):** Returns the updated profile object as shown above.

### `GET /api/staff/my-department`
- **Description:** Fetch primary department details.
- **Success Case (200 OK):**
  ```json
  {
      "success": true,
      "data": {
          "id": "44720168-72b9-40e8-a2b0-889b67cbee43",
          "department_name": "Water Department",
          "department_category": "water_supply",
          "head_name": "Pawan Neupane",
          "head_email": "pawanneupane@gmail.com",
          "official_email": "waterdept@paiyun.gov.np"
      }
  }
  ```

---

## 2. Schedule & Assignments
### `GET /api/staff/my-assignments`
- **Description:** List operational team assignments bound to staff profile.
- **Success Case (200 OK):**
  ```json
  {
      "success": true,
      "data": []
  }
  ```

### `GET /api/staff/schedule`
- **Description:** Get staff's field work schedule calendar and task timeline.
- **Success Case (200 OK):**
  ```json
  {
      "success": true,
      "data": []
  }
  ```

### `GET /api/staff/department-queue`
- **Description:** View department complaint queue.
> [!WARNING] Bug Identified 🐞
> This endpoint currently throws a **500 Internal Server Error**: `Failed to retrieve department complaints log: column complaints.id does not exist`. 
> *Fix needed:* The schema uses `co_uid` as the primary key for complaints, not `id`.

---

## 3. Complaint Assignment Lifecycle (Field Worker Flow)
> [!NOTE]
> Testing these endpoints requires a valid `assignmentId` (or `complaintId` for handoffs). If invalid UUIDs are provided or the ticket is missing, the backend throws a `400` DB constraint error.

### `PATCH /api/staff/assignments/:assignmentId/acknowledge`
- **Description:** Acknowledge assignment receipt.
> [!WARNING] Bug Identified 🐞
> This endpoint throws a **400 Error**: `Failed to acknowledge team assignment: Could not find the 'acknowledged_at' column of 'team_members' in the schema cache`.
> *Fix needed:* Schema migration is required to add `acknowledged_at` to the `team_members` table (or wherever the assignment state is tracked).

### `POST /api/staff/assignments/:assignmentId/accept`
- **Description:** Step 1 — Accept ticket assignment.
- **Success Case (200 OK):**
  ```json
  { "success": true, "message": "Assignment accepted.", "data": { ... } }
  ```

### `POST /api/staff/assignments/:assignmentId/start`
- **Description:** Step 2 — Start active field work.
- **Success Case (200 OK):**
  ```json
  { "success": true, "message": "Field work started.", "data": { ... } }
  ```

### `POST /api/staff/assignments/:assignmentId/complete`
- **Description:** Step 3 — Complete resolution work.
- **Success Case (200 OK):**
  ```json
  { "success": true, "message": "Assignment completed & resolved.", "data": { ... } }
  ```

### `POST /api/staff/assignments/:id/transfer`
- **Description:** Peer-to-peer staff handoff — Transfer complaint to a colleague.
- **Payload:** `{ "to_staff_id": "<uuid>", "reason": "Busy", "note": "Please handle this" }`
- **Success Case (201 Created):**
  ```json
  { "success": true, "message": "Complaint transferred to peer.", "data": { ... } }
  ```

### `POST /api/staff/assignments/:id/return-to-dept`
- **Description:** Return complaint to Department Head for reassignment.
- **Payload:** `{ "reason": "Not my expertise", "note": "Needs specialized equipment" }`
- **Success Case (201 Created):**
  ```json
  { "success": true, "message": "Complaint returned to Department Head.", "data": { ... } }
  ```
