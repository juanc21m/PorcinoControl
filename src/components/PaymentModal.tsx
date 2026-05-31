import { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import type { PaymentMethod, PaymentInfo } from '../types';

interface Props {
  title: string;          // e.g. "Pagar Factura FAC-C-002" / "Cobrar Factura FAC-V-001"
  amount?: number;        // monto a mostrar (opcional)
  date: string;           // fecha por defecto (currentDate)
  onConfirm: (payment: PaymentInfo) => void;
  onClose: () => void;
}

const METHODS: PaymentMethod[] = ['Cheque', 'ACH', 'Efectivo', 'Otro'];

export default function PaymentModal({ title, amount, date, onConfirm, onClose }: Props) {
  const [method, setMethod] = useState<PaymentMethod>('Cheque');
  const [detail, setDetail] = useState('');
  const [payDate, setPayDate] = useState(date);

  function handleConfirm() {
    onConfirm({
      method,
      detail: detail.trim() || undefined,
      date: payDate,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <CreditCard size={18} className="text-brand-400" />
            ¿Método de Pago?
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-400 text-sm mb-5">{title}{typeof amount === 'number' ? ` · $${amount.toLocaleString()}` : ''}</p>

        <div className="space-y-4">
          <div>
            <label className="label">Método</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {METHODS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    method === m
                      ? 'bg-brand-800 border-brand-600 text-white shadow-glow'
                      : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {method === 'Otro' && (
            <div>
              <label className="label">Detalle del Pago</label>
              <input
                className="input"
                placeholder="Especifique el método / referencia"
                value={detail}
                onChange={e => setDetail(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {method === 'Cheque' && (
            <div>
              <label className="label">Nº de Cheque (opcional)</label>
              <input
                className="input"
                placeholder="Cheque #00123"
                value={detail}
                onChange={e => setDetail(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="label">Fecha de Pago</label>
            <input type="date" className="input" value={payDate} onChange={e => setPayDate(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="button" onClick={handleConfirm} className="btn-primary">Confirmar Pago</button>
        </div>
      </div>
    </div>
  );
}
