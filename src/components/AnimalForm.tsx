import { useMemo, useState } from 'react';
import { X, Truck } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { ZONE_DEFAULT_FEED } from '../types';

interface Props {
  onClose: () => void;
}

/** Siguiente ID disponible para un género (M-000001 machos / H-000001 hembras). */
function previewTag(animals: { tag: string }[], gender: 'Macho' | 'Hembra'): string {
  const prefix = gender === 'Macho' ? 'M' : 'H';
  const nums = animals
    .filter(a => a.tag.startsWith(prefix + '-'))
    .map(a => parseInt(a.tag.slice(2), 10))
    .filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${String(max + 1).padStart(6, '0')}`;
}

/**
 * Alta de animal por COMPRA / INGRESO externo (no nacido en la finca).
 * El flujo principal es "Registrar Parto"; este es la opción aparte.
 * Sin Rol ni Etapa: el ingreso entra por defecto a la zona 'Ceba'.
 */
export default function AnimalForm({ onClose }: Props) {
  const addAnimal = useAppStore(s => s.addAnimal);
  const animals = useAppStore(s => s.animals);

  const mothers = animals.filter(a => a.gender === 'Hembra');
  const padrotes = animals.filter(a => a.role === 'Padrote' || a.gender === 'Macho');

  const [form, setForm] = useState({
    gender: 'Hembra' as 'Macho' | 'Hembra',
    breed: '',
    birthDate: '',
    weight: '',
    madreId: '',
    padroteId: '',
  });

  const nextTag = useMemo(() => previewTag(animals, form.gender), [animals, form.gender]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addAnimal({
      gender: form.gender,
      role: undefined,
      breed: form.breed,
      birthDate: form.birthDate,
      weight: parseFloat(form.weight),
      etapaActual: 'Ceba',                       // ingreso externo entra a Ceba
      feedType: ZONE_DEFAULT_FEED['Ceba'],       // Engorde
      dailyConsumption: 6,
      status: 'Activo',
      heatStatus: form.gender === 'Hembra' ? 'Vacía' : undefined,
      madre_id: form.madreId || undefined,
      padrote_id: form.padroteId || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2"><Truck size={20} className="text-brand-400" /> Registrar Compra/Ingreso</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Identificación (ID del Cerdo)</label>
            <input className="input font-mono text-brand-400 cursor-not-allowed opacity-80" value={nextTag} readOnly disabled />
            <p className="text-gray-500 text-xs mt-1">Generado automáticamente según el género. No editable.</p>
          </div>
          <div>
            <label className="label">Género</label>
            <select className="input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value as 'Macho' | 'Hembra' })}>
              <option>Hembra</option>
              <option>Macho</option>
            </select>
          </div>
          <div>
            <label className="label">Raza</label>
            <input className="input" placeholder="Landrace" value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} required />
          </div>
          <div>
            <label className="label">Fecha de Nacimiento</label>
            <input type="date" className="input" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} required />
          </div>
          <div>
            <label className="label">Peso Inicial (lb)</label>
            <input type="number" className="input" placeholder="45" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} required />
          </div>
          <div>
            <label className="label">Madre <span className="text-gray-600">(opcional)</span></label>
            <select className="input" value={form.madreId} onChange={e => setForm({ ...form, madreId: e.target.value })}>
              <option value="">— Desconocida (externa) —</option>
              {mothers.map(m => <option key={m.id} value={m.id}>{m.tag}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Padrote <span className="text-gray-600">(opcional)</span></label>
            <select className="input" value={form.padroteId} onChange={e => setForm({ ...form, padroteId: e.target.value })}>
              <option value="">— Desconocido (externo) —</option>
              {padrotes.map(p => <option key={p.id} value={p.id}>{p.tag}</option>)}
            </select>
          </div>
          <div className="col-span-2 bg-gray-800/40 border border-gray-800 rounded-lg px-4 py-2 text-xs text-gray-400">
            El animal ingresará a la zona <span className="text-white font-medium">Ceba</span>. Puedes reubicarlo luego desde su perfil.
          </div>
          <div className="col-span-2 flex justify-end gap-3 mt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Registrar Ingreso</button>
          </div>
        </form>
      </div>
    </div>
  );
}
