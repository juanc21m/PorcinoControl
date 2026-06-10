import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LOGO_URL, APP_NAME } from '../lib/brand';

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mientras se restaura la sesión persistida, no parpadear el formulario.
  if (loading) return <div className="fixed inset-0 bg-slate-900" />;

  // Si ya hay sesión activa en Supabase, ir directo al dashboard.
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const err = await login(email, password);
      if (err) {
        // Supabase devuelve "Invalid login credentials" para correo/clave erróneos.
        setError(
          /invalid login/i.test(err)
            ? 'Credenciales incorrectas. Verifica tu correo y contraseña.'
            : /email not confirmed/i.test(err)
              ? 'Tu correo aún no está confirmado. Pide al administrador que lo active.'
              : err,
        );
      }
      // En caso de éxito, onAuthStateChange actualiza la sesión y el <Navigate>
      // de arriba redirige automáticamente al dashboard.
    } catch (err) {
      // Red de seguridad final: cualquier excepción inesperada se muestra como
      // mensaje en vez de tumbar la app con un "Type error".
      console.error('[login] excepción no controlada:', err);
      setError('No se pudo procesar el inicio de sesión. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900 px-4 overflow-hidden">
      {/* Halo de fondo */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-7">
        {/* Logo / marca */}
        <div className="flex flex-col items-center mb-6">
          <span className="bg-white rounded-xl px-4 py-2.5 inline-flex items-center mb-2 shadow-lg">
            <img src={LOGO_URL} alt={APP_NAME} className="h-11 w-auto object-contain" />
          </span>
          <p className="text-slate-400 text-xs mt-1">ERP · Gestión Porcina</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Correo Electrónico</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                autoComplete="username"
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                placeholder="correo@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Contraseña</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                autoComplete="current-password"
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-emerald-900/30"
          >
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-6">v1.0.0 — Acceso restringido</p>
      </div>
    </div>
  );
}
