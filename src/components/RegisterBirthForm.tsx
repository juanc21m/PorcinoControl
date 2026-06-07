import { useState } from 'react';
import { X, Baby } from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface Props {
  onClose: () => void;
}

/**
 * Flujo PRINCIPAL de alta de animales: registro de parto.
 * Selecciona Madre + Padrote + fecha/hora + camada (machos/hembras) y crea
 * automáticamente los lechones en la zona de Maternidad, con madre y padrote
 * vinculados desde el inicio.
 */
export default function RegisterBirthForm({ onClose }: Props) {
  const animals = useAppStore(s => s.animals);
  const registerFarrowing = useAppStore(s => s.registerFarrowing);
  const currentDate = useAppStore(s => s.currentDate);

  const mothers = animals.filter(a => a.gender === 'Hembra' && a.status === 'Activo');
  const padrotes = animals.filter(a => a.status === 'Activo' && (a.role === 'Padrote' || a.gender === 'Macho'));

  const [motherId, setMotherId] = useState('');
  const [padroteId, setPadroteId] = useState('');
  const [date, setDate] = useState(currentDate);
  const [time, setTime] = useState('');
  const [breed, setBreed] = useState('');
  const [avgWeight, setAvgWeight] = useState('');
  const [males, setMales] = useState('');
  const [females, setFemales] = useState('');
  const [error, setError] = useState('');

  const total = (parseInt(males) || 0) + (parseInt(females) || 0);

  function selectMother(id: string) {
    setMotherId(id);
    const m = animals.find(a => a.id === id);
    if (m && !breed) setBreed(m.breed); // sugiere la raza de la madre
    if (m?.padrote_id) setPadroteId(m.padrote_id);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!motherId) { setError('Selecciona la madre.'); return; }
    if (total <= 0) { setError('Indica al menos un lechón (machos y/o hembras).'); return; }
    const w = parseFloat(avgWeight);
    if (isNaN(w) || w <= 0) { setError('Peso inicial inválido.'); return; }

    registerFarrowing(motherId, {
      males: parseInt(males) || 0,
      females: parseInt(females) || 0,
      avgWeight: w,
      breed: breed.trim() || undefined,
      padroteId: padroteId || undefined,
      date,
      time: time || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2"><Baby size={20} className="text-brand-400" /> Registrar Parto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Madre</label>
              <select className="input" value={motherId} onChange={e => selectMother(e.target.value)} required>
                <option value="" disabled>Seleccionar madre…</option>
                {mothers.map(m => <option key={m.id} value={m.id}>{m.tag}{m.role ? ` · ${m.role}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Padrote</label>
              <select className="input" value={padroteId} onChange={e => setPadroteId(e.target.value)}>
                <option value="">— Sin especificar —</option>
                {padrotes.map(p => <option key={p.id} value={p.id}>{p.tag}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha del Parto</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Hora exacta</label>
              <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Raza de la camada</label>
              <input className="input" placeholder="(hereda de la madre)" value={breed} onChange={e => setBreed(e.target.value)} />
            </div>
            <div>
              <label className="label">Peso Inicial Promedio (lb)</label>
              <input type="number" step="0.1" min={0} className="input" placeholder="3.2" value={avgWeight} onChange={e => setAvgWeight(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label">Cantidad de Lechones</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400 text-xs">Machos (M-)</span>
                <input type="number" min={0} className="input mt-1" placeholder="0" value={males} onChange={e => setMales(e.target.value)} />
              </div>
              <div>
                <span className="text-gray-400 text-xs">Hembras (H-)</span>
                <input type="number" min={0} className="input mt-1" placeholder="0" value={females} onChange={e => setFemales(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-brand-800/10 border border-brand-800/30 rounded-lg px-4 py-2.5 text-sm text-gray-300">
            Se crearán <span className="text-white font-semibold">{total}</span> lechón(es) en la zona <span className="text-white font-semibold">Maternidad</span>, con ID correlativo (M-/H-) y madre/padrote vinculados.
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Registrar Parto</button>
          </div>
        </form>
      </div>
    </div>
  );
}
