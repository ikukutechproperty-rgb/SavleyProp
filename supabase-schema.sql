create extension if not exists pgcrypto;

create table if not exists public.properties (
  id uuid primary key,
  title text not null,
  type text not null check (type in ('house', 'land')),
  location text not null,
  price numeric not null check (price > 0),
  image text,
  images jsonb not null default '[]'::jsonb,
  videos jsonb not null default '[]'::jsonb,
  description text not null,
  status text not null default 'active',
  interest integer not null default 0,
  qualified_leads integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key,
  name text not null,
  email text unique not null,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.properties enable row level security;
alter table public.users enable row level security;

create policy "Public can view properties"
on public.properties for select
using (true);

insert into storage.buckets (id, name, public)
values ('property-media', 'property-media', true)
on conflict (id) do update set public = true;

create policy "Public can view property media"
on storage.objects for select
using (bucket_id = 'property-media');
