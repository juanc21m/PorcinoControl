import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { ETAPAS } from '../types';
import type { AnimalRole, FeedType, EtapaProductiva } from '../types';

interface Props {
  onClose: () => void;
}

type RoleOption = AnimalRole | 'N/A';

/** Calcula el siguiente ID disponible para un género (M-000001 / F-000001). */
function previewTag(animals: { tag: string }[], gender: 'Macho' | 'Hembra'): string {
  const prefix = gender === 'Macho' ? 'M' : 'F';
  const nums = animals
    .filter(a => a.tag.startsWith(prefix + '-'))
    .map(a => parseInt(a.tag.slice(2), 10))
    .filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${String(max + 1).padStart(6, '0')}`;
}

export default function AnimalForm({ onClose }: Props) {
  const addAnimal = useAppStore(s => s.addAnimal);
  const animals = useAppStore(s => s.animals);
  const [form, setForm] = useState({
    gender: 'Hembra' as 'Macho' | 'Hembra',
    role: 'Madre' as RoleOption,
    breed: '',
    birthDate: '',
    weight: '',
    etapaActual: 'Gestación' as EtapaProductiva,
    feedType: 'Crecimiento' as FeedType,
  });

  // ID autogenerado, reactivo al género seleccionado.
  const nextTag = useMemo(() => previewTag(animals, form.gender), [animals, form.gender]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addAnimal({
      gender: form.gender,
      role: form.role === 'N/A' ? undefined : form.role,
      breed: form.breed,
      birthDate: form.birthDate,
      weight: parseFloat(form.weight),
      etapaActual: form.etapaActual,
      feedType: form.feedType,
      // Consumo diario por defecto según rol (Padrote consume más)
      dailyConsumption: form.role === 'Padrote' ? 8 : 6,
      status: 'Activo',
      heatStatus: form.gender === 'Hembra' ? 'Vacía' : undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg">Agregar Animal Nuevo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">ID del Cerdo</label>
            <input
              className="input font-mono text-brand-400 cursor-not-allowed opacity-80"
              value={nextTag}
              readOnly
              disabled
            />
            <p className="text-gray-500 text-xs mt-1">Generado automáticamente según el género.</p>
          </div>
          <div>
            <label className="label">Género</label>
            <select className="input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value as 'Macho' | 'Hembra' })}>
              <option>Hembra</option>
              <option>Macho</option>
            </select>
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as RoleOption })}>
              <option>Madre</option>
              <option>Padrote</option>
              <option value="N/A">N/A</option>
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
            <label className="label">Etapa Productiva</label>
            <select className="input" value={form.etapaActual} onChange={e => setForm({ ...form, etapaActual: e.target.value as EtapaProductiva })}>
              {ETAPAS.map(etapa => <option key={etapa}>{etapa}</option>)}
            </select>
          </div>
          <div className="col-span-2 flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Guardar Animal</button>
          </div>
        </form>
      </div>
    </div>
  );
}
