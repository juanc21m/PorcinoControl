-- =============================================================================
-- Agrocomercial Moreno · Gestión de usuarios desde la app (sin service_role)
-- =============================================================================
-- Ejecutar completo en Supabase → SQL Editor.
--
-- Por qué así:
--   * `auth.signUp()` desde el cliente reemplazaría la sesión del administrador.
--   * La `service_role` key no puede vivir en el frontend (salta todas las RLS).
--   * Una función SQL no puede llamar a la API de administración de GoTrue, así
--     que estas funciones crean el usuario escribiendo directamente en
--     `auth.users` con la contraseña hasheada en bcrypt — que es exactamente el
--     formato que GoTrue valida al iniciar sesión.
--
-- `SECURITY DEFINER` hace que corran con los permisos del dueño (postgres), y
-- cada función verifica por dentro que el llamante sea Admin activo.
-- =============================================================================

-- bcrypt (crypt/gen_salt). En Supabase las extensiones viven en `extensions`.
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- 1) Crear usuario con rol y contraseña temporal
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
  -- Solo un administrador activo puede crear usuarios.
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

  -- Usuario de Auth. `email_confirmed_at` se fija para que pueda entrar ya,
  -- sin paso de verificación por correo.
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

  -- Identidad del proveedor email (GoTrue la espera para el login por password).
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

  -- Perfil con rol y cambio de contraseña obligatorio en el primer ingreso.
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
-- 2) Eliminar usuario
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

  -- `profiles` tiene ON DELETE CASCADE contra auth.users, así que se limpia solo.
  delete from auth.users where id = p_user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3) Permisos: expuestas solo a usuarios autenticados (la función valida Admin)
-- -----------------------------------------------------------------------------
revoke all on function public.create_user_with_role(text, text, text) from public, anon;
revoke all on function public.delete_user_by_id(uuid) from public, anon;
grant execute on function public.create_user_with_role(text, text, text) to authenticated;
grant execute on function public.delete_user_by_id(uuid) to authenticated;
