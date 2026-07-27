export type AnimalRole = 'Madre' | 'Padrote' | 'Ceba';
export type AnimalStatus = 'Activo' | 'Despachado' | 'Fallecido' | 'Descarte/Matadero';
export type HeatStatus = 'En Celo' | 'Inseminada' | 'Embarazada' | 'Lactante' | 'Vacía' | 'Abierta';
export type FeedType =
  | 'Gestación'
  | 'Lactancia'
  | 'Crecimiento'
  | 'Engorde'
  | 'Fase 1'
  | 'Fase 2'
  | 'Fase 3';

/** Catálogo ordenado de tipos de alimento. */
export const FEED_TYPES: readonly FeedType[] = [
  'Gestación', 'Lactancia', 'Crecimiento', 'Engorde', 'Fase 1', 'Fase 2', 'Fase 3',
] as const;

/**
 * Libras por saco según el tipo. Fase 1 y Fase 2 vienen en sacos de ~25 kg
 * (≈55 lb); el resto en sacos de 100 lb.
 */
export const LB_PER_SACO: Record<FeedType, number> = {
  'Gestación': 100,
  'Lactancia': 100,
  'Crecimiento': 100,
  'Engorde': 100,
  'Fase 1': 55,
  'Fase 2': 55,
  'Fase 3': 100,
};

/**
 * Las 4 zonas físicas de la granja. Cada zona se subdivide en cuartos/salas.
 * Son fijas e inmutables.
 */
export type EtapaProductiva = 'Gestación' | 'Maternidad' | 'Destete' | 'Ceba';

export const ETAPAS: readonly EtapaProductiva[] = [
  'Gestación',
  'Maternidad',
  'Destete',
  'Ceba',
] as const;

/** Configuración física de una zona: cuántas salas tiene y cuánto cabe en cada una. */
export interface ZoneConfig {
  /** Cantidad de cuartos/salas de la zona. */
  rooms: number;
  /** Capacidad máxima de animales por sala. */
  capacityPerRoom: number;
  /** Etiqueta de cada sala (1-indexada). */
  roomLabel: (n: number) => string;
}

/**
 * Estructura real de la granja:
 *  - Gestación:  1 sala,   200 cerdas
 *  - Maternidad: 23 salas, 1 cerda por sala (los lechones NO ocupan sala:
 *                van como conteo de la camada de esa cerda)
 *  - Destete:    1 sala,   300 cerdos
 *  - Ceba:       1 sala,   500 cerdos
 */
export const ZONES: Record<EtapaProductiva, ZoneConfig> = {
  'Gestación': { rooms: 1,  capacityPerRoom: 200, roomLabel: () => 'Sala Principal' },
  'Maternidad': { rooms: 23, capacityPerRoom: 1,  roomLabel: (n) => `Sala ${n}` },
  'Destete':   { rooms: 1,  capacityPerRoom: 300, roomLabel: () => 'Sala Principal' },
  'Ceba':      { rooms: 1,  capacityPerRoom: 500, roomLabel: () => 'Sala Principal' },
};

/** Capacidad total de la zona (salas × capacidad por sala). */
export const ETAPA_CAPACITY: Record<EtapaProductiva, number> = Object.fromEntries(
  ETAPAS.map(z => [z, ZONES[z].rooms * ZONES[z].capacityPerRoom]),
) as Record<EtapaProductiva, number>;

/** Alimento por defecto que consume cada zona. */
export const ZONE_DEFAULT_FEED: Record<EtapaProductiva, FeedType> = {
  'Gestación': 'Gestación',
  Maternidad: 'Lactancia',
  Destete: 'Fase 1',
  Ceba: 'Engorde',
};

/**
 * Alimentos permitidos por zona (para validar el consumo). Destete admite
 * Fase 1/2/3; el resto de zonas tiene un único alimento válido.
 */
export const ZONE_ALLOWED_FEEDS: Record<EtapaProductiva, FeedType[]> = {
  'Gestación': ['Gestación'],
  Maternidad: ['Lactancia'],
  Destete: ['Fase 1', 'Fase 2', 'Fase 3'],
  Ceba: ['Engorde'],
};

export interface Animal {
  id: string;
  tag: string;
  role?: AnimalRole;
  gender: 'Macho' | 'Hembra';
  breed: string;
  birthDate: string;
  birthTime?: string;       // hora exacta del nacimiento (HH:mm), opcional
  weight: number;
  etapaActual: EtapaProductiva;
  /** Sala/cuarto que ocupa dentro de su zona (1-indexada). */
  roomNumber?: number;
  /**
   * Camada del parto actual (solo cerdas en Maternidad). Los lechones NO son
   * animales independientes mientras están con la madre: se llevan como conteo
   * asociado a la cerda y su sala. Al destetar se convierten en animales con ID.
   */
  litterMales?: number;
  litterFemales?: number;
  feedType: FeedType;
  dailyConsumption: number;
  status: AnimalStatus;
  heatStatus?: HeatStatus;
  lastHeatDate?: string;
  inseminationDate?: string;
  expectedFarrowingDate?: string;
  lastFarrowingDate?: string;
  lastWeaningDate?: string;
  totalFarrowings?: number;
  madre_id?: string;
  padrote_id?: string;
  weights: { date: string; weight: number }[];
  vaccinations: { date: string; vaccine: string }[];
  history: { date: string; event: string }[];
}

