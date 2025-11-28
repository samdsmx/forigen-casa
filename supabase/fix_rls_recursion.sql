-- Fix infinite recursion in RLS by making helper functions SECURITY DEFINER
-- This bypasses RLS on app_user when these functions are called

create or replace function is_admin_or_supervisor() returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from app_user u
    where u.auth_user_id = auth.uid()
      and u.role in ('admin','supervisor_central')
  );
$$;

create or replace function user_sede_id() returns uuid language sql stable security definer set search_path = public as $$
  select u.sede_id from app_user u where u.auth_user_id = auth.uid();
$$;

create or replace function user_role() returns text language sql stable security definer set search_path = public as $$
  select u.role from app_user u where u.auth_user_id = auth.uid();
$$;
