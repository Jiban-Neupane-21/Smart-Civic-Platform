create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

create type user_role as enum (
  'superadmin', 'municipality_head', 'department_head', 'staff', 'citizen'
);
create type account_status as enum ('active', 'inactive', 'suspended');
create type employee_status as enum ('active', 'inactive', 'suspended', 'terminated');
create type team_role as enum ('assistant_head', 'member');
create type complaint_status as enum ('pending', 'in_progress', 'resolved', 'rejected', 'reopened');
create type record_type as enum ('complaint', 'request', 'inquiry');
create type assignment_status as enum ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
create type priority as enum ('low', 'medium', 'high', 'urgent');
create type vehicle_status as enum ('available', 'in_use', 'maintenance', 'retired');
create type route_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
create type stop_status as enum ('pending', 'arrived', 'completed', 'skipped');
create type budget_status as enum ('draft', 'proposed', 'approved', 'rejected', 'closed');
create type transaction_type as enum ('purchase', 'payment', 'refund', 'salary', 'misc');
create type payment_type as enum ('online', 'cash', 'cheque');
create type transaction_status as enum ('pending', 'successful', 'failed');
create type broadcast_type as enum ('individual', 'department', 'municipality', 'all', 'team');
create type department_type as enum (
  'electricity', 'water', 'road', 'plumbing', 'health', 'education', 'public_works'
);
create type announcement_audience as enum (
  'all', 'citizen', 'staff', 'all_staff', 'all_citizen',
  'all_department', 'department', 'all_team', 'team'
);
create type audit_action as enum (
  'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
  'ASSIGN', 'REASSIGN', 'STATUS_CHANGE', 'APPROVE', 'REJECT', 'EXPORT'
);
create type severity as enum ('info', 'warning', 'critical');
create type media_context as enum (
  'complaint', 'assignment_proof', 'route_stop_proof', 'announcement', 'profile_picture'
);
create type gender as enum ('male', 'female', 'other', 'prefer_not_to_say');
create type notification_pref as enum ('email', 'sms', 'both', 'none');

