-- Clarvy waitlist (keep emails) + purge HireOdds product tables.
-- Preserves: waitlist_signups (legacy), clarvy_waitlist (new), contact_messages.

create table if not exists public.clarvy_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'unknown'
    check (role in ('student', 'firm', 'unknown')),
  source text not null default 'site',
  created_at timestamptz not null default now()
);

create unique index if not exists clarvy_waitlist_email_uidx
  on public.clarvy_waitlist (lower(email));

create index if not exists clarvy_waitlist_created_idx
  on public.clarvy_waitlist (created_at desc);

alter table public.clarvy_waitlist enable row level security;

grant insert on public.clarvy_waitlist to anon, authenticated;
grant select on public.clarvy_waitlist to authenticated;

drop policy if exists clarvy_waitlist_insert on public.clarvy_waitlist;
create policy clarvy_waitlist_insert
  on public.clarvy_waitlist
  for insert
  to anon, authenticated
  with check (true);

-- Copy any legacy waitlist emails into Clarvy waitlist (idempotent).
insert into public.clarvy_waitlist (email, role, source)
select lower(w.email), 'unknown', 'legacy_waitlist_signups'
from public.waitlist_signups w
where not exists (
  select 1 from public.clarvy_waitlist c where lower(c.email) = lower(w.email)
);

-- ---------------------------------------------------------------------------
-- Drop HireOdds / map / IDE surfaces (data wiped — Clarvy-only project)
-- ---------------------------------------------------------------------------

drop table if exists public.calendar_listing_events cascade;
drop table if exists public.user_connectors cascade;
drop table if exists public.map_scenes cascade;
drop table if exists public.map_places cascade;
drop table if exists public.map_profiles cascade;
drop table if exists public.ide_credits cascade;
drop table if exists public.ide_agent_sessions cascade;
drop table if exists public.platform_feedback cascade;
drop table if exists public.bug_reports cascade;
drop table if exists public.instagram_contacts cascade;
drop table if exists public.instagram_settings cascade;
drop table if exists public.hireodds_markets cascade;
drop table if exists public.internship_live_listings cascade;
drop table if exists public.notifications cascade;
drop table if exists public.user_profiles cascade;

-- Ensure Talk-to-us / contact form can insert from the public site
grant insert on public.contact_messages to anon, authenticated;
drop policy if exists contact_messages_insert on public.contact_messages;
create policy contact_messages_insert
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (true);
