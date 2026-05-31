import { useState } from 'react';
import { X, Weight, Syringe, Clock, Baby } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Animal } from '../types';
import { useAppStore } from '../store/appStore';

interface Props {
  animal: Animal;
  onClose: () => void;
}

function FarrowingModal({ mother, onClose }: { mother: Animal; onClose: () => void }) {
  const registerFarrowing = useAppStore(s => s.registerFarrowing);
  const [count, setCount] = useState('');
  const [avgW, setAvgW] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    registerFarrowing(mother.id, parseInt(count), parseFloat(avgW));
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-96">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Baby size={18} className="text-brand-400" /> Registrar Parto</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Madre</label>
            <input className="input" value={mother.tag} disabled />
          </div>
          <div>
            <label className="label">Cantidad de Lechones</label>
            <input type="number" className="input" placeholder="10" value={count} onChange={e => setCount(e.target.value)} required />
          </div>
          <div>
            <label className="label">Peso Promedio de Camada (lb)</label>
            <input type="number" step="0.1" className="input" placeholder="3.2" value={avgW} onChange={e => setAvgW(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Registrar</button>
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

export default function AnimalDetail({ animal, onClose }: Props) {
  const [showFarrowing, setShowFarrowing] = useState(false);

  return (
    <>
      <div className="fixed right-0 top-0 h-screen w-96 bg-gray-900 border-l border-gray-800 z-40 overflow-y-auto">
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
              ['Nacimiento', animal.birthDate],
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

          {/* Farrowing button */}
          {animal.heatStatus === 'Embarazada' && (
            <button
              onClick={() => setShowFarrowing(true)}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Baby size={16} /> Registrar Parto
            </button>
          )}
        </div>
      </div>

      {showFarrowing && <FarrowingModal mother={animal} onClose={() => setShowFarrowing(false)} />}
    </>
  );
}
