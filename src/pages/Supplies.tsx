import { useState } from 'react';
import { Boxes, Plus, Minus, AlertTriangle, PackagePlus } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { DEFAULT_SUPPLY_MIN_STOCK } from '../types';

export default function Supplies() {
  const supplies = useAppStore(s => s.supplies);
  const addSupply = useAppStore(s => s.addSupply);
  const adjustSupply = useAppStore(s => s.adjustSupply);
  const updateSupply = useAppStore(s => s.updateSupply);

  const [form, setForm] = useState({ name: '', brand: '', quantity: '', minStock: String(DEFAULT_SUPPLY_MIN_STOCK) });
  const [error, setError] = useState('');

  const lowCount = supplies.filter(s => s.quantity <= s.minStock).length;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const quantity = parseInt(form.quantity);
    if (!form.name.trim()) { setError('Ingresa el nombre del insumo.'); return; }
    if (isNaN(quantity) || quantity < 0) { setError('Cantidad inválida.'); return; }
    addSupply({
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      quantity,
      minStock: parseInt(form.minStock) || DEFAULT_SUPPLY_MIN_STOCK,
    });
    setForm({ name: '', brand: '', quantity: '', minStock: String(DEFAULT_SUPPLY_MIN_STOCK) });
    setError('');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Boxes size={22} className="text-brand-400" /> Insumos Generales
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Jabón, papel, guantes y otros consumibles</p>
        </div>
        {lowCount > 0 && (
          <span className="flex items-center gap-2 text-sm bg-red-500/15 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg">
            <AlertTriangle size={15} /> {lowCount} insumo(s) en stock mínimo
          </span>
        )}
      </div>

      {/* Alta de insumo */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <PackagePlus size={16} className="text-green-400" /> Registrar Insumo
        </h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="label">Nombre</label>
            <input className="input" placeholder="Guantes de látex" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Marca</label>
            <input className="input" placeholder="(opcional)" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
          </div>
          <div>
            <label className="label">Cantidad</label>
            <input type="number" min={0} className="input" placeholder="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
          </div>
          <div>
            <label className="label">Stock mínimo</label>
            <input type="number" min={0} className="input" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} />
          </div>
          {error && <p className="text-red-400 text-xs sm:col-span-2 lg:col-span-5">{error}</p>}
          <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
            <button type="submit" className="btn-primary flex items-center gap-2"><Plus size={16} /> Agregar</button>
          </div>
        </form>
      </div>

      {/* Listado */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-white font-semibold">Inventario de Insumos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50 text-gray-400">
              <tr>
                <th className="text-left px-5 py-3">Insumo</th>
                <th className="text-left px-5 py-3">Marca</th>
                <th className="text-left px-5 py-3">Cantidad</th>
                <th className="text-left px-5 py-3">Stock mín.</th>
                <th className="text-left px-5 py-3">Estado</th>
                <th className="text-right px-5 py-3">Ajustar</th>
              </tr>
            </thead>
            <tbody>
              {supplies.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-600">Sin insumos registrados.</td></tr>
              ) : (
                supplies.map(s => {
                  const low = s.quantity <= s.minStock;
                  return (
                    <tr key={s.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                      <td className="px-5 py-3 text-white font-medium">{s.name}</td>
                      <td className="px-5 py-3 text-gray-400">{s.brand ?? '—'}</td>
                      <td className="px-5 py-3 text-white font-semibold">{s.quantity}</td>
                      <td className="px-5 py-3">
                        <input
                          type="number" min={0}
                          className="input !py-1 !w-20"
                          value={s.minStock}
                          onChange={e => updateSupply(s.id, { minStock: Math.max(0, parseInt(e.target.value) || 0) })}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${low ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                          {low ? 'Stock bajo' : 'Normal'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => adjustSupply(s.id, -1)} className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-red-400 flex items-center justify-center" aria-label="Restar">
                            <Minus size={15} />
                          </button>
                          <button onClick={() => adjustSupply(s.id, 1)} className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-green-400 flex items-center justify-center" aria-label="Sumar">
                            <Plus size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
