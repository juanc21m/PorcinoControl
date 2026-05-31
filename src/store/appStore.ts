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

// ---------------------------------------------------------------------------
// Simulated "today" — drives the biological engine.
// Aligned with ESPECIFICACIONES v3.0 (30 de Mayo, 2026).
// ---------------------------------------------------------------------------

const CURRENT_DATE = '2026-05-30';

// ---------------------------------------------------------------------------
// Tag counter helper
// ---------------------------------------------------------------------------

function getNextTag(animals: Animal[], prefix: 'M' | 'F'): string {
  const nums = animals
    .filter(a => a.tag.startsWith(prefix + '-'))
    .map(a => parseInt(a.tag.slice(2), 10))
    .filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${String(max + 1).padStart(6, '0')}`;
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

  // Biological engine state (poblado por runBiologicalEngine)
  alerts: Alert[];
  kpis: KPIUpdate[];
  medicalAgenda: MedicalTask[];

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
  alerts: [],
  kpis: [],
  medicalAgenda: [],

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
  },

  registerFarrowing: (motherId, pigletCount, avgWeight) => {
    const { animals, currentDate } = get();
    const today = currentDate;
    const updatedAnimals = animals.map(a => {
      if (a.id !== motherId) return a;
      return {
        ...a,
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
    });

    const mother = animals.find(a => a.id === motherId);
    const newPiglets: Animal[] = Array.from({ length: pigletCount }, (_, i) => {
      const prefix: 'M' | 'F' = i % 2 === 0 ? 'M' : 'F';
      const tag = getNextTag(
        [...updatedAnimals, ...Array.from({ length: i }, (__, j) => ({ tag: `${j % 2 === 0 ? 'M' : 'F'}-999999` } as Animal))],
        prefix
      );
      return mkPigletStub(tag, i % 2 === 0 ? 'Macho' : 'Hembra', today, avgWeight, motherId, mother?.padrote_id);
    });

    set({ animals: [...updatedAnimals, ...newPiglets] });
  },

  updateAnimalStatus: (id, status) => {
    set({ animals: get().animals.map(a => (a.id === id ? { ...a, status } : a)) });
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
    for (const item of data.items) {
      nextInventory[item.feedType] = {
        sacos: nextInventory[item.feedType].sacos + item.sacosQty,
        lb: nextInventory[item.feedType].lb + item.sacosQty * lbPerSaco,
      };
      txs.push({
        id: crypto.randomUUID(), date: data.date, feedType: item.feedType,
        operation: 'Carga', sacos: item.sacosQty, lb: item.sacosQty * lbPerSaco, note: data.invoiceNumber,
      });
    }

    set({
      purchases: [...purchases, newPurchase],
      inventory: nextInventory,
      inventoryHistory: [...txs, ...inventoryHistory],
    });
  },

  addSale: (data) => {
    const { sales, animals } = get();
    const id = crypto.randomUUID();
    const newSale: SaleInvoice = { ...data, id };
    const tags = data.pigTags ?? [];
    const updated = tags.length
      ? animals.map(a => (tags.includes(a.tag) ? { ...a, status: 'Despachado' as const } : a))
      : animals;
    set({ sales: [...sales, newSale], animals: updated });
  },

  toggleInvoiceStatus: (type, id) => {
    if (type === 'purchase') {
      set({ purchases: get().purchases.map(p => p.id === id ? { ...p, status: p.status === 'Pendiente' ? 'Pagado' : 'Pendiente' } : p) });
    } else {
      set({ sales: get().sales.map(s => s.id === id ? { ...s, status: s.status === 'Pendiente' ? 'Pagado' : 'Pendiente' } : s) });
    }
  },

  payInvoice: (type, id, payment) => {
    if (type === 'purchase') {
      set({ purchases: get().purchases.map(p => p.id === id ? { ...p, status: 'Pagado', payment } : p) });
    } else {
      set({ sales: get().sales.map(s => s.id === id ? { ...s, status: 'Pagado', payment } : s) });
    }
  },

  unpayInvoice: (type, id) => {
    if (type === 'purchase') {
      set({ purchases: get().purchases.map(p => p.id === id ? { ...p, status: 'Pendiente', payment: undefined } : p) });
    } else {
      set({ sales: get().sales.map(s => s.id === id ? { ...s, status: 'Pendiente', payment: undefined } : s) });
    }
  },

  addContact: (data) => {
    set({ contacts: [...get().contacts, { ...data, id: crypto.randomUUID() }] });
  },

  loadFeed: (feedType, sacos, note) => {
    const { inventory, inventoryHistory, currentDate } = get();
    const lb = sacos * 35;
    const tx: InventoryTransaction = {
      id: crypto.randomUUID(), date: currentDate, feedType, operation: 'Carga', sacos, lb, note,
    };
    set({
      inventory: { ...inventory, [feedType]: { sacos: inventory[feedType].sacos + sacos, lb: inventory[feedType].lb + lb } },
      inventoryHistory: [tx, ...inventoryHistory],
    });
  },

  useFeed: (feedType, lb, note) => {
    const { inventory, inventoryHistory, currentDate } = get();
    const sacosToRemove = Math.floor(lb / 35);
    const tx: InventoryTransaction = {
      id: crypto.randomUUID(), date: currentDate, feedType, operation: 'Consumo', lb, note,
    };
    set({
      inventory: {
        ...inventory,
        [feedType]: {
          sacos: Math.max(0, inventory[feedType].sacos - sacosToRemove),
          lb: Math.max(0, inventory[feedType].lb - lb),
        },
      },
      inventoryHistory: [tx, ...inventoryHistory],
    });
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
    const updated = animals.map(a => {
      const m = mutations.find(x => x.animalId === a.id);
      if (!m) return a;
      const needs = (Object.entries(m.changes) as [keyof Animal, unknown][]).some(
        ([k, v]) => a[k] !== v
      );
      if (!needs) return a;
      changed = true;
      return {
        ...a,
        ...m.changes,
        history: [...a.history, { date: currentDate, event: m.reason }],
      };
    });
    if (changed) set({ animals: updated });
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
    set({
      animals: get().animals.map(a =>
        a.id === animalId
          ? { ...a, heatStatus: 'Embarazada', history: [...a.history, { date: today, event: 'Embarazo confirmado (revisión día 21)' }] }
          : a
      ),
    });
  },

  retryMating: (animalId) => {
    const today = get().currentDate;
    set({
      animals: get().animals.map(a =>
        a.id === animalId
          ? { ...a, heatStatus: 'En Celo', inseminationDate: undefined, expectedFarrowingDate: undefined, history: [...a.history, { date: today, event: 'Monta no efectiva — regresa a celo' }] }
          : a
      ),
    });
  },

  moveToMaternity: (animalId) => {
    const today = get().currentDate;
    set({
      animals: get().animals.map(a =>
        a.id === animalId
          ? { ...a, etapaActual: 'Maternidad', feedType: 'Lactancia', dailyConsumption: 12, history: [...a.history, { date: today, event: 'Trasladada a Maternidad (pre-parto)' }] }
          : a
      ),
    });
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
