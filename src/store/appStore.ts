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
  Service,
  EtapaProductiva,
} from '../types';
import { FEED_TYPES, LB_PER_SACO, ZONE_DEFAULT_FEED, DEFAULT_SUPPLY_MIN_STOCK, ZONES } from '../types';
import { safeParseISO } from '../lib/date';
import { evaluateBiologicalRules, getInventoryAlerts, getZoneAlerts } from '../lib/biologicalEngine';
import {
  fetchAllData,
  insertAnimal,
  insertAnimals,
  upsertAnimals,
  upsertInventoryRows,
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
  insertService,
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

/**
 * Primera sala con cupo disponible en una zona (1-indexada), ignorando al
 * animal indicado (útil al reubicarlo). Devuelve undefined si la zona está full.
 */
function firstFreeRoom(
  animals: Animal[],
  zone: EtapaProductiva,
  ignoreAnimalId?: string,
): number | undefined {
  const { rooms, capacityPerRoom } = ZONES[zone];
  const occupants = animals.filter(
    a => a.status === 'Activo' && a.etapaActual === zone && a.id !== ignoreAnimalId,
  );
  for (let n = 1; n <= rooms; n++) {
    if (occupants.filter(a => a.roomNumber === n).length < capacityPerRoom) return n;
  }
  return undefined;
}

/** Lechón destetado: pasa a ser animal con ID propio en la zona de Destete. */
function mkWeanedStub(
  tag: string,
  gender: 'Macho' | 'Hembra',
  mother: Animal,
  date: string,
): Animal {
  return {
    id: crypto.randomUUID(),
    tag,
    role: 'Ceba',
    gender,
    breed: mother.breed,
    birthDate: mother.lastFarrowingDate ?? date,
    weight: 0,
    etapaActual: 'Destete',
    roomNumber: 1,
    feedType: ZONE_DEFAULT_FEED['Destete'],
    dailyConsumption: 0,
    status: 'Activo',
    madre_id: mother.id,
    padrote_id: mother.padrote_id,
    weights: [],
    vaccinations: [],
    history: [{ date, event: `Destetado de ${mother.tag}` }],
  };
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
  services: Service[];
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
  /** Corrige el conteo de la camada actual de una cerda en Maternidad. */
  updateLitter: (motherId: string, males: number, females: number) => void;
  /** Reubica un animal a otra sala dentro de su zona. */
  assignRoom: (animalId: string, roomNumber: number) => void;
  /** Destete: convierte la camada (conteo) en animales con ID propio en Destete. */
  weanLitter: (motherId: string) => void;
  /** Edita campos del perfil (raza, nacimiento, peso). El ID/tag es inmutable. */
  editAnimal: (id: string, changes: Partial<Pick<Animal, 'breed' | 'birthDate' | 'birthTime' | 'weight'>>) => void;
  /** Reemplaza el historial de pesajes (y sincroniza el peso actual con el último). */
  setAnimalWeights: (id: string, weights: Animal['weights']) => void;
  /** Borrado físico de un animal creado por error. */
  deleteAnimal: (id: string) => void;
  /** Importación masiva de animales (upsert por id). */
  importAnimals: (animals: Animal[]) => void;
  /** Importación masiva de inventario de alimentos (upsert por tipo). */
  importInventory: (rows: { feedType: FeedType; sacos: number; lb: number }[]) => void;
  /**
   * Registra un servicio/monta: guarda el registro reproductivo y pasa a la
   * hembra a Gestación con su fecha de parto estimada (+114 días).
   */
  registerService: (
    femaleId: string,
    data: {
      tipoServicio: Service['tipoServicio'];
      padroteId?: string;
      date?: string;
      origenSemenNotas?: string;
    },
  ) => void;

  // Insumos
  addSupply: (data: Omit<Supply, 'id'>) => void;
  updateSupply: (id: string, changes: Partial<Omit<Supply, 'id'>>) => void;
  adjustSupply: (id: string, delta: number) => void;


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
  services: [],
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
        services: data.services,
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
    if (!mother) return;

    const { males, females } = data;
    const date = data.date ?? currentDate;
    const time = data.time;
    const padroteId = data.padroteId ?? mother.padrote_id;
    const total = males + females;
    const when = time ? `${date} ${time}` : date;

    // La cerda ocupa una sala individual de Maternidad. Conserva la que ya
    // tenga; si no, toma la primera libre.
    const room = mother.roomNumber ?? firstFreeRoom(animals, 'Maternidad', motherId);

    // Los lechones NO se crean como animales independientes: van como conteo de
    // la camada asociado a la cerda y su sala. Obtienen ID propio al destetar.
    const motherChanges: Partial<Animal> = {
      heatStatus: 'Lactante',
      feedType: ZONE_DEFAULT_FEED['Maternidad'],
      dailyConsumption: 12,
      etapaActual: 'Maternidad',
      roomNumber: room,
      litterMales: males,
      litterFemales: females,
      padrote_id: padroteId,
      lastFarrowingDate: date,
      totalFarrowings: (mother.totalFarrowings ?? 0) + 1,
      history: [
        ...mother.history,
        {
          date,
          event: `Parto registrado (${when}) en Maternidad Sala ${room ?? '—'}: `
            + `${total} lechones (${males} machos, ${females} hembras), peso prom. ${data.avgWeight} lb`,
        },
      ],
    };

    set({ animals: animals.map(a => (a.id === motherId ? { ...a, ...motherChanges } : a)) });
    persist(updateAnimal(motherId, motherChanges), 'registerFarrowing(cerda + camada)');
  },

  updateLitter: (motherId, males, females) => {
    const { animals } = get();
    const mother = animals.find(a => a.id === motherId);
    if (!mother) return;
    const changes: Partial<Animal> = { litterMales: males, litterFemales: females };
    set({ animals: animals.map(a => (a.id === motherId ? { ...a, ...changes } : a)) });
    persist(updateAnimal(motherId, changes), 'updateLitter');
  },

  assignRoom: (animalId, roomNumber) => {
    const { animals } = get();
    const changes: Partial<Animal> = { roomNumber };
    set({ animals: animals.map(a => (a.id === animalId ? { ...a, ...changes } : a)) });
    persist(updateAnimal(animalId, changes), 'assignRoom');
  },

  weanLitter: (motherId) => {
    const { animals, currentDate } = get();
    const mother = animals.find(a => a.id === motherId);
    if (!mother) return;

    const males = mother.litterMales ?? 0;
    const females = mother.litterFemales ?? 0;
    if (males + females <= 0) return;

    // Al destetar, la camada deja de ser un conteo y pasa a animales con ID
    // propio en la zona de Destete (donde sí ocupan cupo de la sala).
    let mNum = nextTagNumber(animals, 'M');
    let hNum = nextTagNumber(animals, 'H');
    const genders: ('Macho' | 'Hembra')[] = [
      ...Array<'Macho'>(males).fill('Macho'),
      ...Array<'Hembra'>(females).fill('Hembra'),
    ];
    const weaned: Animal[] = genders.map(gender => {
      const tag = gender === 'Macho'
        ? `M-${String(mNum++).padStart(6, '0')}`
        : `H-${String(hNum++).padStart(6, '0')}`;
      return mkWeanedStub(tag, gender, mother, currentDate);
    });

    const motherChanges: Partial<Animal> = {
      heatStatus: 'Vacía',
      litterMales: undefined,
      litterFemales: undefined,
      lastWeaningDate: currentDate,
      history: [
        ...mother.history,
        { date: currentDate, event: `Destete: ${males + females} lechones (${males}M/${females}H) pasan a Destete con ID propio.` },
      ],
    };

    set({
      animals: [
        ...animals.map(a => (a.id === motherId ? { ...a, ...motherChanges } : a)),
        ...weaned,
      ],
    });

    persist(updateAnimal(motherId, motherChanges), 'weanLitter(cerda)');
    persist(insertAnimals(weaned), 'weanLitter(lechones destetados)');
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

  importAnimals: (incoming) => {
    if (!incoming.length) return;
    const existing = new Map(get().animals.map(a => [a.id, a]));
    // Para animales ya existentes, preserva su historial (pesos/vacunas/eventos);
    // así re-subir un CSV exportado no destruye datos anidados que el CSV no lleva.
    const merged = incoming.map(a => {
      const prev = existing.get(a.id);
      return prev ? { ...a, weights: prev.weights, vaccinations: prev.vaccinations, history: prev.history } : a;
    });
    const byId = new Map(existing);
    for (const a of merged) byId.set(a.id, a);
    set({ animals: [...byId.values()] });
    persist(upsertAnimals(merged), 'importAnimals');
  },

  importInventory: (rows) => {
    const inv: FeedInventory = { ...get().inventory };
    for (const r of rows) inv[r.feedType] = { sacos: r.sacos, lb: r.lb };
    set({ inventory: inv });
    persist(upsertInventoryRows(rows), 'importInventory');
  },

  registerService: (femaleId, data) => {
    const { animals, services, currentDate } = get();
    const female = animals.find(a => a.id === femaleId);
    if (!female) return;

    const padrote = data.padroteId ? animals.find(a => a.id === data.padroteId) : undefined;
    const date = data.date ?? currentDate;
    const expected = format(addDays(safeParseISO(date), 114), 'yyyy-MM-dd');
    const isIA = data.tipoServicio === 'Inseminación Artificial';

    const newService: Service = {
      id: crypto.randomUUID(),
      animalId: female.id,
      animalTag: female.tag,
      tipoServicio: data.tipoServicio,
      padroteId: data.padroteId,
      padroteTag: padrote?.tag,
      date,
      // El origen de la dosis solo aplica a inseminación artificial.
      origenSemenNotas: isIA ? (data.origenSemenNotas?.trim() || undefined) : undefined,
      expectedFarrowingDate: expected,
    };

    const femaleChanges: Partial<Animal> = {
      heatStatus: 'Inseminada',
      inseminationDate: date,
      expectedFarrowingDate: expected,
      padrote_id: data.padroteId,
      etapaActual: 'Gestación',
      roomNumber: female.roomNumber ?? firstFreeRoom(animals, 'Gestación', female.id),
      feedType: ZONE_DEFAULT_FEED['Gestación'],
      // Al iniciar una nueva gestación se limpia la camada del parto anterior.
      litterMales: undefined,
      litterFemales: undefined,
    };

    const detalle = [
      data.tipoServicio,
      padrote ? `padrote ${padrote.tag}` : null,
      newService.origenSemenNotas ? `origen: ${newService.origenSemenNotas}` : null,
    ].filter(Boolean).join(' · ');

    set({
      services: [newService, ...services],
      animals: animals.map(a =>
        a.id === femaleId
          ? { ...a, ...femaleChanges, history: [...a.history, { date, event: `Servicio registrado (${detalle}). Parto estimado ${expected}.` }] }
          : a,
      ),
    });

    persist(insertService(newService), 'insertService');
    const f = get().animals.find(a => a.id === femaleId);
    persist(updateAnimal(femaleId, { ...femaleChanges, history: f?.history }), 'registerService(hembra)');
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
    // Toma una sala individual libre de Maternidad al trasladarla.
    const room = firstFreeRoom(get().animals, 'Maternidad', animalId);
    const changes: Partial<Animal> = {
      etapaActual: 'Maternidad',
      roomNumber: room,
      feedType: ZONE_DEFAULT_FEED['Maternidad'],
      dailyConsumption: 12,
    };
    set({
      animals: get().animals.map(a =>
        a.id === animalId
          ? { ...a, ...changes, history: [...a.history, { date: today, event: `Trasladada a Maternidad Sala ${room ?? '—'} (pre-parto)` }] }
          : a
      ),
    });
    const a = get().animals.find(x => x.id === animalId);
    persist(updateAnimal(animalId, { ...changes, history: a?.history }), 'moveToMaternity');
  },
}));

