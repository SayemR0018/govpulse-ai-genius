
-- ENUMS
create type public.app_role as enum ('proposal_manager', 'sme', 'compliance_auditor');
create type public.rfp_status as enum ('ingestion','parsing','drafting','review','submitted');
create type public.risk_level as enum ('high','med','low');
create type public.req_status as enum ('pending','met','warning');
create type public.compliance_state as enum ('draft','approved','rejected','needs_review');

-- ORGANIZATIONS
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_tier text not null default 'enterprise',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.organizations to authenticated;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  current_org_id uuid references public.organizations(id) on delete set null,
  current_role_preview public.app_role,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ORG MEMBERS
create table public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
grant select, insert, delete on public.org_members to authenticated;
grant all on public.org_members to service_role;
alter table public.org_members enable row level security;

-- USER ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, org_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- SECURITY DEFINER HELPERS
create or replace function public.is_org_member(_uid uuid, _org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.org_members where user_id = _uid and org_id = _org)
$$;

create or replace function public.has_role(_uid uuid, _org uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _uid and org_id = _org and role = _role)
$$;

-- POLICIES: organizations
create policy "members read org" on public.organizations for select to authenticated
  using (public.is_org_member(auth.uid(), id));
create policy "auth users create org" on public.organizations for insert to authenticated
  with check (true);
create policy "managers update org" on public.organizations for update to authenticated
  using (public.has_role(auth.uid(), id, 'proposal_manager'));

-- POLICIES: profiles
create policy "own profile read" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "own profile upsert" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated
  using (id = auth.uid());

-- POLICIES: org_members
create policy "see own memberships" on public.org_members for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(auth.uid(), org_id));
create policy "join self" on public.org_members for insert to authenticated
  with check (user_id = auth.uid());

-- POLICIES: user_roles
create policy "see own roles in org" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(auth.uid(), org_id));

-- RFP PROJECTS
create table public.rfp_projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  issuing_agency text,
  budget numeric(14,2),
  due_date date,
  status public.rfp_status not null default 'ingestion',
  win_probability int default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.rfp_projects to authenticated;
grant all on public.rfp_projects to service_role;
alter table public.rfp_projects enable row level security;
create policy "org members read rfps" on public.rfp_projects for select to authenticated
  using (public.is_org_member(auth.uid(), org_id));
create policy "managers insert rfps" on public.rfp_projects for insert to authenticated
  with check (public.has_role(auth.uid(), org_id, 'proposal_manager'));
create policy "managers update rfps" on public.rfp_projects for update to authenticated
  using (public.has_role(auth.uid(), org_id, 'proposal_manager'));
create policy "managers delete rfps" on public.rfp_projects for delete to authenticated
  using (public.has_role(auth.uid(), org_id, 'proposal_manager'));

