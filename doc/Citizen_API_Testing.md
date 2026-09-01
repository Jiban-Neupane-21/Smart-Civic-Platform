# Citizen API Testing Documentation

## Overview
This document outlines the testing and validation of the Citizen module API endpoints for the Smart Civic Platform. All endpoints have been successfully tested, and schema bugs/unique constraint issues have been resolved.

## Test Environment
- **Base URL:** `http://localhost:3000/api`
- **Role:** `citizen`
- **Authentication:** JWT via Supabase Auth

## Endpoints Tested

### 1. Public Endpoints
*Used for onboarding and registration.*

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/citizen/provinces` | GET | 200 OK | Fetches all provinces. |
| `/citizen/districts` | GET | 200 OK | Fetches all districts. |
| `/citizen/municipalities` | GET | 200 OK | Fetches municipalities. |
| `/citizen/wards?municipality_id={id}` | GET | 200 OK | Fetches wards for a specific municipality. |
| `/citizen/municipalities/{id}/categories` | GET | 200 OK | Fetches active complaint categories for a given municipality. |

### 2. Registration & Authentication
*Handled via standard auth endpoints, resulting in a citizen profile.*

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/auth/register` | POST | 200 OK | Registers a new citizen user. |
| `/auth/login` | POST | 200 OK | Logs in and receives a JWT token. |

### 3. Profile & Address Management

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/citizen/dashboard` | GET | 200 OK | Returns summary counts and recent activity. |
| `/citizen/address` | POST | 200 OK | Updates structured current and permanent address info. |
| `/citizen/identity` | POST | 201 Created | Uploads identity document details (e.g., citizenship). Required unique `identity_number`. |
| `/citizen/profile` | PUT | 200 OK | Updates basic profile settings (e.g., contact number). |

### 4. Complaint Management

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/citizen/complaints` | POST | 201 Created | Submits a new complaint. (Fixed tracking_id collision bug by executing inserts with `supabaseAdmin` to bypass RLS for Postgres triggers). |
| `/citizen/complaints` | GET | 200 OK | Retrieves all complaints filed by the citizen. |
| `/citizen/complaints/{id}` | GET | 200 OK | Retrieves details of a specific complaint. (Fixed foreign key join errors for `complaint_categories` and `departments`). |
| `/citizen/complaints/{id}/history` | GET | 200 OK | Retrieves history/audit logs. |
| `/citizen/complaints/{id}/updates` | GET | 200 OK | Fetches timeline updates and comments. |
| `/citizen/complaints/{id}/updates` | POST | 201 Created | Adds a new note/update to the complaint. |
| `/citizen/complaints/{id}/media` | POST | 201 Created | Uploads media evidence for the complaint. (Fixed `media` table schema mismatch). |

### 5. Post-Resolution Endpoints
*These endpoints correctly return 400 Bad Request when the complaint is still `pending`.*

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/citizen/complaints/{id}/reopen` | POST | 400 Bad Request | Successfully blocks reopening if status is not "resolved" or "closed". |
| `/citizen/complaints/{id}/feedback` | POST | 400 Bad Request | Successfully blocks feedback if complaint is not resolved. |

## Resolved Bugs
1. **Tracking ID Collision (`complaints_tracking_id_key`)**
   - *Issue*: A `BEFORE INSERT` trigger on the `complaints` table calculates the next sequential ID based on `SELECT count(*)`. Since it was executing under the Citizen's RLS policy, the count was returning `0` for every new citizen, causing it to assign the same `tracking_id` (e.g., `519D-26-000001`) and throwing a unique constraint violation.
   - *Fix*: The insert query in `citizen.service.ts` was updated to use `supabaseAdmin` to bypass RLS, allowing the trigger to correctly count the global complaints and generate unique `tracking_id` sequences.

2. **Join Relationship Error in `getComplaintDetail`**
   - *Issue*: PostgREST threw an error when attempting to embed `departments` and `complaint_categories` because there were multiple foreign keys pointing to `departments`.
   - *Fix*: Added explicit foreign key hints: `complaint_categories!category_id` and `departments!assigned_department_id`.

3. **Media Table Schema Mismatch**
   - *Issue*: Uploading media evidence returned a `"Could not find the 'complaint_id' column of 'media'"` error.
   - *Fix*: Updated the API to match the actual database schema, which uses `context: "complaint"` and `context_id: complaintId` instead of `complaint_id`. 
