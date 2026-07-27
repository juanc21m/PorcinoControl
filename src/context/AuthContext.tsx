import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchMyProfile } from '../lib/db';
import type { Profile, UserRole } from '../types';

export type Role = 'admin' | 'user';

/**
 * RBAC basado en email. El aprovisionamiento de usuarios es manual en el backend
 * (Supabase Auth); aquí solo derivamos el rol a partir del correo de la sesión.
 *  - admin: acceso total (incl. DB Portal)
 *  - user : acceso restringido
 */
/**
 * Fallback de emergencia: si la tabla `profiles` todavía no existe (migración
 * pendiente) se usa esta lista para no quedarse sin administrador.
 */
const FALLBACK_ADMIN_EMAILS = ['juan59824@gmail.com'];

function fallbackRole(email?: string | null): UserRole {
  return email && FALLBACK_ADMIN_EMAILS.includes(email.trim().toLowerCase()) ? 'Admin' : 'Operador';
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  email: string | null;
  role: Role | null;
  /** Perfil (rol/estado) leído de la tabla `profiles`. */
  profile: Profile | null;
  userRole: UserRole | null;
  /** true si el usuario aún tiene la contraseña temporal y debe cambiarla. */
  mustChangePassword: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  /** true si no se pudo contactar al backend de autenticación. */
  backendDown: boolean;
  /** Devuelve un mensaje de error (string) o `null` si el login fue exitoso. */
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  /** Fija la contraseña definitiva y limpia el flag de cambio obligatorio. */
  changePassword: (newPassword: string) => Promise<string | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;
    let settled = false;

    // Red de seguridad: si la petición se queda colgada (p. ej. el host del
    // backend no resuelve), igual liberamos la UI para no dejar la pantalla
    // en blanco esperando indefinidamente.
    const watchdog = setTimeout(() => {
      if (!mounted || settled) return;
      console.error('[auth] getSession() no respondió a tiempo; se libera la UI.');
      setBackendDown(true);
      setLoading(false);
    }, 8000);

    // Restaura la sesión persistida (si existe) al cargar la app.
    // El .catch() es obligatorio: si el backend no responde, getSession() se
    // rechaza y sin él `loading` se quedaba en true para siempre, dejando la
    // pantalla en blanco (la app nunca llegaba a renderizar el formulario).
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
      })
      .catch((err) => {
        console.error('[auth] no se pudo contactar al servidor de sesión:', err);
        if (mounted) setBackendDown(true);
      })
      .finally(() => {
        settled = true;
        clearTimeout(watchdog);
        if (mounted) setLoading(false);
      });

    // Mantiene el estado sincronizado con login / logout / refresh de token.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      clearTimeout(watchdog);
      sub.subscription.unsubscribe();
    };
  }, []);

  // Carga el perfil (rol/estado) del usuario autenticado desde `profiles`.
  const loadProfile = async (uid: string | undefined) => {
    if (!uid) { setProfile(null); return; }
    try {
      setProfile(await fetchMyProfile(uid));
    } catch (err) {
      // Tabla `profiles` inexistente o sin permiso: se cae al rol de respaldo.
      console.error('[auth] no se pudo leer el perfil:', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    void loadProfile(session?.user?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const refreshProfile = async () => { await loadProfile(session?.user?.id); };

  const changePassword = async (newPassword: string): Promise<string | null> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return error.message;
      // Limpia el flag para que no vuelva a pedir el cambio.
      if (session?.user?.id) {
        const { error: pErr } = await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', session.user.id);
        if (pErr) console.error('[auth] no se pudo limpiar must_change_password:', pErr);
      }
      await loadProfile(session?.user?.id);
      return null;
    } catch (err) {
      console.error('[auth] changePassword falló:', err);
      return err instanceof Error ? err.message : 'No se pudo actualizar la contraseña';
    }
  };

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      return error ? error.message : null;
    } catch (err) {
      // signInWithPassword puede *lanzar* (no solo devolver error) ante fallos de
      // red/fetch (p.ej. "TypeError: Failed to fetch"). Lo capturamos para que el
      // formulario nunca crashee y muestre un mensaje útil.
      console.error('[auth] login lanzó excepción:', err);
      return err instanceof Error ? err.message : 'Error de conexión';
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // Si el backend no responde, igual cerramos la sesión localmente para no
      // dejar al usuario atrapado dentro de la app.
      console.error('[auth] signOut falló; se limpia la sesión local:', err);
      setSession(null);
    }
  };

  const user = session?.user ?? null;
  const email = user?.email ?? null;
  // El rol viene de `profiles`; si aún no hay tabla/perfil, se usa el respaldo.
  const userRole: UserRole | null = user ? (profile?.role ?? fallbackRole(email)) : null;
  const role: Role | null = user ? (userRole === 'Admin' ? 'admin' : 'user') : null;

  const value: AuthContextValue = {
    session,
    user,
    email,
    role,
    profile,
    userRole,
    mustChangePassword: !!profile?.mustChangePassword,
    isAuthenticated: !!session,
    isAdmin: userRole === 'Admin',
    loading,
    backendDown,
    login,
    logout,
    changePassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