-- RFP REQUIREMENTS
create table public.rfp_requirements (
  id uuid primary key default gen_random_uuid(),
  rfp_id uuid not null references public.rfp_projects(id) on delete cascade,
  text_snippet text not null,
  risk_level public.risk_level not null default 'med',
  status public.req_status not null default 'pending',
  assigned_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.rfp_requirements to authenticated;
grant all on public.rfp_requirements to service_role;
alter table public.rfp_requirements enable row level security;
create policy "org read reqs" on public.rfp_requirements for select to authenticated
  using (exists (select 1 from public.rfp_projects r where r.id = rfp_id and public.is_org_member(auth.uid(), r.org_id)));
create policy "managers write reqs" on public.rfp_requirements for insert to authenticated
  with check (exists (select 1 from public.rfp_projects r where r.id = rfp_id and public.has_role(auth.uid(), r.org_id, 'proposal_manager')));
create policy "managers or auditors update reqs" on public.rfp_requirements for update to authenticated
  using (exists (select 1 from public.rfp_projects r where r.id = rfp_id
    and (public.has_role(auth.uid(), r.org_id, 'proposal_manager')
      or public.has_role(auth.uid(), r.org_id, 'compliance_auditor'))));
create policy "managers delete reqs" on public.rfp_requirements for delete to authenticated
  using (exists (select 1 from public.rfp_projects r where r.id = rfp_id and public.has_role(auth.uid(), r.org_id, 'proposal_manager')));

-- PROPOSAL SECTIONS
create table public.proposal_sections (
  id uuid primary key default gen_random_uuid(),
  rfp_id uuid not null references public.rfp_projects(id) on delete cascade,
  section_name text not null,
  ai_draft text,
  human_edits text,
  version_number int not null default 1,
  compliance_status public.compliance_state not null default 'draft',
  compliance_score int default 0,
  assigned_to uuid references auth.users(id) on delete set null,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.proposal_sections to authenticated;
grant all on public.proposal_sections to service_role;
alter table public.proposal_sections enable row level security;
create policy "org read sections" on public.proposal_sections for select to authenticated
  using (exists (select 1 from public.rfp_projects r where r.id = rfp_id and public.is_org_member(auth.uid(), r.org_id)));
create policy "managers insert sections" on public.proposal_sections for insert to authenticated
  with check (exists (select 1 from public.rfp_projects r where r.id = rfp_id and public.has_role(auth.uid(), r.org_id, 'proposal_manager')));
create policy "managers delete sections" on public.proposal_sections for delete to authenticated
  using (exists (select 1 from public.rfp_projects r where r.id = rfp_id and public.has_role(auth.uid(), r.org_id, 'proposal_manager')));
-- Updates: managers anywhere, SMEs only on assigned, auditors for compliance_status
create policy "section updates" on public.proposal_sections for update to authenticated
  using (
    exists (select 1 from public.rfp_projects r where r.id = rfp_id and (
      public.has_role(auth.uid(), r.org_id, 'proposal_manager')
      or public.has_role(auth.uid(), r.org_id, 'compliance_auditor')
      or (public.has_role(auth.uid(), r.org_id, 'sme') and assigned_to = auth.uid())
    ))
  );

-- SECTION VERSIONS (append-only)
create table public.section_versions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.proposal_sections(id) on delete cascade,
  content text not null,
  version_number int not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert on public.section_versions to authenticated;
grant all on public.section_versions to service_role;
alter table public.section_versions enable row level security;
create policy "org read versions" on public.section_versions for select to authenticated
  using (exists (
    select 1 from public.proposal_sections s
    join public.rfp_projects r on r.id = s.rfp_id
    where s.id = section_id and public.is_org_member(auth.uid(), r.org_id)
  ));
create policy "org insert versions" on public.section_versions for insert to authenticated
  with check (exists (
    select 1 from public.proposal_sections s
    join public.rfp_projects r on r.id = s.rfp_id
    where s.id = section_id and public.is_org_member(auth.uid(), r.org_id)
  ));

-- WORKSPACE COMMENTS
create table public.workspace_comments (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.proposal_sections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.workspace_comments to authenticated;
grant all on public.workspace_comments to service_role;
alter table public.workspace_comments enable row level security;
create policy "org read comments" on public.workspace_comments for select to authenticated
  using (exists (
    select 1 from public.proposal_sections s
    join public.rfp_projects r on r.id = s.rfp_id
    where s.id = section_id and public.is_org_member(auth.uid(), r.org_id)
  ));
create policy "members add comments" on public.workspace_comments for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.proposal_sections s
    join public.rfp_projects r on r.id = s.rfp_id
    where s.id = section_id and public.is_org_member(auth.uid(), r.org_id)
  ));
create policy "own delete comments" on public.workspace_comments for delete to authenticated
  using (user_id = auth.uid());

-- CONTENT LIBRARY
create table public.content_library (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  content_body text not null,
  tags text[] not null default '{}',
  reuse_count int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.content_library to authenticated;
grant all on public.content_library to service_role;
alter table public.content_library enable row level security;
create policy "org read library" on public.content_library for select to authenticated
  using (public.is_org_member(auth.uid(), org_id));
create policy "org insert library" on public.content_library for insert to authenticated
  with check (public.is_org_member(auth.uid(), org_id));
create policy "org update library" on public.content_library for update to authenticated
  using (public.is_org_member(auth.uid(), org_id));
create policy "org delete library" on public.content_library for delete to authenticated
  using (public.is_org_member(auth.uid(), org_id));

-- ACTIVITY LOG (simple feed)
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor text not null default 'AI',
  message text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.activity_log to authenticated;
grant all on public.activity_log to service_role;
alter table public.activity_log enable row level security;
create policy "org read activity" on public.activity_log for select to authenticated
  using (public.is_org_member(auth.uid(), org_id));
create policy "org insert activity" on public.activity_log for insert to authenticated
  with check (public.is_org_member(auth.uid(), org_id));

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_rfp_projects_updated before update on public.rfp_projects
  for each row execute function public.touch_updated_at();
create trigger trg_proposal_sections_updated before update on public.proposal_sections
  for each row execute function public.touch_updated_at();

-- NEW USER BOOTSTRAP: profile + starter org + proposal_manager role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_org_id uuid;
  display text;
begin
  display := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1));

  insert into public.organizations (name) values (display || '''s Organization')
    returning id into new_org_id;

  insert into public.profiles (id, display_name, current_org_id, current_role_preview)
    values (new.id, display, new_org_id, 'proposal_manager');

  insert into public.org_members (org_id, user_id) values (new_org_id, new.id);

  insert into public.user_roles (user_id, org_id, role) values
    (new.id, new_org_id, 'proposal_manager'),
    (new.id, new_org_id, 'sme'),
    (new.id, new_org_id, 'compliance_auditor');

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
