-- Digital Poetry Journal — Supabase schema
-- Run this in the Supabase SQL editor for a fresh project.
-- Permissions are enforced here, at the database level, not just hidden
-- in the frontend — a viewer cannot write even if they tamper with the UI.

-- 1. Profiles ---------------------------------------------------------
-- Mirrors auth.users so we can look people up by email for sharing,
-- without exposing the auth schema directly to the client.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Journals -----------------------------------------------------------
create table if not exists public.journals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Poems ----------------------------------------------------------------
create table if not exists public.poems (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals (id) on delete cascade,
  title text,
  content text default '',
  poem_date date,
  spotify_url text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Journal access (view-only sharing) ------------------------------------
create table if not exists public.journal_access (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals (id) on delete cascade,
  viewer_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (journal_id, viewer_id)
);

-- Convenience view: journals shared with the current user.
create or replace view public.shared_journals as
  select j.*
  from public.journals j
  join public.journal_access ja on ja.journal_id = j.id
  where ja.viewer_id = auth.uid();

-- 5. Row-Level Security -----------------------------------------------------
alter table public.profiles enable row level security;
alter table public.journals enable row level security;
alter table public.poems enable row level security;
alter table public.journal_access enable row level security;

-- Profiles: anyone signed in can look up an email to share with.
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- Journals: owners have full control.
create policy "owners manage their journals"
  on public.journals for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Journals: shared viewers can read, never write.
create policy "viewers can read shared journals"
  on public.journals for select
  using (
    exists (
      select 1 from public.journal_access ja
      where ja.journal_id = journals.id
        and ja.viewer_id = auth.uid()
    )
  );

-- Poems: owners have full control via their parent journal.
create policy "owners manage poems in their journals"
  on public.poems for all
  using (
    exists (
      select 1 from public.journals j
      where j.id = poems.journal_id and j.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.journals j
      where j.id = poems.journal_id and j.owner_id = auth.uid()
    )
  );

-- Poems: shared viewers can read, never write.
create policy "viewers can read poems in shared journals"
  on public.poems for select
  using (
    exists (
      select 1 from public.journal_access ja
      where ja.journal_id = poems.journal_id and ja.viewer_id = auth.uid()
    )
  );

-- Journal access: only the journal owner manages who can view it.
create policy "owners manage sharing for their journals"
  on public.journal_access for all
  using (
    exists (
      select 1 from public.journals j
      where j.id = journal_access.journal_id and j.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.journals j
      where j.id = journal_access.journal_id and j.owner_id = auth.uid()
    )
  );

-- A viewer can see their own access rows (so they know what's shared with them).
create policy "viewers can see their own access grants"
  on public.journal_access for select
  using (auth.uid() = viewer_id);