export type FeedInventory = Record<FeedType, { sacos: number; lb: number }>;

// ---------------------------------------------------------------------------
// Insumos generales (jabón, papel, guantes, etc.)
// ---------------------------------------------------------------------------

export const DEFAULT_SUPPLY_MIN_STOCK = 10;

/**
 * Límite de partos en la vida útil de una cerda. Al alcanzarlo, el perfil
 * muestra una alerta visual. Editable (futura pantalla de configuración).
 */
export const LIFETIME_FARROWING_LIMIT = 10;

export interface Supply {
  id: string;
  name: string;        // Nombre del insumo
  brand?: string;      // Marca (opcional)
  quantity: number;    // Cantidad en stock (entero)
  minStock: number;    // Umbral de alerta de stock mínimo (editable, default 10)
}

// ---------------------------------------------------------------------------
// Servicios / Montas (registro reproductivo)
// ---------------------------------------------------------------------------

export type ServiceType = 'Monta Natural' | 'Inseminación Artificial';

export const SERVICE_TYPES: readonly ServiceType[] = [
  'Monta Natural',
  'Inseminación Artificial',
] as const;

export interface Service {
  id: string;
  animalId: string;             // cerda servida
  animalTag: string;
  tipoServicio: ServiceType;
  padroteId?: string;           // macho reproductor responsable
  padroteTag?: string;
  date: string;                 // fecha del servicio
  /** Origen de la dosis (proveedor, casa genética, lote…). Solo en I.A. */
  origenSemenNotas?: string;
  expectedFarrowingDate?: string;
}

// ---------------------------------------------------------------------------
// Contactos (Clientes / Proveedores)
// ---------------------------------------------------------------------------

export type ContactType = 'Cliente' | 'Proveedor';

export interface Contact {
  id: string;
  commercialName: string;   // Nombre Comercial
  legalName: string;        // Nombre Legal (Razón Social)
  ruc: string;              // RUC
  phone: string;            // Teléfono
  location: string;         // Ubicación
  email?: string;           // opcional
  contactPerson?: string;   // Persona de Contacto (opcional)
  type: ContactType;        // Cliente | Proveedor
}

// ---------------------------------------------------------------------------
// Pagos
// ---------------------------------------------------------------------------

export type PaymentMethod = 'Cheque' | 'ACH' | 'Efectivo' | 'Otro';

export interface PaymentInfo {
  method: PaymentMethod;
  detail?: string;          // detalles cuando method === 'Otro'
  date: string;
}

/** Línea de alimento dentro de una factura de compra. */
export interface PurchaseItem {
  feedType: FeedType;
  sacosQty: number;
  pricePerSaco: number;     // precio por saco
  // peso por saco según LB_PER_SACO[feedType]; subtotal = sacosQty * pricePerSaco
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;    // ingresado por el usuario (ej: FAC-C-045)
  supplier: string;
  contactId?: string;       // vínculo al contacto (Proveedor)
  date: string;             // Fecha de Factura
  time?: string;            // Hora de Entrega (HH:mm)
  items: PurchaseItem[];    // líneas de alimento
  totalSacos: number;       // suma de sacos
  totalLbs: number;         // suma de sacosQty * LB_PER_SACO[feedType]
  totalAmount: number;      // suma de subtotales
  status: 'Pendiente' | 'Pagado';
  payment?: PaymentInfo;
}

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;    // ingresado por el usuario (ej: FAC-V-012)
  customer: string;
  contactId?: string;       // vínculo al contacto (Cliente)
  date: string;             // Fecha de Venta
  time?: string;            // Hora de Venta (HH:mm)
  pigCount: number;         // Cantidad de Cerdos
  pigTags?: string[];       // tags despachados (opcional)
  totalWeightLbs: number;
  totalAmount: number;
  status: 'Pendiente' | 'Pagado';
  payment?: PaymentInfo;
}

// ---------------------------------------------------------------------------
// Biological automation engine
// ---------------------------------------------------------------------------

export type AlertSeverity = 'info' | 'warning' | 'critical';

/** Las áreas operativas que agrupan alertas en el Dashboard. */
export type AlertType = 'Gestación' | 'Maternidad' | 'Destete' | 'Ceba' | 'Inventario';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  action?: string;
  // Metadatos opcionales para enlazar la alerta a un animal concreto.
  animalId?: string;
  animalTag?: string;
}

/** Actualización de una métrica/KPI del motor biológico. */
export interface KPIUpdate {
  metrica: 'gestacion' | 'maternidad' | 'destete' | 'ceba';
  valor: number;
  total?: number;
}

export interface MedicalTask {
  id: string;
  protocolDay: number;
  task: string;
  animalTags: string[];
  count: number;
}

export interface Mutation {
  animalId: string;
  changes: Partial<Animal>;
  reason: string;
}

export interface BioEvaluation {
  alerts: Alert[];
  mutations: Mutation[];
  kpis: KPIUpdate[];
  medicalAgenda: MedicalTask[];
}

export interface InventoryTransaction {
  id: string;
  date: string;
  feedType: FeedType;
  operation: 'Carga' | 'Consumo';
  sacos?: number;
  lb: number;
  note?: string;
}
