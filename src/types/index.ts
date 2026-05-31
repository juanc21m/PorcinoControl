export type AnimalRole = 'Madre' | 'Padrote' | 'Ceba';
export type AnimalStatus = 'Activo' | 'Despachado' | 'Fallecido' | 'Descarte/Matadero';
export type HeatStatus = 'En Celo' | 'Inseminada' | 'Embarazada' | 'Lactante' | 'Vacía' | 'Abierta';
export type FeedType = 'Crecimiento' | 'Engorde' | 'Lactancia';

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

/** Capacidad máxima por etapa (0 = sin límite definido). */
export const ETAPA_CAPACITY: Record<EtapaProductiva, number> = {
  Reemplazo: 0,
  Gestación: 150,
  Maternidad: 23,
  Destete: 0,
  Ceba: 0,
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

export interface FeedInventory {
  Crecimiento: { sacos: number; lb: number };
  Engorde: { sacos: number; lb: number };
  Lactancia: { sacos: number; lb: number };
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
  // peso por saco fijo = 35 lb; subtotal = sacosQty * pricePerSaco
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
  totalLbs: number;         // totalSacos * 35
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
export type AlertType = 'Gestación' | 'Maternidad' | 'Destete' | 'Inventario' | 'Reemplazo';

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
