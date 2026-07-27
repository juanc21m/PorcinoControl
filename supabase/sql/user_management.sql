-- =============================================================================
-- Agrocomercial Moreno · Gestión de usuarios (idempotente y autocontenido)
-- =============================================================================
-- Ejecutar COMPLETO en Supabase → SQL Editor. Se puede correr varias veces.
--
-- Incluye: DROP de versiones previas, dependencias (profiles, is_admin), las dos
-- funciones RPC, los permisos, el alta del admin actual y consultas de
-- verificación al final.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- 0) Limpieza de versiones anteriores (todas las firmas plausibles)
-- -----------------------------------------------------------------------------
drop function if exists public.create_user_with_role(text, text, text);
drop function if exists public.create_user_with_role(p_email text, p_password text, p_role text);
drop function if exists public.create_user_with_role(text, text);
drop function if exists public.delete_user_by_id(uuid);
drop function if exists public.delete_user_by_id(p_user_id uuid);
drop function if exists public.is_admin();

-- -----------------------------------------------------------------------------
-- 1) Dependencias: tabla profiles + trigger de alta automática
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'Operador' check (role in ('Admin','Operador')),
  status text not null default 'Activo' check (status in ('Activo','Revocado')),
  must_change_password boolean not null default false,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Perfila a los usuarios que ya existían
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2) is_admin(): usado por las políticas RLS y por los RPC
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'Admin' and status = 'Activo'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- 3) Crear usuario con rol y contraseña temporal
--    Parámetros EXACTOS que envía el frontend: p_email, p_password, p_role
-- -----------------------------------------------------------------------------
create or replace function public.create_user_with_role(
  p_email    text,
  p_password text,
  p_role     text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email   text := lower(trim(p_email));
  v_role    text := case when p_role = 'Admin' then 'Admin' else 'Operador' end;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador activo puede gestionar usuarios.';
  end if;

  if v_email is null or position('@' in v_email) = 0 then
    raise exception 'Correo inválido.';
  end if;

  if length(coalesce(p_password, '')) < 8 then
    raise exception 'La contraseña temporal debe tener al menos 8 caracteres.';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Ese correo ya existe.';
  end if;

  -- Usuario de Auth con la contraseña hasheada en bcrypt (lo que valida GoTrue).
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_user_id::text,
    v_user_id,
    json_build_object('sub', v_user_id::text, 'email', v_email)::jsonb,
    'email',
    now(), now(), now()
  );

  insert into public.profiles (id, email, role, status, must_change_password)
  values (v_user_id, v_email, v_role, 'Activo', true)
  on conflict (id) do update
    set email = excluded.email,
        role = excluded.role,
        status = 'Activo',
        must_change_password = true;

  return v_user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4) Eliminar usuario
-- -----------------------------------------------------------------------------
create or replace function public.delete_user_by_id(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador activo puede gestionar usuarios.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'No puedes eliminar tu propio usuario.';
  end if;

  delete from auth.users where id = p_user_id;  -- profiles cae por CASCADE
end;
$$;

-- -----------------------------------------------------------------------------
-- 5) Permisos (la validación de Admin va dentro de cada función)
-- -----------------------------------------------------------------------------
revoke all on function public.create_user_with_role(text, text, text) from public, anon;
revoke all on function public.delete_user_by_id(uuid) from public, anon;
grant execute on function public.create_user_with_role(text, text, text) to authenticated;
grant execute on function public.delete_user_by_id(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 6) RLS de profiles
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists p_self_read  on public.profiles;
drop policy if exists p_admin_read on public.profiles;
drop policy if exists p_self_flag  on public.profiles;
drop policy if exists p_admin_write on public.profiles;

create policy p_self_read on public.profiles
  for select to authenticated using (id = auth.uid());
create policy p_admin_read on public.profiles
  for select to authenticated using (public.is_admin());
create policy p_self_flag on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy p_admin_write on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 7) CLAVE: asegura que TU usuario sea Admin activo en profiles
--    (sin esto, la app te muestra la pestaña por la lista de respaldo pero los
--     RPC te rechazan con "Solo un administrador activo…")
--    >>> Ajusta el correo si usas otro para entrar. <<<
-- -----------------------------------------------------------------------------
insert into public.profiles (id, email, role, status)
select id, email, 'Admin', 'Activo' from auth.users
where lower(email) = lower('juan59824@gmail.com')
on conflict (id) do update set role = 'Admin', status = 'Activo';

-- -----------------------------------------------------------------------------
-- 8) Refresca la caché del esquema de PostgREST
-- -----------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- 9) VERIFICACIÓN — revisa estas dos salidas
-- -----------------------------------------------------------------------------
-- (a) Las funciones deben aparecer con sus parámetros exactos:
select p.proname as funcion, pg_get_function_arguments(p.oid) as parametros
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('create_user_with_role','delete_user_by_id','is_admin')
order by 1;

-- (b) Tu fila debe decir Admin / Activo:
select email, role, status, must_change_password from public.profiles order by created_at;
