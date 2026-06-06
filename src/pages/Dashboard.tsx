import { useEffect, useMemo, useState } from 'react';
import {
  getYear, getMonth, getDate, getDaysInMonth, format,
} from 'date-fns';
import { safeParseISO } from '../lib/date';
import { es } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { AlertTriangle, AlertCircle, Info, Baby } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { ETAPAS } from '../types';
import type { EtapaProductiva, FeedType, AlertType, AlertSeverity } from '../types';

const LB_PER_SACO = 35;

// ---- Severity styling ----
const severityStyle: Record<AlertSeverity, { color: string; Icon: typeof AlertTriangle }> = {
  critical: { color: '#ef4444', Icon: AlertTriangle },
  warning:  { color: '#ff9800', Icon: AlertCircle },
  info:     { color: '#9ca3af', Icon: Info },
};

// Columns shown in the horizontal alert board
const ALERT_COLUMNS: AlertType[] = ['Gestación', 'Maternidad', 'Destete', 'Inventario', 'Reemplazo'];

type NatalityMode = 'Día' | 'Semana' | 'Mes';

export default function Dashboard() {
  const animals = useAppStore(s => s.animals);
  const inventory = useAppStore(s => s.inventory);
  const inventoryHistory = useAppStore(s => s.inventoryHistory);
  const currentDate = useAppStore(s => s.currentDate);
  const alerts = useAppStore(s => s.alerts);
  const runBiologicalEngine = useAppStore(s => s.runBiologicalEngine);

  // Reevalúa el motor biológico al montar y cuando cambian hato / fecha / inventario.
  useEffect(() => {
    runBiologicalEngine();
  }, [animals, currentDate, inventory, runBiologicalEngine]);

  // -------------------------------------------------------------------------
  // 1. Inventario de animales por etapa
  // -------------------------------------------------------------------------
  const etapaCounts = useMemo(() => {
    const counts = Object.fromEntries(ETAPAS.map(e => [e, 0])) as Record<EtapaProductiva, number>;
    for (const a of animals) {
      if (a.status === 'Activo') counts[a.etapaActual]++;
    }
    return counts;
  }, [animals]);

  // -------------------------------------------------------------------------
  // 3. Consumo de alimento del día por tipo
  // -------------------------------------------------------------------------
  const feedTypes: FeedType[] = ['Crecimiento', 'Engorde', 'Lactancia'];
  const consumedToday = useMemo(() => {
    const map = Object.fromEntries(feedTypes.map(t => [t, 0])) as Record<FeedType, number>;
    for (const tx of inventoryHistory) {
      if (tx.operation === 'Consumo' && tx.date === currentDate) {
        map[tx.feedType] += tx.lb;
      }
    }
    return map;
  }, [inventoryHistory, currentDate]);

  // -------------------------------------------------------------------------
  // 4. Natalidad por período (dinámico)
  // -------------------------------------------------------------------------
  const [natMode, setNatMode] = useState<NatalityMode>('Mes');
  const [natDate, setNatDate] = useState(currentDate);

  const natalityData = useMemo(() => {
    const ref = safeParseISO(natDate);
    const refYear = getYear(ref);
    const refMonth = getMonth(ref); // 0-indexed

    // Solo fechas de nacimiento válidas (evita crash si birthDate es nulo).
    const births = animals
      .map(a => safeParseISO(a.birthDate))
      .filter(d => !isNaN(d.getTime()));

    if (natMode === 'Día') {
      // Nacimientos por día del mes seleccionado
      const days = getDaysInMonth(ref);
      return Array.from({ length: days }, (_, i) => {
        const day = i + 1;
        const count = births.filter(b => getYear(b) === refYear && getMonth(b) === refMonth && getDate(b) === day).length;
        return { label: String(day), nacimientos: count };
      });
    }

    if (natMode === 'Semana') {
      // Nacimientos por semana dentro del mes seleccionado (Sem 1..5)
      const days = getDaysInMonth(ref);
      const weeks = Math.ceil(days / 7);
      return Array.from({ length: weeks }, (_, i) => {
        const start = i * 7 + 1;
        const end = Math.min((i + 1) * 7, days);
        const count = births.filter(b => {
          if (getYear(b) !== refYear || getMonth(b) !== refMonth) return false;
          const d = getDate(b);
          return d >= start && d <= end;
        }).length;
        return { label: `Sem ${i + 1}`, nacimientos: count };
      });
    }

    // Mes: nacimientos por mes del año seleccionado
    return Array.from({ length: 12 }, (_, m) => {
      const count = births.filter(b => getYear(b) === refYear && getMonth(b) === m).length;
      return { label: format(new Date(refYear, m, 1), 'MMM', { locale: es }), nacimientos: count };
    });
  }, [animals, natMode, natDate]);

  // -------------------------------------------------------------------------
  // 5. Alertas agrupadas por columna
  // -------------------------------------------------------------------------
  const alertsByArea = useMemo(() => {
    const grouped = Object.fromEntries(ALERT_COLUMNS.map(a => [a, [] as typeof alerts])) as Record<AlertType, typeof alerts>;
    for (const al of alerts) {
      if (ALERT_COLUMNS.includes(al.type)) grouped[al.type].push(al);
    }
    return grouped;
  }, [alerts]);

  const fmtSacos = (lb: number) => {
    const sacos = lb / LB_PER_SACO;
    const rounded = Math.round(sacos * 10) / 10;
    const label = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
    return `${label} ${rounded === 1 ? 'saco' : 'sacos'} (${lb.toLocaleString()} lb)`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Resumen operativo en tiempo real · {currentDate}</p>
      </div>

      {/* 1. Inventario de animales por etapa */}
      <div>
        <h3 className="text-white font-semibold mb-3">Inventario de Animales</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {ETAPAS.map(etapa => (
            <div key={etapa} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col items-center justify-center text-center">
              <span className="font-bold leading-none" style={{ fontSize: '64px', color: '#4CAF50' }}>
                {etapaCounts[etapa]}
              </span>
              <span className="text-gray-300 text-sm mt-2">{etapa}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Inventario de alimentos */}
      <div>
        <h3 className="text-white font-semibold mb-3">Inventario de Alimentos</h3>
        <div className="grid grid-cols-3 gap-4">
          {(Object.entries(inventory) as [string, { sacos: number; lb: number }][]).map(([type, data]) => (
            <div key={type} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-sm">{type}</p>
              <p className="text-2xl font-bold text-white mt-1">{data.sacos} sacos</p>
              <p className="text-gray-500 text-xs mt-0.5">{data.lb.toLocaleString()} lb</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Consumo de alimento del día por tipo */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Alimento Consumido Hoy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {feedTypes.map(type => (
            <div key={type} className="bg-gray-800/40 border border-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">{type}</p>
              <p className="text-xl font-bold text-white mt-1">{fmtSacos(consumedToday[type])}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Natalidad por período */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Baby size={16} className="text-brand-400" />
            Natalidad por Período
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Ver por:</span>
              <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
                {(['Día', 'Semana', 'Mes'] as NatalityMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setNatMode(m)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${natMode === m ? 'bg-brand-800 text-white shadow-glow' : 'text-gray-400 hover:text-white'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="date"
              className="input !w-auto !py-1.5"
              value={natDate}
              onChange={e => setNatDate(e.target.value)}
            />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={natalityData} barSize={natMode === 'Día' ? 14 : 40}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} interval={natMode === 'Día' ? 1 : 0} />
            <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
              cursor={{ fill: 'rgba(76,175,80,0.08)' }}
            />
            <Bar dataKey="nacimientos" fill="#4CAF50" radius={[4, 4, 0, 0]} name="Nacimientos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 5. Alertas por columnas */}
      <div>
        <h3 className="text-white font-semibold mb-3">Alertas Operativas</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {ALERT_COLUMNS.map(area => {
            const items = alertsByArea[area];
            return (
              <div key={area} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-medium text-sm">{area}</h4>
                  <span className="text-xs text-gray-500 bg-gray-800 rounded-full px-2 py-0.5">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <p className="text-gray-600 text-xs">Sin alertas</p>
                  ) : (
                    items.map(al => {
                      const { color, Icon } = severityStyle[al.severity];
                      return (
                        <div
                          key={al.id}
                          className="rounded-lg px-2.5 py-2 text-xs flex items-start gap-2 border"
                          style={{ borderColor: `${color}40`, background: `${color}14`, color }}
                        >
                          <Icon size={13} className="mt-0.5 shrink-0" />
                          <span className="leading-snug">
                            <span className="font-semibold block">{al.title}</span>
                            {al.message}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
