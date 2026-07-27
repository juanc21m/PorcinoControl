import { useState } from 'react';
import { Baby, Truck, Search, Eye, Filter, HeartCrack, ClipboardList, PiggyBank } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import AnimalForm from '../components/AnimalForm';
import RegisterBirthForm from '../components/RegisterBirthForm';
import AnimalDetail from '../components/AnimalDetail';
import { LOGO_URL, APP_NAME } from '../lib/brand';
import type { Animal } from '../types';

const statusColors: Record<string, string> = {
  Activo:              'bg-green-500/20 text-green-400',
  Despachado:          'bg-gray-500/20 text-gray-400',
  Muerto:              'bg-red-500/20 text-red-400',
  'Descarte/Matadero': 'bg-orange-500/20 text-orange-400',
};

const heatColors: Record<string, string> = {
  'En Celo':   'text-pink-400',
  'Inseminada':'text-blue-400',
  'Embarazada':'text-yellow-400',
  'Lactante':  'text-purple-400',
  'Vacía':     'text-gray-400',
  'Abierta':   'text-amber-400',
};

/** Modal de registro de baja: pide la causa y confirma la acción. */
function DeathModal({ animal, onClose }: { animal: Animal; onClose: () => void }) {
  const registerDeath = useAppStore(s => s.registerDeath);
  const currentDate = useAppStore(s => s.currentDate);
  const [cause, setCause] = useState('');
  const [date, setDate] = useState(currentDate);
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cause.trim()) { setError('Indica la causa del deceso.'); return; }
    registerDeath(animal.id, cause, date);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-900 border border-red-800/50 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-gray-50 font-semibold mb-1 flex items-center gap-2">
          <HeartCrack size={18} className="text-red-400" /> Registrar Baja / Muerte
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Animal <b className="text-gray-50 font-mono">{animal.tag}</b> ({animal.etapaActual}
          {animal.roomNumber ? ` · Sala ${animal.roomNumber}` : ''}). Pasará a estado
          <b className="text-red-400"> Muerto</b> y quedará en la bitácora de mortalidad.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Fecha de la muerte</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">Causa / Notas del deceso</label>
            <textarea
              className="input min-h-[84px] resize-y"
              placeholder="Ej.: neumonía, aplastamiento, causa desconocida…"
              value={cause}
              onChange={e => setCause(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white">
              <HeartCrack size={15} /> Confirmar Baja
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Traceability() {
  const animals = useAppStore(s => s.animals);
  const [showBirth, setShowBirth] = useState(false);
  const [showIntake, setShowIntake] = useState(false);
  const [selected, setSelected] = useState<Animal | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('Todos');
  const [tab, setTab] = useState<'activos' | 'bajas'>('activos');
  const [deathTarget, setDeathTarget] = useState<Animal | null>(null);

  const matches = (a: Animal) => {
    const q = search.toLowerCase();
    const matchSearch = a.tag.toLowerCase().includes(q) || a.breed.toLowerCase().includes(q);
    const matchRole = filterRole === 'Todos' || a.role === filterRole;
    return matchSearch && matchRole;
  };

  // Vivos (todo lo que no es baja) vs. bitácora de mortalidad.
  const filtered = animals.filter(a => a.status !== 'Muerto').filter(matches);
  const deaths = animals
    .filter(a => a.status === 'Muerto')
    .filter(matches)
    .sort((x, y) => (y.deathDate ?? '').localeCompare(x.deathDate ?? ''));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-white rounded-lg p-1.5 hidden sm:inline-flex items-center shadow-sm">
            <img src={LOGO_URL} alt={APP_NAME} className="h-8 w-auto object-contain" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-50">Trazabilidad</h1>
            <p className="text-gray-400 text-sm mt-0.5">{APP_NAME} · Registro de vida y genealogía</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowBirth(true)} className="btn-primary flex items-center gap-2">
            <Baby size={16} /> Registrar Parto
          </button>
          <button onClick={() => setShowIntake(true)} className="btn-secondary flex items-center gap-2">
            <Truck size={16} /> Registrar Compra/Ingreso
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="input pl-9"
            placeholder="Buscar por tag o raza..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <select className="input" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option>Todos</option>
            <option>Madre</option>
            <option>Padrote</option>
            <option>Ceba</option>
          </select>
        </div>
      </div>

      {/* Tabs: activos vs bitácora de mortalidad */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {([
          { key: 'activos', label: 'Cerdos Activos', icon: PiggyBank, count: filtered.length },
          { key: 'bajas',   label: 'Bitácora de Mortalidad', icon: ClipboardList, count: deaths.length },
        ] as const).map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-brand-500/15 text-brand-400' : 'text-gray-400 hover:text-gray-50'
            }`}
          >
            <Icon size={15} /> {label}
            <span className="text-xs tabular-nums opacity-70">({count})</span>
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: animals.length },
          { label: 'Activos', value: animals.filter(a => a.status === 'Activo').length },
          { label: 'Madres', value: animals.filter(a => a.role === 'Madre').length },
          { label: 'En Ceba', value: animals.filter(a => a.role === 'Ceba').length },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-50">{stat.value}</p>
            <p className="text-gray-500 text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabla de activos */}
      {tab === 'activos' && (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/60">
              <tr className="text-gray-400">
                <th className="text-left px-4 py-3">Tag</th>
                <th className="text-left px-4 py-3">Género</th>
                <th className="text-left px-4 py-3">Rol</th>
                <th className="text-left px-4 py-3">Raza</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3">Estado Repr.</th>
                <th className="text-left px-4 py-3">Peso (lb)</th>
                <th className="text-left px-4 py-3">Nacimiento</th>
                <th className="text-left px-4 py-3">Alimento</th>
                <th className="text-left px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(animal => (
                <tr
                  key={animal.id}
                  className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-brand-400 font-semibold">{animal.tag}</td>
                  <td className="px-4 py-3 text-gray-300">{animal.gender}</td>
                  <td className="px-4 py-3 text-gray-300">{animal.role ?? 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-300">{animal.breed}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[animal.status]}`}>{animal.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {animal.heatStatus ? (
                      <span className={`text-xs font-medium ${heatColors[animal.heatStatus]}`}>{animal.heatStatus}</span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-50 font-medium">{animal.weight}</td>
                  <td className="px-4 py-3 text-gray-400">{animal.birthDate}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{animal.feedType}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelected(animal)}
                        title="Ver ficha"
                        className="text-gray-400 hover:text-brand-400 transition-colors p-1 rounded hover:bg-gray-700"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => setDeathTarget(animal)}
                        title="Registrar baja / muerte"
                        className="text-gray-400 hover:text-red-400 transition-colors p-1 rounded hover:bg-gray-700"
                      >
                        <HeartCrack size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">No se encontraron animales.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Bitácora de Mortalidad — vista para autoridades de salud */}
      {tab === 'bajas' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <ClipboardList size={16} className="text-red-400" />
            <h3 className="text-gray-50 font-semibold">Bitácora de Mortalidad</h3>
            <span className="text-gray-500 text-sm">({deaths.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/60 text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3">ID / Arete</th>
                  <th className="text-left px-4 py-3">Zona donde estaba</th>
                  <th className="text-left px-4 py-3">Fecha de Muerte</th>
                  <th className="text-left px-4 py-3">Causa / Notas</th>
                </tr>
              </thead>
              <tbody>
                {deaths.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-600">Sin bajas registradas.</td></tr>
                ) : deaths.map(a => (
                  <tr key={a.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-brand-400 font-semibold">{a.tag}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {a.etapaActual}{a.roomNumber ? ` · Sala ${a.roomNumber}` : ''}
                    </td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{a.deathDate ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{a.deathCause ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deathTarget && <DeathModal animal={deathTarget} onClose={() => setDeathTarget(null)} />}
      {showBirth && <RegisterBirthForm onClose={() => setShowBirth(false)} />}
      {showIntake && <AnimalForm onClose={() => setShowIntake(false)} />}
      {selected && <AnimalDetail animal={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
