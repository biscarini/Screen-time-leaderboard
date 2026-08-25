-- Minimal stand-ins for the pieces of Supabase the migrations lean on, so the
-- schema can be exercised against a plain Postgres. Not part of the app.

create extension if not exists pgcrypto;

create schema if not exists auth;
create schema if not exists storage;

do $$ begin
  create role authenticated;   exception when duplicate_object then null; end $$;
do $$ begin
  create role anon;            exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role;    exception when duplicate_object then null; end $$;

create table if not exists auth.users (id uuid primary key);

-- Driven by test.uid / test.role settings instead of a real JWT.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid;
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('test.role', true), ''), 'authenticated');
$$;

create table if not exists storage.buckets (
  id text primary key,
  name text,
  public boolean,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text
);

-- Matches Supabase: the path's folder segments, filename excluded.
create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)];
$$;
