import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { PiggyBank, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Si ya hay sesión, no mostrar el login: ir directo al dashboard.
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (login(email, password)) {
      navigate('/dashboard', { replace: true });
    } else {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900 px-4 overflow-hidden">
      {/* Halo de fondo */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-7">
        {/* Logo / marca */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-900/40">
            <PiggyBank size={24} className="text-white" />
          </div>
          <h1 className="text-white font-bold text-xl tracking-tight">
            Porci<span className="text-emerald-400">Control</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">Agro Comercial Moreno · ERP</p>
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
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-emerald-900/30"
          >
            Ingresar
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-6">v1.0.0 — Acceso restringido</p>
      </div>
    </div>
  );
}
