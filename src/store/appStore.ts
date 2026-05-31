import { create } from 'zustand';
import type {
  Animal,
  FeedInventory,
  PurchaseInvoice,
  SaleInvoice,
  FeedType,
  InventoryTransaction,
  Mutation,
  Contact,
  PaymentInfo,
  Alert,
  KPIUpdate,
  MedicalTask,
} from '../types';
import { evaluateBiologicalRules, getInventoryAlerts } from '../lib/biologicalEngine';
import {
  fetchAllData,
  insertAnimal,
  insertAnimals,
  updateAnimal,
  insertContact,
  insertPurchase,
  insertSale,
  updatePurchase,
  updateSale,
  insertInventoryTx,
  insertInventoryTxs,
  setFeedInventory,
} from '../lib/db';

// ---------------------------------------------------------------------------
// Simulated "today" — drives the biological engine.
// Aligned with ESPECIFICACIONES v3.0 (30 de Mayo, 2026).
// ---------------------------------------------------------------------------

const CURRENT_DATE = '2026-05-30';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNextTag(animals: Animal[], prefix: 'M' | 'F'): string {
  const nums = animals
    .filter(a => a.tag.startsWith(prefix + '-'))
    .map(a => parseInt(a.tag.slice(2), 10))
    .filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${String(max + 1).padStart(6, '0')}`;
}

/** Dispara una escritura a Supabase sin bloquear la UI; loguea errores. */
function persist(p: Promise<unknown>, label: string): void {
  p.catch(err => console.error(`[Supabase] ${label} falló:`, err));
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface AppState {
  animals: Animal[];
  inventory: FeedInventory;
  inventoryHistory: InventoryTransaction[];
  purchases: PurchaseInvoice[];
  sales: SaleInvoice[];
  contacts: Contact[];
  currentDate: string;
  dismissedAlertIds: string[];
  completedTaskIds: string[];

  // Estado de carga
  loaded: boolean;
  loading: boolean;
  loadError: string | null;

  // Biological engine state (poblado por runBiologicalEngine)
  alerts: Alert[];
  kpis: KPIUpdate[];
  medicalAgenda: MedicalTask[];

  // Lectura inicial desde Supabase
  fetchAll: () => Promise<void>;

  // Animal actions
  addAnimal: (data: Omit<Animal, 'id' | 'tag' | 'weights' | 'vaccinations' | 'history'>) => void;
  registerFarrowing: (motherId: string, pigletCount: number, avgWeight: number) => void;
  updateAnimalStatus: (id: string, status: Animal['status']) => void;

  // Finance actions
  addPurchase: (data: Omit<PurchaseInvoice, 'id'>) => void;
  addSale: (data: Omit<SaleInvoice, 'id'>) => void;
  toggleInvoiceStatus: (type: 'purchase' | 'sale', id: string) => void;
  payInvoice: (type: 'purchase' | 'sale', id: string, payment: PaymentInfo) => void;
  unpayInvoice: (type: 'purchase' | 'sale', id: string) => void;

  // Contact actions
  addContact: (data: Omit<Contact, 'id'>) => void;

  // Inventory actions
  loadFeed: (feedType: FeedType, sacos: number, note?: string) => void;
  useFeed: (feedType: FeedType, lb: number, note?: string) => void;

  // Biological engine actions
  runBiologicalEngine: () => void;
  applyMutations: (mutations: Mutation[]) => void;
  dismissAlert: (id: string) => void;
  completeMedicalTask: (id: string) => void;
  confirmPregnancy: (animalId: string) => void;
  retryMating: (animalId: string) => void;
  moveToMaternity: (animalId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  animals: [],
  inventory: {
    Crecimiento: { sacos: 0, lb: 0 },
    Engorde:     { sacos: 0, lb: 0 },
    Lactancia:   { sacos: 0, lb: 0 },
  },
  inventoryHistory: [],
  purchases: [],
  sales: [],
  contacts: [],
  currentDate: CURRENT_DATE,
  dismissedAlertIds: [],
  completedTaskIds: [],
  loaded: false,
  loading: false,
  loadError: null,
  alerts: [],
  kpis: [],
  medicalAgenda: [],

  // -------------------------------------------------------------------------
  // Lectura inicial: rellena el estado desde Supabase.
  // -------------------------------------------------------------------------
  fetchAll: async () => {
    set({ loading: true, loadError: null });
    try {
      const data = await fetchAllData();
      set({
        animals: data.animals,
        contacts: data.contacts,
        purchases: data.purchases,
        sales: data.sales,
        inventory: data.inventory,
        inventoryHistory: data.inventoryHistory,
        loaded: true,
        loading: false,
      });
    } catch (err) {
      console.error('[Supabase] fetchAll falló:', err);
      set({
        loading: false,
        loaded: true,
        loadError: err instanceof Error ? err.message : 'Error al cargar datos',
      });
    }
  },

  addAnimal: (data) => {
    const { animals } = get();
    const prefix = data.gender === 'Macho' ? 'M' : 'F';
    const tag = getNextTag(animals, prefix);
    const today = get().currentDate;
    const newAnimal: Animal = {
      ...data,
      id: crypto.randomUUID(),
      tag,
      weights: [{ date: today, weight: data.weight }],
      vaccinations: [],
      history: [{ date: today, event: 'Animal registrado en sistema' }],
    };
    set({ animals: [...animals, newAnimal] });
    persist(insertAnimal(newAnimal), 'insertAnimal');
  },

  registerFarrowing: (motherId, pigletCount, avgWeight) => {
    const { animals, currentDate } = get();
    const today = currentDate;
    const mother = animals.find(a => a.id === motherId);

    let motherChanges: Partial<Animal> | null = null;
    const updatedAnimals = animals.map(a => {
      if (a.id !== motherId) return a;
      motherChanges = {
        heatStatus: 'Lactante' as const,
        feedType: 'Lactancia' as FeedType,
        dailyConsumption: 12,
        etapaActual: 'Maternidad' as const,
        lastFarrowingDate: today,
        totalFarrowings: (a.totalFarrowings ?? 0) + 1,
        history: [
          ...a.history,
          { date: today, event: `Parto registrado: ${pigletCount} lechones, peso prom. ${avgWeight} lb` },
        ],
      };
      return { ...a, ...motherChanges };
    });

    const newPiglets: Animal[] = Array.from({ length: pigletCount }, (_, i) => {
      const prefix: 'M' | 'F' = i % 2 === 0 ? 'M' : 'F';
      const tag = getNextTag(
        [...updatedAnimals, ...Array.from({ length: i }, (__, j) => ({ tag: `${j % 2 === 0 ? 'M' : 'F'}-999999` } as Animal))],
        prefix
      );
      return mkPigletStub(tag, i % 2 === 0 ? 'Macho' : 'Hembra', today, avgWeight, motherId, mother?.padrote_id);
    });

    set({ animals: [...updatedAnimals, ...newPiglets] });

    if (motherChanges) persist(updateAnimal(motherId, motherChanges), 'updateAnimal(parto madre)');
    persist(insertAnimals(newPiglets), 'insertAnimals(lechones)');
  },

  updateAnimalStatus: (id, status) => {
    set({ animals: get().animals.map(a => (a.id === id ? { ...a, status } : a)) });
    persist(updateAnimal(id, { status }), 'updateAnimalStatus');
  },

  addPurchase: (data) => {
    const { purchases, inventory, inventoryHistory } = get();
    const id = crypto.randomUUID();
    const newPurchase: PurchaseInvoice = { ...data, id };
    const lbPerSaco = 35;

    // Suma los sacos/lb por tipo de alimento a partir de las líneas.
    const nextInventory: FeedInventory = {
      Crecimiento: { ...inventory.Crecimiento },
      Engorde:     { ...inventory.Engorde },
      Lactancia:   { ...inventory.Lactancia },
    };
    const txs: InventoryTransaction[] = [];
    const touched = new Set<FeedType>();
    for (const item of data.items) {
      nextInventory[item.feedType] = {
        sacos: nextInventory[item.feedType].sacos + item.sacosQty,
        lb: nextInventory[item.feedType].lb + item.sacosQty * lbPerSaco,
      };
      touched.add(item.feedType);
      txs.push({
        id: crypto.randomUUID(), date: data.date, feedType: item.feedType,
        operation: 'Carga', sacos: item.sacosQty, lb: item.sacosQty * lbPerSaco, note: data.invoiceNumber,
      });
    }

    set({
      purchases: [newPurchase, ...purchases],
      inventory: nextInventory,
      inventoryHistory: [...txs, ...inventoryHistory],
    });

    persist(insertPurchase(newPurchase), 'insertPurchase');
    persist(insertInventoryTxs(txs), 'insertInventoryTxs(compra)');
    for (const ft of touched) {
      persist(setFeedInventory(ft, nextInventory[ft].sacos, nextInventory[ft].lb), `setFeedInventory(${ft})`);
    }
  },

  addSale: (data) => {
    const { sales, animals } = get();
    const id = crypto.randomUUID();
    const newSale: SaleInvoice = { ...data, id };
    const tags = data.pigTags ?? [];
    const dispatched = tags.length ? animals.filter(a => tags.includes(a.tag)) : [];
    const updated = tags.length
      ? animals.map(a => (tags.includes(a.tag) ? { ...a, status: 'Despachado' as const } : a))
      : animals;
    set({ sales: [newSale, ...sales], animals: updated });

    persist(insertSale(newSale), 'insertSale');
    for (const a of dispatched) {
      persist(updateAnimal(a.id, { status: 'Despachado' }), 'updateAnimal(venta despacho)');
    }
  },

  toggleInvoiceStatus: (type, id) => {
    if (type === 'purchase') {
      let next: PurchaseInvoice['status'] = 'Pendiente';
      set({ purchases: get().purchases.map(p => {
        if (p.id !== id) return p;
        next = p.status === 'Pendiente' ? 'Pagado' : 'Pendiente';
        return { ...p, status: next };
      }) });
      persist(updatePurchase(id, { status: next }), 'toggleInvoiceStatus(compra)');
    } else {
      let next: SaleInvoice['status'] = 'Pendiente';
      set({ sales: get().sales.map(s => {
        if (s.id !== id) return s;
        next = s.status === 'Pendiente' ? 'Pagado' : 'Pendiente';
        return { ...s, status: next };
      }) });
      persist(updateSale(id, { status: next }), 'toggleInvoiceStatus(venta)');
    }
  },

  payInvoice: (type, id, payment) => {
    if (type === 'purchase') {
      set({ purchases: get().purchases.map(p => p.id === id ? { ...p, status: 'Pagado', payment } : p) });
      persist(updatePurchase(id, { status: 'Pagado', payment }), 'payInvoice(compra)');
    } else {
      set({ sales: get().sales.map(s => s.id === id ? { ...s, status: 'Pagado', payment } : s) });
      persist(updateSale(id, { status: 'Pagado', payment }), 'payInvoice(venta)');
    }
  },

  unpayInvoice: (type, id) => {
    if (type === 'purchase') {
      set({ purchases: get().purchases.map(p => p.id === id ? { ...p, status: 'Pendiente', payment: undefined } : p) });
      persist(updatePurchase(id, { status: 'Pendiente', payment: undefined }), 'unpayInvoice(compra)');
    } else {
      set({ sales: get().sales.map(s => s.id === id ? { ...s, status: 'Pendiente', payment: undefined } : s) });
      persist(updateSale(id, { status: 'Pendiente', payment: undefined }), 'unpayInvoice(venta)');
    }
  },

  addContact: (data) => {
    const newContact: Contact = { ...data, id: crypto.randomUUID() };
    set({ contacts: [...get().contacts, newContact] });
    persist(insertContact(newContact), 'insertContact');
  },

  loadFeed: (feedType, sacos, note) => {
    const { inventory, inventoryHistory, currentDate } = get();
    const lb = sacos * 35;
    const next = { sacos: inventory[feedType].sacos + sacos, lb: inventory[feedType].lb + lb };
    const tx: InventoryTransaction = {
      id: crypto.randomUUID(), date: currentDate, feedType, operation: 'Carga', sacos, lb, note,
    };
    set({
      inventory: { ...inventory, [feedType]: next },
      inventoryHistory: [tx, ...inventoryHistory],
    });
    persist(insertInventoryTx(tx), 'insertInventoryTx(carga)');
    persist(setFeedInventory(feedType, next.sacos, next.lb), `setFeedInventory(${feedType})`);
  },

  useFeed: (feedType, lb, note) => {
    const { inventory, inventoryHistory, currentDate } = get();
    const sacosToRemove = Math.floor(lb / 35);
    const next = {
      sacos: Math.max(0, inventory[feedType].sacos - sacosToRemove),
      lb: Math.max(0, inventory[feedType].lb - lb),
    };
    const tx: InventoryTransaction = {
      id: crypto.randomUUID(), date: currentDate, feedType, operation: 'Consumo', lb, note,
    };
    set({
      inventory: { ...inventory, [feedType]: next },
      inventoryHistory: [tx, ...inventoryHistory],
    });
    persist(insertInventoryTx(tx), 'insertInventoryTx(consumo)');
    persist(setFeedInventory(feedType, next.sacos, next.lb), `setFeedInventory(${feedType})`);
  },

  // ---- Biological engine actions ----

  // Evalúa todas las reglas biológicas contra currentDate, aplica mutaciones
  // automáticas y publica alerts / kpis / medicalAgenda en el estado global.
  runBiologicalEngine: () => {
    const { animals, currentDate, inventory, dismissedAlertIds, completedTaskIds } = get();
    const { alerts: bioAlerts, mutations, kpis, medicalAgenda } = evaluateBiologicalRules(animals, currentDate);
    const invAlerts = getInventoryAlerts(inventory);

    const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    const alerts = [...bioAlerts, ...invAlerts]
      .filter(a => !dismissedAlertIds.includes(a.id))
      .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
    const agenda = medicalAgenda.filter(t => !completedTaskIds.includes(t.id));

    // Aplica mutaciones (no-op si no hay cambios → evita bucles de render).
    get().applyMutations(mutations);

    set({ alerts, kpis, medicalAgenda: agenda });
  },

  applyMutations: (mutations) => {
    if (!mutations.length) return;
    const { animals, currentDate } = get();
    let changed = false;
    const persisted: { id: string; changes: Partial<Animal> }[] = [];
    const updated = animals.map(a => {
      const m = mutations.find(x => x.animalId === a.id);
      if (!m) return a;
      const needs = (Object.entries(m.changes) as [keyof Animal, unknown][]).some(
        ([k, v]) => a[k] !== v
      );
      if (!needs) return a;
      changed = true;
      const history = [...a.history, { date: currentDate, event: m.reason }];
      persisted.push({ id: a.id, changes: { ...m.changes, history } });
      return { ...a, ...m.changes, history };
    });
    if (changed) {
      set({ animals: updated });
      for (const { id, changes } of persisted) {
        persist(updateAnimal(id, changes), 'applyMutations');
      }
    }
  },

  dismissAlert: (id) => {
    if (get().dismissedAlertIds.includes(id)) return;
    set({ dismissedAlertIds: [...get().dismissedAlertIds, id] });
  },

  completeMedicalTask: (id) => {
    if (get().completedTaskIds.includes(id)) return;
    set({ completedTaskIds: [...get().completedTaskIds, id] });
  },

  confirmPregnancy: (animalId) => {
    const today = get().currentDate;
    const changes: Partial<Animal> = { heatStatus: 'Embarazada' };
    set({
      animals: get().animals.map(a =>
        a.id === animalId
          ? { ...a, ...changes, history: [...a.history, { date: today, event: 'Embarazo confirmado (revisión día 21)' }] }
          : a
      ),
    });
    const a = get().animals.find(x => x.id === animalId);
    persist(updateAnimal(animalId, { ...changes, history: a?.history }), 'confirmPregnancy');
  },

  retryMating: (animalId) => {
    const today = get().currentDate;
    const changes: Partial<Animal> = { heatStatus: 'En Celo', inseminationDate: undefined, expectedFarrowingDate: undefined };
    set({
      animals: get().animals.map(a =>
        a.id === animalId
          ? { ...a, ...changes, history: [...a.history, { date: today, event: 'Monta no efectiva — regresa a celo' }] }
          : a
      ),
    });
    const a = get().animals.find(x => x.id === animalId);
    persist(updateAnimal(animalId, { ...changes, history: a?.history }), 'retryMating');
  },

  moveToMaternity: (animalId) => {
    const today = get().currentDate;
    const changes: Partial<Animal> = { etapaActual: 'Maternidad', feedType: 'Lactancia', dailyConsumption: 12 };
    set({
      animals: get().animals.map(a =>
        a.id === animalId
          ? { ...a, ...changes, history: [...a.history, { date: today, event: 'Trasladada a Maternidad (pre-parto)' }] }
          : a
      ),
    });
    const a = get().animals.find(x => x.id === animalId);
    persist(updateAnimal(animalId, { ...changes, history: a?.history }), 'moveToMaternity');
  },
}));

// Helper to build piglet records created during farrowing
function mkPigletStub(
  tag: string,
  gender: 'Macho' | 'Hembra',
  today: string,
  avgWeight: number,
  motherId: string,
  padroteId?: string
): Animal {
  return {
    id: crypto.randomUUID(),
    tag,
    role: 'Ceba',
    gender,
    breed: 'Pietrain',
    birthDate: today,
    weight: avgWeight,
    etapaActual: 'Maternidad',
    feedType: 'Crecimiento',
    dailyConsumption: 0,
    status: 'Activo',
    madre_id: motherId,
    padrote_id: padroteId,
    weights: [{ date: today, weight: avgWeight }],
    vaccinations: [],
    history: [{ date: today, event: 'Nacimiento registrado' }],
  };
}
