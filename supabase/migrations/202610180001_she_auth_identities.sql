-- Add only the trusted identity mapping used by SHE's server-side sign-in.
-- Existing profiles, memberships, products, prices and commissions are untouched.
begin;

create table if not exists public.she_auth_identities (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('line', 'self')),
  subject text not null check (length(subject) between 1 and 255),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (provider, subject),
  unique (provider, user_id)
);

alter table public.she_auth_identities enable row level security;
revoke all on public.she_auth_identities from anon, authenticated;
grant select, insert, update, delete on public.she_auth_identities to service_role;
comment on table public.she_auth_identities is
  'Server-verified LINE/SELF subject mapping; never grants membership entitlements.';

commit;
