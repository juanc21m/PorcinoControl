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
  /** Devuelve un mensaje de error (string) o `null` si el login fue exitoso. */
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Restaura la sesión persistida (si existe) al cargar la app.
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    // Mantiene el estado sincronizado con login / logout / refresh de token.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
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
    await supabase.auth.signOut();
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
