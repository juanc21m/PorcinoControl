import { useRef, useState } from 'react';
import { FileSpreadsheet, Download, Upload, FileDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../context/AuthContext';
import { toCSV, parseCSV, downloadCSV } from '../lib/csv';
import {
  ANIMAL_HEADERS, animalToCSVRow, parseAnimalRow,
  INVENTORY_HEADERS, inventoryToCSVRows, parseInventoryRow,
  buildWeightsCSV, buildMortalityCSV, buildInvoicesCSV,
} from '../lib/dataSchemas';
import type { Animal, FeedType } from '../types';

const inRange = (date: string | undefined, from: string, to: string) => {
  if (!date) return true;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
};

interface ImportResult { label: string; total: number; ok: number; errors: string[]; }

export default function Reports() {
  const { isAdmin } = useAuth();
  const animals = useAppStore(s => s.animals);
  const inventory = useAppStore(s => s.inventory);
  const purchases = useAppStore(s => s.purchases);
  const sales = useAppStore(s => s.sales);
  const importAnimals = useAppStore(s => s.importAnimals);
  const importInventory = useAppStore(s => s.importInventory);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  const animalsRef = useRef<HTMLInputElement>(null);
  const inventoryRef = useRef<HTMLInputElement>(null);

  // -------- Exportaciones --------
  const exportAnimals = () => {
    const rows = animals.filter(a => inRange(a.birthDate, from, to)).map(animalToCSVRow);
    downloadCSV('animales.csv', toCSV([...ANIMAL_HEADERS], rows));
  };
  const exportWeights = () => {
    const { headers, rows } = buildWeightsCSV(animals);
    downloadCSV('historial_pesos.csv', toCSV(headers, rows.filter(r => inRange(String(r[1]), from, to))));
  };
  const exportMortality = () => {
    const { headers, rows } = buildMortalityCSV(animals.filter(a => inRange(a.birthDate, from, to)));
    downloadCSV('mortalidad.csv', toCSV(headers, rows));
  };
  const exportInventory = () => {
    downloadCSV('inventario.csv', toCSV([...INVENTORY_HEADERS], inventoryToCSVRows(inventory)));
  };
  const exportInvoices = () => {
    const { headers, rows } = buildInvoicesCSV(
      purchases.filter(p => inRange(p.date, from, to)),
      sales.filter(s => inRange(s.date, from, to)),
    );
    downloadCSV('facturas.csv', toCSV(headers, rows));
  };

  // -------- Plantillas --------
  const templateAnimals = () => downloadCSV('plantilla_animales.csv', toCSV([...ANIMAL_HEADERS], []));
  const templateInventory = () => downloadCSV('plantilla_inventario.csv', toCSV([...INVENTORY_HEADERS], inventoryToCSVRows(inventory)));

  // -------- Importaciones --------
  async function handleImportAnimals(file: File) {
    const rows = parseCSV(await file.text());
    const ok: Animal[] = [];
    const errors: string[] = [];
    rows.forEach((r, i) => {
      const { animal, error } = parseAnimalRow(r);
      if (animal) ok.push(animal);
      else errors.push(`Fila ${i + 2}: ${error}`);
    });
    if (ok.length) importAnimals(ok);
    setResult({ label: 'Animales', total: rows.length, ok: ok.length, errors });
  }

  async function handleImportInventory(file: File) {
    const rows = parseCSV(await file.text());
    const ok: { feedType: FeedType; sacos: number; lb: number }[] = [];
    const errors: string[] = [];
    rows.forEach((r, i) => {
      const { feedType, sacos, lb, error } = parseInventoryRow(r);
      if (feedType) ok.push({ feedType, sacos: sacos ?? 0, lb: lb ?? 0 });
      else errors.push(`Fila ${i + 2}: ${error}`);
    });
    if (ok.length) importInventory(ok);
    setResult({ label: 'Inventario', total: rows.length, ok: ok.length, errors });
  }

  const ExportBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className="btn-secondary flex items-center gap-2 justify-center">
      <Download size={15} /> {children}
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileSpreadsheet size={22} className="text-brand-400" /> Reportes e Importación
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Exporta toda tu data a CSV (Excel) y carga información de forma masiva</p>
      </div>

      {/* Exportación */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Download size={16} className="text-brand-400" /> Exportar (CSV / Excel)</h3>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input !w-auto" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input !w-auto" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <p className="text-gray-500 text-xs pb-2">Filtro por fecha (nacimiento / fecha de factura). Vacío = todo.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <ExportBtn onClick={exportAnimals}>Animales</ExportBtn>
          <ExportBtn onClick={exportWeights}>Historial Pesos</ExportBtn>
          <ExportBtn onClick={exportMortality}>Mortalidad</ExportBtn>
          <ExportBtn onClick={exportInventory}>Inventario</ExportBtn>
          <ExportBtn onClick={exportInvoices}>Facturas</ExportBtn>
        </div>
      </div>

      {/* Importación (solo admin) */}
      {isAdmin ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-1 flex items-center gap-2"><Upload size={16} className="text-brand-400" /> Importación Masiva</h3>
          <p className="text-gray-500 text-sm mb-4">
            Descarga la plantilla, llénala en Excel y súbela. Las columnas son <b>idénticas</b> a las de exportación:
            puedes exportar, editar y volver a subir. Los animales se actualizan por <code className="text-gray-300">id</code> (déjalo vacío para crear nuevos).
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Animales */}
            <div className="bg-gray-800/40 border border-gray-800 rounded-lg p-4 space-y-3">
              <h4 className="text-white font-medium">Animales</h4>
              <button onClick={templateAnimals} className="btn-secondary w-full flex items-center justify-center gap-2"><FileDown size={15} /> Descargar Plantilla CSV</button>
              <button onClick={() => animalsRef.current?.click()} className="btn-primary w-full flex items-center justify-center gap-2"><Upload size={15} /> Subir Archivo</button>
              <input ref={animalsRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImportAnimals(f); e.target.value = ''; }} />
            </div>
            {/* Inventario */}
            <div className="bg-gray-800/40 border border-gray-800 rounded-lg p-4 space-y-3">
              <h4 className="text-white font-medium">Inventario de Alimentos</h4>
              <button onClick={templateInventory} className="btn-secondary w-full flex items-center justify-center gap-2"><FileDown size={15} /> Descargar Plantilla CSV</button>
              <button onClick={() => inventoryRef.current?.click()} className="btn-primary w-full flex items-center justify-center gap-2"><Upload size={15} /> Subir Archivo</button>
              <input ref={inventoryRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImportInventory(f); e.target.value = ''; }} />
            </div>
          </div>

          {/* Resultado */}
          {result && (
            <div className="mt-4 bg-gray-950 border border-gray-800 rounded-lg p-4">
              <p className="flex items-center gap-2 text-sm">
                {result.errors.length === 0
                  ? <CheckCircle2 size={16} className="text-green-400" />
                  : <AlertTriangle size={16} className="text-yellow-400" />}
                <span className="text-white font-medium">{result.label}:</span>
                <span className="text-gray-300">{result.ok} de {result.total} fila(s) importadas correctamente.</span>
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-red-400 space-y-0.5">
                  {result.errors.slice(0, 50).map((e, i) => <li key={i}>• {e}</li>)}
                  {result.errors.length > 50 && <li>…y {result.errors.length - 50} más.</li>}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-sm text-gray-400">
          La importación masiva está disponible solo para administradores.
        </div>
      )}
    </div>
  );
}
