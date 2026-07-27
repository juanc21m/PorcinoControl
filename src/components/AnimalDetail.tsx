import { useMemo, useState } from 'react';
import {
  X, Weight, Syringe, Clock, Baby, Droplet, MapPin, Pencil, Trash2,
  Plus, Save, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Animal, ServiceType } from '../types';
import { LIFETIME_FARROWING_LIMIT, SERVICE_TYPES, ZONES } from '../types';
import { safeParseISO } from '../lib/date';
import { useAppStore } from '../store/appStore';

interface Props {
  animal: Animal;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Modal de Parto (carga masiva): madre + padrote + peso + fecha/hora
// ---------------------------------------------------------------------------
function FarrowingModal({ mother, onClose }: { mother: Animal; onClose: () => void }) {
  const registerFarrowing = useAppStore(s => s.registerFarrowing);
  const animals = useAppStore(s => s.animals);
  const currentDate = useAppStore(s => s.currentDate);
  const padrotes = animals.filter(a => a.status === 'Activo' && (a.role === 'Padrote' || a.gender === 'Macho'));

  const [males, setMales] = useState('');
  const [females, setFemales] = useState('');
  const [avgW, setAvgW] = useState('');
  const [padroteId, setPadroteId] = useState(mother.padrote_id ?? '');
  const [date, setDate] = useState(currentDate);
  const [time, setTime] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    registerFarrowing(mother.id, {
      males: parseInt(males) || 0,
      females: parseInt(females) || 0,
      avgWeight: parseFloat(avgW),
      padroteId: padroteId || undefined,
      date,
      time: time || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-gray-50 font-semibold mb-4 flex items-center gap-2"><Baby size={18} className="text-brand-400" /> Registrar Nacimiento (Camada)</h3>
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Machos</label>
              <input type="number" min={0} className="input" placeholder="0" value={males} onChange={e => setMales(e.target.value)} />
            </div>
            <div>
              <label className="label">Hembras</label>
              <input type="number" min={0} className="input" placeholder="0" value={females} onChange={e => setFemales(e.target.value)} />
            </div>
            <div>
              <label className="label">Peso Prom. (lb)</label>
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
// Modal de Registro de Monta / Servicio
// ---------------------------------------------------------------------------
function ServiceModal({ female, onClose }: { female: Animal; onClose: () => void }) {
  const animals = useAppStore(s => s.animals);
  const registerService = useAppStore(s => s.registerService);
  const currentDate = useAppStore(s => s.currentDate);

  const padrotes = animals.filter(a => a.status === 'Activo' && (a.role === 'Padrote' || a.gender === 'Macho'));

  const [tipoServicio, setTipoServicio] = useState<ServiceType>('Monta Natural');
  const [padroteId, setPadroteId] = useState(female.padrote_id ?? '');
  const [date, setDate] = useState(currentDate);
  const [origenSemenNotas, setOrigenSemenNotas] = useState('');
  const [error, setError] = useState('');

  const isIA = tipoServicio === 'Inseminación Artificial';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!padroteId) { setError('Selecciona el padrote / macho reproductor.'); return; }
    registerService(female.id, {
      tipoServicio,
      padroteId,
      date,
      origenSemenNotas: isIA ? origenSemenNotas : undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-gray-50 font-semibold mb-4 flex items-center gap-2">
          <Syringe size={18} className="text-brand-400" /> Registrar Servicio · {female.tag}
        </h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Tipo de Servicio</label>
            <select
              className="input"
              value={tipoServicio}
              onChange={e => setTipoServicio(e.target.value as ServiceType)}
            >
              {SERVICE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Padrote / Macho Reproductor</label>
              <select className="input" value={padroteId} onChange={e => setPadroteId(e.target.value)} required>
                <option value="" disabled>Seleccionar…</option>
                {padrotes.map(p => <option key={p.id} value={p.id}>{p.tag}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fecha del Servicio</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>

          {/* Solo en Inseminación Artificial: origen de la dosis */}
          {isIA && (
            <div>
              <label className="label">Comentarios / Origen del Semen</label>
              <textarea
                className="input min-h-[76px] resize-y"
                placeholder="Proveedor, casa genética, lote de la dosis…"
                value={origenSemenNotas}
                onChange={e => setOrigenSemenNotas(e.target.value)}
              />
              <p className="text-gray-500 text-xs mt-1">Especifica de dónde proviene la dosis utilizada.</p>
            </div>
          )}

          <p className="text-gray-500 text-xs">
            La hembra pasará a <span className="text-gray-300">Gestación</span> con parto estimado a +114 días.
          </p>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Registrar Servicio</button>
          </div>
        </form>
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

function Metric({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-gray-500 text-xs">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${accent ?? 'text-gray-50'}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AnimalDetail({ animal: initial, onClose }: Props) {
  // Lee el animal vivo del store (refleja ediciones al instante).
  const live = useAppStore(s => s.animals.find(a => a.id === initial.id)) ?? initial;
  const currentDate = useAppStore(s => s.currentDate);
  const editAnimal = useAppStore(s => s.editAnimal);
  const setAnimalWeights = useAppStore(s => s.setAnimalWeights);
  const deleteAnimal = useAppStore(s => s.deleteAnimal);

  const [showFarrowing, setShowFarrowing] = useState(false);
  const [showService, setShowService] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ---- Edición ----
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ breed: live.breed, birthDate: live.birthDate, birthTime: live.birthTime ?? '' });
  const [weightsDraft, setWeightsDraft] = useState<Animal['weights']>(live.weights);

  function startEdit() {
    setDraft({ breed: live.breed, birthDate: live.birthDate, birthTime: live.birthTime ?? '' });
    setWeightsDraft(live.weights.length ? live.weights : [{ date: live.birthDate, weight: live.weight }]);
    setEditing(true);
  }
  function saveEdit() {
    editAnimal(live.id, { breed: draft.breed, birthDate: draft.birthDate, birthTime: draft.birthTime || undefined });
    setAnimalWeights(live.id, weightsDraft.filter(w => w.date && !isNaN(w.weight)));
    setEditing(false);
  }

  // Servicios/montas del animal: como hembra servida o como padrote responsable.
  const services = useAppStore(s => s.services);
  const animalServices = useMemo(
    () => services.filter(s => s.animalId === live.id || s.padroteId === live.id),
    [services, live.id],
  );

  // Métricas derivadas
  const ageDays = Math.max(0, differenceInDays(safeParseISO(currentDate), safeParseISO(live.birthDate)) || 0);
  const initialWeight = live.weights.length ? live.weights[0].weight : live.weight;
  const gain = +(live.weight - initialWeight).toFixed(1);
  const farrowings = live.totalFarrowings ?? 0;
  const litterTotal = (live.litterMales ?? 0) + (live.litterFemales ?? 0);
  const overLimit = farrowings >= LIFETIME_FARROWING_LIMIT;
  const cumConsumption = Math.round(live.dailyConsumption * ageDays);

  const partoEvents = live.history.filter(h => /parto/i.test(h.event));

  function handleDelete() {
    deleteAnimal(live.id);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-gray-950 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
            <div className="min-w-0">
              <h2 className="text-gray-50 font-bold text-xl tracking-tight flex items-center gap-2">
                {live.tag}
                <span className="text-gray-600 text-xs font-normal">(ID no editable)</span>
              </h2>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[live.status]}`}>{live.status}</span>
                {live.heatStatus && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[live.heatStatus]}`}>{live.heatStatus}</span>}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {!editing ? (
                <button onClick={startEdit} className="btn-secondary flex items-center gap-1.5"><Pencil size={15} /> Editar</button>
              ) : (
                <>
                  <button onClick={() => setEditing(false)} className="btn-secondary">Cancelar</button>
                  <button onClick={saveEdit} className="btn-primary flex items-center gap-1.5"><Save size={15} /> Guardar</button>
                </>
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-50 p-1"><X size={22} /></button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Alerta de vida útil */}
          {overLimit && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300">
              <AlertTriangle size={20} className="shrink-0" />
              <p className="text-sm">
                <span className="font-semibold">Vida útil alcanzada:</span> esta cerda registra <b>{farrowings}</b> partos
                (límite {LIFETIME_FARROWING_LIMIT}). Considera evaluar su descarte.
              </p>
            </div>
          )}

          {/* Métricas clave */}
          <div>
            <h3 className="text-gray-50 font-semibold mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-brand-400" /> Métricas Clave</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <Metric label="Edad" value={`${ageDays} d`} sub={`Nac. ${live.birthDate}`} />
              <Metric label="Peso actual" value={`${live.weight} lb`} sub={`Inicial ${initialWeight} lb`} />
              <Metric label="Ganancia" value={`${gain >= 0 ? '+' : ''}${gain} lb`} accent={gain >= 0 ? 'text-green-400' : 'text-red-400'} />
              <Metric label="Partos (lifetime)" value={farrowings} sub={`Límite ${LIFETIME_FARROWING_LIMIT}`} accent={overLimit ? 'text-red-400' : 'text-gray-50'} />
              <Metric label="Consumo acum. (est.)" value={`${cumConsumption} lb`} sub={`${live.dailyConsumption} lb/día`} />
            </div>
          </div>

          {/* Ubicación + Consumo actual */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-gray-50 font-semibold mb-3 flex items-center gap-2"><MapPin size={16} className="text-brand-400" /> Ubicación Actual</h3>
              <p className="text-3xl font-bold text-gray-50">{live.etapaActual}</p>
              <p className="text-gray-500 text-sm mt-1">
                {live.roomNumber ? ZONES[live.etapaActual].roomLabel(live.roomNumber) : 'Sala sin asignar'}
              </p>
              {live.etapaActual === 'Maternidad' && (litterTotal > 0) && (
                <p className="text-gray-300 text-sm mt-2">
                  Camada actual: <span className="text-gray-50 font-semibold">{litterTotal}</span> lechones
                  <span className="text-gray-500"> ({live.litterMales ?? 0} machos, {live.litterFemales ?? 0} hembras)</span>
                </p>
              )}
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-gray-50 font-semibold mb-3 flex items-center gap-2"><Droplet size={16} className="text-brand-400" /> Consumo</h3>
              <p className="text-gray-300">Alimento: <span className="text-gray-50 font-medium">{live.feedType}</span></p>
              <p className="text-gray-300">Ración diaria: <span className="text-gray-50 font-medium">{live.dailyConsumption} lb/día</span></p>
              <p className="text-gray-300">Acumulado estimado: <span className="text-gray-50 font-medium">{cumConsumption} lb</span> <span className="text-gray-500 text-xs">(ración × edad)</span></p>
            </div>
          </div>

          {/* Datos generales (con edición) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-gray-50 font-semibold mb-4">Datos Generales</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">ID del Cerdo</p>
                <input className="input font-mono opacity-70 cursor-not-allowed" value={live.tag} readOnly disabled />
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Rol</p>
                <p className="text-gray-50 font-medium pt-2">{live.role ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Género</p>
                <p className="text-gray-50 font-medium pt-2">{live.gender}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Raza</p>
                {editing
                  ? <input className="input" value={draft.breed} onChange={e => setDraft({ ...draft, breed: e.target.value })} />
                  : <p className="text-gray-50 font-medium pt-2">{live.breed}</p>}
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Fecha de Nacimiento</p>
                {editing
                  ? <input type="date" className="input" value={draft.birthDate} onChange={e => setDraft({ ...draft, birthDate: e.target.value })} />
                  : <p className="text-gray-50 font-medium pt-2">{live.birthDate}</p>}
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Hora de Nacimiento</p>
                {editing
                  ? <input type="time" className="input" value={draft.birthTime} onChange={e => setDraft({ ...draft, birthTime: e.target.value })} />
                  : <p className="text-gray-50 font-medium pt-2">{live.birthTime ?? '—'}</p>}
              </div>
            </div>
          </div>

          {/* Historial de servicios / montas */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-gray-50 font-semibold mb-3 flex items-center gap-2">
              <Syringe size={16} className="text-brand-400" /> Servicios / Montas
              <span className="text-gray-500 text-sm font-normal">({animalServices.length})</span>
            </h3>
            {animalServices.length === 0 ? (
              <p className="text-gray-600 text-sm">Sin servicios registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800/60 text-gray-400">
                    <tr>
                      <th className="text-left px-3 py-2">Fecha</th>
                      <th className="text-left px-3 py-2">Tipo</th>
                      <th className="text-left px-3 py-2">Cerda</th>
                      <th className="text-left px-3 py-2">Padrote</th>
                      <th className="text-left px-3 py-2">Origen del semen</th>
                      <th className="text-left px-3 py-2">Parto est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {animalServices.map(s => (
                      <tr key={s.id} className="border-t border-gray-800">
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{s.date}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            s.tipoServicio === 'Inseminación Artificial'
                              ? 'bg-sky-500/20 text-sky-400'
                              : 'bg-brand-500/20 text-brand-300'
                          }`}>
                            {s.tipoServicio === 'Inseminación Artificial' ? 'I.A.' : 'Monta Natural'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-50 font-medium">{s.animalTag}</td>
                        <td className="px-3 py-2 text-gray-300">{s.padroteTag ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-400 text-xs">{s.origenSemenNotas ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{s.expectedFarrowingDate ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Historial de pesajes (editable) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-50 font-semibold flex items-center gap-2"><Weight size={16} className="text-brand-400" /> Historial de Pesajes</h3>
              {editing && (
                <button onClick={() => setWeightsDraft([...weightsDraft, { date: currentDate, weight: 0 }])} className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1">
                  <Plus size={14} /> Añadir pesaje
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-2">
                {weightsDraft.map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="date" className="input !py-1.5" value={w.date}
                      onChange={e => setWeightsDraft(weightsDraft.map((x, idx) => idx === i ? { ...x, date: e.target.value } : x))} />
                    <input type="number" step="0.1" className="input !py-1.5 !w-32" value={w.weight}
                      onChange={e => setWeightsDraft(weightsDraft.map((x, idx) => idx === i ? { ...x, weight: parseFloat(e.target.value) } : x))} />
                    <span className="text-gray-500 text-sm">lb</span>
                    <button onClick={() => setWeightsDraft(weightsDraft.filter((_, idx) => idx !== i))} className="text-gray-500 hover:text-red-400 ml-auto"><Trash2 size={15} /></button>
                  </div>
                ))}
                {weightsDraft.length === 0 && <p className="text-gray-600 text-sm">Sin pesajes. Añade el primero.</p>}
                <p className="text-gray-500 text-xs">El peso actual se sincroniza con el pesaje más reciente al guardar.</p>
              </div>
            ) : live.weights.length === 0 ? (
              <p className="text-gray-600 text-sm">Sin pesajes registrados.</p>
            ) : (
              <>
                {live.weights.length > 1 && (
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={live.weights}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                      <Line type="monotone" dataKey="weight" stroke="#4ade80" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                <ul className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  {live.weights.map((w, i) => (
                    <li key={i} className="bg-gray-800/40 rounded-lg px-3 py-1.5 flex justify-between">
                      <span className="text-gray-400">{w.date}</span><span className="text-gray-50 font-medium">{w.weight} lb</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Historial de partos */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-gray-50 font-semibold mb-3 flex items-center gap-2"><Baby size={16} className="text-brand-400" /> Historial de Partos <span className="text-gray-500 text-sm font-normal">({farrowings})</span></h3>
            {partoEvents.length === 0 ? (
              <p className="text-gray-600 text-sm">Sin partos registrados.</p>
            ) : (
              <ul className="space-y-1">
                {[...partoEvents].reverse().map((h, i) => (
                  <li key={i} className="text-sm text-gray-300 border-l-2 border-brand-800 pl-3 py-0.5">
                    <p>{h.event}</p><p className="text-gray-500 text-xs">{h.date}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Genealogía + Vacunas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-gray-50 font-semibold mb-3">Genealogía</h3>
              <div className="space-y-1 text-sm">
                <p className="text-gray-300">Madre ID: <span className="text-gray-50">{live.madre_id ?? '—'}</span></p>
                <p className="text-gray-300">Padrote ID: <span className="text-gray-50">{live.padrote_id ?? '—'}</span></p>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-gray-50 font-semibold mb-3 flex items-center gap-2"><Syringe size={16} className="text-brand-400" /> Vacunas</h3>
              {live.vaccinations.length === 0 ? (
                <p className="text-gray-600 text-sm">Sin registros</p>
              ) : (
                <ul className="space-y-1">
                  {live.vaccinations.map((v, i) => (
                    <li key={i} className="text-sm text-gray-300 flex justify-between"><span>{v.vaccine}</span><span className="text-gray-500">{v.date}</span></li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Historial completo */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-gray-50 font-semibold mb-3 flex items-center gap-2"><Clock size={16} className="text-brand-400" /> Historial Completo</h3>
            <ul className="space-y-1">
              {[...live.history].reverse().map((h, i) => (
                <li key={i} className="text-sm text-gray-300 border-l-2 border-gray-700 pl-3 py-0.5">
                  <p>{h.event}</p><p className="text-gray-500 text-xs">{h.date}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap gap-3">
            {live.gender === 'Hembra' && live.status === 'Activo'
              && !['Inseminada', 'Embarazada', 'Lactante'].includes(live.heatStatus ?? '') && (
              <button onClick={() => setShowService(true)} className="btn-primary flex items-center gap-2"><Syringe size={16} /> Registrar Servicio</button>
            )}
            {live.heatStatus === 'Embarazada' && (
              <button onClick={() => setShowFarrowing(true)} className="btn-primary flex items-center gap-2"><Baby size={16} /> Registrar Parto</button>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-red-800/50 text-red-400 hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={16} /> Eliminar animal
            </button>
          </div>
        </div>
      </div>

      {showFarrowing && <FarrowingModal mother={live} onClose={() => setShowFarrowing(false)} />}
      {showService && <ServiceModal female={live} onClose={() => setShowService(false)} />}

      {/* Confirmación de borrado */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4">
          <div className="bg-gray-900 border border-red-800/50 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-gray-50 font-semibold mb-2 flex items-center gap-2"><Trash2 size={18} className="text-red-400" /> Eliminar {live.tag}</h3>
            <p className="text-gray-400 text-sm mb-5">
              Esta acción borra el animal <b className="text-gray-50">permanentemente</b> de la base de datos.
              Úsala solo si fue creado por error. No se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-gray-50">
                <Trash2 size={15} /> Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
