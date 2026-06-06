import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'placeholder-key';

/**
 * Cliente único de Supabase.
 *
 * `persistSession` + `autoRefreshToken` garantizan que, tras el login, la sesión
 * (y su JWT) se guarde en localStorage y se adjunte automáticamente en cada
 * petición a PostgREST. Esto es lo que hace que el rol pase de `anon` a
 * `authenticated` y que las políticas RLS de Postgres se evalúen con el usuario
 * real en lugar de rechazar los datos.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'porcicontrol-auth',
  },
});
