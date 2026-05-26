# 🔍 Smart Civic Platform Backend - Codebase & Schema Audit Report

We have conducted a thorough audit of the database schema (`smart_civic_platform.sql`) against the backend codebase (TypeScript/Express implementation in `src/`). 

### 🚨 Overall Verdict: NOT PERFECT
While the backend has a solid structure with Express routing, JWT authentication, and TypeScript integration, it is **not perfect**. There are critical security vulnerabilities, performance overheads caused by redundant trigger actions, and severe logical bugs that leave half the schema columns or tables disconnected.

Below is the complete list of issues identified, along with detailed step-by-step solutions for each.

---

## 📖 Table of Contents
1. [Security Vulnerabilities](#1-security-vulnerabilities)
   - [Issue 1.1: Complete Bypass of Row-Level Security (RLS)](#issue-11-complete-bypass-of-row-level-security-rls)
   - [Issue 1.2: Public Exposure of Invitation Token Hashes (Privilege Escalation Risk)](#issue-12-public-exposure-of-invitation-token-hashes-privilege-escalation-risk)
2. [Redundancy & Performance Bottlenecks](#2-redundancy--performance-bottlenecks)
   - [Issue 2.1: Citizen Creation-Then-Deletion Overhead during Staff/Admin Registration](#issue-21-citizen-creation-then-deletion-overhead-during-staffadmin-registration)
3. [Logical Bugs & Disconnected Schema Columns](#3-logical-bugs--disconnected-schema-columns)
   - [Issue 3.1: Orphaned Feedback (Always-Null Team/Staff IDs in citizen feedback)](#issue-31-orphaned-feedback-always-null-teamstaff-ids-in-citizen-feedback)
   - [Issue 3.2: Inconsistent Staff Status Validation in Service Layers](#issue-32-inconsistent-staff-status-validation-in-service-layers)
4. [Unimplemented Database Subsystems](#4-unimplemented-database-subsystems)
   - [Issue 4.1: Missing Service Layers for Core Tables (Dead Schema)](#issue-41-missing-service-layers-for-core-tables-dead-schema)

---

## 1. Security Vulnerabilities

### 🛠️ Issue 1.1: Complete Bypass of Row-Level Security (RLS)
* **Location:** `src/config/supabase.ts` and all service files (e.g. `auth.service.ts`, `citizen.service.ts`, etc.)
* **The Problem:** 
  The database schema explicitly enables **Row Level Security (RLS)** for all 24 tables (lines 611-626 in `smart_civic_platform.sql`) and sets up intricate user policies. However, the backend instantiates a single `supabaseAdmin` client using the Supabase **Service Role Key** (bypass key). 
  Because every single query in the backend services is executed via `supabaseAdmin`, the database completely bypasses RLS rules. Any access control is therefore left entirely up to the Node.js middleware. If a developer assumes the database is securing the tables, they are mistaken.
* **The Solution:**
  1. Initialize a user-scoped Supabase client on a per-request basis in the authentication middleware, using the incoming user's JWT access token.
  2. Use the user-scoped client for citizen/staff reads and writes so the database RLS policies are active.
  3. Keep `supabaseAdmin` strictly for system-level operations that are meant to run as an admin (e.g. sending staff invites).

### 🛠️ Issue 1.2: Public Exposure of Invitation Token Hashes (Privilege Escalation Risk)
* **Location:** `smart_civic_platform.sql` (Line 850)
* **The Problem:** 
  The schema defines the following RLS policy for the `staff_invitations` table:
  ```sql
  create policy "anyone can read pending invitation by token"
    on staff_invitations for select
    using (status = 'pending' and expires_at > now());
  ```
  Since this allows *anyone* to perform a broad `SELECT` on pending invitations, a malicious user can query the table to fetch *all* active invitation records. This includes retrieving the `token_hash` for each pending invite. 
  An attacker can then call the invite-accept endpoint with the stolen token, registering themselves as a `department_head`, `municipality_head`, or `staff` in any municipality.
* **The Solution:**
  1. Remove this public RLS policy entirely from the database schema:
     ```sql
     drop policy "anyone can read pending invitation by token" on staff_invitations;
     ```
  2. Since `acceptInviteService` already runs on the server side using the `supabaseAdmin` client (which bypasses RLS), public RLS access is not required to retrieve or validate the token.

---

## 2. Redundancy & Performance Bottlenecks

### 🛠️ Issue 2.1: Citizen Creation-Then-Deletion Overhead during Staff/Admin Registration
* **Location:** `smart_civic_platform.sql` (Line 497) & `auth.service.ts` / `superadmin.services.ts`
* **The Problem:** 
  The database trigger `trg_on_auth_user_created` fires automatically whenever a user is added to `auth.users`. It assumes every user is a citizen and automatically inserts a record into both `profiles` (with `'citizen'` role) and `citizens` (with `'Unknown'` names).
  When a staff member accepts their invitation or a Super Admin is registered, the trigger fires and creates this citizen record. The backend must immediately perform two corrective queries:
  ```typescript
  // 1. Update the profile role to the actual invited role
  await supabaseAdmin.from("profiles").update({ role: invite.target_role, ... });
  // 2. Manually delete the citizen record
  await supabaseAdmin.from("citizens").delete().eq("id", uid);
  ```
  This creates 3 database writes for a single sign-up. It wastes database cycles, triggers redundant cascade operations, and bloats write operations.
* **The Solution:**
  Modify the `handle_new_user()` database function in `smart_civic_platform.sql` to check user metadata before creating a citizen:
  ```sql
  create or replace function handle_new_user()
  returns trigger language plpgsql security definer as $$
  declare
    user_role text;
  begin
    user_role := coalesce(new.raw_user_meta_data->>'role', 'citizen');
    
    insert into profiles (id, full_name, email, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', 'Unknown'),
      new.email,
      user_role::user_role
    );

    -- Only create a citizen record if the role is actually 'citizen'
    if user_role = 'citizen' then
      insert into citizens (id, first_name, last_name)
      values (
        new.id,
        coalesce(new.raw_user_meta_data->>'first_name', 'Unknown'),
        coalesce(new.raw_user_meta_data->>'last_name', 'Unknown')
      );
    end if;

    return new;
  end;
  $$;
  ```
  This completely removes the need for `supabaseAdmin.from("citizens").delete()` in the backend code for staff/admin registration!

---

## 3. Logical Bugs & Disconnected Schema Columns

### 🛠️ Issue 3.1: Orphaned Feedback (Always-Null Team/Staff IDs in citizen feedback)
* **Location:** `src/modules/citizen/services/citizen.service.ts` -> `submitFeedback` (Line 133)
* **The Problem:** 
  The `feedback` table schema includes `team_id` and `staff_id` columns (lines 416-417 in `smart_civic_platform.sql`) to link ratings to the team or staff member who resolved the complaint. However, `submitFeedback` in the backend only inserts `complaint_id`, `citizen_id`, `rating`, `comment`, and `is_anonymous`:
  ```typescript
  const { data, error } = await supabaseAdmin
    .from("feedback")
    .insert({
      complaint_id: complaintId,
      citizen_id: citizenId,
      rating: body.rating,
      comment: body.comment ?? null,
      is_anonymous: body.is_anonymous ?? false,
    });
  ```
  Because there is no backend look-up to find the associated team/staff, and no database trigger in SQL to fill them in, `team_id` and `staff_id` **will always remain NULL**. This breaks the team performance statistics view (`v_team_workload` in line 589 of SQL) because no feedback will ever join to a team.
* **The Solution:**
  You can solve this on either the backend or the database layer:
  * **Option A (Database-level - RECOMMENDED):** Add a `BEFORE INSERT` trigger on the `feedback` table in `smart_civic_platform.sql` to automatically populate the `team_id` and `staff_id` from the most recent completed assignment of the complaint:
    ```sql
    create or replace function populate_feedback_assignee()
    returns trigger language plpgsql as $$
    begin
      select team_id, staff_id into new.team_id, new.staff_id
      from assignments
      where complaint_id = new.complaint_id
      order by actual_end desc nulls last, created_at desc
      limit 1;
      return new;
    end;
    $$;

    create trigger trg_feedback_populate_assignee
      before insert on feedback
      for each row execute function populate_feedback_assignee();
    ```
  * **Option B (Backend-level):** Query the `assignments` table for the complaint's active `team_id` or `staff_id` in the `submitFeedback` service before inserting into the `feedback` table.

### 🛠️ Issue 3.2: Inconsistent Staff Status Validation in Service Layers
* **Location:** `src/modules/municipality/services/municipality.service.ts` (Line 357) vs `src/modules/staff/services/staff.service.ts` (Line 217)
* **The Problem:** 
  The `employee_status` enum in the database has four values: `'active'`, `'inactive'`, `'suspended'`, and `'terminated'`.
  * `StaffService.updateStatus` (in `staff.service.ts`) handles statuses correctly by casting `status as EmployeeStatus` directly.
  * In contrast, `StaffService.updateStatus` duplicated in `municipality.service.ts` uses this restricted mapping:
    ```typescript
    const employeeStatus = status === "inactive" ? "inactive" : status === "terminated" ? "terminated" : "active";
    ```
    This completely locks out and fails to validate the `'suspended'` status when called from the municipality context. This inconsistency leads to logical errors and visual state mismatches.
* **The Solution:**
  Align both services by removing the duplicate service logic. Import the unified service function or ensure that the municipality module utilizes the global `EmployeeStatus` mapping:
  ```typescript
  const employeeStatus = status as EmployeeStatus;
  ```

---

## 4. Unimplemented Database Subsystems

### 🛠️ Issue 4.1: Missing Service Layers for Core Tables (Dead Schema)
* **Location:** `src/modules/`
* **The Problem:** 
  The SQL file contains rich specifications for civic workflows, but a large portion of it has **zero backend support**. The following tables exist in the database but have no routes, controllers, or service logic in the Express app:
  1. **Teams & Team Members:** `teams`, `team_members` (no endpoints to create/manage department teams).
  2. **Service Level Agreement (SLA):** `sla_rules` (no endpoints or backend tasks enforcing SLAs).
  3. **Polymorphic Media:** `media` (no storage-to-database upload endpoints).
  4. **Logistics & Vehicles:** `vehicles` (no fleet management services).
  5. **Task Management:** `assignments` (no task assignment or tracking routes).
  6. **Waste Management Routing:** `garbage_routes`, `route_stops` (no pathing or scheduling endpoints).
  7. **Financials & Accounting:** `budgets`, `spending_logs` (no budget allocation or spending log pipelines).
  8. **Civic Engagement & Comms:** `announcements`, `notifications`, `notification_reads` (no announcement creation or notifications engine).
* **The Solution:**
  If the platform is intended to support garbage collection, SLA tracking, and budgeting, the backend must be extended with modules for:
  * `/api/assignments` (Workload delegation)
  * `/api/budgets` & `/api/spending` (Municipal accounting)
  * `/api/routing` (Waste management route optimization using PostGIS coordinates)
  * `/api/notifications` & `/api/announcements` (Citizen broadcast system)

---

### Summary Checklist: Is the Backend Perfect?

| Area | Assessment | Critical Actions Required |
| :--- | :--- | :--- |
| **Authentication & Tokens** | ⚠️ Minor Issues | Fix the redundant citizen creation/deletion upon staff invitation acceptance. |
| **Authorization & RLS** | ❌ Highly Flawed | Enforce Per-Request Client instantiation to enable RLS; delete the public RLS read policy on `staff_invitations`. |
| **Citizens & Complaints** | ⚠️ Minor Issues | Integrate PostGIS spatial calculations instead of ignoring the `boundary` column. |
| **Municipalities & Depts** |  Perfect | Fully aligned with schema. |
| **Feedback System** | ❌ Broken | Populate `team_id` and `staff_id` columns via trigger or backend assignment lookup. |
| **Advanced Modules** | ❌ Missing | Implement routes and services for Teams, Vehicles, Budgets, Assignments, Comms, and Waste Routing. |
