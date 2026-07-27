import { useState } from 'react';
import { KeyRound, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LOGO_URL, APP_NAME } from '../lib/brand';

const MIN_LEN = 8;

/**
 * Pantalla de cambio obligatorio de contraseña. Se interpone al ERP cuando el
 * perfil trae `mustChangePassword` (usuario creado con contraseña temporal).
 */
export default function ChangePassword() {
  const { email, changePassword, logout } = useAuth();
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pass.length < MIN_LEN) { setError(`La contraseña debe tener al menos ${MIN_LEN} caracteres.`); return; }
    if (pass !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setSaving(true);
    const err = await changePassword(pass);
    setSaving(false);
    if (err) setError(err);
    // Si sale bien, `mustChangePassword` pasa a false y el gate deja entrar al ERP.
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900 px-4 overflow-hidden">
      <div className="absolute z-0 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-7">
        <div className="flex flex-col items-center mb-5">
          <img src={LOGO_URL} alt={APP_NAME} className="w-full max-w-[190px] h-auto object-contain" />
        </div>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2.5 text-xs text-amber-800 mb-5">
          <ShieldCheck size={14} className="shrink-0 mt-0.5" />
          <span>
            Estás usando una <b>contraseña temporal</b>. Define tu contraseña definitiva
            para poder acceder al sistema.
          </span>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-700 mb-1 font-medium">Usuario</label>
            <input className="w-full bg-gray-100 border border-gray-300 text-gray-500 rounded-lg px-3 py-2.5 text-sm" value={email ?? ''} disabled />
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1 font-medium">Nueva Contraseña</label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                autoComplete="new-password"
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-colors"
                placeholder={`Mínimo ${MIN_LEN} caracteres`}
                value={pass}
                onChange={e => setPass(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1 font-medium">Confirmar Contraseña</label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                autoComplete="new-password"
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-colors"
                placeholder="Repite la contraseña"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
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
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-emerald-900/20"
          >
            {saving ? 'Guardando…' : 'Actualizar Contraseña y Entrar'}
          </button>

          <button
            type="button"
            onClick={() => void logout()}
            className="w-full text-gray-500 hover:text-gray-700 text-xs py-1"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
