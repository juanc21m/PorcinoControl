import { useState } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { RefreshCw, HeartPulse, Baby, Wheat, Scale, ChevronRight, Eye } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { ETAPAS, ETAPA_CAPACITY } from '../types';
import type { Animal, EtapaProductiva } from '../types';
import AnimalDetail from '../components/AnimalDetail';

const ETAPA_META: Record<EtapaProductiva, { icon: LucideIcon; accent: string; desc: string }> = {
  Reemplazo:  { icon: RefreshCw,  accent: 'text-sky-400',     desc: 'Hembras candidatas a pie de cría' },
  Gestación:  { icon: HeartPulse, accent: 'text-pink-400',    desc: 'Cerdas inseminadas / embarazadas' },
  Maternidad: { icon: Baby,       accent: 'text-purple-400',  desc: 'Madres lactando + camadas' },
  Destete:    { icon: Wheat,      accent: 'text-amber-400',   desc: 'Lechones destetados (21–70 días)' },
  Ceba:       { icon: Scale,      accent: 'text-brand-400',   desc: 'Engorde hasta venta (≈230 lb)' },
};

function ageInDays(birthDate: string, currentDate: string): number {
  return differenceInDays(parseISO(currentDate), parseISO(birthDate));
}

function daysSince(date: string, currentDate: string): number {
  return Math.max(0, differenceInDays(parseISO(currentDate), parseISO(date)));
}

/** Días que el animal lleva dentro de su etapa actual (aproximado por hitos biológicos). */
function diasEnEtapa(a: Animal, currentDate: string): number {
  const age = ageInDays(a.birthDate, currentDate);
  switch (a.etapaActual) {
    case 'Maternidad':
      return a.role === 'Madre' && a.lastFarrowingDate ? daysSince(a.lastFarrowingDate, currentDate) : age;
    case 'Gestación':
      if (a.inseminationDate) return daysSince(a.inseminationDate, currentDate);
      if (a.lastWeaningDate) return daysSince(a.lastWeaningDate, currentDate);
      return age;
    case 'Destete':
      return Math.max(0, age - 21);
    case 'Ceba':
      return a.role === 'Ceba' ? Math.max(0, age - 70) : age;
    case 'Reemplazo':
    default:
      return age;
  }
}

export default function Etapas() {
  const animals = useAppStore(s => s.animals);
  const currentDate = useAppStore(s => s.currentDate);
  const [selected, setSelected] = useState<EtapaProductiva>('Gestación');
  const [detail, setDetail] = useState<Animal | null>(null);

  const active = animals.filter(a => a.status === 'Activo');
  const byEtapa = (e: EtapaProductiva) => active.filter(a => a.etapaActual === e);

  const rows = byEtapa(selected)
    .map(a => ({ animal: a, dias: diasEnEtapa(a, currentDate) }))
    .sort((x, y) => y.dias - x.dias);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Flujo Productivo</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Seguimiento del hato a través de las 5 etapas productivas (sin ubicaciones físicas)
        </p>
      </div>

      {/* 5 fixed stage cards — Bento grid FUI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {ETAPAS.map(etapa => {
          const { icon: Icon, accent, desc } = ETAPA_META[etapa];
          const count = byEtapa(etapa).length;
          const cap = ETAPA_CAPACITY[etapa];
          const pct = cap > 0 ? Math.min(100, Math.round((count / cap) * 100)) : 0;
          const isSel = selected === etapa;
          const nearFull = cap > 0 && count >= cap;
          return (
            <button
              key={etapa}
              onClick={() => setSelected(etapa)}
              className={`text-left bg-gray-900 border rounded-xl p-4 transition-all ${
                isSel
                  ? 'border-brand-600 shadow-glow ring-1 ring-brand-700/50'
                  : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-gray-800/60 ${accent}`}>
                  <Icon size={18} />
                </div>
                <span className="text-2xl font-bold text-white tabular-nums">{count}</span>
              </div>
              <p className="text-white font-semibold text-sm">{etapa}</p>
              <p className="text-gray-500 text-[11px] leading-snug mt-0.5 h-8">{desc}</p>

              {cap > 0 ? (
                <div className="mt-2">
                  <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${nearFull ? 'bg-red-500' : 'bg-brand-600'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {count}/{cap} {etapa === 'Maternidad' ? 'salas' : 'cupos'}
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-gray-600 mt-2.5">Sin límite de capacidad</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Drill-down DataGrid */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
          {(() => {
            const { icon: Icon, accent } = ETAPA_META[selected];
            return <Icon size={16} className={accent} />;
          })()}
          <h3 className="text-white font-semibold">Etapa: {selected}</h3>
          <ChevronRight size={14} className="text-gray-600" />
          <span className="text-gray-400 text-sm">{rows.length} animal{rows.length === 1 ? '' : 'es'}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50">
              <tr className="text-gray-400">
                <th className="text-left px-4 py-3">Tag</th>
                <th className="text-left px-4 py-3">Rol</th>
                <th className="text-left px-4 py-3">Género</th>
                <th className="text-left px-4 py-3">Peso (lb)</th>
                <th className="text-left px-4 py-3">Días en etapa</th>
                <th className="text-left px-4 py-3">Estado Repr.</th>
                <th className="text-left px-4 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ animal, dias }) => (
                <tr key={animal.id} className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-brand-400 font-semibold">{animal.tag}</td>
                  <td className="px-4 py-3 text-gray-300">{animal.role ?? 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-300">{animal.gender}</td>
                  <td className="px-4 py-3 text-white font-medium tabular-nums">{animal.weight}</td>
                  <td className="px-4 py-3 text-gray-300 tabular-nums">{dias} día{dias === 1 ? '' : 's'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{animal.heatStatus ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetail(animal)}
                      className="text-gray-400 hover:text-brand-400 transition-colors p-1 rounded hover:bg-gray-700"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No hay animales en la etapa {selected}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail && <AnimalDetail animal={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
