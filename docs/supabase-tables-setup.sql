-- ENFE 2026 Supabase table setup
-- Fictional social game only. No real money, no deposits, no withdrawals.
-- Run this in Supabase SQL Editor. It does not delete the legacy crybet_state table.

create table if not exists public.enfe_app_meta (
  id text primary key default 'main',
  platform text not null default 'enfe-clean-v2',
  graph jsonb not null default '[]'::jsonb,
  market_heat integer not null default 38,
  volatility integer not null default 22,
  event_status text default 'Sprint criativo carregando',
  top_event text default 'Sprint Editorial de Sexta',
  total_coin_flow integer not null default 0,
  active_trigger_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.enfe_users (
  id text primary key,
  username text not null,
  avatar text,
  enfecoins integer not null default 50,
  wins integer not null default 0,
  losses integer not null default 0,
  total_won integer not null default 0,
  total_lost integer not null default 0,
  best_odds_won numeric not null default 0,
  winstreak integer not null default 0,
  completed_demands integer not null default 0,
  speed_bonus_won integer not null default 0,
  favorite_competition text default 'Sprint Editorial',
  active boolean not null default false,
  rank text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enfe_productivity (
  user_id text primary key references public.enfe_users(id) on delete cascade,
  current_file text default '',
  current_task text default '',
  progress integer not null default 0,
  estimate_hours numeric not null default 1,
  target_topics integer not null default 1,
  completed_topics integer not null default 0,
  completed_files integer not null default 0,
  delivered_assets integer not null default 0,
  water_ml integer not null default 0,
  revision_status text default 'Em produção',
  started_at timestamptz,
  paused_at timestamptz,
  paused_ms integer not null default 0,
  finished_at timestamptz,
  canceled_at timestamptz,
  extension_count integer not null default 0,
  extension_hours numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.enfe_completed_demands (
  id text primary key,
  user_id text not null references public.enfe_users(id) on delete cascade,
  file text,
  task text,
  topics integer not null default 1,
  progress integer not null default 0,
  started_at timestamptz,
  paused_ms integer not null default 0,
  finished_at timestamptz not null,
  estimate_minutes integer not null default 0,
  actual_minutes integer not null default 0,
  saved_minutes integer not null default 0,
  speed_bonus integer not null default 0,
  finished_at_label text,
  duration_label text,
  created_at timestamptz not null default now()
);

create table if not exists public.enfe_finish_bets (
  id text primary key,
  bettor_id text not null references public.enfe_users(id) on delete cascade,
  bettor_name text,
  target_user_id text not null references public.enfe_users(id) on delete cascade,
  target_name text,
  window_id text,
  window_label text,
  amount integer not null default 0,
  odds numeric not null default 1,
  status text not null default 'active',
  winning_window text,
  won boolean,
  refunded boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  canceled_at timestamptz
);

create table if not exists public.enfe_chat_messages (
  id text primary key,
  type text not null default 'global',
  from_id text not null references public.enfe_users(id) on delete cascade,
  from_name text,
  to_id text references public.enfe_users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.enfe_feed_events (
  id text primary key,
  message text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.enfe_competitions (
  id text primary key,
  title text not null,
  description text,
  participants text,
  participant_ids text[] default '{}',
  category text default 'active',
  challenge_type text,
  timer text,
  reward integer not null default 0,
  entry_amount integer not null default 0,
  end_time text,
  status text not null default 'active',
  created_by_id text references public.enfe_users(id) on delete set null,
  created_by_name text,
  winning_option_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.enfe_competition_options (
  id text not null,
  competition_id text not null references public.enfe_competitions(id) on delete cascade,
  label text not null,
  position integer not null default 0,
  primary key (competition_id, id)
);

create table if not exists public.enfe_competition_bets (
  id text primary key,
  competition_id text not null references public.enfe_competitions(id) on delete cascade,
  user_id text not null references public.enfe_users(id) on delete cascade,
  username text,
  option_id text,
  option_label text,
  amount integer not null default 0,
  odds numeric not null default 1,
  confidence integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.enfe_app_meta enable row level security;
alter table public.enfe_users enable row level security;
alter table public.enfe_productivity enable row level security;
alter table public.enfe_completed_demands enable row level security;
alter table public.enfe_finish_bets enable row level security;
alter table public.enfe_chat_messages enable row level security;
alter table public.enfe_feed_events enable row level security;
alter table public.enfe_competitions enable row level security;
alter table public.enfe_competition_options enable row level security;
alter table public.enfe_competition_bets enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'enfe_app_meta',
    'enfe_users',
    'enfe_productivity',
    'enfe_completed_demands',
    'enfe_finish_bets',
    'enfe_chat_messages',
    'enfe_feed_events',
    'enfe_competitions',
    'enfe_competition_options',
    'enfe_competition_bets'
  ]
  loop
    execute format('drop policy if exists "%s_read_all" on public.%I', table_name, table_name);
    execute format('drop policy if exists "%s_insert_all" on public.%I', table_name, table_name);
    execute format('drop policy if exists "%s_update_all" on public.%I', table_name, table_name);
    execute format('drop policy if exists "%s_delete_all" on public.%I', table_name, table_name);

    execute format('create policy "%s_read_all" on public.%I for select to anon using (true)', table_name, table_name);
    execute format('create policy "%s_insert_all" on public.%I for insert to anon with check (true)', table_name, table_name);
    execute format('create policy "%s_update_all" on public.%I for update to anon using (true) with check (true)', table_name, table_name);
    execute format('create policy "%s_delete_all" on public.%I for delete to anon using (true)', table_name, table_name);
  end loop;
end $$;

insert into public.enfe_app_meta (id)
values ('main')
on conflict (id) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.enfe_app_meta;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.enfe_users;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.enfe_productivity;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.enfe_completed_demands;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.enfe_finish_bets;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.enfe_chat_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.enfe_feed_events;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.enfe_competitions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.enfe_competition_options;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.enfe_competition_bets;
exception when duplicate_object then null;
end $$;
