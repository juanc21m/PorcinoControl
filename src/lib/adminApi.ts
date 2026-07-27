import { supabase } from './supabase';
import type { UserRole } from '../types';

/**
 * Operaciones privilegiadas de usuarios (crear / eliminar).
 *
 * Se resuelven con funciones RPC de PostgreSQL `SECURITY DEFINER`, que corren
 * dentro de la base de datos y validan por dentro que el llamante sea Admin.
 * Así no hace falta exponer la `service_role` key en el frontend, ni usar
 * `auth.signUp()`, que reemplazaría la sesión del administrador.
 */

/** Error de PostgREST/Postgres tal como lo devuelve supabase-js. */
interface PgError { message: string; code?: string; details?: string | null; hint?: string | null }

/**
 * Algunas funciones devuelven un envoltorio JSON `{ success, error }` con
 * HTTP 200 en vez de lanzar excepción: en ese caso supabase-js no reporta
 * `error`, así que hay que inspeccionar el cuerpo o el fallo pasa desapercibido.
 */
interface RpcEnvelope { success?: boolean; error?: string; user_id?: string; id?: string }

/** Traduce el error pero SIEMPRE conserva el código y el mensaje crudo. */
function friendly(err: PgError): string {
  const raw = `[${err.code ?? 'sin código'}] ${err.message}`;
  const m = err.message;

  if (err.code === 'PGRST202' || /could not find the function/i.test(m)) {
    return `La función no existe en Supabase (o la caché del esquema está vieja). Corre el SQL y luego NOTIFY pgrst, 'reload schema'. · ${raw}`;
  }
  if (/solo un administrador|no autorizado/i.test(m)) {
    return `Tu usuario no es Admin ACTIVO en la tabla profiles (aunque la app te lo muestre). · ${raw}`;
  }
  if (err.code === '42501' || /permission denied/i.test(m)) {
    return `Sin permiso para ejecutar la función. Falta el GRANT EXECUTE a authenticated, o tu sesión expiró. · ${raw}`;
  }
  if (err.code === '42883' || /does not exist/i.test(m)) {
    return `Falta una función o extensión dependiente. Si menciona gen_salt/crypt, el search_path de la función no incluye el esquema `
      + `extensions (donde vive pgcrypto). · ${raw}`;
  }
  if (/ya existe|already exists|duplicate key/i.test(m)) {
    return `Ese correo ya tiene un usuario registrado. · ${raw}`;
  }
  return raw;
}

/** Traduce el error que viene dentro del envoltorio JSON. */
function friendlyEnvelope(msg: string): string {
  if (/gen_salt|crypt/i.test(msg)) {
    return `La función SQL no encuentra pgcrypto: su search_path no incluye el esquema "extensions". `
      + `Corre el parche de supabase/sql/user_management.sql. · ${msg}`;
  }
  if (/solo un administrador|no autorizado|not authorized/i.test(msg)) {
    return `Tu usuario no es Admin ACTIVO en la tabla profiles. · ${msg}`;
  }
  if (/ya existe|already exists|duplicate/i.test(msg)) {
    return `Ese correo ya tiene un usuario registrado. · ${msg}`;
  }
  return msg;
}

/** Crea el usuario con contraseña temporal y su perfil con rol. */
export async function adminCreateUser(
  email: string,
  tempPassword: string,
  role: UserRole,
): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc('crear_usuario_admin', {
    email_param: email,
    password_param: tempPassword,
    rol_param: role,
  });

  // Fallo a nivel de PostgREST/Postgres (excepción, permisos, función ausente).
  if (error) throw new Error(friendly(error));

  // Fallo reportado dentro del cuerpo con HTTP 200.
  const env = (typeof data === 'object' && data !== null ? data : {}) as RpcEnvelope;
  if (env.success === false || (env.error && !env.success)) {
    throw new Error(friendlyEnvelope(env.error ?? 'La función devolvió success = false.'));
  }

  return { id: env.user_id ?? env.id ?? (typeof data === 'string' ? data : '') };
}

/** Elimina definitivamente el usuario (y su perfil por cascada). */
export async function adminDeleteUser(userId: string): Promise<{ ok: true }> {
  const { data, error } = await supabase.rpc('delete_user_by_id', { p_user_id: userId });
  if (error) throw new Error(friendly(error));

  const env = (typeof data === 'object' && data !== null ? data : {}) as RpcEnvelope;
  if (env.success === false || (env.error && !env.success)) {
    throw new Error(friendlyEnvelope(env.error ?? 'La función devolvió success = false.'));
  }
  return { ok: true };
}
