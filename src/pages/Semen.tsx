import { useMemo, useState } from 'react';
import { TestTube, Plus, Droplet } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export default function Semen() {
  const animals = useAppStore(s => s.animals);
  const semenBatches = useAppStore(s => s.semenBatches);
  const addSemenBatch = useAppStore(s => s.addSemenBatch);
  const currentDate = useAppStore(s => s.currentDate);

  const padrotes = animals.filter(a => a.status === 'Activo' && (a.role === 'Padrote' || a.gender === 'Macho'));

  const [form, setForm] = useState({ padroteId: '', date: currentDate, strawsTotal: '', note: '' });
  const [error, setError] = useState('');

  // Resumen por padrote: pajillas disponibles + última extracción.
  const byPadrote = useMemo(() => {
    const map = new Map<string, { tag: string; available: number; total: number; last: string }>();
    for (const b of semenBatches) {
      const cur = map.get(b.padroteId) ?? { tag: b.padroteTag, available: 0, total: 0, last: '' };
      cur.available += b.strawsAvailable;
      cur.total += b.strawsTotal;
      if (b.date > cur.last) cur.last = b.date;
      map.set(b.padroteId, cur);
    }
    return [...map.values()].sort((a, b) => a.tag.localeCompare(b.tag));
  }, [semenBatches]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const padrote = padrotes.find(p => p.id === form.padroteId);
    const strawsTotal = parseInt(form.strawsTotal);
    if (!padrote) { setError('Selecciona un padrote.'); return; }
    if (isNaN(strawsTotal) || strawsTotal <= 0) { setError('Cantidad de pajillas inválida.'); return; }
    addSemenBatch({
      padroteId: padrote.id,
      padroteTag: padrote.tag,
      date: form.date,
      strawsTotal,
      note: form.note.trim() || undefined,
    });
    setForm({ padroteId: '', date: currentDate, strawsTotal: '', note: '' });
    setError('');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TestTube size={22} className="text-brand-400" /> Banco de Semen
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Registro de pajillas por extracción y stock por padrote</p>
      </div>

      {/* Stock por padrote */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {byPadrote.length === 0 ? (
          <p className="text-gray-600 text-sm col-span-full">Sin extracciones registradas.</p>
        ) : byPadrote.map(p => (
          <div key={p.tag} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Droplet size={15} className="text-sky-400" />
              <span className="text-white font-semibold">{p.tag}</span>
            </div>
            <p className="text-3xl font-bold text-white">{p.available}</p>
            <p className="text-gray-500 text-xs">pajillas disponibles</p>
            <p className="text-gray-500 text-xs mt-2">Última extracción: <span className="text-gray-300">{p.last || '—'}</span></p>
          </div>
        ))}
      </div>

      {/* Registrar extracción */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Plus size={16} className="text-green-400" /> Registrar Extracción
        </h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="label">Padrote</label>
            <select className="input" value={form.padroteId} onChange={e => setForm({ ...form, padroteId: e.target.value })} required>
              <option value="" disabled>Seleccionar…</option>
              {padrotes.map(p => <option key={p.id} value={p.id}>{p.tag}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div>
            <label className="label">Pajillas obtenidas</label>
            <input type="number" min={1} className="input" placeholder="20" value={form.strawsTotal} onChange={e => setForm({ ...form, strawsTotal: e.target.value })} required />
          </div>
          <div>
            <label className="label">Nota</label>
            <input className="input" placeholder="(opcional)" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          </div>
          {error && <p className="text-red-400 text-xs sm:col-span-2 lg:col-span-4">{error}</p>}
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button type="submit" className="btn-primary flex items-center gap-2"><Plus size={16} /> Registrar</button>
          </div>
        </form>
      </div>

      {/* Historial de lotes */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-white font-semibold">Lotes de Extracción</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-primary-800/40 text-gray-400">
              <tr>
                <th className="text-left px-5 py-3">Fecha</th>
                <th className="text-left px-5 py-3">Padrote</th>
                <th className="text-left px-5 py-3">Disponibles</th>
                <th className="text-left px-5 py-3">Total</th>
                <th className="text-left px-5 py-3">Nota</th>
              </tr>
            </thead>
            <tbody>
              {semenBatches.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-600">Sin lotes registrados.</td></tr>
              ) : semenBatches.map(b => (
                <tr key={b.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                  <td className="px-5 py-3 text-gray-400">{b.date}</td>
                  <td className="px-5 py-3 text-white font-medium">{b.padroteTag}</td>
                  <td className="px-5 py-3 text-white font-semibold">{b.strawsAvailable}</td>
                  <td className="px-5 py-3 text-gray-300">{b.strawsTotal}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{b.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
