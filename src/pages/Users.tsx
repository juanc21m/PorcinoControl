import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Users as UsersIcon, UserPlus, ShieldCheck, ShieldOff, Trash2, AlertCircle, RefreshCw, KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchProfiles, updateProfile } from '../lib/db';
import { adminCreateUser, adminDeleteUser } from '../lib/adminApi';
import { USER_ROLES } from '../types';
import type { Profile, UserRole } from '../types';

const MIN_TEMP_LEN = 8;

export default function Users() {
  const { isAdmin, user: me } = useAuth();

  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null);

  // Formulario de creación
  const [form, setForm] = useState({ email: '', role: 'Operador' as UserRole, tempPassword: '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await fetchProfiles());
    } catch (err) {
      setError(
        err instanceof Error && /profiles/i.test(err.message)
          ? 'La tabla `profiles` no existe todavía. Corre la migración SQL en Supabase.'
          : (err instanceof Error ? err.message : 'No se pudieron cargar los usuarios.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // RBAC: bloqueo a nivel de página (los hooks van antes de este return).
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  async function changeRole(p: Profile, role: UserRole) {
    setError(''); setFlash('');
    try {
      await updateProfile(p.id, { role });
      setRows(rs => rs.map(r => (r.id === p.id ? { ...r, role } : r)));
      setFlash(`${p.email} ahora es ${role}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el rol.');
    }
  }

  async function toggleAccess(p: Profile) {
    const status = p.status === 'Activo' ? 'Revocado' : 'Activo';
    setError(''); setFlash('');
    try {
      await updateProfile(p.id, { status });
      setRows(rs => rs.map(r => (r.id === p.id ? { ...r, status } : r)));
      setFlash(`Acceso de ${p.email} ${status === 'Revocado' ? 'revocado' : 'restaurado'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado.');
    }
  }

  async function resetToTemp(p: Profile) {
    setError(''); setFlash('');
    try {
      await updateProfile(p.id, { mustChangePassword: true });
      setRows(rs => rs.map(r => (r.id === p.id ? { ...r, mustChangePassword: true } : r)));
      setFlash(`${p.email} deberá definir una nueva contraseña en su próximo ingreso.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo marcar el cambio de clave.');
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setFlash('');
    const email = form.email.trim().toLowerCase();
    if (!email.includes('@')) { setError('Ingresa un correo válido.'); return; }
    if (form.tempPassword.length < MIN_TEMP_LEN) {
      setError(`La contraseña temporal debe tener al menos ${MIN_TEMP_LEN} caracteres.`); return;
    }
    setCreating(true);
    try {
      await adminCreateUser(email, form.tempPassword, form.role);
      setFlash(`Usuario ${email} creado como ${form.role}. Deberá cambiar la contraseña al entrar.`);
      setForm({ email: '', role: 'Operador', tempPassword: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el usuario.');
    } finally {
      setCreating(false);
    }
  }

  async function deleteUser(p: Profile) {
    setError(''); setFlash('');
    try {
      await adminDeleteUser(p.id);
      setRows(rs => rs.filter(r => r.id !== p.id));
      setFlash(`Usuario ${p.email} eliminado.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el usuario.');
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-50 flex items-center gap-2">
            <UsersIcon size={22} className="text-brand-400" /> Usuarios
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Gestión de accesos, roles y permisos</p>
        </div>
        <button onClick={() => void load()} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={15} /> Recargar
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 text-sm text-red-400">
          <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {flash && (
        <div className="bg-brand-800/15 border border-brand-700/40 rounded-lg px-4 py-2.5 text-sm text-brand-200">
          {flash}
        </div>
      )}

      {/* Crear usuario */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-gray-50 font-semibold mb-1 flex items-center gap-2">
          <UserPlus size={16} className="text-brand-400" /> Crear Usuario
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          El usuario entrará con la contraseña temporal y el sistema le exigirá definir
          una definitiva en su primer inicio de sesión.
        </p>
        <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="label">Correo electrónico</label>
            <input
              type="email" className="input" placeholder="persona@empresa.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
            />
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })}>
              {USER_ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Contraseña temporal</label>
            <input
              type="text" className="input" placeholder={`Mínimo ${MIN_TEMP_LEN} caracteres`}
              value={form.tempPassword} onChange={e => setForm({ ...form, tempPassword: e.target.value })} required
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              <UserPlus size={16} /> {creating ? 'Creando…' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-gray-50 font-semibold">Usuarios Registrados <span className="text-gray-500 text-sm font-normal">({rows.length})</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/60 text-gray-400">
              <tr>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Rol</th>
                <th className="text-left px-5 py-3">Estado</th>
                <th className="text-left px-5 py-3">Creación</th>
                <th className="text-right px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-500">Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-600">Sin usuarios registrados.</td></tr>
              ) : rows.map(p => {
                const isMe = p.id === me?.id;
                return (
                  <tr key={p.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                    <td className="px-5 py-3">
                      <span className="text-gray-50 font-medium">{p.email}</span>
                      {isMe && <span className="ml-2 text-[10px] uppercase tracking-wider text-brand-400">(tú)</span>}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        className="input !py-1 !w-32"
                        value={p.role}
                        disabled={isMe}
                        title={isMe ? 'No puedes cambiar tu propio rol' : 'Cambiar rol'}
                        onChange={e => void changeRole(p, e.target.value as UserRole)}
                      >
                        {USER_ROLES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.status === 'Activo' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {p.status}
                        </span>
                        {p.mustChangePassword && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                            Pendiente cambio clave
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                      {p.createdAt ? p.createdAt.slice(0, 10) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => void resetToTemp(p)}
                          title="Exigir cambio de contraseña en el próximo ingreso"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-gray-800"
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          onClick={() => void toggleAccess(p)}
                          disabled={isMe}
                          title={p.status === 'Activo' ? 'Revocar acceso' : 'Restaurar acceso'}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-50 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {p.status === 'Activo' ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(p)}
                          disabled={isMe}
                          title="Eliminar usuario"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmación de eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4">
          <div className="bg-gray-900 border border-red-800/50 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-gray-50 font-semibold mb-2 flex items-center gap-2">
              <Trash2 size={18} className="text-red-400" /> Eliminar usuario
            </h3>
            <p className="text-gray-400 text-sm mb-5">
              ¿Estás seguro de eliminar el acceso de <b className="text-gray-50">{confirmDelete.email}</b>?
              Esta acción borra su usuario de forma permanente y no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => void deleteUser(confirmDelete)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white"
              >
                <Trash2 size={15} /> Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
