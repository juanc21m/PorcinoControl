import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Role = 'admin' | 'user';

/**
 * RBAC basado en email. El aprovisionamiento de usuarios es manual en el backend
 * (Supabase Auth); aquí solo derivamos el rol a partir del correo de la sesión.
 *  - admin: acceso total (incl. DB Portal)
 *  - user : acceso restringido
 */
const ADMIN_EMAILS = ['juan59824@gmail.com'];

function roleForEmail(email?: string | null): Role {
  return email && ADMIN_EMAILS.includes(email.trim().toLowerCase()) ? 'admin' : 'user';
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  email: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  /** true si no se pudo contactar al backend de autenticación. */
  backendDown: boolean;
  /** Devuelve un mensaje de error (string) o `null` si el login fue exitoso. */
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);

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
  const role = user ? roleForEmail(email) : null;

  const value: AuthContextValue = {
    session,
    user,
    email,
    role,
    isAuthenticated: !!session,
    isAdmin: role === 'admin',
    loading,
    backendDown,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
