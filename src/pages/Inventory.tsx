import { useState } from 'react';
import { Package, PlusCircle, MinusCircle, Wheat, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { FEED_TYPES, LB_PER_SACO } from '../types';
import type { FeedType } from '../types';

const feedColors: Record<FeedType, { card: string; dot: string }> = {
  'Gestación':   { card: 'border-pink-700/40 shadow-pink-900/20',     dot: 'bg-pink-500'    },
  'Lactancia':   { card: 'border-purple-700/40 shadow-purple-900/20', dot: 'bg-purple-500'  },
  'Crecimiento': { card: 'border-blue-700/40 shadow-blue-900/20',     dot: 'bg-blue-500'    },
  'Engorde':     { card: 'border-yellow-700/40 shadow-yellow-900/20', dot: 'bg-yellow-500'  },
  'Fase 1':      { card: 'border-emerald-700/40 shadow-emerald-900/20', dot: 'bg-emerald-500' },
  'Fase 2':      { card: 'border-teal-700/40 shadow-teal-900/20',     dot: 'bg-teal-500'    },
  'Fase 3':      { card: 'border-cyan-700/40 shadow-cyan-900/20',     dot: 'bg-cyan-500'    },
};

/** Estimación de consumo diario (lb) por tipo, para los "días restantes". */
const DAILY_LB: Record<FeedType, number> = {
  'Gestación': 6, 'Lactancia': 12, 'Crecimiento': 8, 'Engorde': 10, 'Fase 1': 2, 'Fase 2': 3, 'Fase 3': 5,
};

const LOW_STOCK_SACOS = 50;

export default function Inventory() {
  const { inventory, inventoryHistory, loadFeed, useFeed } = useAppStore();

  const [loadForm, setLoadForm] = useState({ feedType: 'Crecimiento' as FeedType, sacos: '', note: '' });
  const [useForm, setUseForm]   = useState({ feedType: 'Crecimiento' as FeedType, sacos: '', note: '' });
  const [loadError, setLoadError] = useState('');
  const [useError, setUseError]   = useState('');

  function handleLoad(e: React.FormEvent) {
    e.preventDefault();
    const sacos = parseInt(loadForm.sacos);
    if (!sacos || sacos <= 0) { setLoadError('Ingresa una cantidad válida.'); return; }
    loadFeed(loadForm.feedType, sacos, loadForm.note || undefined);
    setLoadForm({ feedType: 'Crecimiento', sacos: '', note: '' });
    setLoadError('');
  }

  function handleUse(e: React.FormEvent) {
    e.preventDefault();
    const sacos = parseInt(useForm.sacos);
    if (!sacos || sacos <= 0) { setUseError('Ingresa una cantidad válida.'); return; }
    if (sacos > inventory[useForm.feedType].sacos) {
      setUseError(`Stock insuficiente (${inventory[useForm.feedType].sacos} sacos disponibles).`);
      return;
    }
    useFeed(useForm.feedType, sacos * LB_PER_SACO[useForm.feedType], useForm.note || undefined);
    setUseForm({ feedType: 'Crecimiento', sacos: '', note: '' });
    setUseError('');
  }

  const recentHistory = inventoryHistory.slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Package size={22} className="text-brand-400" /> Inventario de Alimentos
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Control de stock, cargas y consumos</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {FEED_TYPES.map(type => {
          const data = inventory[type];
          const isLow = data.sacos <= LOW_STOCK_SACOS;
          const { card, dot } = feedColors[type];
          return (
            <div key={type} className={`bg-gray-900 border ${card} rounded-xl p-5 shadow`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                  <span className="text-gray-300 font-medium text-sm">{type}</span>
                </div>
                {isLow && (
                  <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-medium">
                    Stock Bajo
                  </span>
                )}
              </div>
              <p className="text-4xl font-bold text-white">{data.sacos}</p>
              <p className="text-gray-500 text-sm mt-1">sacos</p>
              <div className="mt-3 pt-3 border-t border-gray-800">
                <p className="text-brand-400 font-semibold">{data.lb.toLocaleString()} lb</p>
                <p className="text-gray-600 text-xs">{LB_PER_SACO[type]} lb / saco</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stock table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
          <Wheat size={16} className="text-brand-400" />
          <h3 className="text-white font-semibold">Stock Actual</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-primary-800/40">
            <tr className="text-gray-400">
              <th className="text-left px-5 py-3">Tipo de Alimento</th>
              <th className="text-left px-5 py-3">Sacos en Stock</th>
              <th className="text-left px-5 py-3">Libras en Stock</th>
              <th className="text-left px-5 py-3">Consumo Aprox./día</th>
              <th className="text-left px-5 py-3">Días Restantes</th>
              <th className="text-left px-5 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {FEED_TYPES.map(type => {
              const data = inventory[type];
              const dailyLb = DAILY_LB[type];
              const daysLeft = dailyLb > 0 ? Math.floor(data.lb / dailyLb) : '∞';
              const isLow = data.sacos <= LOW_STOCK_SACOS;
              return (
                <tr key={type} className="border-t border-gray-800 hover:bg-gray-800/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${feedColors[type].dot}`} />
                      <span className="text-white font-medium">{type}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-white font-semibold">{data.sacos}</td>
                  <td className="px-5 py-3 text-gray-300">{data.lb.toLocaleString()}</td>
                  <td className="px-5 py-3 text-gray-400">{dailyLb} lb</td>
                  <td className="px-5 py-3">
                    <span className={typeof daysLeft === 'number' && daysLeft < 30 ? 'text-red-400 font-semibold' : 'text-gray-300'}>
                      {daysLeft} días
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isLow ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      {isLow ? 'Bajo' : 'Normal'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Forms row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Load form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <PlusCircle size={16} className="text-green-400" /> Cargar Alimento
          </h3>
          <form onSubmit={handleLoad} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tipo de Alimento</label>
                <select className="input" value={loadForm.feedType} onChange={e => setLoadForm({ ...loadForm, feedType: e.target.value as FeedType })}>
                  {FEED_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Cantidad de Sacos</label>
                <input
                  type="number"
                  className="input"
                  placeholder="50"
                  min={1}
                  value={loadForm.sacos}
                  onChange={e => setLoadForm({ ...loadForm, sacos: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Nota (opcional)</label>
              <input
                className="input"
                placeholder="Ej: Proveedor, número de factura..."
                value={loadForm.note}
                onChange={e => setLoadForm({ ...loadForm, note: e.target.value })}
              />
            </div>
            {loadForm.sacos && (
              <div className="bg-brand-800/10 border border-brand-800/30 rounded-lg px-4 py-2 text-sm text-gray-300">
                Se agregarán <span className="text-white font-semibold">{parseInt(loadForm.sacos || '0') * LB_PER_SACO[loadForm.feedType]} lb</span> al inventario de {loadForm.feedType}
              </div>
            )}
            {loadError && <p className="text-red-400 text-xs">{loadError}</p>}
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
              <ArrowUpCircle size={16} /> Guardar Carga
            </button>
          </form>
        </div>

        {/* Use form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <MinusCircle size={16} className="text-red-400" /> Usar / Registrar Consumo
          </h3>
          <form onSubmit={handleUse} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tipo de Alimento</label>
                <select className="input" value={useForm.feedType} onChange={e => setUseForm({ ...useForm, feedType: e.target.value as FeedType })}>
                  {FEED_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Sacos a Usar</label>
                <input
                  type="number"
                  className="input"
                  placeholder="1"
                  min={1}
                  value={useForm.sacos}
                  onChange={e => setUseForm({ ...useForm, sacos: e.target.value })}
                  required
                />
              </div>
            </div>
            {useForm.sacos && (
              <div className="bg-brand-800/10 border border-brand-800/30 rounded-lg px-4 py-2 text-sm text-gray-300">
                Equivalente: <span className="text-white font-semibold">{parseInt(useForm.sacos || '0') * LB_PER_SACO[useForm.feedType]} libras</span>
              </div>
            )}
            <div>
              <label className="label">Nota (opcional)</label>
              <input
                className="input"
                placeholder="Ej: Consumo diario, etapa Ceba..."
                value={useForm.note}
                onChange={e => setUseForm({ ...useForm, note: e.target.value })}
              />
            </div>
            <div className="bg-primary-800/40 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-400">
              Disponible: <span className="text-white font-semibold">{inventory[useForm.feedType].lb.toLocaleString()} lb</span> ({inventory[useForm.feedType].sacos} sacos)
            </div>
            {useError && <p className="text-red-400 text-xs">{useError}</p>}
            <button type="submit" className="btn-secondary w-full flex items-center justify-center gap-2 border-red-800/50 hover:bg-red-900/20 text-red-400">
              <ArrowDownCircle size={16} /> Restar del Inventario
            </button>
          </form>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-white font-semibold">Últimas Transacciones de Inventario</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-primary-800/40">
            <tr className="text-gray-400">
              <th className="text-left px-5 py-3">Fecha</th>
              <th className="text-left px-5 py-3">Tipo</th>
              <th className="text-left px-5 py-3">Operación</th>
              <th className="text-left px-5 py-3">Sacos</th>
              <th className="text-left px-5 py-3">Libras</th>
              <th className="text-left px-5 py-3">Nota</th>
            </tr>
          </thead>
          <tbody>
            {recentHistory.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-600">Sin transacciones aún.</td></tr>
            ) : (
              recentHistory.map(tx => (
                <tr key={tx.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                  <td className="px-5 py-3 text-gray-400">{tx.date}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${feedColors[tx.feedType].dot}`} />
                      <span className="text-gray-300">{tx.feedType}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${tx.operation === 'Carga' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {tx.operation === 'Carga' ? <ArrowUpCircle size={11} /> : <ArrowDownCircle size={11} />}
                      {tx.operation}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-white">{tx.sacos ?? '—'}</td>
                  <td className="px-5 py-3 text-white font-medium">{tx.lb.toLocaleString()}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{tx.note ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
