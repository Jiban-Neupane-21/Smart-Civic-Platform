# Staff Frontend - Pending Tasks

This document tracks the pending frontend implementation tasks for the **Staff role** based on:
- Backend API documentation (`doc/Staff_API_Testing.md`)
- Current navbar configuration (`src/config/navbar.config.tsx`)
- Existing frontend codebase

---

## Current Staff Navbar Configuration

From `navbar.config.tsx:160-176`, Staff role has these navigation items:

| Nav Item | Route | Status |
|----------|-------|--------|
| Dashboard | `/dashboard` (`/staff/dashboard`) | ✅ Implemented (`Homepage.tsx`) |
| Team | `/team` (`/staff/team`) | ✅ Implemented (`Team.tsx`) |
| Complaint | `/complaint` (`/staff/complaint`) | 🟡 Initial page implemented (`Complaint.tsx`) |
| Profile | `/profile` (`/staff/profile`) | ✅ Implemented (`ProfilePage.tsx`) |
| Notification | `/notification` (`/staff/notification`) | ✅ Implemented (`Notification.tsx`) |
| Logout | `/logout` | ✅ Handled by auth |

---

## Backend API Endpoints (from `Staff_API_Testing.md`)

### 1. Profile & Department Info
| Endpoint | Method | Frontend Need |
|----------|--------|---------------|
| `/api/staff/profile` | GET | ✅ Profile page - fetch & display staff profile |
| `/api/staff/profile` | PATCH | ✅ Profile page - update contact/address |
| `/api/staff/my-department` | GET | ✅ Dashboard/Profile - show department info |

### 2. Schedule & Assignments
| Endpoint | Method | Frontend Need |
|----------|--------|---------------|
| `/api/staff/my-assignments` | GET | ✅ **Dashboard** - list assigned complaints/tasks |
| `/api/staff/schedule` | GET | ✅ **Dashboard/Schedule page** - calendar view |
| `/api/staff/department-queue` | GET | ⚠️ **Bug** - 500 error (backend fix needed first) |

### 3. Complaint Assignment Lifecycle (Field Worker Flow)
| Endpoint | Method | Frontend Need |
|----------|--------|---------------|
| `/api/staff/assignments/:id/acknowledge` | PATCH | ⚠️ **Bug** - 400 error (schema migration needed) |
| `/api/staff/assignments/:id/accept` | POST | ✅ **Complaint Detail** - Accept button |
| `/api/staff/assignments/:id/start` | POST | ✅ **Complaint Detail** - Start Work button |
| `/api/staff/assignments/:id/complete` | POST | ✅ **Complaint Detail** - Complete button |
| `/api/staff/assignments/:id/transfer` | POST | ✅ **Complaint Detail** - Transfer to peer |
| `/api/staff/assignments/:id/return-to-dept` | POST | ✅ **Complaint Detail** - Return to Dept Head |

---

## Pending Frontend Implementation Tasks

### Phase 1: Core Pages (High Priority)

#### 1. Staff Dashboard (`/dashboard`) - `src/pages/staff/Homepage.tsx`
- [x] Create dashboard layout with stats cards
- [x] Fetch and display **My Assignments** (`GET /api/staff/my-assignments`)
- [x] Fetch and display **Schedule** (`GET /api/staff/schedule`) - calendar/timeline view
- [x] Show **Department Info** (`GET /api/staff/my-department`)
- [x] Quick actions: View Assignment Details, Start Work, etc.

#### 2. Staff Team Page (`/team`) - `src/pages/staff/Team.tsx`
- [x] Created `src/pages/staff/Team.tsx`
- [x] Display Department details and leadership status
- [x] Display active squad assignments and timeline

#### 3. Complaint Management Page (`/complaint`) - `src/pages/staff/Complaint.tsx`
- [x] Created `src/pages/staff/Complaint.tsx`
- [x] List assigned complaints & squad operations
- [x] Filter by status: All, Active, Completed, Emergency
- [x] Click to navigate to Complaint Detail (`/staff/complaint/:id`)

#### 4. Complaint Detail Page (`/complaint/:id`) - `src/pages/staff/ComplaintDetail.tsx`
- [x] Created `src/pages/staff/ComplaintDetail.tsx`
- [x] Display full complaint details & operational timeline
- [x] **Action Buttons** based on current status & Team Leader role:
  - **Accept** (if assigned not accepted)
  - **Start Work** (if accepted)
  - **Complete & Resolve** (with resolution note)
  - **Transfer** (to peer staff)
  - **Return to Dept** (to department head)

