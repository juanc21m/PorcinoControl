import { useMemo, useState } from 'react';
import { X, Baby, Minus, Plus } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { Animal, EtapaProductiva } from '../types';

interface Props {
  onClose: () => void;
}

// Solo pueden parir las hembras que están en estas zonas.
const BIRTH_ELIGIBLE_ZONES: EtapaProductiva[] = ['Gestación', 'Maternidad'];

function nextNum(animals: Animal[], prefix: 'M' | 'H'): number {
  const nums = animals
    .filter(a => a.tag.startsWith(prefix + '-'))
    .map(a => parseInt(a.tag.slice(2), 10))
    .filter(n => !isNaN(n));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}
const fmt = (prefix: string, n: number) => `${prefix}-${String(n).padStart(6, '0')}`;

/** Stepper numérico grande, óptimo para móvil. */
function Stepper({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <span className="text-gray-400 text-xs">{label} <span className="text-gray-600">({hint})</span></span>
      <div className="mt-1 flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))}
          className="w-11 h-11 shrink-0 rounded-lg bg-gray-800 hover:bg-gray-700 text-red-400 flex items-center justify-center" aria-label={`Restar ${label}`}>
          <Minus size={18} />
        </button>
        <input
          type="number" inputMode="numeric" min={0}
          className="input text-center text-lg font-semibold !py-2"
          value={value === 0 ? '' : value}
          placeholder="0"
          onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        />
        <button type="button" onClick={() => onChange(value + 1)}
          className="w-11 h-11 shrink-0 rounded-lg bg-gray-800 hover:bg-gray-700 text-green-400 flex items-center justify-center" aria-label={`Sumar ${label}`}>
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

/**
 * Flujo PRINCIPAL de alta: registro masivo de camada.
 * Solo lista madres en Gestación/Maternidad. Al guardar, crea TODOS los
 * lechones de una sola vez (un único INSERT), en Maternidad y vinculados a la
 * madre y al padrote.
 */
export default function RegisterBirthForm({ onClose }: Props) {
  const animals = useAppStore(s => s.animals);
  const registerFarrowing = useAppStore(s => s.registerFarrowing);
  const currentDate = useAppStore(s => s.currentDate);

  const mothers = animals.filter(a => a.gender === 'Hembra' && a.status === 'Activo' && BIRTH_ELIGIBLE_ZONES.includes(a.etapaActual));
  const padrotes = animals.filter(a => a.status === 'Activo' && (a.role === 'Padrote' || a.gender === 'Macho'));

  const [motherId, setMotherId] = useState('');
  const [padroteId, setPadroteId] = useState('');
  const [date, setDate] = useState(currentDate);
  const [time, setTime] = useState('');
  const [breed, setBreed] = useState('');
  const [avgWeight, setAvgWeight] = useState('');
  const [males, setMales] = useState(0);
  const [females, setFemales] = useState(0);
  const [error, setError] = useState('');

  const total = males + females;

  // Vista previa de los IDs que se asignarán (correlativos globales M-/H-).
  const preview = useMemo(() => {
    const sm = nextNum(animals, 'M');
    const sh = nextNum(animals, 'H');
    return {
      m: males > 0 ? (males === 1 ? fmt('M', sm) : `${fmt('M', sm)} → ${fmt('M', sm + males - 1)}`) : null,
      h: females > 0 ? (females === 1 ? fmt('H', sh) : `${fmt('H', sh)} → ${fmt('H', sh + females - 1)}`) : null,
    };
  }, [animals, males, females]);

  function selectMother(id: string) {
    setMotherId(id);
    const m = animals.find(a => a.id === id);
    if (m && !breed) setBreed(m.breed);
    if (m?.padrote_id) setPadroteId(m.padrote_id);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!motherId) { setError('Selecciona la madre.'); return; }
    if (total <= 0) { setError('Indica al menos un lechón (machos y/o hembras).'); return; }
    const w = parseFloat(avgWeight);
    if (isNaN(w) || w <= 0) { setError('Peso inicial inválido.'); return; }

    registerFarrowing(motherId, {
      males, females, avgWeight: w,
      breed: breed.trim() || undefined,
      padroteId: padroteId || undefined,
      date,
      time: time || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sm:p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2"><Baby size={20} className="text-brand-400" /> Registrar Parto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={22} /></button>
        </div>

        {mothers.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-300 bg-gray-800/40 border border-gray-800 rounded-lg px-4 py-3">
              No hay hembras en <b className="text-white">Gestación</b> ni <b className="text-white">Maternidad</b> disponibles para parto.
              Solo aparecen aquí las madres en esas zonas.
            </p>
            <div className="flex justify-end"><button onClick={onClose} className="btn-secondary">Cerrar</button></div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Madre <span className="text-gray-600">(en Gestación/Maternidad)</span></label>
                <select className="input" value={motherId} onChange={e => selectMother(e.target.value)} required>
                  <option value="" disabled>Seleccionar madre…</option>
                  {mothers.map(m => <option key={m.id} value={m.id}>{m.tag} · {m.etapaActual}</option>)}
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
                <input type="number" inputMode="decimal" step="0.1" min={0} className="input" placeholder="3.2" value={avgWeight} onChange={e => setAvgWeight(e.target.value)} required />
              </div>
            </div>

            {/* Camada: steppers grandes para móvil */}
            <div className="grid grid-cols-2 gap-4">
              <Stepper label="Machos" hint="M-" value={males} onChange={setMales} />
              <Stepper label="Hembras" hint="H-" value={females} onChange={setFemales} />
            </div>

            {/* Resumen + preview de IDs */}
            <div className="bg-brand-800/10 border border-brand-800/30 rounded-lg px-4 py-3 text-sm space-y-1">
              <p className="text-gray-300">Se crearán <span className="text-white font-bold text-base">{total}</span> lechón(es) en <span className="text-white font-semibold">Maternidad</span>, en un solo registro.</p>
              {preview.m && <p className="text-gray-400 text-xs">Machos: <span className="font-mono text-brand-300">{preview.m}</span></p>}
              {preview.h && <p className="text-gray-400 text-xs">Hembras: <span className="font-mono text-brand-300">{preview.h}</span></p>}
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary py-3 sm:py-2 text-base sm:text-sm">Guardar Camada ({total})</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
