-- BuzzBoard MVP Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  avatar_url text,
  biological_gender text check (biological_gender in ('male', 'female')),
  height_inches integer,
  weight_lbs integer,
  university_name text,
  personal_drink_limit integer,
  calibration_count integer default 0,
  calculated_low_limit integer,
  calculated_med_limit integer,
  calculated_high_limit integer,
  show_on_leaderboard boolean default false,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- CALIBRATION SESSIONS
-- ============================================
create table public.calibration_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  session_number integer check (session_number between 1 and 3) not null,
  drinks_consumed integer not null,
  feeling_rating integer check (feeling_rating between 1 and 5) not null,
  could_handle_more boolean not null,
  adjustment_shots integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- DRINK SESSIONS
-- ============================================
create table public.drink_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  is_active boolean default true,
  total_standard_drinks float default 0,
  peak_bac float default 0,
  status text default 'active' check (status in ('active', 'completed'))
);

-- ============================================
-- DRINK LOGS
-- ============================================
create table public.drink_logs (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.drink_sessions(id) on delete cascade not null,
  drink_type text check (drink_type in ('shot', 'beer', 'mixed')) not null,
  quantity float default 1,
  standard_drink_equivalent float not null,
  logged_at timestamptz default now()
);

-- ============================================
-- FRIENDSHIPS
-- ============================================
create table public.friendships (
  id uuid default uuid_generate_v4() primary key,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  addressee_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  can_see_drinks boolean default true,
  created_at timestamptz default now(),
  unique(requester_id, addressee_id)
);

-- ============================================
-- FRIEND GROUPS
-- ============================================
create table public.friend_groups (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- ============================================
-- FRIEND GROUP MEMBERS
-- ============================================
create table public.friend_group_members (
  group_id uuid references public.friend_groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (group_id, user_id)
);

-- ============================================
-- FRIEND ALERTS
-- ============================================
create table public.friend_alerts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  friend_id uuid references public.profiles(id) on delete cascade not null,
  session_id uuid references public.drink_sessions(id) on delete cascade not null,
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- NIGHT PRIVACY OVERRIDES
-- ============================================
create table public.night_privacy_overrides (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  session_id uuid references public.drink_sessions(id) on delete cascade not null,
  friend_id uuid references public.profiles(id) on delete cascade not null,
  can_see boolean default true
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.profiles enable row level security;
alter table public.calibration_sessions enable row level security;
alter table public.drink_sessions enable row level security;
alter table public.drink_logs enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_groups enable row level security;
alter table public.friend_group_members enable row level security;
alter table public.friend_alerts enable row level security;
alter table public.night_privacy_overrides enable row level security;

-- Profiles
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
-- Allow viewing other profiles for friend search and leaderboard
create policy "Users can view all profiles" on profiles
  for select using (true);

-- Calibration sessions
create policy "Users can view own calibration" on calibration_sessions
  for select using (auth.uid() = user_id);
create policy "Users can insert own calibration" on calibration_sessions
  for insert with check (auth.uid() = user_id);

-- Drink sessions
create policy "Users can view own sessions" on drink_sessions
  for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on drink_sessions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on drink_sessions
  for update using (auth.uid() = user_id);

-- Drink logs
create policy "Users can view own drink logs" on drink_logs
  for select using (
    session_id in (select id from drink_sessions where user_id = auth.uid())
  );
create policy "Users can insert own drink logs" on drink_logs
  for insert with check (
    session_id in (select id from drink_sessions where user_id = auth.uid())
  );

-- Friendships
create policy "Users can view own friendships" on friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "Users can request friendships" on friendships
  for insert with check (auth.uid() = requester_id);
create policy "Users can update friendships" on friendships
  for update using (auth.uid() = addressee_id or auth.uid() = requester_id);

-- Friend groups
create policy "Users can view own groups" on friend_groups
  for select using (auth.uid() = creator_id);
create policy "Users can create groups" on friend_groups
  for insert with check (auth.uid() = creator_id);

-- Friend group members
create policy "Users can view group members" on friend_group_members
  for select using (
    group_id in (select id from friend_groups where creator_id = auth.uid())
    or user_id = auth.uid()
  );
create policy "Group creators can add members" on friend_group_members
  for insert with check (
    group_id in (select id from friend_groups where creator_id = auth.uid())
  );

-- Friend alerts
create policy "Users can view alerts for them" on friend_alerts
  for select using (auth.uid() = friend_id or auth.uid() = user_id);
create policy "Users can create alerts" on friend_alerts
  for insert with check (auth.uid() = user_id);
create policy "Users can update own alerts" on friend_alerts
  for update using (auth.uid() = friend_id);

-- Night privacy overrides
create policy "Users can manage own privacy" on night_privacy_overrides
  for all using (auth.uid() = user_id);

-- ============================================
-- ENABLE REALTIME
-- ============================================
alter publication supabase_realtime add table friend_alerts;
