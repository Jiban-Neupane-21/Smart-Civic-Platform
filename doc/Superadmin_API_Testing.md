# Superadmin API Testing Documentation

This document records the results of testing Superadmin API endpoints, including both success cases and handled error scenarios.

## Authentication
To access these endpoints, use the `Bearer <token>` retrieved by logging into `POST /api/auth/login` with Superadmin credentials.

---

## 1. Analytics & Audit
### `GET /api/superadmin/analytics`
- **Description:** Fetch system-wide macro metrics.
- **Success Case (200 OK):**
  ```json
  {
      "success": true,
      "data": {
          "total_municipalities": 1,
          "total_departments": 2,
          "total_staff": 4,
          "total_citizens": 1,
          "total_active_users": 7,
          "total_suspended_users": 0,
          "total_pending_complaints": 1,
          "total_resolved_complaints": 0
      }
  }
  ```
- **Error Case (401 Unauthorized - Missing Token):**
  ```json
  { "error": "Authorization header absent." }
  ```
  *Solution:* Ensure the `Authorization: Bearer <token>` header is sent in the request.

### `GET /api/superadmin/audit-logs`
- **Description:** Query system audit logging stream.
- **Success Case (200 OK):**
  ```json
  {
      "success": true,
      "data": []
  }
  ```

---

## 2. Reference Data
### `GET /api/superadmin/provinces`
- **Description:** Fetch all provinces.
- **Success Case (200 OK):** Returns a list of provinces.

### `GET /api/superadmin/districts`
- **Description:** Fetch districts.
- **Success Case (200 OK):** Returns a list of districts with their associated `province_id`.

### `GET /api/superadmin/municipalities/reference`
- **Description:** Fetch reference municipalities for cascading dropdowns.
- **Success Case (200 OK):**
  ```json
  {
      "success": true,
      "data": [
          {
              "id": "519d8eac-53ca-4b11-802d-548c484e867b",
              "official_name": "Paiyun",
              "local_level_type": "rural_municipality",
              "total_wards": 9,
              "district_id": "813628a7-ebe7-41e9-9dc6-1751214260a0",
              "is_active": true
          }
      ]
  }
  ```

### `GET /api/superadmin/municipalities/:id/detail`
- **Description:** Fetch full municipality detail.
- **Success Case (200 OK):** Returns full profile including `district_name` and `province_name`.
- **Error Case (Invalid ID format):**
  *Solution:* Ensure the `id` provided in the path is a valid UUID.

### `GET /api/superadmin/wards/:municipality_id`
- **Description:** Fetch wards for a municipality.
- **Success Case (200 OK):** Returns a list of wards.

---

## 3. Municipality Management
### `GET /api/superadmin/municipalities`
- **Description:** Fetch all active municipalities with joined province & district details.
- **Success Case (200 OK):**
  ```json
  {
      "success": true,
      "data": [
          {
              "id": "519d8eac-53ca-4b11-802d-548c484e867b",
              "official_name": "Paiyun",
              "is_active": true
              // ...
          }
      ]
  }
  ```

### `POST /api/superadmin/municipalities/provision`
- **Description:** Provision and activate pre-seeded municipality entity.
- **Payload:**
  ```json
  {
      "municipality_id": "<uuid>",
      "head_name": "Test Head",
      "head_email": "testhead@example.com",
      "head_password": "TestPassword@123!"
  }
  ```
- **Success Case (201 Created):** Returns the updated provisioned municipality payload.
- **Error Case (Missing Fields or Invalid UUID):**
  *Solution:* Make sure `municipality_id`, `head_name`, `head_email`, and `head_password` are passed.

### `PUT /api/superadmin/municipalities/:id`
- **Description:** Update a municipality.
- **Payload:** Any valid profile keys (e.g. `about_description`).
- **Success Case (200 OK):** Returns updated municipality data.

### `PATCH /api/superadmin/municipalities/:id/kyc`
- **Description:** Review and update a municipality's KYC status.
- **Payload:** `{ "status": "approved" | "rejected" }`
- **Success Case (200 OK):** Returns updated status.

### `DELETE /api/superadmin/municipalities/:id`
- **Description:** Delete a municipality.
- **Success Case (200 OK):**
  ```json
  {
      "success": true,
      "message": "Municipality and linked user deleted successfully."
  }
  ```

---

## 4. User Management
### `POST /api/superadmin/users/create`
- **Description:** Create a municipality head user account or staff role.
- **Payload:** Requires `email`, `password`, `full_name`, `role`.
- **Success Case (201 Created):** Returns new user details.

### `PATCH /api/superadmin/users/assign-role`
- **Description:** Elevate or alter systemic authorization roles.
- **Payload:** `{ "user_id": "<uuid>", "role": "department_head" }`
- **Success Case (200 OK):** Core account role elevated.

### `PATCH /api/superadmin/users/manage-status`
- **Description:** Enforce account lifecycle status transitions.
- **Payload:** `{ "user_id": "<uuid>", "status": "suspended" }`
- **Success Case (200 OK):** Profile status updated.
