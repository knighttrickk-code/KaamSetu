-- =====================================================================
-- KaamSetu — Supabase schema with Row Level Security
-- Run in Supabase SQL editor, then run seed.sql for demo data.
-- =====================================================================
create extension if not exists "pgcrypto";

-- ---------- helpers ----------
create or replace function public.haversine_km(lat1 float8, lng1 float8, lat2 float8, lng2 float8)
returns float8 language sql immutable as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- ---------- core tables ----------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,   -- null for seeded demo rows
  role text not null check (role in ('worker','household','business','admin')),
  name text not null,
  photo_url text,
  age int,
  gender text,
  description text,
  languages text[] default '{}',
  area text, city text,
  lat float8, lng float8,               -- exact coords: never readable by other users (see view below)
  id_status text default 'none' check (id_status in ('none','pending','verified','rejected')),
  police_status text default 'none' check (police_status in ('none','pending','verified','rejected')),
  suspended boolean default false,
  views int default 0,
  referral_code text unique,
  created_at timestamptz default now()
);

-- Phone numbers live in their own table so RLS can reveal them only after acceptance
create table public.private_contacts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  phone text not null
);

create table public.worker_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  primary_role text not null,
  experience_years int default 0,
  wage int, wage_type text default 'month' check (wage_type in ('month','day')),
  work_type text default 'permanent',
  past_jobs text[] default '{}',
  available boolean default true,
  rehired_count int default 0,
  boost_until timestamptz
);

create table public.employer_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text, business_type text,
  free_connection_used boolean default false,
  plan text check (plan in ('basic','pro')), plan_until timestamptz
);

create table public.job_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,   -- role, place, hours, budget, languages, gender, max_distance, verified_only / categories, skills
  updated_at timestamptz default now()
);

create table public.skills (id serial primary key, name text unique not null);
create table public.worker_skills (
  profile_id uuid references public.profiles(id) on delete cascade,
  skill_id int references public.skills(id) on delete cascade,
  primary key (profile_id, skill_id)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles(id) on delete cascade,
  role text not null, place text check (place in ('home','shop')),
  timings text, work_type text, pay int, pay_type text default 'month',
  description text, lat float8, lng float8,
  open boolean default true, urgent_until timestamptz,
  created_at timestamptz default now()
);

create table public.swipes (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null,               -- worker profile id OR job id
  dir text not null check (dir in ('left','right')),
  created_at timestamptz default now()
);

create table public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired','hired')),
  phone_revealed boolean default false,
  created_at timestamptz default now(),
  responded_at timestamptz, hired_at timestamptz
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique not null references public.connection_requests(id) on delete cascade,
  created_at timestamptz default now()
);

create table public.messages (
  id bigserial primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null,
  read boolean default false,
  created_at timestamptz default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique references public.connection_requests(id),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  employer_id uuid references public.profiles(id),
  reviewer_name text,
  stars int not null check (stars between 1 and 5),
  tags text[] default '{}', body text,
  created_at timestamptz default now()
);

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('id','police')),
  id_type text,
  id_last4 char(4),                       -- NEVER the full Aadhaar number
  storage_path text,                      -- private bucket 'verification-docs'
  status text default 'pending' check (status in ('pending','verified','rejected')),
  reason text,
  created_at timestamptz default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id),
  target_id uuid not null references public.profiles(id) on delete cascade,
  reason text, status text default 'open' check (status in ('open','warned','suspended','dismissed')),
  created_at timestamptz default now()
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references public.profiles(id) on delete cascade,
  referred_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table public.credits (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  balance int not null default 0,
  expires_at timestamptz
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount_inr int default 0, credits int default 0,
  description text, gateway_ref text,     -- Razorpay payment id later
  created_at timestamptz default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text, body text, body_hi text, link text,
  read boolean default false,
  created_at timestamptz default now()
);

create table public.saved_profiles (
  profile_id uuid references public.profiles(id) on delete cascade,
  target_id uuid not null,
  created_at timestamptz default now(),
  primary key (profile_id, target_id)
);

-- ---------- identity helpers ----------
create or replace function public.my_profile_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from profiles where user_id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
$$;

-- ---------- privacy-safe public view (no exact coordinates, no phone) ----------
create or replace view public.public_profiles with (security_invoker = false) as
  select p.id, p.role, p.name, p.photo_url, p.age, p.gender, p.description, p.languages,
         p.area, p.city, p.id_status, p.police_status, p.created_at,
         round(p.lat::numeric, 2)::float8 as approx_lat,   -- ~1 km precision only
         round(p.lng::numeric, 2)::float8 as approx_lng
  from profiles p where not p.suspended;

