import { useMemo, useState } from 'react';
import { Plus, ShoppingCart, TrendingUp, Calculator, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import PaymentModal from '../components/PaymentModal';
import type { FeedType, PaymentInfo, PurchaseItem } from '../types';

const LB_PER_SACO = 35;

interface PayTarget {
  type: 'purchase' | 'sale';
  id: string;
  title: string;
  amount: number;
}

type Tab = 'purchases' | 'sales' | 'cashflow';

const statusColors: Record<string, string> = {
  Pendiente: 'bg-yellow-500/20 text-yellow-400',
  Pagado:    'bg-green-500/20 text-green-400',
};

interface ItemRow {
  feedType: FeedType;
  sacosQty: string;
  pricePerSaco: string;
}

const emptyRow = (): ItemRow => ({ feedType: 'Crecimiento', sacosQty: '', pricePerSaco: '' });

// ---- Purchase Form ----
function PurchaseForm({ onClose }: { onClose: () => void }) {
  const addPurchase = useAppStore(s => s.addPurchase);
  const contacts = useAppStore(s => s.contacts);
  const suppliers = contacts.filter(c => c.type === 'Proveedor');

  const [contactId, setContactId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);

  const addRow = () => setRows(r => [...r, emptyRow()]);
  const removeRow = (i: number) => setRows(r => (r.length === 1 ? r : r.filter((_, idx) => idx !== i)));
  const updateRow = (i: number, patch: Partial<ItemRow>) =>
    setRows(r => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const subtotal = (row: ItemRow) => (parseFloat(row.sacosQty || '0') || 0) * (parseFloat(row.pricePerSaco || '0') || 0);
  const totalSacos = rows.reduce((acc, r) => acc + (parseInt(r.sacosQty || '0') || 0), 0);
  const totalLbs = totalSacos * LB_PER_SACO;
  const totalAmount = rows.reduce((acc, r) => acc + subtotal(r), 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const supplier = suppliers.find(c => c.id === contactId);
    if (!supplier || !invoiceNumber.trim() || !date) return;

    const items: PurchaseItem[] = rows
      .filter(r => parseInt(r.sacosQty || '0') > 0)
      .map(r => ({
        feedType: r.feedType,
        sacosQty: parseInt(r.sacosQty),
        pricePerSaco: parseFloat(r.pricePerSaco || '0') || 0,
      }));
    if (items.length === 0) return;

    addPurchase({
      supplier: supplier.commercialName,
      contactId: supplier.id,
      invoiceNumber: invoiceNumber.trim(),
      date,
      time: time || undefined,
      items,
      totalSacos,
      totalLbs,
      totalAmount,
      status: 'Pendiente',
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-white font-semibold text-lg mb-5">Nueva Factura de Compra</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Proveedor</label>
              <select className="input" value={contactId} onChange={e => setContactId(e.target.value)} required>
                <option value="" disabled>Seleccionar proveedor…</option>
                {suppliers.map(c => <option key={c.id} value={c.id}>{c.commercialName}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Número de Factura</label>
              <input type="text" className="input" placeholder="FAC-C-001" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de Factura</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Hora de Entrega</label>
              <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          {/* Items dinámicos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Alimentos</label>
              <button type="button" onClick={addRow} className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1">
                <Plus size={14} /> Agregar Alimento
              </button>
            </div>
            <div className="bg-gray-800/30 border border-gray-800 rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50 text-gray-400">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Tipo Alimento</th>
                    <th className="text-left px-3 py-2 font-medium">Cantidad</th>
                    <th className="text-left px-3 py-2 font-medium">Peso/Saco</th>
                    <th className="text-left px-3 py-2 font-medium">Precio/Saco</th>
                    <th className="text-left px-3 py-2 font-medium">Subtotal</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t border-gray-800">
                      <td className="px-3 py-2">
                        <select
                          className="input !py-1.5"
                          value={row.feedType}
                          onChange={e => updateRow(i, { feedType: e.target.value as FeedType })}
                        >
                          <option>Crecimiento</option>
                          <option>Engorde</option>
                          <option>Lactancia</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min="0" className="input !py-1.5 !w-24" placeholder="50"
                          value={row.sacosQty}
                          onChange={e => updateRow(i, { sacosQty: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">35 lb</td>
                      <td className="px-3 py-2">
                        <input
                          type="number" step="0.01" min="0" className="input !py-1.5 !w-28" placeholder="25.00"
                          value={row.pricePerSaco}
                          onChange={e => updateRow(i, { pricePerSaco: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2 text-white font-medium whitespace-nowrap">${subtotal(row).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button" onClick={() => removeRow(i)}
                          className="text-gray-500 hover:text-red-400 disabled:opacity-30"
                          disabled={rows.length === 1}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen automático */}
          <div className="bg-brand-800/10 border border-brand-800/30 rounded-lg px-4 py-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Total Sacos</p>
              <p className="text-white font-semibold">{totalSacos}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Total Libras</p>
              <p className="text-white font-semibold">{totalLbs.toLocaleString()} lb</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Total Factura</p>
              <p className="text-brand-400 font-bold text-base">${totalAmount.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Sale Form ----
function SaleForm({ onClose }: { onClose: () => void }) {
  const addSale = useAppStore(s => s.addSale);
  const contacts = useAppStore(s => s.contacts);
  const customers = contacts.filter(c => c.type === 'Cliente');

  const [form, setForm] = useState({
    contactId: '', invoiceNumber: '', date: '', time: '',
    pigCount: '', totalWeightLbs: '', totalAmount: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const customer = customers.find(c => c.id === form.contactId);
    if (!customer || !form.invoiceNumber.trim() || !form.date) return;
    addSale({
      customer: customer.commercialName,
      contactId: customer.id,
      invoiceNumber: form.invoiceNumber.trim(),
      date: form.date,
      time: form.time || undefined,
      pigCount: parseInt(form.pigCount || '0') || 0,
      totalWeightLbs: parseFloat(form.totalWeightLbs || '0') || 0,
      totalAmount: parseFloat(form.totalAmount || '0') || 0,
      status: 'Pendiente',
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-white font-semibold text-lg mb-5">Nueva Factura de Venta</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cliente</label>
              <select className="input" value={form.contactId} onChange={e => setForm({ ...form, contactId: e.target.value })} required>
                <option value="" disabled>Seleccionar cliente…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.commercialName}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Número de Factura</label>
              <input type="text" className="input" placeholder="FAC-V-001" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de Venta</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <label className="label">Hora de Venta</label>
              <input type="time" className="input" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Cantidad de Cerdos</label>
              <input type="number" min="0" className="input" placeholder="20" value={form.pigCount} onChange={e => setForm({ ...form, pigCount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Peso Total (lb)</label>
              <input type="number" min="0" className="input" placeholder="4600" value={form.totalWeightLbs} onChange={e => setForm({ ...form, totalWeightLbs: e.target.value })} required />
            </div>
            <div>
              <label className="label">Total Factura ($)</label>
              <input type="number" step="0.01" min="0" className="input" placeholder="5000.00" value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: e.target.value })} required />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function Finances() {
  const [tab, setTab] = useState<Tab>('purchases');
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  const { purchases, sales, payInvoice, unpayInvoice, currentDate } = useAppStore();

  const handleStatusClick = (target: PayTarget, status: 'Pendiente' | 'Pagado') => {
    if (status === 'Pendiente') setPayTarget(target);
    else unpayInvoice(target.type, target.id);
  };

  const handleConfirmPayment = (payment: PaymentInfo) => {
    if (payTarget) payInvoice(payTarget.type, payTarget.id, payment);
  };

  const totalBilled = useMemo(() => sales.reduce((s, i) => s + i.totalAmount, 0), [sales]);
  const totalCollected = useMemo(() => sales.filter(s => s.status === 'Pagado').reduce((s, i) => s + i.totalAmount, 0), [sales]);
  const totalSpent = useMemo(() => purchases.reduce((s, p) => s + p.totalAmount, 0), [purchases]);
  const deviation = totalBilled > 0 ? ((totalBilled - totalCollected) / totalBilled) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Finanzas</h1>
        <p className="text-gray-400 text-sm mt-0.5">Libro mayor y control de inventarios</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {([
          { key: 'purchases', label: 'Compras Alimento', icon: ShoppingCart },
          { key: 'sales',     label: 'Ventas',           icon: TrendingUp },
          { key: 'cashflow',  label: 'Cuadre de Caja',   icon: Calculator },
        ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-brand-800 text-white shadow-glow' : 'text-gray-400 hover:text-white'}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Tab: Purchases */}
      {tab === 'purchases' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowPurchaseForm(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Nueva Compra
            </button>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr className="text-gray-400">
                  <th className="text-left px-4 py-3">Factura</th>
                  <th className="text-left px-4 py-3">Proveedor</th>
                  <th className="text-left px-4 py-3">Alimentos</th>
                  <th className="text-left px-4 py-3">Sacos</th>
                  <th className="text-left px-4 py-3">Libras</th>
                  <th className="text-left px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">Sin compras registradas.</td></tr>
                ) : purchases.map(p => (
                  <tr key={p.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-brand-400">{p.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-300">{p.supplier}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{p.items.map(it => `${it.feedType} ×${it.sacosQty}`).join(', ')}</td>
                    <td className="px-4 py-3 text-white">{p.totalSacos}</td>
                    <td className="px-4 py-3 text-gray-300">{p.totalLbs.toLocaleString()} lb</td>
                    <td className="px-4 py-3 text-white font-semibold">${p.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400">{p.date}{p.time ? ` · ${p.time}` : ''}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleStatusClick({ type: 'purchase', id: p.id, title: `Pagar Factura ${p.invoiceNumber} · ${p.supplier}`, amount: p.totalAmount }, p.status)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusColors[p.status]}`}
                      >
                        {p.status === 'Pendiente' ? <ToggleLeft size={12} /> : <ToggleRight size={12} />}
                        {p.status === 'Pendiente' ? 'Pagar' : p.status}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Sales */}
      {tab === 'sales' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowSaleForm(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Nueva Venta
            </button>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr className="text-gray-400">
                  <th className="text-left px-4 py-3">Factura</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Cerdos</th>
                  <th className="text-left px-4 py-3">Peso (lb)</th>
                  <th className="text-left px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Sin ventas registradas.</td></tr>
                ) : sales.map(s => (
                  <tr key={s.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-brand-400">{s.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-300">{s.customer}</td>
                    <td className="px-4 py-3 text-white">{s.pigCount}</td>
                    <td className="px-4 py-3 text-white">{s.totalWeightLbs.toLocaleString()}</td>
                    <td className="px-4 py-3 text-white font-semibold">${s.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400">{s.date}{s.time ? ` · ${s.time}` : ''}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleStatusClick({ type: 'sale', id: s.id, title: `Cobrar Factura ${s.invoiceNumber} · ${s.customer}`, amount: s.totalAmount }, s.status)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusColors[s.status]}`}
                      >
                        {s.status === 'Pendiente' ? <ToggleLeft size={12} /> : <ToggleRight size={12} />}
                        {s.status === 'Pendiente' ? 'Cobrar' : s.status}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Cash Flow */}
      {tab === 'cashflow' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Facturado (Ventas)', value: `$${totalBilled.toLocaleString()}`, color: 'text-white' },
              { label: 'Total Cobrado', value: `$${totalCollected.toLocaleString()}`, color: 'text-green-400' },
              { label: 'Pendiente por Cobrar', value: `$${(totalBilled - totalCollected).toLocaleString()}`, color: 'text-yellow-400' },
              { label: 'Total Gastado (Compras)', value: `$${totalSpent.toLocaleString()}`, color: 'text-red-400' },
            ].map(card => (
              <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-2">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Resumen Financiero</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-gray-400">Margen Bruto</span>
                <span className="text-white font-semibold">${(totalCollected - totalSpent).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-gray-400">Desvío de Cobranza</span>
                <span className={`font-semibold ${deviation > 5 ? 'text-red-400' : 'text-green-400'}`}>{deviation.toFixed(1)}%</span>
              </div>
              {deviation > 5 && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                  ⚠️ Desvío superior al 5% — revisar facturas pendientes de cobro.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPurchaseForm && <PurchaseForm onClose={() => setShowPurchaseForm(false)} />}
      {showSaleForm && <SaleForm onClose={() => setShowSaleForm(false)} />}
      {payTarget && (
        <PaymentModal
          title={payTarget.title}
          amount={payTarget.amount}
          date={currentDate}
          onConfirm={handleConfirmPayment}
          onClose={() => setPayTarget(null)}
        />
      )}
    </div>
  );
}
