import { supabase } from './supabase';
import type { UserRole } from '../types';

/**
 * Operaciones privilegiadas de usuarios (crear / eliminar en Supabase Auth).
 *
 * IMPORTANTE: crear y borrar usuarios requiere la llave `service_role`, que
 * NUNCA debe vivir en el frontend (cualquiera podría extraerla del bundle y
 * tomar control total de la base de datos, saltándose RLS). Por eso estas
 * operaciones se delegan a una Edge Function de Supabase (`admin-users`), que
 * corre en el servidor, guarda la llave como secreto y verifica que quien llama
 * sea realmente un Admin antes de actuar.
 *
 * Ver `supabase/functions/admin-users/index.ts` para el código a desplegar.
 */

async function callAdminFn<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...payload },
  });
  if (error) {
    // Mensaje claro si la función aún no está desplegada.
    const msg = /not found|404|failed to fetch/i.test(error.message)
      ? 'La función admin-users no está desplegada en Supabase. Sigue las instrucciones de supabase/functions/admin-users.'
      : error.message;
    throw new Error(msg);
  }
  const res = data as { error?: string } | null;
  if (res?.error) throw new Error(res.error);
  return data as T;
}

/** Crea el usuario en Auth con contraseña temporal y su perfil con rol. */
export function adminCreateUser(email: string, tempPassword: string, role: UserRole) {
  return callAdminFn<{ id: string }>('create', { email, tempPassword, role });
}

/** Elimina definitivamente el usuario de Auth (y su perfil por cascada). */
export function adminDeleteUser(userId: string) {
  return callAdminFn<{ ok: true }>('delete', { userId });
}
