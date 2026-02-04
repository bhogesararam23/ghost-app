-- Ghost Network Prototype - Supabase Schema
-- This SQL file defines the core tables and RLS policies for:
--   - users
--   - contacts
--   - handshakes
--   - messages
--   - (optional) message_status
--
-- Apply this in your Supabase project's SQL editor or via the CLI.

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- USERS ----------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  public_key text not null unique,
  token_id text not null unique,
  warning_acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- A user can only see/update their own user row
create policy "Users can select own row"
  on public.users
  for select
  using (auth.uid() = id);

create policy "Users can insert own row"
  on public.users
  for insert
  with check (auth.uid() = id);

create policy "Users can update own row"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- CONTACTS -------------------------------------------------------------------

create table if not exists public.contacts (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.users(id) on delete cascade,
  peer_user_id uuid not null references public.users(id) on delete cascade,
  session_key_material text not null,
  display_name_enc text,
  typing_enabled boolean not null default false,
  read_receipts_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (owner_id, peer_user_id)
);

alter table public.contacts enable row level security;

-- Only the owner can see their contacts
create policy "Contacts are visible to owner only"
  on public.contacts
  for select
  using (auth.uid() = owner_id);

create policy "Contacts can be inserted by owner"
  on public.contacts
  for insert
  with check (auth.uid() = owner_id);

create policy "Contacts can be updated by owner"
  on public.contacts
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Contacts can be deleted by owner"
  on public.contacts
  for delete
  using (auth.uid() = owner_id);

-- HANDSHAKES -----------------------------------------------------------------

create type public.handshake_status as enum ('pending', 'accepted', 'rejected', 'expired');

create table if not exists public.handshakes (
  id uuid primary key default uuid_generate_v4(),
  initiator_id uuid not null references public.users(id) on delete cascade,
  target_token_id text not null,
  status public.handshake_status not null default 'pending',
  one_time_public_key text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.handshakes enable row level security;

-- Handshake visibility:
-- - Initiator can see their own handshakes.
-- - Target user (resolved by target_token_id) can see relevant handshakes via RPC/select with RLS condition.

create policy "Initiator can manage own handshakes"
  on public.handshakes
  for all
  using (auth.uid() = initiator_id)
  with check (auth.uid() = initiator_id);

-- Optional: allow target user (by token_id lookup) to see pending handshakes.
-- This assumes the client only queries handshakes referencing their token_id.
create policy "Target user can see relevant handshakes"
  on public.handshakes
  for select
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.token_id = handshakes.target_token_id
    )
  );

-- MESSAGES -------------------------------------------------------------------

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  ciphertext text not null,
  nonce text not null,
  synthetic_timestamp timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Only sender or recipient can see message rows
create policy "Messages visible to sender or recipient"
  on public.messages
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Sender can insert messages"
  on public.messages
  for insert
  with check (auth.uid() = sender_id);

-- Optional: allow sender to delete their own messages (local deletion is separate)
create policy "Sender can delete own messages"
  on public.messages
  for delete
  using (auth.uid() = sender_id);

-- MESSAGE STATUS (OPTIONAL) --------------------------------------------------

create table if not exists public.message_status (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid not null references public.messages(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  delivered boolean not null default false,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (message_id, recipient_id)
);

alter table public.message_status enable row level security;

-- Recipient controls status records
create policy "Recipient manages message_status"
  on public.message_status
  for all
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- CLEANUP HELPERS ------------------------------------------------------------

-- Example helper function to delete expired messages.
-- You can wire this to a Supabase scheduled task.

create or replace function public.cleanup_expired_messages()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.messages
  where expires_at < now();

  delete from public.handshakes
  where expires_at < now()
    and status in ('pending', 'expired');
end;
$$;

grant execute on function public.cleanup_expired_messages() to service_role;


