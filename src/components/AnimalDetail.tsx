import { useMemo, useState } from 'react';
import { X, Weight, Syringe, Clock, Baby, Droplet } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Animal } from '../types';
import { useAppStore } from '../store/appStore';

interface Props {
  animal: Animal;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Modal de Parto (carga masiva de lechones): madre + padrote + peso + fecha/hora
// ---------------------------------------------------------------------------
function FarrowingModal({ mother, onClose }: { mother: Animal; onClose: () => void }) {
  const registerFarrowing = useAppStore(s => s.registerFarrowing);
  const animals = useAppStore(s => s.animals);
  const currentDate = useAppStore(s => s.currentDate);
  const padrotes = animals.filter(a => a.status === 'Activo' && (a.role === 'Padrote' || a.gender === 'Macho'));

  const [count, setCount] = useState('');
  const [avgW, setAvgW] = useState('');
  const [padroteId, setPadroteId] = useState(mother.padrote_id ?? '');
  const [date, setDate] = useState(currentDate);
  const [time, setTime] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    registerFarrowing(mother.id, parseInt(count), parseFloat(avgW), {
      padroteId: padroteId || undefined,
      date,
      time: time || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Baby size={18} className="text-brand-400" /> Registrar Nacimiento (Camada)</h3>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Madre</label>
              <input className="input" value={mother.tag} disabled />
            </div>
            <div>
              <label className="label">Padrote</label>
              <select className="input" value={padroteId} onChange={e => setPadroteId(e.target.value)}>
                <option value="">— Sin especificar —</option>
                {padrotes.map(p => <option key={p.id} value={p.id}>{p.tag}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cantidad de Lechones</label>
              <input type="number" min={1} className="input" placeholder="10" value={count} onChange={e => setCount(e.target.value)} required />
            </div>
            <div>
              <label className="label">Peso Inicial Prom. (lb)</label>
              <input type="number" step="0.1" min={0} className="input" placeholder="3.2" value={avgW} onChange={e => setAvgW(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha de Nacimiento</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Hora exacta</label>
              <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <p className="text-gray-500 text-xs">Se crearán {count || 0} lechones con estos datos (madre, padrote, peso, fecha y hora).</p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Registrar Camada</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de Inseminación: descuenta 1 pajilla del padrote elegido
// ---------------------------------------------------------------------------
function InseminateModal({ female, onClose }: { female: Animal; onClose: () => void }) {
  const animals = useAppStore(s => s.animals);
  const semenBatches = useAppStore(s => s.semenBatches);
  const inseminate = useAppStore(s => s.inseminate);

  const available = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of semenBatches) map.set(b.padroteId, (map.get(b.padroteId) ?? 0) + b.strawsAvailable);
    return map;
  }, [semenBatches]);

  const padrotes = animals
    .filter(a => a.status === 'Activo' && (a.role === 'Padrote' || a.gender === 'Macho'))
    .map(p => ({ ...p, straws: available.get(p.id) ?? 0 }));

  const withStock = padrotes.filter(p => p.straws > 0);
  const [padroteId, setPadroteId] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!padroteId) return;
    inseminate(female.id, padroteId);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Syringe size={18} className="text-brand-400" /> Inseminar {female.tag}</h3>
        {withStock.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-red-400">No hay pajillas disponibles. Registra una extracción en el módulo de Semen.</p>
            <div className="flex justify-end"><button onClick={onClose} className="btn-secondary">Cerrar</button></div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Padrote (pajillas disponibles)</label>
              <select className="input" value={padroteId} onChange={e => setPadroteId(e.target.value)} required>
                <option value="" disabled>Seleccionar…</option>
                {withStock.map(p => <option key={p.id} value={p.id}>{p.tag} — {p.straws} pajilla(s)</option>)}
              </select>
            </div>
            <p className="text-gray-500 text-xs">Se descontará 1 pajilla, la hembra pasará a "Inseminada" y se calculará el parto estimado (+114 días).</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary">Confirmar Inseminación</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const statusColors: Record<string, string> = {
  'Activo':            'bg-green-500/20 text-green-400',
  'Despachado':        'bg-gray-500/20 text-gray-400',
  'Fallecido':         'bg-red-500/20 text-red-400',
  'Descarte/Matadero': 'bg-orange-500/20 text-orange-400',
  'En Celo':           'bg-pink-500/20 text-pink-400',
  'Inseminada':        'bg-blue-500/20 text-blue-400',
  'Embarazada':        'bg-yellow-500/20 text-yellow-400',
  'Lactante':          'bg-purple-500/20 text-purple-400',
  'Vacía':             'bg-gray-500/20 text-gray-400',
  'Abierta':           'bg-amber-500/20 text-amber-400',
};

export default function AnimalDetail({ animal, onClose }: Props) {
  const [showFarrowing, setShowFarrowing] = useState(false);
  const [showInseminate, setShowInseminate] = useState(false);
  const semenBatches = useAppStore(s => s.semenBatches);

  // Semen del padrote (si aplica): disponibles + última extracción.
  const semenInfo = useMemo(() => {
    const own = semenBatches.filter(b => b.padroteId === animal.id);
    if (!own.length) return null;
    return {
      available: own.reduce((acc, b) => acc + b.strawsAvailable, 0),
      total: own.reduce((acc, b) => acc + b.strawsTotal, 0),
      last: own.reduce((acc, b) => (b.date > acc ? b.date : acc), ''),
    };
  }, [semenBatches, animal.id]);

  const isMale = animal.gender === 'Macho' || animal.role === 'Padrote';

  return (
    <>
      <div className="fixed right-0 top-0 h-screen w-full max-w-sm bg-gray-900 border-l border-gray-800 z-40 overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">{animal.tag}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* General info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Rol', animal.role ?? 'N/A'],
              ['Género', animal.gender],
              ['Raza', animal.breed],
              ['Nacimiento', animal.birthTime ? `${animal.birthDate} ${animal.birthTime}` : animal.birthDate],
              ['Peso', `${animal.weight} lb`],
              ['Etapa', animal.etapaActual],
              ['Alimento', animal.feedType],
              ['Consumo/día', `${animal.dailyConsumption} lb`],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-gray-500 text-xs">{k}</p>
                <p className="text-white font-medium">{v}</p>
              </div>
            ))}
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[animal.status]}`}>{animal.status}</span>
            {animal.heatStatus && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[animal.heatStatus]}`}>{animal.heatStatus}</span>
            )}
          </div>

          {/* Semen del padrote */}
          {isMale && semenInfo && (
            <div className="bg-gray-800/40 border border-gray-800 rounded-lg p-4">
              <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><Droplet size={12} /> Semen</h4>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">{semenInfo.available}</p>
                  <p className="text-gray-500 text-xs">pajillas disponibles (de {semenInfo.total})</p>
                </div>
                <p className="text-gray-400 text-xs text-right">Última extracción<br /><span className="text-white">{semenInfo.last || '—'}</span></p>
              </div>
            </div>
          )}

          {/* Genealogy */}
          {(animal.madre_id || animal.padrote_id) && (
            <div>
              <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Genealogía</h4>
              <div className="space-y-1 text-sm">
                {animal.madre_id && <p className="text-gray-300">Madre ID: <span className="text-white">{animal.madre_id}</span></p>}
                {animal.padrote_id && <p className="text-gray-300">Padrote ID: <span className="text-white">{animal.padrote_id}</span></p>}
              </div>
            </div>
          )}

          {/* Weight chart */}
          {animal.weights.length > 1 && (
            <div>
              <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-1"><Weight size={12} /> Historial de Pesos</h4>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={animal.weights}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="weight" stroke="#4ade80" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Vaccinations */}
          <div>
            <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><Syringe size={12} /> Vacunas</h4>
            {animal.vaccinations.length === 0 ? (
              <p className="text-gray-600 text-sm">Sin registros</p>
            ) : (
              <ul className="space-y-1">
                {animal.vaccinations.map((v, i) => (
                  <li key={i} className="text-sm text-gray-300 flex justify-between">
                    <span>{v.vaccine}</span>
                    <span className="text-gray-500">{v.date}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* History */}
          <div>
            <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><Clock size={12} /> Historial</h4>
            <ul className="space-y-1">
              {[...animal.history].reverse().map((h, i) => (
                <li key={i} className="text-sm text-gray-300 border-l-2 border-brand-800 pl-3 py-0.5">
                  <p>{h.event}</p>
                  <p className="text-gray-500 text-xs">{h.date}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Acciones */}
          {animal.gender === 'Hembra' && animal.heatStatus === 'En Celo' && (
            <button onClick={() => setShowInseminate(true)} className="w-full btn-primary flex items-center justify-center gap-2">
              <Syringe size={16} /> Inseminar
            </button>
          )}
          {animal.heatStatus === 'Embarazada' && (
            <button onClick={() => setShowFarrowing(true)} className="w-full btn-primary flex items-center justify-center gap-2">
              <Baby size={16} /> Registrar Parto
            </button>
          )}
        </div>
      </div>

      {showFarrowing && <FarrowingModal mother={animal} onClose={() => setShowFarrowing(false)} />}
      {showInseminate && <InseminateModal female={animal} onClose={() => setShowInseminate(false)} />}
    </>
  );
}
