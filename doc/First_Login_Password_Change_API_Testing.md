# First Login Password Change - API Testing Documentation

## Overview
This document outlines the testing and validation of the First Login Password Change flow for internally provisioned users (`municipality_head`, `department_head`, and `staff`) in the Smart Civic Platform.

When an administrator provisions a new internal account, the system automatically assigns a temporary password and flags the account requiring a password reset upon first login (`force_password_reset = true`).

## Test Environment
- **Base URL:** `http://localhost:3000/api`
- **Authentication:** JWT via Supabase Auth
- **New Test Password Used:** `NewPassword123!`

---

## 1. Municipality Head Testing
**Account:** `neupanejiban89@gmail.com`

### 1.1 Initial Login (First Login)
- **Endpoint:** `POST /api/auth/login`
- **Payload:** `{"email": "neupanejiban89@gmail.com", "password": "<temp_password>"}`
- **Result:** Successfully returned JWT tokens and user profile indicating `force_password_reset: true`.
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGci...",
    "refresh_token": "mctlzdfz6hn3",
    "expires_in": 3600,
    "profile": {
      "id": "...",
      "email": "neupanejiban89@gmail.com",
      "role": "municipality_head",
      "account_status": "active",
      "force_password_reset": true
    }
  }
}
```

### 1.2 Middleware Enforcement Verification
- **Endpoint:** `GET /api/auth/me`
- **Headers:** `Authorization: Bearer <access_token>`
- **Result:** The `forcePasswordReset` middleware correctly intercepted the request and returned an error message.
```json
{
  "success": false,
  "message": "You must reset your initial password before accessing the platform.",
  "code": "FORCE_PASSWORD_RESET"
}
```

### 1.3 Password Change Execution
- **Endpoint:** `PATCH /api/auth/change-password`
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Payload:** `{"current_password": "<temp_password>", "new_password": "NewPassword123!"}`
- **Result:** Successfully updated the password and cleared the reset flag.
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "message": "Password changed successfully"
  }
}
```

### 1.4 Re-Authentication and Verification
- **Endpoint:** `POST /api/auth/login` (with `NewPassword123!`) followed by `GET /api/auth/me`
- **Result:** Login succeeded, and `/auth/me` allowed access, confirming `force_password_reset: false`.
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "email": "neupanejiban89@gmail.com",
    "role": "municipality_head",
    "account_status": "active",
    "force_password_reset": false
  }
}
```

---

## 2. Department Head Testing
**Account:** `pawanneupane@gmail.com`

### 2.1 Initial Login (First Login)
- **Endpoint:** `POST /api/auth/login`
- **Payload:** `{"email": "pawanneupane@gmail.com", "password": "<temp_password>"}`
- **Result:** Success, user profile indicates `force_password_reset: true`.
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "profile": {
      "email": "pawanneupane@gmail.com",
      "role": "department_head",
      "force_password_reset": true
    }
  }
}
```

### 2.2 Middleware Enforcement Verification
- **Endpoint:** `GET /api/auth/me`
- **Result:** Request blocked by middleware.
```json
{
  "success": false,
  "message": "You must reset your initial password before accessing the platform.",
  "code": "FORCE_PASSWORD_RESET"
}
```

### 2.3 Password Change Execution
- **Endpoint:** `PATCH /api/auth/change-password`
- **Payload:** `{"current_password": "<temp_password>", "new_password": "NewPassword123!"}`
- **Result:** Success message returned.
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### 2.4 Re-Authentication and Verification
- **Endpoint:** `GET /api/auth/me` (Using new token from re-login)
- **Result:** Successful profile fetch, middleware restriction lifted.
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "email": "pawanneupane@gmail.com",
    "role": "department_head",
    "force_password_reset": false
  }
}
```

---

## 3. Staff Testing
**Account:** `ankit@gmail.com`

### 3.1 Initial Login (First Login)
- **Endpoint:** `POST /api/auth/login`
- **Payload:** `{"email": "ankit@gmail.com", "password": "<temp_password>"}`
- **Result:** Success, user profile indicates `force_password_reset: true`.
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "profile": {
      "email": "ankit@gmail.com",
      "role": "staff",
      "force_password_reset": true
    }
  }
}
```

### 3.2 Middleware Enforcement Verification
- **Endpoint:** `GET /api/auth/me`
- **Result:** Request blocked by middleware.
```json
{
  "success": false,
  "message": "You must reset your initial password before accessing the platform.",
  "code": "FORCE_PASSWORD_RESET"
}
```

### 3.3 Password Change Execution
- **Endpoint:** `PATCH /api/auth/change-password`
- **Payload:** `{"current_password": "<temp_password>", "new_password": "NewPassword123!"}`
- **Result:** Success message returned.
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### 3.4 Re-Authentication and Verification
- **Endpoint:** `GET /api/auth/me` (Using new token from re-login)
- **Result:** Successful profile fetch, middleware restriction lifted.
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "email": "ankit@gmail.com",
    "role": "staff",
    "force_password_reset": false
  }
}
```

## Conclusion
The **First Login Password Change** workflow operates flawlessly across all internally provisioned roles (`municipality_head`, `department_head`, and `staff`). The security middleware properly blocks access with the `FORCE_PASSWORD_RESET` error code, the password change API successfully updates the credentials and profile flags, and subsequent re-authentication functions securely and correctly.
