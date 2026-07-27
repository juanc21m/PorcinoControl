import { supabase } from './supabase';
import type { UserRole } from '../types';

/**
 * Operaciones privilegiadas de usuarios (crear / eliminar).
 *
 * Se resuelven con funciones RPC de PostgreSQL marcadas `SECURITY DEFINER`, que
 * corren dentro de la base de datos con permisos elevados y validan por dentro
 * que el llamante sea Admin activo. Así:
 *   - no hace falta exponer la `service_role` key en el frontend, y
 *   - no se usa `auth.signUp()`, que reemplazaría la sesión del administrador.
 *
 * El SQL de estas funciones está en `supabase/sql/user_management.sql`.
 */

/** Error de PostgREST/Postgres tal como lo devuelve supabase-js. */
interface PgError { message: string; code?: string; details?: string | null; hint?: string | null }

/**
 * Traduce el error pero SIEMPRE conserva el código y el mensaje crudo al final:
 * ocultarlos hacía imposible distinguir "falta el SQL" de "no eres Admin en la
 * base de datos", que son problemas muy distintos.
 */
function friendly(err: PgError): string {
  const raw = `[${err.code ?? 'sin código'}] ${err.message}`;
  const m = err.message;

  if (err.code === 'PGRST202' || /could not find the function/i.test(m)) {
    return `Las funciones de gestión de usuarios no existen en Supabase (o la caché del esquema está vieja). Corre supabase/sql/user_management.sql y luego NOTIFY pgrst, 'reload schema'. · ${raw}`;
  }
  if (/solo un administrador/i.test(m)) {
    return `Tu usuario no es Admin ACTIVO en la tabla profiles (aunque la app te lo muestre). Revisa tu fila en profiles. · ${raw}`;
  }
  if (err.code === '42501' || /permission denied/i.test(m)) {
    return `Sin permiso para ejecutar la función. Falta el GRANT EXECUTE a authenticated, o tu sesión expiró. · ${raw}`;
  }
  if (err.code === '42883' || /function .* does not exist/i.test(m)) {
    return `Falta una función dependiente (probablemente public.is_admin()). Corre el SQL completo. · ${raw}`;
  }
  if (/ya existe|already exists|duplicate key/i.test(m)) {
    return `Ese correo ya tiene un usuario registrado. · ${raw}`;
  }
  return raw;
}

/** Crea el usuario con contraseña temporal y su perfil con rol. */
export async function adminCreateUser(
  email: string,
  tempPassword: string,
  role: UserRole,
): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc('create_user_with_role', {
    p_email: email,
    p_password: tempPassword,
    p_role: role,
  });
  if (error) throw new Error(friendly(error));
  return { id: data as string };
}

/** Elimina definitivamente el usuario (y su perfil por cascada). */
export async function adminDeleteUser(userId: string): Promise<{ ok: true }> {
  const { error } = await supabase.rpc('delete_user_by_id', { p_user_id: userId });
  if (error) throw new Error(friendly(error));
  return { ok: true };
}
