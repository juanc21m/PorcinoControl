import { useMemo, useState } from 'react';
import {
  ArrowRightLeft, Search, ArrowRight, CheckSquare, Square, Baby, AlertTriangle, History,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../context/AuthContext';
import { ETAPAS, ZONES } from '../types';
import type { Animal, EtapaProductiva } from '../types';

/** Selector de zona + sala. */
function ZonePicker({
  label, zone, room, onZone, onRoom, autoRoomLabel,
}: {
  label: string;
  zone: EtapaProductiva;
  room: number | 'all';
  onZone: (z: EtapaProductiva) => void;
  onRoom: (r: number | 'all') => void;
  autoRoomLabel?: string;
}) {
  const cfg = ZONES[zone];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="label">{label}</label>
        <select className="input" value={zone} onChange={e => { onZone(e.target.value as EtapaProductiva); onRoom('all'); }}>
          {ETAPAS.map(z => <option key={z}>{z}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Sala</label>
        <select className="input" value={String(room)} onChange={e => onRoom(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">{autoRoomLabel ?? 'Todas las salas'}</option>
          {Array.from({ length: cfg.rooms }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>{cfg.roomLabel(n)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function Movilizacion() {
  const animals = useAppStore(s => s.animals);
  const transfers = useAppStore(s => s.transfers);
  const transferAnimals = useAppStore(s => s.transferAnimals);
  const materializeLitter = useAppStore(s => s.materializeLitter);
  const { email } = useAuth();
  const user = email ?? 'desconocido';

  const [fromZone, setFromZone] = useState<EtapaProductiva>('Lechones');
  const [fromRoom, setFromRoom] = useState<number | 'all'>('all');
  const [toZone, setToZone] = useState<EtapaProductiva>('Destete');
  const [toRoom, setToRoom] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [litterDraft, setLitterDraft] = useState<Record<string, { m: string; f: string }>>({});
  const [flash, setFlash] = useState('');

  const active = useMemo(() => animals.filter(a => a.status === 'Activo'), [animals]);

  // Animales individuales disponibles en el origen seleccionado.
  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    // En Maternidad las cerdas se gestionan por camada, no se movilizan aquí.
    if (fromZone === 'Maternidad') return [];
    return active
      .filter(a => a.etapaActual === fromZone)
      .filter(a => fromRoom === 'all' || a.roomNumber === fromRoom)
      .filter(a => !q || a.tag.toLowerCase().includes(q) || a.breed.toLowerCase().includes(q))
      .sort((x, y) => x.tag.localeCompare(y.tag));
  }, [active, fromZone, fromRoom, search]);

  // Cerdas con camada (cuando el origen es Maternidad).
  const sows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return active
      .filter(a => a.etapaActual === 'Maternidad')
      .filter(a => fromRoom === 'all' || a.roomNumber === fromRoom)
      .filter(a => (a.litterMales ?? 0) + (a.litterFemales ?? 0) > 0)
      .filter(a => !q || a.tag.toLowerCase().includes(q))
      .sort((x, y) => (x.roomNumber ?? 0) - (y.roomNumber ?? 0));
  }, [active, fromRoom, search]);

  const isLitterMode = fromZone === 'Maternidad';

  // Capacidad del destino
  const destOccupied = active.filter(a => a.etapaActual === toZone).length;
  const destCap = ZONES[toZone].rooms * ZONES[toZone].capacityPerRoom;
  const wouldOverflow = destOccupied + picked.length > destCap;

  const toggleOne = (id: string) =>
    setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  const allPicked = available.length > 0 && picked.length === available.length;
  const toggleAll = () => setPicked(allPicked ? [] : available.map(a => a.id));

  function doTransfer() {
    if (!picked.length || fromZone === toZone) return;
    transferAnimals(picked, {
      toZone,
      toRoom: toRoom === 'all' ? undefined : toRoom,
      user,
    });
    setFlash(`${picked.length} animal(es) movilizado(s) de ${fromZone} a ${toZone}.`);
    setPicked([]);
  }

  function doLitterTransfer(sow: Animal) {
    const d = litterDraft[sow.id];
    const m = d ? Math.max(0, parseInt(d.m) || 0) : (sow.litterMales ?? 0);
    const f = d ? Math.max(0, parseInt(d.f) || 0) : (sow.litterFemales ?? 0);
    if (m + f <= 0) return;
    materializeLitter(sow.id, {
      males: m, females: f, toZone,
      toRoom: toRoom === 'all' ? undefined : toRoom,
      user,
    });
    setFlash(`${m + f} lechón(es) de ${sow.tag} movilizados a ${toZone} con ID propio.`);
    setLitterDraft(prev => ({ ...prev, [sow.id]: { m: '0', f: '0' } }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-50 flex items-center gap-2">
          <ArrowRightLeft size={22} className="text-brand-400" /> Movilización
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Transferencia de animales entre zonas y salas</p>
      </div>

      {flash && (
        <div className="bg-brand-800/15 border border-brand-700/40 rounded-lg px-4 py-2.5 text-sm text-brand-200">
          {flash}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ---------------- PANEL ORIGEN ---------------- */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h3 className="text-gray-50 font-semibold">Origen</h3>
          <ZonePicker
            label="Zona de origen" zone={fromZone} room={fromRoom}
            onZone={z => { setFromZone(z); setPicked([]); }}
            onRoom={r => { setFromRoom(r); setPicked([]); }}
          />

          {/* Buscador desplegable por ID */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="input pl-9"
              placeholder="Buscar por ID o raza…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              list="mov-ids"
            />
            <datalist id="mov-ids">
              {(isLitterMode ? sows : available).map(a => <option key={a.id} value={a.tag} />)}
            </datalist>
          </div>

          {isLitterMode ? (
            /* Origen Maternidad: se movilizan lechones de la camada (conteo) */
            <div className="space-y-2">
              <p className="text-gray-500 text-xs flex items-start gap-1.5">
                <Baby size={13} className="mt-0.5 shrink-0" />
                En Maternidad los lechones son conteo de la camada. Al movilizarlos reciben ID propio.
              </p>
              {sows.length === 0 ? (
                <p className="text-gray-600 text-sm py-4 text-center">Sin camadas disponibles.</p>
              ) : (
                <ul className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
                  {sows.map(s => {
                    const d = litterDraft[s.id] ?? { m: String(s.litterMales ?? 0), f: String(s.litterFemales ?? 0) };
                    return (
                      <li key={s.id} className="py-3 flex flex-wrap items-end gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-brand-400 text-sm font-semibold">{s.tag}</p>
                          <p className="text-gray-500 text-xs">
                            Sala {s.roomNumber ?? '—'} · {s.litterMales ?? 0}M / {s.litterFemales ?? 0}H
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">M</span>
                          <input type="number" min={0} max={s.litterMales ?? 0} className="input !py-1 !w-16 mt-0.5"
                            value={d.m}
                            onChange={e => setLitterDraft(p => ({ ...p, [s.id]: { ...d, m: e.target.value } }))} />
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">H</span>
                          <input type="number" min={0} max={s.litterFemales ?? 0} className="input !py-1 !w-16 mt-0.5"
                            value={d.f}
                            onChange={e => setLitterDraft(p => ({ ...p, [s.id]: { ...d, f: e.target.value } }))} />
                        </div>
                        <button onClick={() => doLitterTransfer(s)} className="btn-primary !py-1.5 flex items-center gap-1.5">
                          <ArrowRight size={14} /> Mover
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            /* Origen con animales individuales: checkboxes + seleccionar todos */
            <>
              <div className="flex items-center justify-between">
                <button onClick={toggleAll} disabled={!available.length}
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-gray-50 disabled:opacity-40">
                  {allPicked ? <CheckSquare size={16} className="text-brand-400" /> : <Square size={16} />}
                  Seleccionar todos ({available.length})
                </button>
                <span className="text-xs text-gray-500">{picked.length} seleccionado(s)</span>
              </div>

              {available.length === 0 ? (
                <p className="text-gray-600 text-sm py-6 text-center">Sin animales en esta ubicación.</p>
              ) : (
                <ul className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
                  {available.map(a => {
                    const on = picked.includes(a.id);
                    return (
                      <li key={a.id}>
                        <label className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-gray-800/30 px-1 rounded">
                          <input type="checkbox" checked={on} onChange={() => toggleOne(a.id)}
                            className="w-4 h-4 accent-brand-500" />
                          <span className="font-mono text-brand-400 text-sm font-semibold">{a.tag}</span>
                          <span className="text-gray-500 text-xs">{a.gender} · {a.breed}</span>
                          <span className="ml-auto text-gray-600 text-xs">
                            {a.roomNumber ? ZONES[a.etapaActual].roomLabel(a.roomNumber) : '—'}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>

        {/* ---------------- PANEL DESTINO ---------------- */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h3 className="text-gray-50 font-semibold">Destino</h3>
          <ZonePicker
            label="Zona de destino" zone={toZone} room={toRoom}
            onZone={setToZone} onRoom={setToRoom}
            autoRoomLabel="Asignar automáticamente"
          />

          <div className="bg-gray-800/40 border border-gray-800 rounded-lg p-4 space-y-1">
            <p className="text-gray-400 text-sm">
              Ocupación actual: <span className="text-gray-50 font-semibold">{destOccupied} / {destCap}</span>
            </p>
            <p className="text-gray-500 text-xs">
              {ZONES[toZone].rooms} {ZONES[toZone].rooms === 1 ? 'sala' : 'salas'} ·
              {' '}{ZONES[toZone].capacityPerRoom} por sala
            </p>
          </div>

          {fromZone === toZone && (
            <p className="text-amber-400 text-xs flex items-center gap-1.5">
              <AlertTriangle size={13} /> El origen y el destino son la misma zona.
            </p>
          )}
          {wouldOverflow && (
            <p className="text-red-400 text-xs flex items-center gap-1.5">
              <AlertTriangle size={13} /> La selección excede la capacidad del destino.
            </p>
          )}

          {!isLitterMode && (
            <button
              onClick={doTransfer}
              disabled={!picked.length || fromZone === toZone}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight size={16} />
              Movilizar {picked.length || ''} {picked.length === 1 ? 'animal' : 'animales'}
            </button>
          )}

          <p className="text-gray-600 text-xs">
            Movilización registrada por <span className="text-gray-400">{user}</span>.
          </p>
        </div>
      </div>

      {/* ---------------- HISTORIAL ---------------- */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
          <History size={16} className="text-brand-400" />
          <h3 className="text-gray-50 font-semibold">Historial de Movilizaciones</h3>
          <span className="text-gray-500 text-sm">({transfers.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/60 text-gray-400">
              <tr>
                <th className="text-left px-5 py-3">Fecha</th>
                <th className="text-left px-5 py-3">Cerdo / Cantidad</th>
                <th className="text-left px-5 py-3">Origen</th>
                <th className="text-left px-5 py-3">Destino</th>
                <th className="text-left px-5 py-3">Usuario</th>
                <th className="text-left px-5 py-3">Nota</th>
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-600">Sin movilizaciones registradas.</td></tr>
              ) : transfers.slice(0, 50).map(t => (
                <tr key={t.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{t.date}</td>
                  <td className="px-5 py-3">
                    {t.animalTag
                      ? <span className="font-mono text-brand-400 font-semibold">{t.animalTag}</span>
                      : <span className="text-gray-50 font-semibold">{t.count} animales</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-300">
                    {t.fromZone}{t.fromRoom ? ` · Sala ${t.fromRoom}` : ''}
                  </td>
                  <td className="px-5 py-3 text-gray-300">
                    {t.toZone}{t.toRoom ? ` · Sala ${t.toRoom}` : ''}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{t.user}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{t.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
