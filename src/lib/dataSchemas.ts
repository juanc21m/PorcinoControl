import type {
  Animal, FeedInventory, FeedType, EtapaProductiva, AnimalStatus, AnimalRole, HeatStatus,
  PurchaseInvoice, SaleInvoice,
} from '../types';
import { FEED_TYPES, ETAPAS, ZONE_DEFAULT_FEED } from '../types';

/**
 * Esquema CANÓNICO de columnas. Exportación e importación usan exactamente las
 * mismas cabeceras y orden → descargar, editar en Excel y volver a subir es
 * round-trip seguro.
 */

const GENDERS = ['Macho', 'Hembra'] as const;
const STATUSES: AnimalStatus[] = ['Activo', 'Despachado', 'Fallecido', 'Descarte/Matadero'];
const ROLES: AnimalRole[] = ['Madre', 'Padrote', 'Ceba'];
const HEATS: HeatStatus[] = ['En Celo', 'Inseminada', 'Embarazada', 'Lactante', 'Vacía', 'Abierta'];

const today = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// ANIMALES  (export ⇄ import)
// ---------------------------------------------------------------------------
export const ANIMAL_HEADERS = [
  'id', 'tag', 'gender', 'role', 'breed', 'birthDate', 'birthTime', 'weight',
  'etapaActual', 'feedType', 'dailyConsumption', 'status', 'heatStatus',
  'lastHeatDate', 'inseminationDate', 'expectedFarrowingDate', 'lastFarrowingDate',
  'lastWeaningDate', 'totalFarrowings', 'madre_id', 'padrote_id',
] as const;

export function animalToCSVRow(a: Animal): (string | number | undefined)[] {
  return [
    a.id, a.tag, a.gender, a.role ?? '', a.breed, a.birthDate, a.birthTime ?? '', a.weight,
    a.etapaActual, a.feedType, a.dailyConsumption, a.status, a.heatStatus ?? '',
    a.lastHeatDate ?? '', a.inseminationDate ?? '', a.expectedFarrowingDate ?? '', a.lastFarrowingDate ?? '',
    a.lastWeaningDate ?? '', a.totalFarrowings ?? 0, a.madre_id ?? '', a.padrote_id ?? '',
  ];
}

/** Convierte una fila CSV (cabeceras canónicas) en un Animal listo para upsert. */
export function parseAnimalRow(row: Record<string, string>): { animal?: Animal; error?: string } {
  const tag = (row.tag || '').trim();
  if (!tag) return { error: 'Falta "tag" (ID del cerdo).' };
  const gender = row.gender as Animal['gender'];
  if (!GENDERS.includes(gender)) return { error: `Género inválido "${row.gender}" (usa Macho u Hembra).` };

  const etapa = (ETAPAS as readonly string[]).includes(row.etapaActual)
    ? (row.etapaActual as EtapaProductiva) : 'Ceba';
  const feedType = (FEED_TYPES as readonly string[]).includes(row.feedType)
    ? (row.feedType as FeedType) : ZONE_DEFAULT_FEED[etapa];
  const status = STATUSES.includes(row.status as AnimalStatus) ? (row.status as AnimalStatus) : 'Activo';
  const role = ROLES.includes(row.role as AnimalRole) ? (row.role as AnimalRole) : undefined;
  const heatStatus = HEATS.includes(row.heatStatus as HeatStatus) ? (row.heatStatus as HeatStatus) : undefined;

  const birthDate = row.birthDate || today();
  const weight = Number(row.weight) || 0;

  const animal: Animal = {
    id: row.id || crypto.randomUUID(),
    tag,
    gender,
    role,
    breed: row.breed || '',
    birthDate,
    birthTime: row.birthTime || undefined,
    weight,
    etapaActual: etapa,
    feedType,
    dailyConsumption: Number(row.dailyConsumption) || 0,
    status,
    heatStatus,
    lastHeatDate: row.lastHeatDate || undefined,
    inseminationDate: row.inseminationDate || undefined,
    expectedFarrowingDate: row.expectedFarrowingDate || undefined,
    lastFarrowingDate: row.lastFarrowingDate || undefined,
    lastWeaningDate: row.lastWeaningDate || undefined,
    totalFarrowings: Number(row.totalFarrowings) || 0,
    madre_id: row.madre_id || undefined,
    padrote_id: row.padrote_id || undefined,
    weights: [{ date: birthDate, weight }],
    vaccinations: [],
    history: [{ date: today(), event: 'Importado masivamente' }],
  };
  return { animal };
}

// ---------------------------------------------------------------------------
// INVENTARIO de alimentos  (export ⇄ import)
// ---------------------------------------------------------------------------
export const INVENTORY_HEADERS = ['feedType', 'sacos', 'lb'] as const;

export function inventoryToCSVRows(inv: FeedInventory): (string | number)[][] {
  return FEED_TYPES.map(t => [t, inv[t].sacos, inv[t].lb]);
}

export function parseInventoryRow(row: Record<string, string>): { feedType?: FeedType; sacos?: number; lb?: number; error?: string } {
  const feedType = row.feedType as FeedType;
  if (!(FEED_TYPES as readonly string[]).includes(feedType)) {
    return { error: `Tipo de alimento inválido "${row.feedType}".` };
  }
  return { feedType, sacos: Number(row.sacos) || 0, lb: Number(row.lb) || 0 };
}

// ---------------------------------------------------------------------------
// Reportes de SOLO EXPORTACIÓN
// ---------------------------------------------------------------------------
export function buildWeightsCSV(animals: Animal[]): { headers: string[]; rows: (string | number)[][] } {
  const headers = ['animalTag', 'date', 'weight'];
  const rows: (string | number)[][] = [];
  for (const a of animals) for (const w of a.weights) rows.push([a.tag, w.date, w.weight]);
  return { headers, rows };
}

export function buildMortalityCSV(animals: Animal[]): { headers: string[]; rows: (string | number)[][] } {
  const headers = ['tag', 'gender', 'breed', 'birthDate', 'status', 'etapaActual'];
  const rows = animals
    .filter(a => a.status === 'Fallecido' || a.status === 'Descarte/Matadero')
    .map(a => [a.tag, a.gender, a.breed, a.birthDate, a.status, a.etapaActual]);
  return { headers, rows };
}

export function buildInvoicesCSV(purchases: PurchaseInvoice[], sales: SaleInvoice[]): { headers: string[]; rows: (string | number)[][] } {
  const headers = ['tipo', 'invoiceNumber', 'contraparte', 'date', 'totalAmount', 'status', 'metodoPago'];
  const rows: (string | number)[][] = [
    ...purchases.map(p => ['Compra', p.invoiceNumber, p.supplier, p.date, p.totalAmount, p.status, p.payment?.method ?? '']),
    ...sales.map(s => ['Venta', s.invoiceNumber, s.customer, s.date, s.totalAmount, s.status, s.payment?.method ?? '']),
  ];
  return { headers, rows };
}
