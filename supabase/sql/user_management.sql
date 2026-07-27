-- =============================================================================
-- Agrocomercial Moreno · Gestión de usuarios — VERSIÓN CORREGIDA
-- =============================================================================
-- Ejecutar COMPLETO en Supabase → SQL Editor. Es idempotente (se puede repetir).
--
-- Corrige DOS problemas detectados en la versión anterior de crear_usuario_admin:
--
--   1) BUG: devolvía {"success": false, "error": "function gen_salt(unknown)
--      does not exist"}. En Supabase pgcrypto vive en el esquema `extensions`,
--      así que hay que incluirlo en el search_path (o llamar
--      extensions.gen_salt). Sin esto la función NUNCA puede crear un usuario.
--
--   2) SEGURIDAD: la función se podía ejecutar con el rol `anon`, es decir,
--      cualquiera en internet con la llave pública podía invocarla. Se agrega la
--      validación is_admin() al inicio y se revoca EXECUTE a anon/public.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- 0) Limpieza de versiones previas (incluida la que quedó a medias)
-- -----------------------------------------------------------------------------
drop function if exists public.crear_usuario_admin(text, text, text);
drop function if exists public.crear_usuario_admin(email_param text, password_param text, rol_param text);
drop function if exists public.create_user_with_role(text, text, text);
drop function if exists public.delete_user_by_id(uuid);

-- -----------------------------------------------------------------------------
-- 1) Dependencias: profiles + trigger + is_admin()
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

insert into public.profiles (id, email)
select id, email from auth.users on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'Admin' and status = 'Activo'
  );
$$;
grant execute on function public.is_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- 2) crear_usuario_admin — nombres de parámetro que usa el frontend:
--    email_param, password_param, rol_param
--    Devuelve jsonb: {"success":true,"user_id":"..."} o {"success":false,"error":"..."}
-- -----------------------------------------------------------------------------
create or replace function public.crear_usuario_admin(
  email_param    text,
  password_param text,
  rol_param      text
)
returns jsonb
language plpgsql
security definer
-- CLAVE: `extensions` va en el search_path para encontrar crypt()/gen_salt().
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email   text := lower(trim(email_param));
  v_role    text := case when rol_param = 'Admin' then 'Admin' else 'Operador' end;
begin
  -- SEGURIDAD: solo un administrador activo. Sin esto, cualquiera con la llave
  -- pública podría crear usuarios Admin y tomar control del sistema.
  if not public.is_admin() then
    return jsonb_build_object('success', false,
      'error', 'Solo un administrador activo puede gestionar usuarios.');
  end if;

  if v_email is null or position('@' in v_email) = 0 then
    return jsonb_build_object('success', false, 'error', 'Correo inválido.');
  end if;

  if length(coalesce(password_param, '')) < 8 then
    return jsonb_build_object('success', false,
      'error', 'La contraseña temporal debe tener al menos 8 caracteres.');
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    return jsonb_build_object('success', false, 'error', 'Ese correo ya existe.');
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(password_param, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_user_id::text, v_user_id,
    json_build_object('sub', v_user_id::text, 'email', v_email)::jsonb,
    'email', now(), now(), now()
  );

  insert into public.profiles (id, email, role, status, must_change_password)
  values (v_user_id, v_email, v_role, 'Activo', true)
  on conflict (id) do update
    set email = excluded.email, role = excluded.role,
        status = 'Activo', must_change_password = true;

  return jsonb_build_object('success', true, 'user_id', v_user_id);
exception when others then
  return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;

-- -----------------------------------------------------------------------------
-- 3) delete_user_by_id (parámetro p_user_id, como lo llama el frontend)
-- -----------------------------------------------------------------------------
create or replace function public.delete_user_by_id(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false,
      'error', 'Solo un administrador activo puede gestionar usuarios.');
  end if;

  if p_user_id = auth.uid() then
    return jsonb_build_object('success', false,
      'error', 'No puedes eliminar tu propio usuario.');
  end if;

  delete from auth.users where id = p_user_id;  -- profiles cae por CASCADE
  return jsonb_build_object('success', true);
exception when others then
  return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;

-- -----------------------------------------------------------------------------
-- 4) PERMISOS — cierra el agujero: anon NO puede ejecutar estas funciones
-- -----------------------------------------------------------------------------
revoke all on function public.crear_usuario_admin(text, text, text) from public, anon;
revoke all on function public.delete_user_by_id(uuid) from public, anon;
grant execute on function public.crear_usuario_admin(text, text, text) to authenticated;
grant execute on function public.delete_user_by_id(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 5) RLS de profiles
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
drop policy if exists p_self_read   on public.profiles;
drop policy if exists p_admin_read  on public.profiles;
drop policy if exists p_self_flag   on public.profiles;
drop policy if exists p_admin_write on public.profiles;

create policy p_self_read   on public.profiles for select to authenticated using (id = auth.uid());
create policy p_admin_read  on public.profiles for select to authenticated using (public.is_admin());
create policy p_self_flag   on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy p_admin_write on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 6) Asegura que TU usuario sea Admin activo  >>> ajusta el correo si usas otro
-- -----------------------------------------------------------------------------
insert into public.profiles (id, email, role, status)
select id, email, 'Admin', 'Activo' from auth.users
where lower(email) = lower('juan59824@gmail.com')
on conflict (id) do update set role = 'Admin', status = 'Activo';

notify pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- 7) VERIFICACIÓN
-- -----------------------------------------------------------------------------
-- (a) Funciones y parámetros exactos:
select p.proname as funcion, pg_get_function_arguments(p.oid) as parametros
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('crear_usuario_admin','delete_user_by_id','is_admin')
order by 1;

-- (b) Quién puede ejecutar crear_usuario_admin (NO debe aparecer anon):
select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public' and routine_name = 'crear_usuario_admin';

-- (c) Tu fila debe decir Admin / Activo:
select email, role, status, must_change_password from public.profiles order by created_at;
