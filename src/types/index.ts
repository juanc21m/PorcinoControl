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
 * Las 5 etapas productivas del negocio. Sustituyen por completo al antiguo
 * mapeo de ubicaciones físicas (Galeras/Cuartos). Son fijas e inmutables.
 */
export type EtapaProductiva = 'Reemplazo' | 'Gestación' | 'Maternidad' | 'Destete' | 'Ceba';

export const ETAPAS: readonly EtapaProductiva[] = [
  'Reemplazo',
  'Gestación',
  'Maternidad',
  'Destete',
  'Ceba',
] as const;

/**
 * Capacidad máxima de animales por zona. Valores iniciales sensatos; ajústalos
 * a tu granja (futura pantalla de configuración los hará editables).
 */
export const ETAPA_CAPACITY: Record<EtapaProductiva, number> = {
  Reemplazo: 30,
  'Gestación': 150,
  Maternidad: 23,
  Destete: 200,
  Ceba: 500,
};

/** Alimento por defecto que consume cada zona (etapa productiva). */
export const ZONE_DEFAULT_FEED: Record<EtapaProductiva, FeedType> = {
  Reemplazo: 'Crecimiento',
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
  Reemplazo: ['Crecimiento'],
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
  weight: number;
  etapaActual: EtapaProductiva;
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
export type AlertType = 'Gestación' | 'Maternidad' | 'Destete' | 'Inventario' | 'Reemplazo' | 'Ceba';

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
  metrica: 'reemplazo' | 'gestacion' | 'maternidad' | 'destete' | 'ceba';
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
