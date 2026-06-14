import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Navigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, PiggyBank, Leaf, Wheat, Tractor, Sprout, Bird } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LOGO_URL, APP_NAME } from '../lib/brand';

// Ecosistema flotante: posiciones, tamaños, opacidades y tiempos escalonados
// (estáticos para que el movimiento sea orgánico y no se re-aleatorice al render).
const FLOATERS: { Icon: LucideIcon; left: string; top: string; size: number; op: number; dur: string; delay: string; x: string; rot: string }[] = [
  { Icon: PiggyBank, left: '6%',  top: '80%', size: 64, op: 0.16, dur: '16s', delay: '0s',   x: '40px',  rot: '35deg' },
  { Icon: Leaf,      left: '16%', top: '95%', size: 40, op: 0.18, dur: '13s', delay: '-4s',  x: '-30px', rot: '-40deg' },
  { Icon: Wheat,     left: '27%', top: '88%', size: 52, op: 0.15, dur: '18s', delay: '-9s',  x: '25px',  rot: '30deg' },
  { Icon: Tractor,   left: '38%', top: '97%', size: 70, op: 0.16, dur: '20s', delay: '-2s',  x: '50px',  rot: '20deg' },
  { Icon: Sprout,    left: '48%', top: '85%', size: 44, op: 0.18, dur: '14s', delay: '-11s', x: '-20px', rot: '45deg' },
  { Icon: Bird,      left: '58%', top: '92%', size: 48, op: 0.15, dur: '17s', delay: '-6s',  x: '35px',  rot: '-30deg' },
  { Icon: Leaf,      left: '69%', top: '96%', size: 36, op: 0.18, dur: '12s', delay: '-14s', x: '-25px', rot: '50deg' },
  { Icon: Wheat,     left: '80%', top: '88%', size: 50, op: 0.15, dur: '19s', delay: '-3s',  x: '30px',  rot: '-35deg' },
  { Icon: PiggyBank, left: '90%', top: '94%', size: 44, op: 0.16, dur: '15s', delay: '-8s',  x: '-35px', rot: '40deg' },
  { Icon: Tractor,   left: '12%', top: '64%', size: 50, op: 0.14, dur: '22s', delay: '-16s', x: '45px',  rot: '30deg' },
  { Icon: Sprout,    left: '24%', top: '70%', size: 38, op: 0.17, dur: '14s', delay: '-19s', x: '20px',  rot: '-25deg' },
  { Icon: Bird,      left: '34%', top: '60%', size: 34, op: 0.16, dur: '16s', delay: '-12s', x: '-30px', rot: '-45deg' },
  { Icon: Leaf,      left: '44%', top: '66%', size: 42, op: 0.18, dur: '13s', delay: '-5s',  x: '28px',  rot: '38deg' },
  { Icon: Wheat,     left: '54%', top: '72%', size: 46, op: 0.15, dur: '18s', delay: '-21s', x: '-22px', rot: '-30deg' },
  { Icon: PiggyBank, left: '64%', top: '62%', size: 40, op: 0.16, dur: '15s', delay: '-7s',  x: '32px',  rot: '28deg' },
  { Icon: Tractor,   left: '74%', top: '70%', size: 56, op: 0.14, dur: '21s', delay: '-17s', x: '-40px', rot: '22deg' },
  { Icon: Sprout,    left: '84%', top: '64%', size: 40, op: 0.17, dur: '14s', delay: '-10s', x: '24px',  rot: '-42deg' },
  { Icon: Bird,      left: '94%', top: '74%', size: 38, op: 0.16, dur: '17s', delay: '-23s', x: '-26px', rot: '44deg' },
  { Icon: Leaf,      left: '4%',  top: '50%', size: 34, op: 0.15, dur: '16s', delay: '-13s', x: '30px',  rot: '-35deg' },
  { Icon: Wheat,     left: '50%', top: '52%', size: 40, op: 0.14, dur: '19s', delay: '-9s',  x: '-28px', rot: '32deg' },
  { Icon: Sprout,    left: '88%', top: '48%', size: 36, op: 0.16, dur: '15s', delay: '-18s', x: '22px',  rot: '40deg' },
  { Icon: PiggyBank, left: '20%', top: '46%', size: 42, op: 0.14, dur: '20s', delay: '-15s', x: '-32px', rot: '-28deg' },
];

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
      {/* Ecosistema flotante (screensaver agrícola) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {FLOATERS.map((f, i) => {
          const Icon = f.Icon;
          return (
            <Icon
              key={i}
              size={f.size}
              className="absolute text-brand-300 animate-login-float"
              style={{
                left: f.left,
                top: f.top,
                '--float-op': f.op,
                '--float-dur': f.dur,
                '--float-x': f.x,
                '--float-rot': f.rot,
                animationDelay: f.delay,
              } as CSSProperties}
            />
          );
        })}
      </div>

      {/* Halo de fondo */}
      <div className="absolute z-0 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-7">
        {/* Logo / marca (sobre tarjeta blanca, sin fondos extra) */}
        <div className="flex flex-col items-center mb-6">
          <img src={LOGO_URL} alt={APP_NAME} className="w-full max-w-[200px] h-auto object-contain" />
          <p className="text-gray-500 text-xs mt-2">ERP · Gestión Porcina</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-700 mb-1 font-medium">Correo Electrónico</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                autoComplete="username"
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-colors"
                placeholder="correo@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1 font-medium">Contraseña</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                autoComplete="current-password"
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-emerald-900/20"
          >
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-xs mt-6">v1.0.0 — Acceso restringido</p>
      </div>
    </div>
  );
}