#### 5. Profile Page (`/profile`) - `src/pages/staff/ProfilePage.tsx`
- [x] Fetch profile data (`GET /api/staff/profile`)
- [x] Display: Name, Email, Contact, Department, Municipality, Employee ID, Onboarded Date
- [x] **Edit Mode**: Update contact number & address (`PATCH /api/staff/profile`)

---

### Phase 2: Enhanced Features (Medium Priority)

#### 5. Schedule/Calendar Page (`/schedule`) - **NEW PAGE NEEDED**
- [ ] Create `src/pages/staff/Schedule.tsx`
- [ ] Calendar view of field work schedule (`GET /api/staff/schedule`)
- [ ] Monthly/Weekly/Daily views
- [ ] Click assignment to navigate to Complaint Detail

#### 6. Department Queue Page (`/department-queue`) - **BLOCKED**
- [ ] Create `src/pages/staff/DepartmentQueue.tsx`
- [ ] ⚠️ **Blocked by backend bug** - 500 error on `GET /api/staff/department-queue`
- [ ] Once fixed: Show queue with filters (category, priority, date)

---

### Phase 3: API Integration & Utilities

#### 7. Staff API Extensions (`src/api/modules/staff.api.ts`)
Current file only has department-head staff management APIs. Need to add **staff self-service APIs**:

- [ ] `getMyProfile()` - `GET /api/staff/profile`
- [ ] `updateMyProfile(data)` - `PATCH /api/staff/profile`
- [ ] `getMyDepartment()` - `GET /api/staff/my-department`
- [ ] `getMyAssignments()` - `GET /api/staff/my-assignments`
- [ ] `getMySchedule()` - `GET /api/staff/schedule`
- [ ] `getDepartmentQueue()` - `GET /api/staff/department-queue` (when fixed)
- [ ] `acknowledgeAssignment(id)` - `PATCH /api/staff/assignments/:id/acknowledge`
- [ ] `acceptAssignment(id)` - `POST /api/staff/assignments/:id/accept`
- [ ] `startAssignment(id)` - `POST /api/staff/assignments/:id/start`
- [ ] `completeAssignment(id)` - `POST /api/staff/assignments/:id/complete`
- [ ] `transferAssignment(id, data)` - `POST /api/staff/assignments/:id/transfer`
- [ ] `returnToDept(id, data)` - `POST /api/staff/assignments/:id/return-to-dept`

#### 8. Type Definitions (`src/api/types/staff.types.ts`)
- [ ] Add types for: `StaffProfile`, `DepartmentInfo`, `Assignment`, `ScheduleItem`, `ComplaintDetail`
- [ ] Add request/response types for all new API calls

---

### Phase 4: Routing & Navigation

#### 9. Route Configuration
- [ ] Add routes in `src/routes/` or `App.tsx` for:
  - `/staff/dashboard` → `Homepage`
  - `/staff/complaint` → `ComplaintList`
  - `/staff/complaint/:id` → `ComplaintDetail`
  - `/staff/schedule` → `Schedule`
  - `/staff/profile` → `ProfilePage`
  - `/staff/department-queue` → `DepartmentQueue` (when unblocked)

#### 10. Navbar Updates (if needed)
Current navbar has "Complaint" linking to `/complaint`. May need:
- [ ] Update to `/staff/complaint` for consistency
- [ ] Consider adding "Schedule" and "Department Queue" to navbar if required

---

## Backend Bugs Blocking Frontend

| Bug | Endpoint | Impact | Status |
|-----|----------|--------|--------|
| Column `complaints.id` doesn't exist (should be `co_uid`) | `GET /api/staff/department-queue` | Blocks Department Queue page | 🐞 Backend fix needed |
| Column `acknowledged_at` missing in `team_members` | `PATCH /api/staff/assignments/:id/acknowledge` | Blocks Acknowledge action | 🐞 Schema migration needed |

---

## Implementation Order Recommendation

1. **Week 1**: Staff API extensions + Types + Dashboard (`Homepage.tsx`)
2. **Week 2**: Complaint List + Complaint Detail (core workflow)
3. **Week 3**: Profile Page + Schedule Page
4. **Week 4**: Department Queue (once backend fixed) + Polish

---

## Notes

- The navbar currently shows "Complaint" singular - consider "Complaints" or "My Assignments" for clarity
- Staff role has no "Team" or "Cross-Dept Teams" in navbar (unlike Department Head) - verify if intentional
- Notification page already works (reuses `NotificationInbox` component)
- Consider adding a "My Tasks" or "Field Work" label instead of generic "Complaint" for better UX