-- Distance from the current user, rounded to 0.5 km
create or replace function public.nearby_workers(max_km float8 default 10)
returns table (profile_id uuid, distance_km float8)
language sql stable security definer set search_path = public as $$
  select w.id, round((haversine_km(me.lat, me.lng, w.lat, w.lng) * 2)::numeric) / 2
  from profiles me, profiles w
  where me.user_id = auth.uid() and w.role = 'worker' and not w.suspended
    and haversine_km(me.lat, me.lng, w.lat, w.lng) <= max_km
$$;

-- ---------- RPC: accept a request, charge employer credit, reveal phone ----------
create or replace function public.accept_request(req_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r connection_requests; emp uuid; e employer_profiles; c credits; charged boolean := false;
begin
  select * into r from connection_requests where id = req_id for update;
  if r.to_id <> my_profile_id() then raise exception 'not your request'; end if;
  if r.status <> 'pending' then raise exception 'request is %', r.status; end if;

  select id into emp from profiles where id in (r.from_id, r.to_id) and role in ('household','business');
  select * into e from employer_profiles where profile_id = emp for update;
  select * into c from credits where profile_id = emp for update;

  if e.plan = 'pro' and e.plan_until > now() then charged := true;
  elsif (select role from profiles where id = emp) = 'household' and not e.free_connection_used then
    update employer_profiles set free_connection_used = true where profile_id = emp; charged := true;
  elsif coalesce(c.balance, 0) > 0 and (c.expires_at is null or c.expires_at > now()) then
    update credits set balance = balance - 1 where profile_id = emp; charged := true;
  end if;

  if charged then
    insert into transactions(profile_id, credits, description) values (emp, -1, 'Connection credit used');
  end if;

  update connection_requests set status = 'accepted', responded_at = now(), phone_revealed = charged where id = req_id;
  insert into conversations(request_id) values (req_id) on conflict do nothing;
  insert into notifications(profile_id, type, body, link)
    values (r.from_id, 'accepted', (select name from profiles where id = r.to_id) || ' accepted your request', '/app/chat/' || req_id);
  return jsonb_build_object('charged', charged);
end $$;

-- Requests auto-expire after 72h (schedule with pg_cron: select cron.schedule('*/30 * * * *', 'select expire_requests()');)
create or replace function public.expire_requests() returns void language sql security definer as $$
  update public.connection_requests set status = 'expired', responded_at = now()
  where status = 'pending' and created_at < now() - interval '72 hours';
$$;

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table private_contacts enable row level security;
alter table worker_profiles enable row level security;
alter table employer_profiles enable row level security;
alter table job_preferences enable row level security;
alter table worker_skills enable row level security;
alter table skills enable row level security;
alter table jobs enable row level security;
alter table swipes enable row level security;
alter table connection_requests enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table reviews enable row level security;
alter table verifications enable row level security;
alter table reports enable row level security;
alter table referrals enable row level security;
alter table credits enable row level security;
alter table transactions enable row level security;
alter table notifications enable row level security;
alter table saved_profiles enable row level security;

-- profiles: own row full access; others use public_profiles view (no coords)
create policy "own profile read"   on profiles for select using (user_id = auth.uid() or is_admin());
create policy "own profile insert" on profiles for insert with check (user_id = auth.uid() and role <> 'admin');
create policy "own profile update" on profiles for update using (user_id = auth.uid()) with check (role <> 'admin' or is_admin());
create policy "admin profile update" on profiles for update using (is_admin());

-- phone: own, admin, or the employer side of an ACCEPTED request with phone_revealed
create policy "phone visibility" on private_contacts for select using (
  profile_id = my_profile_id() or is_admin() or exists (
    select 1 from connection_requests r
    where r.status in ('accepted','hired') and r.phone_revealed
      and ((r.from_id = my_profile_id() and r.to_id = private_contacts.profile_id)
        or (r.to_id = my_profile_id() and r.from_id = private_contacts.profile_id))
      and (select role from profiles where id = my_profile_id()) in ('household','business')
  ));
create policy "own phone write" on private_contacts for all using (profile_id = my_profile_id()) with check (profile_id = my_profile_id());

create policy "worker details public" on worker_profiles for select using (true);
create policy "worker details own" on worker_profiles for all using (profile_id = my_profile_id()) with check (profile_id = my_profile_id());
create policy "employer details public" on employer_profiles for select using (true);
create policy "employer details own update" on employer_profiles for update using (profile_id = my_profile_id())
  with check (profile_id = my_profile_id());   -- plan/free flag changed only by RPCs (security definer)
create policy "employer details own insert" on employer_profiles for insert with check (profile_id = my_profile_id());

create policy "prefs own" on job_preferences for all using (profile_id = my_profile_id()) with check (profile_id = my_profile_id());
create policy "skills read" on skills for select using (true);
create policy "worker skills read" on worker_skills for select using (true);
create policy "worker skills own" on worker_skills for all using (profile_id = my_profile_id()) with check (profile_id = my_profile_id());

create policy "jobs read open" on jobs for select using (open or employer_id = my_profile_id() or is_admin());
create policy "jobs own write" on jobs for all using (employer_id = my_profile_id() or is_admin()) with check (employer_id = my_profile_id() or is_admin());

create policy "swipes own" on swipes for all using (user_id = my_profile_id()) with check (user_id = my_profile_id());

create policy "requests parties read" on connection_requests for select using (from_id = my_profile_id() or to_id = my_profile_id() or is_admin());
create policy "requests send" on connection_requests for insert with check (from_id = my_profile_id() and status = 'pending'
  and not exists (select 1 from connection_requests x where ((x.from_id = connection_requests.from_id and x.to_id = connection_requests.to_id) or (x.from_id = connection_requests.to_id and x.to_id = connection_requests.from_id))
    and (x.status in ('pending','accepted','hired') or x.responded_at > now() - interval '30 days')));
create policy "requests decline" on connection_requests for update using (to_id = my_profile_id()) with check (status in ('declined'));
create policy "requests hire" on connection_requests for update using (
  (from_id = my_profile_id() or to_id = my_profile_id()) and (select role from profiles where id = my_profile_id()) in ('household','business')
) with check (status = 'hired');

create policy "conversations parties" on conversations for select using (exists (
  select 1 from connection_requests r where r.id = request_id and (r.from_id = my_profile_id() or r.to_id = my_profile_id())));
create policy "messages parties read" on messages for select using (exists (
  select 1 from conversations c join connection_requests r on r.id = c.request_id
  where c.id = conversation_id and (r.from_id = my_profile_id() or r.to_id = my_profile_id())));
create policy "messages parties send" on messages for insert with check (sender_id = my_profile_id() and exists (
  select 1 from conversations c join connection_requests r on r.id = c.request_id
  where c.id = conversation_id and r.status in ('accepted','hired') and (r.from_id = my_profile_id() or r.to_id = my_profile_id())));
create policy "messages mark read" on messages for update using (exists (
  select 1 from conversations c join connection_requests r on r.id = c.request_id
  where c.id = conversation_id and (r.from_id = my_profile_id() or r.to_id = my_profile_id())));

-- reviews: anyone can read; only the EMPLOYER of an accepted/hired connection can write
create policy "reviews read" on reviews for select using (true);
create policy "reviews by connected employer" on reviews for insert with check (
  employer_id = my_profile_id() and exists (
    select 1 from connection_requests r where r.id = request_id and r.status in ('accepted','hired')
      and worker_id in (r.from_id, r.to_id) and employer_id in (r.from_id, r.to_id)));
create policy "reviews admin delete" on reviews for delete using (is_admin());

-- verification docs: owner can submit, only admin can read/approve
create policy "verif submit" on verifications for insert with check (profile_id = my_profile_id());
create policy "verif admin" on verifications for all using (is_admin());
create policy "verif own status" on verifications for select using (profile_id = my_profile_id());

create policy "reports submit" on reports for insert with check (reporter_id = my_profile_id());
create policy "reports admin" on reports for all using (is_admin());

create policy "referrals own" on referrals for select using (referrer_id = my_profile_id() or referred_id = my_profile_id());
create policy "credits own read" on credits for select using (profile_id = my_profile_id() or is_admin());
create policy "tx own read" on transactions for select using (profile_id = my_profile_id() or is_admin());
create policy "notif own" on notifications for all using (profile_id = my_profile_id()) with check (profile_id = my_profile_id());
create policy "saved own" on saved_profiles for all using (profile_id = my_profile_id()) with check (profile_id = my_profile_id());

-- ---------- storage ----------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('verification-docs', 'verification-docs', false) on conflict do nothing;
create policy "avatar upload own" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatar read" on storage.objects for select using (bucket_id = 'avatars');
create policy "verif doc upload own" on storage.objects for insert with check (bucket_id = 'verification-docs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "verif doc admin only" on storage.objects for select using (bucket_id = 'verification-docs' and public.is_admin());

-- ---------- realtime ----------
alter publication supabase_realtime add table messages, connection_requests, notifications;

-- Make someone admin manually:
-- update profiles set role = 'admin' where user_id = '<auth-user-uuid>';
