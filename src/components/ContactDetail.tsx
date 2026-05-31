import { X, Building2, Phone, MapPin, Mail, User, FileText } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { Contact } from '../types';

interface Props {
  contact: Contact;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  Pendiente: 'bg-yellow-500/20 text-yellow-400',
  Pagado:    'bg-green-500/20 text-green-400',
};

export default function ContactDetail({ contact, onClose }: Props) {
  const purchases = useAppStore(s => s.purchases);
  const sales = useAppStore(s => s.sales);

  const invoices = contact.type === 'Proveedor'
    ? purchases
        .filter(p => p.contactId === contact.id)
        .map(p => ({ id: p.id, number: p.invoiceNumber, date: p.date, amount: p.totalAmount, status: p.status, payment: p.payment }))
    : sales
        .filter(s => s.contactId === contact.id)
        .map(s => ({ id: s.id, number: s.invoiceNumber, date: s.date, amount: s.totalAmount, status: s.status, payment: s.payment }));

  const totalPending = invoices.filter(i => i.status === 'Pendiente').reduce((acc, i) => acc + i.amount, 0);

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-gray-900 border-l border-gray-800 z-40 overflow-y-auto">
      <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">{contact.commercialName}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${contact.type === 'Cliente' ? 'bg-blue-500/20 text-blue-400' : 'bg-brand-800/30 text-brand-400'}`}>
            {contact.type}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Datos generales */}
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2 text-gray-300"><Building2 size={15} className="text-gray-500" /> {contact.legalName}</div>
          <div className="flex items-center gap-2 text-gray-300"><FileText size={15} className="text-gray-500" /> RUC: {contact.ruc}</div>
          <div className="flex items-center gap-2 text-gray-300"><Phone size={15} className="text-gray-500" /> {contact.phone}</div>
          <div className="flex items-center gap-2 text-gray-300"><MapPin size={15} className="text-gray-500" /> {contact.location}</div>
          {contact.email && <div className="flex items-center gap-2 text-gray-300"><Mail size={15} className="text-gray-500" /> {contact.email}</div>}
          {contact.contactPerson && <div className="flex items-center gap-2 text-gray-300"><User size={15} className="text-gray-500" /> {contact.contactPerson}</div>}
        </div>

        {/* Facturas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <FileText size={15} className="text-brand-400" /> Facturas
            </h3>
            {totalPending > 0 && (
              <span className="text-xs text-yellow-400">Pendiente: ${totalPending.toLocaleString()}</span>
            )}
          </div>
          {invoices.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin facturas registradas.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map(inv => (
                <div key={inv.id} className="bg-gray-800/40 border border-gray-800 rounded-lg px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-brand-400 text-sm">{inv.number}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {inv.date}{inv.payment ? ` · ${inv.payment.method}${inv.payment.detail ? ` (${inv.payment.detail})` : ''}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">${inv.amount.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[inv.status]}`}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
