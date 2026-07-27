import { useEffect, useMemo, useState } from 'react';
import {
  getYear, getMonth, getDate, getDaysInMonth, format,
} from 'date-fns';
import { safeParseISO } from '../lib/date';
import { differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { AlertTriangle, AlertCircle, Info, Baby, Bell, CheckCircle2, X, HeartCrack } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { ETAPAS, ETAPA_CAPACITY, FEED_TYPES } from '../types';
import type { EtapaProductiva, AlertSeverity } from '../types';

const LOW_FEED_SACOS = 50;

// ---- Severity styling ----
const severityStyle: Record<AlertSeverity, { tone: string; Icon: typeof AlertTriangle }> = {
  critical: { tone: 'text-red-400',   Icon: AlertTriangle },
  warning:  { tone: 'text-amber-400', Icon: AlertCircle },
  info:     { tone: 'text-gray-400',  Icon: Info },
};

type NatalityMode = 'Día' | 'Semana' | 'Mes';

export default function Dashboard() {
  const animals = useAppStore(s => s.animals);
  const inventory = useAppStore(s => s.inventory);
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

  // Mortalidad de los últimos 7 días (control sanitario).
  const deaths7d = useMemo(() => {
    const ref = safeParseISO(currentDate);
    return animals.filter(a => {
      if (a.status !== 'Muerto' || !a.deathDate) return false;
      const d = differenceInDays(ref, safeParseISO(a.deathDate));
      return !isNaN(d) && d >= 0 && d <= 7;
    }).length;
  }, [animals, currentDate]);

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const totalActive = animals.filter(a => a.status === 'Activo').length;
  const totalSacos = Object.values(inventory).reduce((acc, v) => acc + v.sacos, 0);
  const dismissAlert = useAppStore(s => s.dismissAlert);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-50">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Resumen operativo en tiempo real · {currentDate}</p>
      </div>

      {/* Métrica sanitaria: mortalidad reciente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className={`bg-gray-900 border rounded-2xl p-5 shadow-sm flex items-center gap-4 ${
          deaths7d > 0 ? 'border-red-700/50' : 'border-gray-800'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            deaths7d > 0 ? 'bg-red-500/15 text-red-400' : 'bg-gray-800 text-gray-500'
          }`}>
            <HeartCrack size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wider">
              Mortalidad (últimos 7 días)
            </p>
            <p className={`text-3xl font-bold leading-none mt-1 tabular-nums ${
              deaths7d > 0 ? 'text-red-400' : 'text-gray-50'
            }`}>
              {deaths7d}
            </p>
            <p className="text-gray-500 text-[11px] mt-1">
              {deaths7d === 1 ? 'animal dado de baja' : 'animales dados de baja'}
            </p>
          </div>
        </div>
      </div>

      {/* 1. Inventario de animales por zona */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-gray-50 font-semibold tracking-tight">Inventario de Animales</h3>
          <span className="text-gray-500 text-xs tabular-nums">{totalActive} activos</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {ETAPAS.map(etapa => {
            const count = etapaCounts[etapa];
            const cap = ETAPA_CAPACITY[etapa];
            const pct = cap > 0 ? Math.min(100, (count / cap) * 100) : 0;
            return (
              <div
                key={etapa}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-sm hover:border-brand-600/40 hover:shadow-md transition-all"
              >
                <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wider truncate">{etapa}</p>
                <p className="text-4xl font-bold text-gray-50 mt-2 leading-none tabular-nums">{count}</p>
                <div className="mt-4 h-1 w-full rounded-full bg-gray-800 overflow-hidden">
                  <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-gray-500 text-[11px] mt-1.5 tabular-nums">de {cap} de capacidad</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Inventario de alimentos */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-gray-50 font-semibold tracking-tight">Inventario de Alimentos</h3>
          <span className="text-gray-500 text-xs tabular-nums">{totalSacos.toLocaleString()} sacos en total</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {FEED_TYPES.map(type => {
            const data = inventory[type];
            const low = data.sacos <= LOW_FEED_SACOS;
            return (
              <div
                key={type}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wider">{type}</p>
                  {low && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1" title="Stock bajo" />}
                </div>
                <p className={`text-3xl font-bold mt-2 leading-none tabular-nums ${low ? 'text-red-400' : 'text-gray-50'}`}>
                  {data.sacos}
                </p>
                <p className="text-gray-500 text-[11px] mt-1.5 tabular-nums">sacos · {data.lb.toLocaleString()} lb</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Natalidad por período */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-gray-50 font-semibold flex items-center gap-2">
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
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${natMode === m ? 'bg-brand-800 text-gray-50 shadow-glow' : 'text-gray-400 hover:text-gray-50'}`}
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
              cursor={{ fill: 'rgba(46,148,55,0.10)' }}
            />
            <Bar dataKey="nacimientos" fill="#2E9437" radius={[4, 4, 0, 0]} name="Nacimientos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 5. Bandeja de alertas (panel compacto) */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-800">
          <Bell size={16} className="text-brand-400" />
          <h3 className="text-gray-50 font-semibold tracking-tight">Alertas Operativas</h3>
          {alerts.length > 0 && (
            <span className="text-[11px] font-semibold bg-brand-500/15 text-brand-400 rounded-full px-2 py-0.5 tabular-nums">
              {alerts.length}
            </span>
          )}
          {criticalCount > 0 && (
            <span className="text-[11px] font-semibold bg-red-500/15 text-red-400 rounded-full px-2 py-0.5 tabular-nums">
              {criticalCount} crítica{criticalCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="px-5 py-10 flex flex-col items-center text-center">
            <CheckCircle2 size={26} className="text-brand-500 mb-2" />
            <p className="text-gray-100 text-sm font-medium">Todo en orden</p>
            <p className="text-gray-500 text-xs mt-0.5">No hay alertas operativas pendientes.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-800 max-h-[26rem] overflow-y-auto">
            {alerts.map(al => {
              const { tone, Icon } = severityStyle[al.severity];
              return (
                <li key={al.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-800/40 transition-colors">
                  <Icon size={15} className={`${tone} mt-0.5 shrink-0`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-gray-100 text-sm font-medium">{al.title}</p>
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 bg-gray-800 rounded px-1.5 py-0.5">
                        {al.type}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5 leading-snug">{al.message}</p>
                  </div>
                  <button
                    onClick={() => dismissAlert(al.id)}
                    aria-label="Descartar alerta"
                    className="text-gray-500 hover:text-gray-100 p-1 shrink-0 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
