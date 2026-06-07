import { create } from 'zustand';
import { addDays, format } from 'date-fns';
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
  Supply,
  SemenBatch,
} from '../types';
import { FEED_TYPES, LB_PER_SACO, ZONE_DEFAULT_FEED, DEFAULT_SUPPLY_MIN_STOCK } from '../types';
import { safeParseISO } from '../lib/date';
import { evaluateBiologicalRules, getInventoryAlerts, getZoneAlerts } from '../lib/biologicalEngine';
import {
  fetchAllData,
  insertAnimal,
  insertAnimals,
  updateAnimal,
  deleteAnimal as dbDeleteAnimal,
  insertContact,
  insertPurchase,
  insertSale,
  updatePurchase,
  updateSale,
  insertInventoryTx,
  insertInventoryTxs,
  setFeedInventory,
  insertSupply,
  updateSupply as dbUpdateSupply,
  insertSemenBatch,
  updateSemenBatch,
} from '../lib/db';

// ---------------------------------------------------------------------------
// Simulated "today" — drives the biological engine.
// Aligned with ESPECIFICACIONES v3.0 (30 de Mayo, 2026).
// ---------------------------------------------------------------------------

const CURRENT_DATE = '2026-05-30';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nextTagNumber(animals: Animal[], prefix: 'M' | 'H'): number {
  const nums = animals
    .filter(a => a.tag.startsWith(prefix + '-'))
    .map(a => parseInt(a.tag.slice(2), 10))
    .filter(n => !isNaN(n));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

function getNextTag(animals: Animal[], prefix: 'M' | 'H'): string {
  return `${prefix}-${String(nextTagNumber(animals, prefix)).padStart(6, '0')}`;
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
  supplies: Supply[];
  semenBatches: SemenBatch[];
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
  registerFarrowing: (
    motherId: string,
    data: {
      males: number;
      females: number;
      avgWeight: number;
      breed?: string;
      padroteId?: string;
      date?: string;
      time?: string;
    },
  ) => void;
  updateAnimalStatus: (id: string, status: Animal['status']) => void;
  /** Edita campos del perfil (raza, nacimiento, peso). El ID/tag es inmutable. */
  editAnimal: (id: string, changes: Partial<Pick<Animal, 'breed' | 'birthDate' | 'birthTime' | 'weight'>>) => void;
  /** Reemplaza el historial de pesajes (y sincroniza el peso actual con el último). */
  setAnimalWeights: (id: string, weights: Animal['weights']) => void;
  /** Borrado físico de un animal creado por error. */
  deleteAnimal: (id: string) => void;
  /** Inseminación: descuenta 1 pajilla del padrote y marca a la hembra Inseminada. */
  inseminate: (femaleId: string, padroteId: string) => void;

  // Insumos
  addSupply: (data: Omit<Supply, 'id'>) => void;
  updateSupply: (id: string, changes: Partial<Omit<Supply, 'id'>>) => void;
  adjustSupply: (id: string, delta: number) => void;

  // Semen
  addSemenBatch: (data: Omit<SemenBatch, 'id' | 'strawsAvailable'>) => void;

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
  inventory: Object.fromEntries(FEED_TYPES.map(t => [t, { sacos: 0, lb: 0 }])) as FeedInventory,
  inventoryHistory: [],
  purchases: [],
  sales: [],
  contacts: [],
  supplies: [],
  semenBatches: [],
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
        supplies: data.supplies,
        semenBatches: data.semenBatches,
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
    const prefix = data.gender === 'Macho' ? 'M' : 'H';
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

  registerFarrowing: (motherId, data) => {
    const { animals, currentDate } = get();
    const mother = animals.find(a => a.id === motherId);
    const { males, females, avgWeight } = data;
    const date = data.date ?? currentDate;
    const time = data.time;
    const padroteId = data.padroteId ?? mother?.padrote_id;
    const litterBreed = data.breed || mother?.breed || 'Pietrain';
    const total = males + females;
    const when = time ? `${date} ${time}` : date;

    let motherChanges: Partial<Animal> | null = null;
    const updatedAnimals = animals.map(a => {
      if (a.id !== motherId) return a;
      motherChanges = {
        heatStatus: 'Lactante' as const,
        feedType: 'Lactancia' as FeedType,
        dailyConsumption: 12,
        etapaActual: 'Maternidad' as const,
        padrote_id: padroteId,
        lastFarrowingDate: date,
        totalFarrowings: (a.totalFarrowings ?? 0) + 1,
        history: [
          ...a.history,
          { date, event: `Parto registrado (${when}): ${total} lechones (${males}M / ${females}H), peso prom. ${avgWeight} lb` },
        ],
      };
      return { ...a, ...motherChanges };
    });

    // IDs correlativos globales por género (M-/H-), reservando números por lote.
    let mNum = nextTagNumber(animals, 'M');
    let hNum = nextTagNumber(animals, 'H');
    const genders: ('Macho' | 'Hembra')[] = [
      ...Array<'Macho'>(males).fill('Macho'),
      ...Array<'Hembra'>(females).fill('Hembra'),
    ];
    const newPiglets: Animal[] = genders.map(gender => {
      const tag = gender === 'Macho'
        ? `M-${String(mNum++).padStart(6, '0')}`
        : `H-${String(hNum++).padStart(6, '0')}`;
      return mkPigletStub(tag, gender, date, time, avgWeight, motherId, padroteId, litterBreed);
    });

    set({ animals: [...updatedAnimals, ...newPiglets] });

    if (motherChanges) persist(updateAnimal(motherId, motherChanges), 'updateAnimal(parto madre)');
    persist(insertAnimals(newPiglets), 'insertAnimals(lechones)');
  },

  updateAnimalStatus: (id, status) => {
    set({ animals: get().animals.map(a => (a.id === id ? { ...a, status } : a)) });
    persist(updateAnimal(id, { status }), 'updateAnimalStatus');
  },

  editAnimal: (id, changes) => {
    // El tag/id nunca se tocan: `changes` está acotado por tipo a campos editables.
    set({ animals: get().animals.map(a => (a.id === id ? { ...a, ...changes } : a)) });
    persist(updateAnimal(id, changes), 'editAnimal');
  },

  setAnimalWeights: (id, weights) => {
    const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted.length ? sorted[sorted.length - 1].weight : undefined;
    set({
      animals: get().animals.map(a =>
        a.id === id ? { ...a, weights: sorted, ...(latest !== undefined ? { weight: latest } : {}) } : a,
      ),
    });
    persist(updateAnimal(id, { weights: sorted, ...(latest !== undefined ? { weight: latest } : {}) }), 'setAnimalWeights');
  },

  deleteAnimal: (id) => {
    set({ animals: get().animals.filter(a => a.id !== id) });
    persist(dbDeleteAnimal(id), 'deleteAnimal');
  },

  inseminate: (femaleId, padroteId) => {
    const { animals, semenBatches, currentDate } = get();
    const female = animals.find(a => a.id === femaleId);
    const padrote = animals.find(a => a.id === padroteId);
    if (!female || !padrote) return;

    // Pajilla disponible más antigua de ese padrote (FIFO).
    const batch = semenBatches
      .filter(b => b.padroteId === padroteId && b.strawsAvailable > 0)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (!batch) return; // sin stock de pajillas: la UI debe impedir llegar aquí

    const expected = format(addDays(safeParseISO(currentDate), 114), 'yyyy-MM-dd');
    const femaleChanges: Partial<Animal> = {
      heatStatus: 'Inseminada',
      inseminationDate: currentDate,
      expectedFarrowingDate: expected,
      padrote_id: padroteId,
      etapaActual: 'Gestación',
      feedType: ZONE_DEFAULT_FEED['Gestación'],
    };

    set({
      semenBatches: semenBatches.map(b =>
        b.id === batch.id ? { ...b, strawsAvailable: b.strawsAvailable - 1 } : b,
      ),
      animals: animals.map(a =>
        a.id === femaleId
          ? { ...a, ...femaleChanges, history: [...a.history, { date: currentDate, event: `Inseminada con semen de ${padrote.tag} (parto estimado ${expected}).` }] }
          : a,
      ),
    });

    persist(updateSemenBatch(batch.id, { strawsAvailable: batch.strawsAvailable - 1 }), 'inseminate(pajilla)');
    const f = get().animals.find(a => a.id === femaleId);
    persist(updateAnimal(femaleId, { ...femaleChanges, history: f?.history }), 'inseminate(hembra)');
  },

  addSupply: (data) => {
    const newSupply: Supply = {
      ...data,
      id: crypto.randomUUID(),
      minStock: data.minStock || DEFAULT_SUPPLY_MIN_STOCK,
    };
    set({ supplies: [...get().supplies, newSupply] });
    persist(insertSupply(newSupply), 'insertSupply');
  },

  updateSupply: (id, changes) => {
    set({ supplies: get().supplies.map(s => (s.id === id ? { ...s, ...changes } : s)) });
    persist(dbUpdateSupply(id, changes), 'updateSupply');
  },

  adjustSupply: (id, delta) => {
    const supply = get().supplies.find(s => s.id === id);
    if (!supply) return;
    const quantity = Math.max(0, supply.quantity + delta);
    set({ supplies: get().supplies.map(s => (s.id === id ? { ...s, quantity } : s)) });
    persist(dbUpdateSupply(id, { quantity }), 'adjustSupply');
  },

  addSemenBatch: (data) => {
    const newBatch: SemenBatch = { ...data, id: crypto.randomUUID(), strawsAvailable: data.strawsTotal };
    set({ semenBatches: [newBatch, ...get().semenBatches] });
    persist(insertSemenBatch(newBatch), 'insertSemenBatch');
  },

  addPurchase: (data) => {
    const { purchases, inventory, inventoryHistory } = get();
    const id = crypto.randomUUID();
    const newPurchase: PurchaseInvoice = { ...data, id };

    // Suma los sacos/lb por tipo de alimento (peso por saco según el tipo).
    const nextInventory: FeedInventory = Object.fromEntries(
      FEED_TYPES.map(t => [t, { ...inventory[t] }]),
    ) as FeedInventory;
    const txs: InventoryTransaction[] = [];
    const touched = new Set<FeedType>();
    for (const item of data.items) {
      const lb = item.sacosQty * LB_PER_SACO[item.feedType];
      nextInventory[item.feedType] = {
        sacos: nextInventory[item.feedType].sacos + item.sacosQty,
        lb: nextInventory[item.feedType].lb + lb,
      };
      touched.add(item.feedType);
      txs.push({
        id: crypto.randomUUID(), date: data.date, feedType: item.feedType,
        operation: 'Carga', sacos: item.sacosQty, lb, note: data.invoiceNumber,
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
    const lb = sacos * LB_PER_SACO[feedType];
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
    const sacosToRemove = Math.floor(lb / LB_PER_SACO[feedType]);
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
    try {
      const { alerts: bioAlerts, mutations, kpis, medicalAgenda } = evaluateBiologicalRules(animals, currentDate);
      const invAlerts = getInventoryAlerts(inventory);
      const zoneAlerts = getZoneAlerts(animals);

      const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
      const alerts = [...bioAlerts, ...invAlerts, ...zoneAlerts]
        .filter(a => !dismissedAlertIds.includes(a.id))
        .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
      const agenda = medicalAgenda.filter(t => !completedTaskIds.includes(t.id));

      // Aplica mutaciones (no-op si no hay cambios → evita bucles de render).
      get().applyMutations(mutations);

      set({ alerts, kpis, medicalAgenda: agenda });
    } catch (err) {
      // Datos reales con campos inesperados (fechas nulas, etc.) no deben tumbar
      // toda la app al entrar. Se registra y se continúa sin alertas/kpis.
      console.error('[motor biológico] error al evaluar reglas:', err);
    }
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
  date: string,
  time: string | undefined,
  avgWeight: number,
  motherId: string,
  padroteId: string | undefined,
  breed: string,
): Animal {
  return {
    id: crypto.randomUUID(),
    tag,
    role: 'Ceba',
    gender,
    breed,
    birthDate: date,
    birthTime: time,
    weight: avgWeight,
    etapaActual: 'Maternidad',
    feedType: 'Crecimiento',
    dailyConsumption: 0,
    status: 'Activo',
    madre_id: motherId,
    padrote_id: padroteId,
    weights: [{ date, weight: avgWeight }],
    vaccinations: [],
    history: [{ date, event: `Nacimiento registrado${time ? ` (${date} ${time})` : ''}` }],
  };
}
