import { useState } from 'react';
import { Plus, Search, Eye, Filter } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import AnimalForm from '../components/AnimalForm';
import AnimalDetail from '../components/AnimalDetail';
import type { Animal } from '../types';

const statusColors: Record<string, string> = {
  Activo:              'bg-green-500/20 text-green-400',
  Despachado:          'bg-gray-500/20 text-gray-400',
  Fallecido:           'bg-red-500/20 text-red-400',
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

export default function Traceability() {
  const animals = useAppStore(s => s.animals);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Animal | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('Todos');

  const filtered = animals.filter(a => {
    const matchSearch = a.tag.toLowerCase().includes(search.toLowerCase()) ||
      a.breed.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'Todos' || a.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trazabilidad</h1>
          <p className="text-gray-400 text-sm mt-0.5">Registro de vida y genealogía de animales</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Agregar Animal
        </button>
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

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: animals.length },
          { label: 'Activos', value: animals.filter(a => a.status === 'Activo').length },
          { label: 'Madres', value: animals.filter(a => a.role === 'Madre').length },
          { label: 'En Ceba', value: animals.filter(a => a.role === 'Ceba').length },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-gray-500 text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50">
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
                  <td className="px-4 py-3 text-white font-medium">{animal.weight}</td>
                  <td className="px-4 py-3 text-gray-400">{animal.birthDate}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{animal.feedType}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(animal)}
                      className="text-gray-400 hover:text-brand-400 transition-colors p-1 rounded hover:bg-gray-700"
                    >
                      <Eye size={16} />
                    </button>
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

      {showForm && <AnimalForm onClose={() => setShowForm(false)} />}
      {selected && <AnimalDetail animal={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
