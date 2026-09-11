import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('Supabase env vars missing — saved dashboards will be disabled until configured.');
}

export const supabase = createClient(url ?? '', anonKey ?? '');

/*
Suggested schema (run in Supabase SQL editor):

create table dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamptz default now()
);

create table saved_queries (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid references dashboards on delete cascade,
  question text not null,
  sql text not null,
  chart_type text not null,
  position jsonb,
  created_at timestamptz default now()
);

alter table dashboards enable row level security;
alter table saved_queries enable row level security;

create policy "Users manage own dashboards" on dashboards
  for all using (auth.uid() = user_id);

create policy "Users manage own saved queries" on saved_queries
  for all using (
    dashboard_id in (select id from dashboards where user_id = auth.uid())
  );
*/
