import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

// Credenciales hardcodeadas (mock). Sustituir por Supabase Auth en Fase 3.
const VALID_EMAIL = 'agrocomercialmoreno@gmail.com';
const VALID_PASSWORD = 'admin';
const STORAGE_KEY = 'pc_auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === '1',
  );

  const login = (email: string, password: string): boolean => {
    if (email.trim().toLowerCase() === VALID_EMAIL && password === VALID_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, '1');
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
