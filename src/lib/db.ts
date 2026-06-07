import { supabase } from './supabase';
import { FEED_TYPES } from '../types';
import type {
  Animal,
  Contact,
  PurchaseInvoice,
  SaleInvoice,
  FeedInventory,
  FeedType,
  InventoryTransaction,
  Supply,
  SemenBatch,
} from '../types';

/**
 * Capa de acceso a datos (Supabase).
 *
 * La base de datos usa columnas en snake_case (esquema canónico); la app usa
 * camelCase. Todos los mapeos viven aquí para que el resto del código nunca
 * vea nombres de columnas crudos.
 */

// ---------------------------------------------------------------------------
// Helpers de mapeo
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

/** Quita claves con valor `undefined` (Supabase prefiere null/omisión). */
function clean<T extends Row>(obj: T): T {
  const out = {} as T;
  for (const k in obj) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

// ---- Animal ----
function animalToRow(a: Animal): Row {
  return clean({
    id: a.id,
    tag: a.tag,
    role: a.role ?? null,
    gender: a.gender,
    breed: a.breed,
    birth_date: a.birthDate,
    birth_time: a.birthTime ?? null,
    weight: a.weight,
    etapa_actual: a.etapaActual,
    feed_type: a.feedType,
    daily_consumption: a.dailyConsumption,
    status: a.status,
    heat_status: a.heatStatus ?? null,
    last_heat_date: a.lastHeatDate ?? null,
    insemination_date: a.inseminationDate ?? null,
    expected_farrowing_date: a.expectedFarrowingDate ?? null,
    last_farrowing_date: a.lastFarrowingDate ?? null,
    last_weaning_date: a.lastWeaningDate ?? null,
    total_farrowings: a.totalFarrowings ?? 0,
    madre_id: a.madre_id ?? null,
    padrote_id: a.padrote_id ?? null,
    weights: a.weights,
    vaccinations: a.vaccinations,
    history: a.history,
  });
}

function rowToAnimal(r: Row): Animal {
  return {
    id: r.id as string,
    tag: r.tag as string,
    role: (r.role as Animal['role']) ?? undefined,
    gender: r.gender as Animal['gender'],
    breed: r.breed as string,
    birthDate: r.birth_date as string,
    birthTime: (r.birth_time as string) ?? undefined,
    weight: Number(r.weight),
    etapaActual: r.etapa_actual as Animal['etapaActual'],
    feedType: r.feed_type as FeedType,
    dailyConsumption: Number(r.daily_consumption),
    status: r.status as Animal['status'],
    heatStatus: (r.heat_status as Animal['heatStatus']) ?? undefined,
    lastHeatDate: (r.last_heat_date as string) ?? undefined,
    inseminationDate: (r.insemination_date as string) ?? undefined,
    expectedFarrowingDate: (r.expected_farrowing_date as string) ?? undefined,
    lastFarrowingDate: (r.last_farrowing_date as string) ?? undefined,
    lastWeaningDate: (r.last_weaning_date as string) ?? undefined,
    totalFarrowings: (r.total_farrowings as number) ?? undefined,
    madre_id: (r.madre_id as string) ?? undefined,
    padrote_id: (r.padrote_id as string) ?? undefined,
    weights: (r.weights as Animal['weights']) ?? [],
    vaccinations: (r.vaccinations as Animal['vaccinations']) ?? [],
    history: (r.history as Animal['history']) ?? [],
  };
}

/** Mapea un parche parcial de Animal (camelCase) a columnas snake_case. */
const ANIMAL_COL: Record<string, string> = {
  tag: 'tag', role: 'role', gender: 'gender', breed: 'breed',
  birthDate: 'birth_date', birthTime: 'birth_time', weight: 'weight', etapaActual: 'etapa_actual',
  feedType: 'feed_type', dailyConsumption: 'daily_consumption', status: 'status',
  heatStatus: 'heat_status', lastHeatDate: 'last_heat_date',
  inseminationDate: 'insemination_date', expectedFarrowingDate: 'expected_farrowing_date',
  lastFarrowingDate: 'last_farrowing_date', lastWeaningDate: 'last_weaning_date',
  totalFarrowings: 'total_farrowings', madre_id: 'madre_id', padrote_id: 'padrote_id',
  weights: 'weights', vaccinations: 'vaccinations', history: 'history',
};

function animalChangesToRow(changes: Partial<Animal>): Row {
  const row: Row = {};
  for (const [k, v] of Object.entries(changes)) {
    const col = ANIMAL_COL[k];
    if (col) row[col] = v ?? null;
  }
  return row;
}

// ---- Contact ----
function contactToRow(c: Contact): Row {
  return clean({
    id: c.id,
    commercial_name: c.commercialName,
    legal_name: c.legalName,
    ruc: c.ruc,
    phone: c.phone,
    location: c.location,
    email: c.email ?? null,
    contact_person: c.contactPerson ?? null,
    type: c.type,
  });
}

function rowToContact(r: Row): Contact {
  return {
    id: r.id as string,
    commercialName: r.commercial_name as string,
    legalName: r.legal_name as string,
    ruc: r.ruc as string,
    phone: r.phone as string,
    location: r.location as string,
    email: (r.email as string) ?? undefined,
    contactPerson: (r.contact_person as string) ?? undefined,
    type: r.type as Contact['type'],
  };
}

// ---- PurchaseInvoice ----
function purchaseToRow(p: PurchaseInvoice): Row {
  return clean({
    id: p.id,
    invoice_number: p.invoiceNumber,
    supplier: p.supplier,
    contact_id: p.contactId ?? null,
    date: p.date,
    time: p.time ?? null,
    items: p.items,
    total_sacos: p.totalSacos,
    total_lbs: p.totalLbs,
    total_amount: p.totalAmount,
    status: p.status,
    payment: p.payment ?? null,
  });
}

function rowToPurchase(r: Row): PurchaseInvoice {
  return {
    id: r.id as string,
    invoiceNumber: r.invoice_number as string,
    supplier: r.supplier as string,
    contactId: (r.contact_id as string) ?? undefined,
    date: r.date as string,
    time: (r.time as string) ?? undefined,
    items: (r.items as PurchaseInvoice['items']) ?? [],
    totalSacos: Number(r.total_sacos),
    totalLbs: Number(r.total_lbs),
    totalAmount: Number(r.total_amount),
    status: r.status as PurchaseInvoice['status'],
    payment: (r.payment as PurchaseInvoice['payment']) ?? undefined,
  };
}

// ---- SaleInvoice ----
function saleToRow(s: SaleInvoice): Row {
  return clean({
    id: s.id,
    invoice_number: s.invoiceNumber,
    customer: s.customer,
    contact_id: s.contactId ?? null,
    date: s.date,
    time: s.time ?? null,
    pig_count: s.pigCount,
    pig_tags: s.pigTags ?? [],
    total_weight_lbs: s.totalWeightLbs,
    total_amount: s.totalAmount,
    status: s.status,
    payment: s.payment ?? null,
  });
}

function rowToSale(r: Row): SaleInvoice {
  return {
    id: r.id as string,
    invoiceNumber: r.invoice_number as string,
    customer: r.customer as string,
    contactId: (r.contact_id as string) ?? undefined,
    date: r.date as string,
    time: (r.time as string) ?? undefined,
    pigCount: Number(r.pig_count),
    pigTags: (r.pig_tags as string[]) ?? [],
    totalWeightLbs: Number(r.total_weight_lbs),
    totalAmount: Number(r.total_amount),
    status: r.status as SaleInvoice['status'],
    payment: (r.payment as SaleInvoice['payment']) ?? undefined,
  };
}

// ---- InventoryTransaction ----
function txToRow(t: InventoryTransaction): Row {
  return clean({
    id: t.id,
    date: t.date,
    feed_type: t.feedType,
    operation: t.operation,
    sacos: t.sacos ?? null,
    lb: t.lb,
    note: t.note ?? null,
  });
}

function rowToTx(r: Row): InventoryTransaction {
  return {
    id: r.id as string,
    date: r.date as string,
    feedType: r.feed_type as FeedType,
    operation: r.operation as InventoryTransaction['operation'],
    sacos: (r.sacos as number) ?? undefined,
    lb: Number(r.lb),
    note: (r.note as string) ?? undefined,
  };
}

// ---- Supply (insumos) ----
function supplyToRow(s: Supply): Row {
  return clean({
    id: s.id,
    name: s.name,
    brand: s.brand ?? null,
    quantity: s.quantity,
    min_stock: s.minStock,
  });
}

function rowToSupply(r: Row): Supply {
  return {
    id: r.id as string,
    name: r.name as string,
    brand: (r.brand as string) ?? undefined,
    quantity: Number(r.quantity),
    minStock: Number(r.min_stock),
  };
}

// ---- SemenBatch (pajillas por lote de extracción) ----
function semenToRow(s: SemenBatch): Row {
  return clean({
    id: s.id,
    padrote_id: s.padroteId,
    padrote_tag: s.padroteTag,
    date: s.date,
    straws_total: s.strawsTotal,
    straws_available: s.strawsAvailable,
    note: s.note ?? null,
  });
}

function rowToSemen(r: Row): SemenBatch {
  return {
    id: r.id as string,
    padroteId: r.padrote_id as string,
    padroteTag: r.padrote_tag as string,
    date: r.date as string,
    strawsTotal: Number(r.straws_total),
    strawsAvailable: Number(r.straws_available),
    note: (r.note as string) ?? undefined,
  };
}

function rowsToInventory(rows: Row[]): FeedInventory {
  const inv = Object.fromEntries(
    FEED_TYPES.map(t => [t, { sacos: 0, lb: 0 }]),
  ) as FeedInventory;
  for (const r of rows) {
    const ft = r.feed_type as FeedType;
    if (FEED_TYPES.includes(ft)) inv[ft] = { sacos: Number(r.sacos), lb: Number(r.lb) };
  }
  return inv;
}

// ---------------------------------------------------------------------------
// Lectura inicial (SELECT)
// ---------------------------------------------------------------------------

export interface AllData {
  animals: Animal[];
  contacts: Contact[];
  purchases: PurchaseInvoice[];
  sales: SaleInvoice[];
  inventory: FeedInventory;
  inventoryHistory: InventoryTransaction[];
  supplies: Supply[];
  semenBatches: SemenBatch[];
}

export async function fetchAllData(): Promise<AllData> {
  const [animalsRes, contactsRes, purchasesRes, salesRes, invRes, txRes, suppliesRes, semenRes] = await Promise.all([
    supabase.from('animals').select('*').order('created_at', { ascending: true }),
    supabase.from('contacts').select('*').order('created_at', { ascending: true }),
    supabase.from('purchase_invoices').select('*').order('date', { ascending: false }),
    supabase.from('sale_invoices').select('*').order('date', { ascending: false }),
    supabase.from('feed_inventory').select('*'),
    supabase.from('inventory_transactions').select('*').order('date', { ascending: false }),
    supabase.from('supplies').select('*').order('name', { ascending: true }),
    supabase.from('semen_batches').select('*').order('date', { ascending: false }),
  ]);

  const firstError =
    animalsRes.error || contactsRes.error || purchasesRes.error ||
    salesRes.error || invRes.error || txRes.error || suppliesRes.error || semenRes.error;
  if (firstError) throw firstError;

  return {
    animals: (animalsRes.data ?? []).map(rowToAnimal),
    contacts: (contactsRes.data ?? []).map(rowToContact),
    purchases: (purchasesRes.data ?? []).map(rowToPurchase),
    sales: (salesRes.data ?? []).map(rowToSale),
    inventory: rowsToInventory(invRes.data ?? []),
    inventoryHistory: (txRes.data ?? []).map(rowToTx),
    supplies: (suppliesRes.data ?? []).map(rowToSupply),
    semenBatches: (semenRes.data ?? []).map(rowToSemen),
  };
}

// ---------------------------------------------------------------------------
// Escritura (INSERT / UPDATE)
// ---------------------------------------------------------------------------

export async function insertAnimal(a: Animal): Promise<void> {
  const { error } = await supabase.from('animals').insert(animalToRow(a));
  if (error) throw error;
}

export async function insertAnimals(animals: Animal[]): Promise<void> {
  if (!animals.length) return;
  const { error } = await supabase.from('animals').insert(animals.map(animalToRow));
  if (error) throw error;
}

/** Importación masiva: inserta o actualiza (por id) en un solo round-trip. */
export async function upsertAnimals(animals: Animal[]): Promise<void> {
  if (!animals.length) return;
  const { error } = await supabase.from('animals').upsert(animals.map(animalToRow), { onConflict: 'id' });
  if (error) throw error;
}

/** Importación masiva de inventario (upsert por feed_type). */
export async function upsertInventoryRows(rows: { feedType: FeedType; sacos: number; lb: number }[]): Promise<void> {
  if (!rows.length) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('feed_inventory')
    .upsert(rows.map(r => ({ feed_type: r.feedType, sacos: r.sacos, lb: r.lb, updated_at: now })), { onConflict: 'feed_type' });
  if (error) throw error;
}

export async function updateAnimal(id: string, changes: Partial<Animal>): Promise<void> {
  const row = animalChangesToRow(changes);
  if (!Object.keys(row).length) return;
  const { error } = await supabase.from('animals').update(row).eq('id', id);
  if (error) throw error;
}

/** Borrado físico de un animal (creado por error). */
export async function deleteAnimal(id: string): Promise<void> {
  const { error } = await supabase.from('animals').delete().eq('id', id);
  if (error) throw error;
}

export async function insertContact(c: Contact): Promise<void> {
  const { error } = await supabase.from('contacts').insert(contactToRow(c));
  if (error) throw error;
}

export async function insertPurchase(p: PurchaseInvoice): Promise<void> {
  const { error } = await supabase.from('purchase_invoices').insert(purchaseToRow(p));
  if (error) throw error;
}

export async function insertSale(s: SaleInvoice): Promise<void> {
  const { error } = await supabase.from('sale_invoices').insert(saleToRow(s));
  if (error) throw error;
}

export async function updatePurchase(id: string, changes: Partial<PurchaseInvoice>): Promise<void> {
  const row: Row = {};
  if ('status' in changes) row.status = changes.status;
  if ('payment' in changes) row.payment = changes.payment ?? null;
  if (!Object.keys(row).length) return;
  const { error } = await supabase.from('purchase_invoices').update(row).eq('id', id);
  if (error) throw error;
}

export async function updateSale(id: string, changes: Partial<SaleInvoice>): Promise<void> {
  const row: Row = {};
  if ('status' in changes) row.status = changes.status;
  if ('payment' in changes) row.payment = changes.payment ?? null;
  if (!Object.keys(row).length) return;
  const { error } = await supabase.from('sale_invoices').update(row).eq('id', id);
  if (error) throw error;
}

export async function insertInventoryTx(tx: InventoryTransaction): Promise<void> {
  const { error } = await supabase.from('inventory_transactions').insert(txToRow(tx));
  if (error) throw error;
}

export async function insertInventoryTxs(txs: InventoryTransaction[]): Promise<void> {
  if (!txs.length) return;
  const { error } = await supabase.from('inventory_transactions').insert(txs.map(txToRow));
  if (error) throw error;
}

/** Actualiza el stock de un tipo de alimento (fila en feed_inventory). */
export async function setFeedInventory(feedType: FeedType, sacos: number, lb: number): Promise<void> {
  const { error } = await supabase
    .from('feed_inventory')
    .update({ sacos, lb, updated_at: new Date().toISOString() })
    .eq('feed_type', feedType);
  if (error) throw error;
}

// ---- Insumos ----
export async function insertSupply(s: Supply): Promise<void> {
  const { error } = await supabase.from('supplies').insert(supplyToRow(s));
  if (error) throw error;
}

export async function updateSupply(id: string, changes: Partial<Supply>): Promise<void> {
  const row: Row = {};
  if ('name' in changes) row.name = changes.name;
  if ('brand' in changes) row.brand = changes.brand ?? null;
  if ('quantity' in changes) row.quantity = changes.quantity;
  if ('minStock' in changes) row.min_stock = changes.minStock;
  if (!Object.keys(row).length) return;
  const { error } = await supabase.from('supplies').update(row).eq('id', id);
  if (error) throw error;
}

// ---- Semen ----
export async function insertSemenBatch(b: SemenBatch): Promise<void> {
  const { error } = await supabase.from('semen_batches').insert(semenToRow(b));
  if (error) throw error;
}

export async function updateSemenBatch(id: string, changes: Partial<SemenBatch>): Promise<void> {
  const row: Row = {};
  if ('strawsAvailable' in changes) row.straws_available = changes.strawsAvailable;
  if ('strawsTotal' in changes) row.straws_total = changes.strawsTotal;
  if ('note' in changes) row.note = changes.note ?? null;
  if (!Object.keys(row).length) return;
  const { error } = await supabase.from('semen_batches').update(row).eq('id', id);
  if (error) throw error;
}
