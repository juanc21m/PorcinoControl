import { useState } from 'react';
import { Plus, Users, Truck } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import ContactForm from '../components/ContactForm';
import ContactDetail from '../components/ContactDetail';
import type { Contact, ContactType } from '../types';

export default function Contacts() {
  const contacts = useAppStore(s => s.contacts);
  const [tab, setTab] = useState<ContactType>('Cliente');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Contact | null>(null);

  const filtered = contacts.filter(c => c.type === tab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contactos</h1>
          <p className="text-gray-400 text-sm mt-0.5">Directorio de clientes y proveedores</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo Contacto
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {([
          { key: 'Cliente' as ContactType, label: 'Clientes', icon: Users },
          { key: 'Proveedor' as ContactType, label: 'Proveedores', icon: Truck },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-brand-800 text-white shadow-glow' : 'text-gray-400 hover:text-white'}`}
          >
            <Icon size={15} /> {label}
            <span className="text-xs opacity-70">({contacts.filter(c => c.type === key).length})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary-800/40">
            <tr className="text-gray-400">
              <th className="text-left px-4 py-3">Nombre Comercial</th>
              <th className="text-left px-4 py-3">RUC</th>
              <th className="text-left px-4 py-3">Teléfono</th>
              <th className="text-left px-4 py-3">Ubicación</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No hay {tab === 'Cliente' ? 'clientes' : 'proveedores'} registrados.
                </td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="border-t border-gray-800 hover:bg-gray-800/30 cursor-pointer"
                >
                  <td className="px-4 py-3 text-white font-medium">{c.commercialName}</td>
                  <td className="px-4 py-3 text-gray-300 font-mono">{c.ruc}</td>
                  <td className="px-4 py-3 text-gray-300">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-400">{c.location}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && <ContactForm defaultType={tab} onClose={() => setShowForm(false)} />}
      {selected && <ContactDetail contact={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
