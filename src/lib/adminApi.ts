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

function friendly(message: string): string {
  if (/does not exist|could not find the function/i.test(message)) {
    return 'Las funciones de gestión de usuarios no existen aún en Supabase. Corre el SQL de supabase/sql/user_management.sql.';
  }
  if (/ya existe|already exists|duplicate key/i.test(message)) {
    return 'Ese correo ya tiene un usuario registrado.';
  }
  if (/solo un administrador|not authorized|permission denied/i.test(message)) {
    return 'Solo un administrador activo puede gestionar usuarios.';
  }
  return message;
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
  if (error) throw new Error(friendly(error.message));
  return { id: data as string };
}

/** Elimina definitivamente el usuario (y su perfil por cascada). */
export async function adminDeleteUser(userId: string): Promise<{ ok: true }> {
  const { error } = await supabase.rpc('delete_user_by_id', { p_user_id: userId });
  if (error) throw new Error(friendly(error.message));
  return { ok: true };
}
