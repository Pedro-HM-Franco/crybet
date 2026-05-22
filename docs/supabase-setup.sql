-- CRYBET Supabase setup
-- Fictional meme app only. No real gambling, no real money.

create table if not exists public.crybet_state (
  id text primary key default 'main',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.crybet_state enable row level security;

drop policy if exists "crybet_state_read_all" on public.crybet_state;
drop policy if exists "crybet_state_insert_all" on public.crybet_state;
drop policy if exists "crybet_state_update_all" on public.crybet_state;

create policy "crybet_state_read_all"
on public.crybet_state
for select
to anon
using (true);

create policy "crybet_state_insert_all"
on public.crybet_state
for insert
to anon
with check (id = 'main');

create policy "crybet_state_update_all"
on public.crybet_state
for update
to anon
using (id = 'main')
with check (id = 'main');

insert into public.crybet_state (id, data)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;

-- Enable Realtime for this table.
alter publication supabase_realtime add table public.crybet_state;