-- PROFILES first (no FKs yet)
create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text not null,
  email             text not null unique,
  phone             text,
  role              user_role not null default 'citizen',
  account_status    account_status not null default 'active',
  municipality_id   uuid,
  department_id     uuid,
  profile_picture   text,
  last_login_at     timestamptz,
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- MUNICIPALITIES
create table municipalities (
  m_uid             uuid primary key default uuid_generate_v4(),
  official_name     text not null,
  slug              text unique,
  boundary          geometry(multipolygon, 4326),
  region_state      text,
  country_code      char(2) not null default 'NP',
  time_zone         text not null default 'Asia/Kathmandu',
  office_address    text,
  login_email       text not null unique,
  support_email     text,
  emergency_contact text,
  website_url       text,
  head_id           uuid references profiles(id) deferrable initially deferred,
  is_active         boolean not null default true,
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Add municipality FK to profiles
alter table profiles
  add constraint fk_profiles_municipality
  foreign key (municipality_id) references municipalities(m_uid);

-- DEPARTMENTS
create table departments (
  d_uid             uuid primary key default uuid_generate_v4(),
  municipality_id   uuid not null references municipalities(m_uid) on delete restrict,
  dept_name         text not null,
  department_type   department_type,
  head_id           uuid references profiles(id),
  dept_contact      text,
  dept_email        text,
  operating_budget  numeric check (operating_budget >= 0),
  is_active         boolean not null default true,
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Add department FK to profiles
alter table profiles
  add constraint fk_profiles_department
  foreign key (department_id) references departments(d_uid);

-- STAFF
create table staff (
  s_uid             uuid primary key default uuid_generate_v4(),
  profile_id        uuid not null unique references profiles(id) on delete cascade,
  municipality_id   uuid references municipalities(m_uid),
  department_id     uuid references departments(d_uid),
  employee_id       text unique,
  staff_role        user_role not null
                    check (staff_role in ('municipality_head', 'department_head', 'staff')),
  shift_start       time,
  shift_end         time,
  employee_status   employee_status not null default 'active',
  joined_date       date,
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- CITIZENS
create table citizens (
  id                uuid primary key references profiles(id) on delete cascade,
  first_name        text not null,
  middle_name       text,
  last_name         text not null,
  date_of_birth     date,
  gender            gender,
  home_address      text,
  permanent_address text,
  ward_number       text,
  notification_pref notification_pref not null default 'email',
  last_active_at    timestamptz,
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);


create table teams (
  t_uid             uuid primary key default uuid_generate_v4(),
  department_id     uuid not null references departments(d_uid) on delete restrict,
  team_name         text not null,
  specialty         text,
  team_head_id      uuid references profiles(id),
  is_available      boolean not null default true,
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table team_members (
  tm_uid            uuid primary key default uuid_generate_v4(),
  team_id           uuid not null references teams(t_uid) on delete cascade,
  staff_profile_id  uuid not null references profiles(id) on delete cascade,
  role              team_role not null default 'member',
  joined_at         timestamptz not null default now(),
  unique (team_id, staff_profile_id)
);

create table complaint_categories (
  category_id       uuid primary key default uuid_generate_v4(),
  municipality_id   uuid references municipalities(m_uid),
  name              text not null,
  description       text,
  icon_name         text,
  color_hex         char(7),
  display_order     int not null default 0,
  is_active         boolean not null default true,
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table sla_rules (
  sla_uid               uuid primary key default uuid_generate_v4(),
  municipality_id       uuid not null references municipalities(m_uid),
  category_id           uuid references complaint_categories(category_id),
  priority              priority not null,
  first_response_hours  int not null check (first_response_hours > 0),
  resolution_hours      int not null check (resolution_hours > first_response_hours),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table complaints (
  co_uid            uuid primary key default uuid_generate_v4(),
  citizen_id        uuid not null references profiles(id),
  municipality_id   uuid not null references municipalities(m_uid),
  department_id     uuid references departments(d_uid),
  category_id       uuid references complaint_categories(category_id),
  record_type       record_type not null default 'complaint',
  priority          priority not null default 'medium',
  title             text not null,
  description       text,
  status            complaint_status not null default 'pending',
  resolved_at       timestamptz,
  resolution_note   text,
  latitude          double precision,
  longitude         double precision,
  location_point    geometry(point, 4326)
                    generated always as (
                      case
                        when latitude is not null and longitude is not null
                        then st_setsrid(st_makepoint(longitude, latitude), 4326)
                      end
                    ) stored,
  address_hint      text,
  reported_at       timestamptz not null default now(),
  is_anonymous      boolean not null default false,
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  updated_at        timestamptz not null default now()
);

create table media (
  media_uid         uuid primary key default uuid_generate_v4(),
  uploaded_by       uuid not null references profiles(id),
  context           media_context not null,
  entity_id         uuid not null,
  storage_url       text not null,
  file_name         text,
  mime_type         text,
  size_bytes        bigint check (size_bytes > 0),
  thumbnail_url     text,
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now()
);

create table vehicles (
  v_uid             uuid primary key default uuid_generate_v4(),
  municipality_id   uuid not null references municipalities(m_uid),
  department_id     uuid references departments(d_uid),
  registration_no   text not null unique,
  vehicle_type      text not null,
  make_model        text,
  capacity_kg       numeric check (capacity_kg > 0),
  manufacture_year  smallint,
  status            vehicle_status not null default 'available',
  last_serviced_on  date,
  next_service_due  date,
  notes             text,
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table assignments (
  a_uid             uuid primary key default uuid_generate_v4(),
  complaint_id      uuid not null references complaints(co_uid),
  team_id           uuid references teams(t_uid),
  staff_id          uuid references profiles(id),
  authorizer_id     uuid not null references profiles(id),
  priority          priority not null default 'medium',
  status            assignment_status not null default 'pending',
  scheduled_start   timestamptz,
  actual_start      timestamptz,
  actual_end        timestamptz check (actual_end >= actual_start),
  labor_hours       numeric check (labor_hours >= 0),
  materials_used    text,
  equipment_used    text,
  internal_note     text,
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint chk_assignment_assignee check (
    team_id is not null or staff_id is not null
  )
);

create table garbage_routes (
  gr_uid            uuid primary key default uuid_generate_v4(),
  municipality_id   uuid not null references municipalities(m_uid),
  department_id     uuid references departments(d_uid),
  team_id           uuid references teams(t_uid),
  vehicle_id        uuid references vehicles(v_uid),
  route_title       text not null,
  route_date        date not null,
  status            route_status not null default 'scheduled',
  optimized_path    jsonb,
  scheduled_start   timestamptz,
  actual_start      timestamptz,
  actual_end        timestamptz check (actual_end >= actual_start),
  total_distance_km numeric,
  notes             text,
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table route_stops (
  stop_uid          uuid primary key default uuid_generate_v4(),
  route_id          uuid not null references garbage_routes(gr_uid) on delete cascade,
  complaint_id      uuid references complaints(co_uid),
  stop_order        smallint not null check (stop_order > 0),
  stop_label        text,
  latitude          double precision,
  longitude         double precision,
  address           text,
  status            stop_status not null default 'pending',
  arrived_at        timestamptz,
  completed_at      timestamptz,
  skip_reason       text,
  unique (route_id, stop_order)
);

create table budgets (
  b_uid             uuid primary key default uuid_generate_v4(),
  parent_b_uid      uuid references budgets(b_uid),
  municipality_id   uuid not null references municipalities(m_uid),
  department_id     uuid references departments(d_uid),
  title             text not null,
  fiscal_year       text not null,
  currency_code     char(3) not null default 'NPR',
  total_allocated   numeric not null check (total_allocated >= 0),
  status            budget_status not null default 'draft',
  notes             text,
  approved_by       uuid references profiles(id),
  approved_at       timestamptz,
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table spending_logs (
  sl_uid            uuid primary key default uuid_generate_v4(),
  budget_id         uuid not null references budgets(b_uid),
  assignment_id     uuid references assignments(a_uid),
  team_id           uuid references teams(t_uid),
  staff_id          uuid references profiles(id),
  vendor_name       text,
  transaction_type  transaction_type not null,
  amount            numeric not null check (amount > 0),
  currency_code     char(3) not null default 'NPR',
  payment_method    text,
  reference_no      text,
  invoice_url       text,
  status            transaction_status not null default 'pending',
  description       text,
  transaction_date  date not null,
  recorded_by       uuid references profiles(id),
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table announcements (
  ann_uid               uuid primary key default uuid_generate_v4(),
  municipality_id       uuid not null references municipalities(m_uid),
  department_id         uuid references departments(d_uid),
  created_by            uuid not null references profiles(id),
  title                 text not null,
  body                  text not null,
  audience              announcement_audience not null,
  target_department_id  uuid references departments(d_uid),
  target_team_id        uuid references teams(t_uid),
  is_pinned             boolean not null default false,
  published_at          timestamptz,
  expires_at            timestamptz,
  is_deleted            boolean not null default false,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table notifications (
  n_uid                 uuid primary key default uuid_generate_v4(),
  municipality_id       uuid references municipalities(m_uid),
  department_id         uuid references departments(d_uid),
  sender_id             uuid references profiles(id),
  scope                 broadcast_type not null,
  target_municipality_id uuid references municipalities(m_uid),
  target_department_id  uuid references departments(d_uid),
  target_team_id        uuid references teams(t_uid),
  target_profile_id     uuid references profiles(id),
  subject               text not null,
  body                  text not null,
  deep_link             text,
  is_pinned             boolean not null default false,
  expires_at            timestamptz,
  is_deleted            boolean not null default false,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now()
);

create table notification_reads (
  nr_uid            uuid primary key default uuid_generate_v4(),
  notification_id   uuid not null references notifications(n_uid) on delete cascade,
  recipient_id      uuid not null references profiles(id) on delete cascade,
  read_at           timestamptz,
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  unique (notification_id, recipient_id)
);

create table feedback (
  f_uid             uuid primary key default uuid_generate_v4(),
  complaint_id      uuid not null references complaints(co_uid),
  citizen_id        uuid not null references profiles(id),
  team_id           uuid references teams(t_uid),
  staff_id          uuid references profiles(id),
  rating            smallint not null check (rating between 1 and 5),
  comment           text,
  is_anonymous      boolean not null default false,
  is_deleted        boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table audit_logs (
  al_uid            uuid primary key default uuid_generate_v4(),
  action_by         uuid references profiles(id),
  action_role       user_role not null,
  municipality_id   uuid references municipalities(m_uid),
  department_id     uuid references departments(d_uid),
  table_name        text not null,
  record_id         uuid not null,
  action            audit_action not null,
  old_value         jsonb,
  new_value         jsonb,
  ip_address        inet,
  user_agent        text,
  request_id        text,
  severity          severity not null default 'info',
  note              text,
  created_at        timestamptz not null default now()
);

create index idx_profiles_municipality     on profiles(municipality_id);
create index idx_profiles_department       on profiles(department_id);
create index idx_profiles_role             on profiles(role);
create index idx_staff_profile             on staff(profile_id);
create index idx_staff_municipality        on staff(municipality_id);
create index idx_staff_department          on staff(department_id);
create index idx_complaints_citizen        on complaints(citizen_id);
create index idx_complaints_municipality   on complaints(municipality_id);
create index idx_complaints_department     on complaints(department_id);
create index idx_complaints_status         on complaints(status);
create index idx_complaints_location       on complaints using gist(location_point);
create index idx_assignments_complaint     on assignments(complaint_id);
create index idx_assignments_team          on assignments(team_id);
create index idx_assignments_status        on assignments(status);
create index idx_spending_budget           on spending_logs(budget_id);
create index idx_audit_table_record        on audit_logs(table_name, record_id);
create index idx_audit_action_by           on audit_logs(action_by);
create index idx_notifications_scope       on notifications(scope);
create index idx_notif_reads_recipient     on notification_reads(recipient_id);

-- updated_at function
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to all tables with updated_at
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','municipalities','departments','staff','citizens',
    'teams','complaint_categories','sla_rules','complaints',
    'vehicles','assignments','garbage_routes','budgets',
    'spending_logs','announcements','feedback'
  ] loop
    execute format(
      'create trigger trg_%s_updated_at
       before update on %s
       for each row execute function set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- handle_new_user trigger
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Unknown'),
    new.email,
    'citizen'
  );

  insert into citizens (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', 'Unknown'),
    coalesce(new.raw_user_meta_data->>'last_name', 'Unknown')
  );

  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
  
  
  create or replace view v_complaints as
select
  c.co_uid, c.title, c.description, c.record_type, c.status, c.priority,
  c.reported_at, c.resolved_at, c.latitude, c.longitude, c.address_hint,
  p.full_name   as citizen_name,
  p.email       as citizen_email,
  ci.ward_number,
  cc.name       as category_name,
  d.department_type::text as service_type,
  m.official_name as municipality_name,
  d.dept_name     as department_name,
  sr.first_response_hours,
  sr.resolution_hours,
  c.reported_at + (sr.first_response_hours || ' hours')::interval as response_deadline,
  c.reported_at + (sr.resolution_hours     || ' hours')::interval as resolution_deadline,
  (
    c.status not in ('resolved', 'rejected') and
    now() > c.reported_at + (sr.resolution_hours || ' hours')::interval
  ) as is_sla_breached
from complaints c
join profiles      p  on p.id            = c.citizen_id
left join citizens ci on ci.id           = c.citizen_id
left join complaint_categories cc on cc.category_id = c.category_id
left join departments d on d.d_uid       = c.department_id
join municipalities m  on m.m_uid        = c.municipality_id
left join sla_rules sr on sr.municipality_id = c.municipality_id
  and sr.priority = c.priority
  and sr.is_active = true
where c.is_deleted = false;

create or replace view v_budget_utilisation as
select
  b.b_uid, b.title, b.fiscal_year, b.currency_code,
  b.total_allocated, b.status,
  m.official_name as municipality_name,
  d.dept_name     as department_name,
  coalesce(sum(sl.amount), 0)                              as total_spent,
  b.total_allocated - coalesce(sum(sl.amount), 0)          as remaining,
  round(
    coalesce(sum(sl.amount), 0) / nullif(b.total_allocated, 0) * 100, 2
  )                                                        as utilisation_pct
from budgets b
join municipalities m      on m.m_uid   = b.municipality_id
left join departments d    on d.d_uid   = b.department_id
left join spending_logs sl on sl.budget_id = b.b_uid
  and sl.is_deleted = false
  and sl.status = 'successful'
where b.is_deleted = false
group by b.b_uid, m.official_name, d.dept_name;

create or replace view v_team_workload as
select
  t.t_uid, t.team_name, t.specialty, t.is_available,
  d.dept_name       as dept_name,
  m.official_name   as municipality_name,
  count(distinct a.a_uid) filter (
    where a.status in ('assigned', 'in_progress')
  )                 as active_assignments,
  count(distinct tm.tm_uid) as member_count,
  round(avg(f.rating)::numeric, 2) as avg_rating
from teams t
left join departments  d  on d.d_uid        = t.department_id
left join municipalities m on m.m_uid       = d.municipality_id
left join assignments  a  on a.team_id      = t.t_uid and a.is_deleted = false
left join team_members tm on tm.team_id     = t.t_uid
left join feedback     f  on f.team_id      = t.t_uid and f.is_deleted = false
where t.is_deleted = false
group by t.t_uid, d.dept_name, m.official_name;

create or replace view v_sla_breaches as
select
  c.co_uid, c.title, c.status, c.priority,
  c.municipality_id, c.department_id, c.reported_at,
  sr.resolution_hours,
  c.reported_at + (sr.resolution_hours || ' hours')::interval as deadline,
  extract(epoch from (
    now() - (c.reported_at + (sr.resolution_hours || ' hours')::interval)
  )) / 3600 as hours_overdue
from complaints c
join sla_rules sr on sr.municipality_id = c.municipality_id
  and sr.priority = c.priority
  and sr.is_active = true
where c.is_deleted = false
  and c.status not in ('resolved', 'rejected')
  and now() > c.reported_at + (sr.resolution_hours || ' hours')::interval;
  
  
  alter table municipalities      enable row level security;
alter table departments         enable row level security;
alter table staff               enable row level security;
alter table citizens            enable row level security;
alter table profiles            enable row level security;
alter table complaints          enable row level security;
alter table assignments         enable row level security;
alter table teams               enable row level security;
alter table team_members        enable row level security;
alter table budgets             enable row level security;
alter table spending_logs       enable row level security;
alter table announcements       enable row level security;
alter table notifications       enable row level security;
alter table notification_reads  enable row level security;
alter table feedback            enable row level security;
alter table audit_logs          enable row level security;

create or replace function auth_role()
returns user_role language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_municipality_id()
returns uuid language sql stable security definer as $$
  select municipality_id from profiles where id = auth.uid()
$$;

create or replace function auth_department_id()
returns uuid language sql stable security definer as $$
  select department_id from profiles where id = auth.uid()
$$;

create policy "superadmin can manage municipalities"
  on municipalities for all
  using (auth_role() = 'superadmin')
  with check (auth_role() = 'superadmin');

create policy "authenticated users can read active municipalities"
  on municipalities for select
  using (is_active = true and is_deleted = false);

create policy "municipality_head can manage own departments"
  on departments for all
  using (auth_role() = 'municipality_head' and municipality_id = auth_municipality_id())
  with check (auth_role() = 'municipality_head' and municipality_id = auth_municipality_id());

create policy "staff can read own department"
  on departments for select
  using (is_deleted = false and (municipality_id = auth_municipality_id() or d_uid = auth_department_id()));

create policy "municipality_head can manage staff"
  on staff for all
  using (auth_role() = 'municipality_head' and municipality_id = auth_municipality_id())
  with check (auth_role() = 'municipality_head' and municipality_id = auth_municipality_id());

create policy "department_head can manage own dept staff"
  on staff for all
  using (auth_role() = 'department_head' and department_id = auth_department_id())
  with check (auth_role() = 'department_head' and department_id = auth_department_id());

create policy "staff can read own record"
  on staff for select
  using (profile_id = auth.uid());

create policy "citizen owns their row"
  on citizens for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "staff can read citizens"
  on citizens for select
  using (auth_role() in ('superadmin','municipality_head','department_head','staff'));

create policy "users read own profile"
  on profiles for select
  using (id = auth.uid());

create policy "users update own profile"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "staff can read profiles in municipality"
  on profiles for select
  using (
    auth_role() in ('superadmin','municipality_head','department_head','staff')
    and (municipality_id = auth_municipality_id() or id = auth.uid())
  );

create policy "citizen can manage own complaints"
  on complaints for all
  using (citizen_id = auth.uid())
  with check (citizen_id = auth.uid());

create policy "staff can read complaints in municipality"
  on complaints for select
  using (municipality_id = auth_municipality_id() and is_deleted = false);

create policy "dept_head and staff can update complaints"
  on complaints for update
  using (
    auth_role() in ('department_head','staff','municipality_head')
    and municipality_id = auth_municipality_id()
  );
  
  -- ============================================================
-- SCHEMA ADDITIONS FOR REGISTRATION & LOGIN SYSTEM
-- Run this on top of your existing smart_civic_platform.sql
-- ============================================================


-- ------------------------------------------------------------
-- 1. EXTEND EXISTING ENUMS
-- ------------------------------------------------------------

alter type audit_action add value if not exists 'INVITE';
alter type audit_action add value if not exists 'PASSWORD_RESET';


-- ------------------------------------------------------------
-- 2. NEW COLUMNS ON EXISTING TABLES
-- ------------------------------------------------------------

-- profiles: force password reset flag, who invited this user, email verification
alter table profiles
  add column if not exists force_password_reset  boolean     not null default false,
  add column if not exists invited_by            uuid        references profiles(id) on delete set null,
  add column if not exists email_verified_at     timestamptz;

-- municipalities: optional domain restriction + citizen registration code
alter table municipalities
  add column if not exists login_domain          text,
  add column if not exists registration_code     text unique;

-- staff: when invite was sent, when they first logged in after accepting
alter table staff
  add column if not exists invited_at            timestamptz,
  add column if not exists onboarded_at          timestamptz;


-- ------------------------------------------------------------
-- 3. NEW TABLE: staff_invitations
-- ------------------------------------------------------------

create table if not exists staff_invitations (
  inv_uid           uuid primary key default uuid_generate_v4(),

  -- The raw token is emailed; only the hash is stored here
  token_hash        text not null unique,

  target_email      text not null,
  target_role       user_role not null
                    check (target_role in ('staff', 'department_head', 'municipality_head')),

  municipality_id   uuid not null references municipalities(m_uid) on delete cascade,
  department_id     uuid references departments(d_uid) on delete cascade,

  invited_by        uuid not null references profiles(id) on delete cascade,

  -- Lifecycle
  status            text not null default 'pending'
                    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  accepted_at       timestamptz,
  expires_at        timestamptz not null default (now() + interval '72 hours'),

  created_at        timestamptz not null default now()
);

-- Indexes for the lookup patterns you will always run
create index if not exists idx_invitations_token_hash    on staff_invitations(token_hash);
create index if not exists idx_invitations_email         on staff_invitations(target_email);
create index if not exists idx_invitations_municipality  on staff_invitations(municipality_id);
create index if not exists idx_invitations_status        on staff_invitations(status);


-- ------------------------------------------------------------
-- 4. NEW TABLE: refresh_tokens (server-side session revocation)
-- ------------------------------------------------------------

create table if not exists refresh_tokens (
  rt_uid            uuid primary key default uuid_generate_v4(),
  profile_id        uuid not null references profiles(id) on delete cascade,

  -- Store hash of the token, never the raw value
  token_hash        text not null unique,

  issued_at         timestamptz not null default now(),
  expires_at        timestamptz not null,
  is_revoked        boolean not null default false,
  revoked_at        timestamptz,

  -- Useful for knowing which device/session to show in a "manage sessions" UI
  ip_address        inet,
  user_agent        text
);

create index if not exists idx_refresh_tokens_profile    on refresh_tokens(profile_id);
create index if not exists idx_refresh_tokens_hash       on refresh_tokens(token_hash);


-- ------------------------------------------------------------
-- 5. RLS FOR NEW TABLES
-- ------------------------------------------------------------

alter table staff_invitations  enable row level security;
alter table refresh_tokens     enable row level security;

-- Invitations: superadmin sees all; municipality_head sees own municipality; dept_head sees own dept
create policy "superadmin manages all invitations"
  on staff_invitations for all
  using (auth_role() = 'superadmin')
  with check (auth_role() = 'superadmin');

create policy "municipality_head manages own municipality invitations"
  on staff_invitations for all
  using (
    auth_role() = 'municipality_head'
    and municipality_id = auth_municipality_id()
  )
  with check (
    auth_role() = 'municipality_head'
    and municipality_id = auth_municipality_id()
  );

create policy "department_head manages own department invitations"
  on staff_invitations for all
  using (
    auth_role() = 'department_head'
    and department_id = auth_department_id()
  )
  with check (
    auth_role() = 'department_head'
    and department_id = auth_department_id()
    -- dept_head can only invite staff, not dept_head or above
    and target_role = 'staff'
  );

-- Public read on pending invite by token_hash (needed for accept-invite endpoint)
-- Backend uses service role so this is a safety net only
create policy "anyone can read pending invitation by token"
  on staff_invitations for select
  using (status = 'pending' and expires_at > now());

-- Refresh tokens: users can only see and revoke their own
create policy "users manage own refresh tokens"
  on refresh_tokens for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "superadmin manages all refresh tokens"
  on refresh_tokens for all
  using (auth_role() = 'superadmin')
  with check (auth_role() = 'superadmin');


-- ------------------------------------------------------------
-- 6. AUTO-EXPIRE INVITATIONS (helper function + scheduled use)
-- ------------------------------------------------------------

-- Call this from a cron job or at the start of every accept-invite request
create or replace function expire_stale_invitations()
returns void language sql security definer as $$
  update staff_invitations
  set status = 'expired'
  where status = 'pending'
    and expires_at < now();
$$;


-- ------------------------------------------------------------
-- 7. updated_at TRIGGER for staff_invitations (matches your pattern)
-- ------------------------------------------------------------
-- staff_invitations has no updated_at column by design (it's an event log).
-- refresh_tokens also intentionally has no updated_at.
-- No trigger needed for either.


-- ------------------------------------------------------------
-- 8. USEFUL VIEW: pending invitations per municipality
-- ------------------------------------------------------------

create or replace view v_pending_invitations as
select
  i.inv_uid,
  i.target_email,
  i.target_role,
  i.status,
  i.expires_at,
  i.created_at,
  m.official_name  as municipality_name,
  d.dept_name      as department_name,
  p.full_name      as invited_by_name,
  p.email          as invited_by_email
from staff_invitations i
join municipalities  m on m.m_uid    = i.municipality_id
left join departments d on d.d_uid   = i.department_id
join profiles        p on p.id       = i.invited_by
where i.status = 'pending'
  and i.expires_at > now();
  
  