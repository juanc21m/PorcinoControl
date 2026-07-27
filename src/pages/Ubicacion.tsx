import { useMemo, useState } from 'react';
import {
  HeartPulse, Baby, Wheat, Scale, ChevronRight, Eye, MapPin, AlertTriangle, Pencil,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../context/AuthContext';
import { ETAPAS, ZONES } from '../types';
import type { Animal, EtapaProductiva } from '../types';
import AnimalDetail from '../components/AnimalDetail';

const ZONE_META: Record<EtapaProductiva, { icon: LucideIcon; accent: string; desc: string }> = {
  'Gestación': { icon: HeartPulse, accent: 'text-pink-400',   desc: 'Cerdas servidas / gestantes' },
  Maternidad:  { icon: Baby,       accent: 'text-purple-400', desc: 'Una cerda por sala, con su camada' },
  'Lechones':  { icon: Baby,      accent: 'text-sky-400',    desc: 'Lechones con arete, aún lactando' },
  Destete:     { icon: Wheat,      accent: 'text-amber-400',  desc: 'Lechones destetados' },
  Ceba:        { icon: Scale,      accent: 'text-brand-400',  desc: 'Engorde hasta venta' },
};

/** Barra de ocupación. */
function OccupancyBar({ used, cap }: { used: number; cap: number }) {
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  const over = used > cap;
  const near = !over && pct >= 90;
  return (
    <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : near ? 'bg-amber-500' : 'bg-brand-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Editor rápido del conteo de camada de una cerda en Maternidad. */
function LitterEditor({ sow, onDone }: { sow: Animal; onDone: () => void }) {
  const updateLitter = useAppStore(s => s.updateLitter);
  const [males, setMales] = useState(String(sow.litterMales ?? 0));
  const [females, setFemales] = useState(String(sow.litterFemales ?? 0));

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <span className="text-gray-500 text-xs">Machos</span>
        <input type="number" min={0} className="input !py-1 !w-20 mt-0.5" value={males}
          onChange={e => setMales(e.target.value)} />
      </div>
      <div>
        <span className="text-gray-500 text-xs">Hembras</span>
        <input type="number" min={0} className="input !py-1 !w-20 mt-0.5" value={females}
          onChange={e => setFemales(e.target.value)} />
      </div>
      <button
        onClick={() => {
          updateLitter(sow.id, Math.max(0, parseInt(males) || 0), Math.max(0, parseInt(females) || 0));
          onDone();
        }}
        className="btn-primary !py-1.5"
      >
        Guardar
      </button>
      <button onClick={onDone} className="btn-secondary !py-1.5">Cancelar</button>
    </div>
  );
}

export default function Ubicacion() {
  const animals = useAppStore(s => s.animals);
  const materializeLitter = useAppStore(s => s.materializeLitter);
  const { email } = useAuth();
  const [open, setOpen] = useState<EtapaProductiva[]>(['Maternidad']);
  const [detail, setDetail] = useState<Animal | null>(null);
  const [editingLitter, setEditingLitter] = useState<string | null>(null);

  const active = useMemo(() => animals.filter(a => a.status === 'Activo'), [animals]);

  const toggle = (z: EtapaProductiva) =>
    setOpen(prev => (prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]));

  const inZone = (z: EtapaProductiva) => active.filter(a => a.etapaActual === z);

  /**
   * Lechones por madre, DERIVADOS de los animales reales de la zona 'Lechones'.
   * Se calcula, no se almacena: así Maternidad los refleja ("arrastrados") sin
   * duplicar el conteo en los totales del sistema.
   */
  const litterByMother = useMemo(() => {
    const m = new Map<string, { machos: number; hembras: number }>();
    for (const a of active) {
      if (a.etapaActual !== 'Lechones' || !a.madre_id) continue;
      const cur = m.get(a.madre_id) ?? { machos: 0, hembras: 0 };
      if (a.gender === 'Macho') cur.machos++; else cur.hembras++;
      m.set(a.madre_id, cur);
    }
    return m;
  }, [active]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-50 flex items-center gap-2">
          <MapPin size={22} className="text-brand-400" /> Ubicación
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Zonas, cuartos y ocupación de la granja</p>
      </div>

      <div className="space-y-3">
        {ETAPAS.map(zone => {
          const { icon: Icon, accent, desc } = ZONE_META[zone];
          const cfg = ZONES[zone];
          const occupants = inZone(zone);
          const capTotal = cfg.rooms * cfg.capacityPerRoom;
          const isOpen = open.includes(zone);
          const isMaternity = zone === 'Maternidad';

          // En Maternidad los lechones son conteo de camada, no ocupantes de sala.
          const pigletTotal = isMaternity
            ? occupants.reduce((acc, s) => {
                const d = litterByMother.get(s.id);
                return acc + (d ? d.machos + d.hembras : (s.litterMales ?? 0) + (s.litterFemales ?? 0));
              }, 0)
            : 0;

          const over = occupants.length > capTotal;

          return (
            <div key={zone} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Cabecera de zona (clic para desplegar) */}
              <button
                onClick={() => toggle(zone)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-gray-800/40 transition-colors text-left"
              >
                <ChevronRight
                  size={18}
                  className={`text-gray-500 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
                <Icon size={20} className={`${accent} shrink-0`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-gray-50 font-semibold">{zone}</h3>
                    {over && (
                      <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={11} /> Sobrecupo
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5 truncate">
                    {desc} · {cfg.rooms} {cfg.rooms === 1 ? 'sala' : 'salas'}
                    {isMaternity && pigletTotal > 0 && ` · ${pigletTotal} lechones`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-gray-50 font-bold text-lg leading-none">
                    {occupants.length}<span className="text-gray-500 text-sm font-normal"> / {capTotal}</span>
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {isMaternity ? 'salas ocupadas' : 'ocupados'}
                  </p>
                </div>
              </button>

              {/* Detalle desplegable: salas de la zona */}
              {isOpen && (
                <div className="border-t border-gray-800">
                  {isMaternity ? (
                    /* 23 salas individuales: 1 cerda por sala + su camada */
                    <ul className="divide-y divide-gray-800">
                      {Array.from({ length: cfg.rooms }, (_, i) => i + 1).map(n => {
                        const sow = occupants.find(a => a.roomNumber === n);
                        const der = sow ? litterByMother.get(sow.id) : undefined;
                        const m = der?.machos ?? sow?.litterMales ?? 0;
                        const f = der?.hembras ?? sow?.litterFemales ?? 0;
                        const tot = m + f;
                        return (
                          <li key={n} className="px-4 sm:px-5 py-3">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="text-gray-400 text-sm font-medium w-20 shrink-0">
                                {cfg.roomLabel(n)}
                              </span>
                              {sow ? (
                                <>
                                  <span className="font-mono text-brand-400 font-semibold text-sm">
                                    Cerda {sow.tag}
                                  </span>
                                  <span className="text-gray-300 text-sm">
                                    — {tot} {tot === 1 ? 'lechón' : 'lechones'}
                                    {tot > 0 && (
                                      <span className="text-gray-500"> ({m} machos, {f} hembras)</span>
                                    )}
                                  </span>
                                  <div className="ml-auto flex items-center gap-1.5">
                                    <button
                                      onClick={() => setEditingLitter(editingLitter === sow.id ? null : sow.id)}
                                      title="Editar camada"
                                      className="text-gray-500 hover:text-brand-400 p-1 rounded hover:bg-gray-800"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    {tot > 0 && (
                                      <button
                                        onClick={() => materializeLitter(sow.id, {
                                          males: sow.litterMales ?? 0,
                                          females: sow.litterFemales ?? 0,
                                          toZone: 'Destete',
                                          user: email ?? 'desconocido',
                                        })}
                                        className="text-xs border border-amber-700/50 text-amber-400 hover:bg-amber-900/20 px-2 py-1 rounded-lg"
                                        title="Convierte la camada en animales con ID propio en Destete"
                                      >
                                        Destetar
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setDetail(sow)}
                                      title="Ver ficha"
                                      className="text-gray-500 hover:text-brand-400 p-1 rounded hover:bg-gray-800"
                                    >
                                      <Eye size={15} />
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <span className="text-gray-600 text-sm italic">[Vacía]</span>
                              )}
                            </div>
                            {sow && editingLitter === sow.id && (
                              <div className="mt-3 pl-0 sm:pl-20">
                                <LitterEditor sow={sow} onDone={() => setEditingLitter(null)} />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    /* Zonas de sala única: ocupación agregada */
                    <div className="px-4 sm:px-5 py-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-300 text-sm font-medium">{cfg.roomLabel(1)}</span>
                        <span className="text-gray-50 text-sm font-semibold">
                          {occupants.length} / {cfg.capacityPerRoom} ocupados
                        </span>
                      </div>
                      <OccupancyBar used={occupants.length} cap={cfg.capacityPerRoom} />

                      {occupants.length === 0 ? (
                        <p className="text-gray-600 text-sm italic">[Vacía]</p>
                      ) : (
                        <div className="max-h-56 overflow-y-auto -mx-1 px-1">
                          <div className="flex flex-wrap gap-1.5">
                            {occupants.map(a => (
                              <button
                                key={a.id}
                                onClick={() => setDetail(a)}
                                className="font-mono text-xs bg-gray-800 hover:bg-gray-700 text-brand-300 px-2 py-1 rounded-md transition-colors"
                                title="Ver ficha"
                              >
                                {a.tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {detail && <AnimalDetail animal={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
