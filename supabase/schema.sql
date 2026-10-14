-- Run once in the Supabase SQL editor (Dashboard → SQL → New query).

create table if not exists public.submissions (
  id uuid primary key,
  seq bigint generated always as identity unique,
  created_at timestamptz not null default now(),
  name text not null,
  roll_no text not null,
  email text not null,
  mobile text not null,
  year text not null check (year in ('FY', 'SY', 'TY', 'LY')),
  branch text not null check (branch in ('EXCP', 'CSBS', 'VLSI')),
  activity_category text not null,
  organiser_participant_name text not null,
  activity_name text not null,
  activity_details text not null,
  activity_level text not null check (activity_level in ('University', 'State', 'National', 'International')),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  is_ly_excp boolean not null,
  file_key text not null unique,
  file_name text not null,
  file_size bigint not null
);

create index if not exists submissions_roll_no_idx on public.submissions (roll_no);
create index if not exists submissions_created_at_idx on public.submissions (created_at desc);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Only the server (service role key) may touch the data: RLS on, no policies.
alter table public.submissions enable row level security;
alter table public.app_settings enable row level security;

-- Private bucket for proof PDFs. Raise file_size_limit if your plan allows (free plan max is 50 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;
