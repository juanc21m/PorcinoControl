import { useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { ContactType } from '../types';

interface Props {
  defaultType?: ContactType;
  onClose: () => void;
}

export default function ContactForm({ defaultType = 'Cliente', onClose }: Props) {
  const addContact = useAppStore(s => s.addContact);
  const [form, setForm] = useState({
    commercialName: '',
    legalName: '',
    ruc: '',
    phone: '',
    location: '',
    email: '',
    contactPerson: '',
    type: defaultType as ContactType,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addContact({
      commercialName: form.commercialName.trim(),
      legalName: form.legalName.trim(),
      ruc: form.ruc.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      email: form.email.trim() || undefined,
      contactPerson: form.contactPerson.trim() || undefined,
      type: form.type,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg">Nuevo Contacto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Tipo de Contacto</label>
            <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ContactType })}>
              <option>Cliente</option>
              <option>Proveedor</option>
            </select>
          </div>
          <div>
            <label className="label">Nombre Comercial</label>
            <input className="input" placeholder="Embutidora X" value={form.commercialName} onChange={e => setForm({ ...form, commercialName: e.target.value })} required />
          </div>
          <div>
            <label className="label">Nombre Legal (Razón Social)</label>
            <input className="input" placeholder="Embutidora X, S.A." value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} required />
          </div>
          <div>
            <label className="label">RUC</label>
            <input className="input" placeholder="1-234-567" value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} required />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" placeholder="6000-0000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div className="col-span-2">
            <label className="label">Ubicación</label>
            <input className="input" placeholder="Panamá, Vía España" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email (opcional)</label>
            <input type="email" className="input" placeholder="ventas@empresa.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Persona de Contacto (opcional)</label>
            <input className="input" placeholder="Luis Pérez" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
          </div>
          <div className="col-span-2 flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Guardar Contacto</button>
          </div>
        </form>
      </div>
    </div>
  );
}
