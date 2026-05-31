# ESPECIFICACIONES PORCICONTROL ERP (V3.0)

**Fecha:** 30 de Mayo, 2026  
**Empresa:** Agro Comercial Moreno  
**Rol:** Senior Full-Stack Developer, UX/UI Expert & Product Architect  
**Objetivo:** Transformar la app React en un ERP industrial de alta fidelidad para gestión porcina con automatización biológica, reglas de negocio estrictas y reconciliación financiera.

---

## 1. IDENTIDAD DE MARCA & DISEÑO VISUAL

### Paleta de Colores
- **Verde Primario:** `#2E7D32` (Marca Moreno)
- **Verde Claro/Acento:** `#4CAF50` (Llamadas a acción, KPIs)
- **Fondo Oscuro:** `#070d07` (Negro con tinte verde muy sutil)
- **Fondo Cards:** `rgba(46, 125, 50, 0.06)`
- **Borde Cards:** `rgba(46, 125, 50, 0.25)`
- **Texto Principal:** `#E8F5E9` (Blanco cálido)
- **Texto Secundario:** `#81C784` (Verde suave)
- **Alerta Crítica:** `#ef4444` (Rojo)

### Logo
- Archivo: `/public/logo.png`
- Descripción: Círculo verde con tractor y letra M, recortado sin fondo
- Tamaño navbar: `height: 40px`
- Posición: Esquina superior izquierda del navbar

### Layout Visual
- **Navbar:** Horizontal superior, `height: 64px`
  - Logo Moreno a la izquierda
  - Links centrados: Dashboard / Trazabilidad / Finanzas / Inventario / Portal
  - Indicador activo: línea verde inferior + texto verde brillante
  - Fondo: `rgba(7, 13, 7, 0.95)` con `backdrop-filter: blur(12px)`
  - Borde inferior: `1px solid rgba(46, 125, 50, 0.3)`

- **Cards/Paneles:**
  - Fondo: `rgba(255,255,255,0.03)`
  - Borde: `1px solid rgba(46,125,50,0.2)`
  - Border-radius: `12px`
  - Glow: `box-shadow: 0 0 20px rgba(46,125,50,0.08)`
  - Hover: borde cambia a `rgba(76,175,80,0.5)`, glow aumenta

- **Dashboard:**
  - Bento grid asimétrico
  - Fila superior: 3 KPI grandes (números 64px, verde brillante)
  - Fila media: gráfica grande + panel de alertas
  - Fila inferior: tabla actividad

---

## 2. STACK TECNOLÓGICO

- **Frontend:** React 18 + TypeScript (strict mode)
- **Bundler:** Vite 6.x
- **Estilos:** Tailwind CSS v3
- **Navegación:** React Router DOM v6
- **Iconos:** Lucide React
- **Gráficas:** Recharts (basado en SVG)
- **Base de Datos (Futura):** Supabase (PostgreSQL)
- **Hosting:** Vercel (frontend)

---

## 3. MÓDULOS & FUNCIONALIDADES DETALLADAS

### 3.1 DASHBOARD (/)
**Responsabilidad:** Vista ejecutiva en tiempo real con KPIs, alertas biológicas y financieras.

#### KPI Cards (Fila Superior)
- **Card 1:** "342" | "Animales Activos"
- **Card 2:** "1,240 lb" | "Alimento Consumido Hoy"
- **Card 3:** "$4,850" | "Facturación Pendiente"

#### Gráficas
- **Inventario Alimento por Tipo:** BarChart Recharts (Crecimiento/Engorde/Lactancia)
- **Tendencia de Ocupación (Gestación/Maternidad):** LineChart

#### Panel de Alertas Críticas
- Dot pulsante rojo (#ef4444) para críticas
- Dot verde (#4CAF50) para informativas
- Ejemplos:
  - "Cerda M-00247: Revisar preñez (21 días post-monta)"
  - "Inventario Alimento Engorde: 45 sacos disponibles"
  - "3 cerdas próximas a abrir (Días abiertos > 7)"

#### Tabla de Actividad Reciente
- Últimas 5 transacciones: fecha, animal/tipo, acción, estado

#### Agenda Médica Diaria (NEW)
- Listado automático de tareas según edad de lechones
- Basado en birthdates de la cohort actual
- Permite marcar como "Completada"

---

### 3.2 TRAZABILIDAD (/traceability)
**Responsabilidad:** Registro de vida completo de cada animal, genealogía y salud.

#### Tabla de Animales Activos
- Columnas: TAG, Género, Rol, Estado, Peso Actual, Edad, Acción (Ver Detalles)
- Filtros: por Rol, por Estado, búsqueda por TAG

#### Panel Lateral: Perfil del Cerdo (Detail View)
- **Sección General:**
  - TAG, Género, Rol, Raza, Fecha Nacimiento, Peso Actual, Status
  - Galera Actual, Feed Type, Consumo Diario

- **Sección Genealogía:**
  - Madre ID (link clickeable)
  - Padrote ID (link clickeable)
  - Lechones (si es madre)

- **Sección Historial Clínico (NEW - Bitácora):**
  - Chronological feed de eventos
  - Timestamp automático
  - Operador puede loguear: observaciones, intervenciones médicas, cambios de estado
  - Ejemplo: "Inyectada Emicina - Juan López - 30/05/2026 09:15"

- **Gráfica de Pesos:** Mini LineChart mostrando curva de crecimiento
- **Historial de Vacunas:** Tabla con fecha, vacuna, aplicador
- **Estado Reproductivo (si es hembra):**
  - En Celo / Inseminada / Embarazada / Lactante / Vacía
  - Fechas clave: último celo, inseminación, fecha parto esperada

#### Formularios
- **Agregar Puerco Nuevo:**
  - Campos: Género, Rol, Fecha Nacimiento, Raza, Peso inicial
  - Al guardar: auto-genera TAG (M-XXXXX o H-XXXXX)
  
- **Registrar Parto:**
  - **Madre:** dropdown de cerdas embarazadas
  - **Padrote (NEW):** dropdown filtrando `role === 'Padrote'`
  - Cantidad lechones, peso promedio camada
  - Al guardar:
    - Crea registros de cada lechón
    - Transiciona madre a "Lactante"
    - Cambia consumo a "Lactancia" (12 lb/día)
    - Reloca a Galera 2 (Maternidad)
    - Registra en historial

---

### 3.3 INVENTARIO DE ALIMENTOS (/inventory) — NEW
**Responsabilidad:** Gestión manual 100% de stock de alimentos vinculado a auditorías físicas.

#### Dashboard de Inventario
- **3 Cards Grandes:** Sacos totales por tipo (Crecimiento/Engorde/Lactancia)
- **Tabla de Stock:**
  - Columnas: Tipo, Sacos en Stock, Libras en Stock, Acciones (editar)

#### Formularios de Movimiento
- **"Registrar Movimiento"** — Modal dinámico
  - Selector: `Transacción` (Compra/Ingreso, Uso/Egreso, Ajuste)
  
  - **Si Compra/Ingreso:**
    - Tipo alimento (select)
    - Cantidad sacos
    - Precio/saco (opcional)
    - **Número de Factura (MANDATORIO)** — vincula a documento financiero
    - Botón "Guardar"
    - Al guardar: suma sacos y libras (1 saco = 35 lb)

  - **Si Uso/Egreso:**
    - Tipo alimento (select)
    - Libras a restar
    - **Destino/Ubicación (MANDATORIO):** dropdown (Galera 1, 2, 3, 4, Maternidad, etc.)
    - Botón "Restar del Inventario"

#### Historial de Transacciones
- Tabla: Fecha, Tipo Alimento, Operación, Cantidad, Destino, Usuario
- Últimas 20 transacciones

---

### 3.4 FINANZAS (/finances)
**Responsabilidad:** Libro mayor, gestión de facturas, cuadre de caja.

#### Tabs Principales

**Tab 1: Facturas por Pagar**
- Sub-tabs: `[ Pendientes | Pagadas ]`
- Tabla de compras de alimento/servicios

**Tab 2: Facturas por Cobrar**
- Sub-tabs: `[ Pendientes | Cobradas ]`
- Tabla de ventas de animales/productos

**Tab 3: Cuadre de Caja**
- Resumen: Total Facturado vs Total Cobrado, Diferencia Pendiente
- Alerta si desvío > 5%

#### Formulario "Nueva Factura"
- **Campos Mandatorios:**
  - Tipo: Compra (AP) o Venta (AR)
  - **Contacto (NEW):** dropdown vinculado a Contactos
    - Option especial: "Otros" → si se selecciona, renderiza campo libre: `Nombre de persona independiente`
  - Número de Factura
  - Fecha
  - Descripción (si Compra: tipo alimento; si Venta: descripción de lote)
  - Monto Total

- **Campos Adicionales (según tipo):**
  - Compra: Proveedor, cantidad sacos (si alimento)
  - Venta: Animales despachados (multi-select de TAGs)

#### Payment Workflow (Modal)
- Click en botón "Pagar" o "Cobrar" → abre **"Confirmar Pago"** modal
- **Campos en Modal:**
  - **Método de Pago (MANDATORIO):** selector con opciones:
    - ACH
    - Efectivo
    - Cheque
    - Yappy
  - Fecha de Pago
  - Referencia/Nota (opcional)
- **Confirmación:**
  - Al confirmar: muta status factura a `Pagada` o `Cobrada`
  - Registra método de pago en historial
  - Recalcula balances globales

---

### 3.5 CONTACTOS (/contacts) — UPDATED
**Responsabilidad:** Directorio de clientes y proveedores.

#### Navigation
- Tabs: `[ Clientes | Proveedores ]` — NO "Todos"
- Strict routing (no default a ambos)

#### Tabla de Contactos
- Columnas: Nombre Comercial, RUC, Teléfono, Ubicación, Acciones (editar/eliminar)

#### Formulario "Nuevo Contacto"
- **Mandatorios:**
  - Nombre Comercial
  - Nombre Legal (Razón Social)
  - **Número de RUC (NEW)**
  - Ubicación (ciudad/región)
  - Teléfono
  - Rol: Cliente / Proveedor

- **Opcionales:**
  - Email
  - Persona de Contacto (free text)

---

### 3.6 DATABASE PORTAL (/portal)
**Responsabilidad:** Consola técnica para auditoría y demostración de API.

#### Sección 1: Esquema PostgreSQL
- Volcado completo de DDL (CREATE TABLE statements)
- Relaciones, constraints, índices

#### Sección 2: Sandbox REST API
- Selector de endpoint: GET /animals/:tag, POST /animals/farrowing, GET /invoices/pending, etc.
- Botón "Ejecutar"
- Respuesta JSON con datos del estado actual

---

## 4. DATA MODEL & TIPOS TYPESCRIPT

```typescript
// types/index.ts

export type AnimalRole = 'Madre' | 'Padrote' | 'Ceba';
export type AnimalStatus = 'Activo' | 'Despachado' | 'Fallecido' | 'Descarte/Matadero';
export type HeatStatus = 'En Celo' | 'Inseminada' | 'Embarazada' | 'Lactante' | 'Vacía' | 'Abierta';
export type FeedType = 'Crecimiento' | 'Engorde' | 'Lactancia';
export type GaleraLocation = 1 | 2 | 3 | 4 | 'Maternidad' | 'Gestación';
export type InvoiceType = 'Compra' | 'Venta';
export type InvoiceStatus = 'Pendiente' | 'Pagada' | 'Cobrada';
export type PaymentMethod = 'ACH' | 'Efectivo' | 'Cheque' | 'Yappy';
export type ContactRole = 'Cliente' | 'Proveedor';

export interface Animal {
  id: string; // UUID
  tag: string; // M-XXXXX / H-XXXXX (unique)
  role: AnimalRole;
  gender: 'Macho' | 'Hembra';
  breed: string;
  birthDate: string; // YYYY-MM-DD
  weight: number; // Peso actual en lb
  currentGalera: GaleraLocation;
  feedType: FeedType;
  dailyConsumption: number; // lb/day
  status: AnimalStatus;
  madre_id?: string | null;
  padrote_id?: string | null;
  
  // Reproductive metadata (hembras)
  heatStatus?: HeatStatus;
  lastHeatDate?: string;
  inseminationDate?: string;
  expectedFarrowingDate?: string;
  lastFarrowingDate?: string;
  totalFarrowings?: number; // Contador de partos (max 8 para descarte)
  
  // Clinical history
  weights: { date: string; weight: number }[];
  vaccinations: { date: string; vaccine: string; appliedBy: string }[];
  clinicalNotes: { date: string; time: string; event: string; user: string }[]; // Bitácora clínica
  history: { date: string; event: string }[];
}

export interface FeedInventory {
  Crecimiento: { sacos: number; lb: number };
  Engorde: { sacos: number; lb: number };
  Lactancia: { sacos: number; lb: number };
}

export interface FeedMovement {
  id: string;
  date: string;
  feedType: FeedType;
  operation: 'Compra' | 'Uso' | 'Ajuste';
  quantity: number; // sacos o lb según operación
  destination?: GaleraLocation; // Mandatorio si Uso/Egreso
  invoiceNumber?: string; // Mandatorio si Compra/Ingreso
  user: string;
}

export interface Contact {
  id: string;
  nombreComercial: string;
  nombreLegal: string; // Razón Social
  ruc: string; // NEW
  ubicacion: string;
  telefono: string;
  email?: string;
  personaContacto?: string;
  role: ContactRole;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  contactId: string; // Link a Contacts, o null si "Otros"
  contactName?: string; // Si contactId es null, nombre libre
  paymentMethod?: PaymentMethod; // Registrado al marcar como pagada
  date: string;
  description: string;
  amount: number;
  status: InvoiceStatus;
  paidDate?: string;
  pigTags?: string[]; // Si Venta: animales despachados
  totalWeight?: number; // Si Venta: peso total
  paymentDate?: string;
  paymentNote?: string;
}

export interface AppState {
  animals: Animal[];
  feedInventory: FeedInventory;
  feedMovements: FeedMovement[];
  invoices: Invoice[];
  contacts: Contact[];
  currentDate: string; // YYYY-MM-DD (simula date.now())
}
```

---

## 5. MOTOR DE AUTOMATIZACIÓN BIOLÓGICA (BIOLOGICAL EVENT BUS)

**Objetivo:** Implementar un evaluation engine robusto que evalúe el estado actual de `Animals` contra `currentDate` y dispare alertas, KPIs y mutaciones automáticas basadas en reglas biológicas estrictas.

### AREA 1: REEMPLAZO & CERDAS MADRES
- **Regla:** Cerdas de reemplazo se seleccionan a los 30 días de edad. Cuota: 5 nuevas reemplazas/mes.
- **Implementación:**
  - Dashboard KPI: "Cuota de Reemplazo: X / 5"
  - Filtrar hembras > 30 días con mejores métricas de peso
  - Marcar en UI como "Reemplazo Sugerido" (verde claro, opción de confirmación)

### AREA 2: GESTACIÓN
- **Capacidad:** 150 cerdas máximo en gestación
- **Tracker:** "Ocupación Gestación: X / 150" (Dashboard KPI)
- **Entrada:** Hembras entran a Gestación a los 6 meses de edad
- **Revisión Preñez (Day 21):**
  - Si `currentDate - fecha_monta === 21 días`, dispara alerta **crítica roja:**
    - "Revisar celo de [TAG] - Confirmar Preñez"
    - Botón de acción: "Confirmar Embarazo" (muta a Embarazada) o "Reintentar Monta"
- **Countdown Parto (Day 111):**
  - Total gestación = 114 días
  - Si `currentDate - fecha_monta === 111`, resalta la cerda en **rojo vivo**
  - Alerta crítica: "TRASLADAR A MATERNIDAD: [TAG] (3 días para parto)"
  - Acción quick: botón "Trasladar a Maternidad"

### AREA 3: MATERNIDAD
- **Capacidad:** 23 salas de maternidad
- **Duración:** 21 días post-parto
- **Tracker:** "Ocupación Maternidad: X / 23"
- **Auditoria de Peso al Nacer:**
  - Al registrar parto, calcula peso promedio de la camada
  - Si promedio < 1.3 kg → alerta naranja: "⚠️ Peso Bajo al Nacer [TAG] - Lote de X lechones"
- **Días Abiertos (Open Days) - CRÍTICO:**
  - Post-destete, cerdas deben mostrar celo dentro de 7 días
  - Si `currentDate - fecha_destete > 7 días` y NO hay nuevo celo registrado → **alerta roja**
  - Dashboard: "Cerdas a Preñar Esta Semana: [Array de TAGs]"
  - Operador debe registrar nuevo celo o evaluar descarte
- **Regla de Jubilación:**
  - Si `totalFarrowings === 8` → automáticamente lockear perfil
  - Muta status a "Descarte/Matadero"
  - Deshabilita botones de reproducción (grisados)
  - Nota: Farm target es 2.5 partos/año/cerda productiva

### AREA 4: DESTETE & CALENDARIO MÉDICO AUTOMÁTICO
- **Implementación:** Generar "Agenda Médica Diaria" en Dashboard basada en birthdates de lechones activos
- **Protocolo según edad (días de vida):**
  - **Day 0:** Inyectar Emicina
  - **Day 3:** Inyectar Hierro
  - **Day 7:** Antidiarreico Oral
  - **Day 10:** Capar machos
  - **Day 21:** Inyectar Vitamina + Circovirus, **TRASLADAR a pens individuales** (fuera Maternidad)
  - **Day 70:** Desparasitante, **FORZAR pesaje**, target 65 lb
    - Si promedio cohort < 65 lb → alerta naranja: "Cohort [LOTE-ID] por debajo de target"

### AREA 5: CEBA (FATTENING)
- **Regla:** Entrada a Ceba = Day 70 de vida, duración mínima 80 días
- **Exit Target:** 230 lb a los 150 días de vida
- **KPI Financiero (Proyección de Venta):**
  - Dashboard widget: "Proyección de Venta (14 días)"
  - Calcula: número de pigs próximos a 150 días × 230 lb target = inventario live-weight para mercado
  - Actualiza automáticamente diariamente
  - Sirve para forecasting de ingresos

---

## 6. INSTRUCCIONES PARA CLAUDE CODE

### Lectura & Comprensión
1. Lee completamente esta especificación
2. Entiende la jerarquía biológica: Reemplazo → Gestación → Maternidad → Destete → Ceba
3. Identifica los 3 tipos de alertas: informativa (verde), warning (naranja), crítica (roja)

### Refactorización de Componentes
1. **DELETE:** Pestaña global "Salud" de navegación
2. **REFACTOR:** Agregar "Bitácora Clínica" dentro del Perfil del Cerdo detail view
3. **UPDATE:** Modal "Registrar Parto" con dropdown Padrote (filter `role === 'Padrote'`)
4. **DECOUPLE:** Inventario de alimentos → manual 100%, con triggers de número de factura y destino
5. **REFACTOR:** Contactos → strict tabs (no "Todos"), agregar campo RUC y "Otros"
6. **IMPLEMENT:** Payment workflow modal con métodos de pago y confirmación
7. **CREATE:** Nueva página `/inventory` con formulario de movimientos dinámicos
8. **CREATE:** Agenda Médica Diaria en Dashboard

### Implementación del Motor Biológico
1. Crea utilidad `evaluateBiologicalRules(animals, currentDate)` que retorna:
   ```typescript
   {
     alerts: Alert[], // array de alertas con tipo, severity, acción
     mutations: Mutation[], // cambios de estado automáticos a aplicar
     kpis: KPIUpdate[] // actualizaciones de métricas
   }
   ```
2. Evalúa estas reglas **diariamente** (en useEffect o context)
3. Dispara cambios de UI según severidad de alerta
4. No sobrescribas estilos CSS existentes; inyecta lógica en componentes

### Validación & QA
- `npm run build` debe completar sin errores
- `npm run dev` debe correr sin warnings críticos
- Todos los tipos TypeScript deben compilar en strict mode
- Documentar cualquier cambio estructural en un `CHANGELOG.md`

---

## 7. PRIORIDADES DE IMPLEMENTACIÓN

**Fase 1 (Inmediato):**
- Refactorización de CRUD: Parto (padrote), Contactos (RUC), Inventory (dinámico)
- Payment workflow modal
- Bitácora clínica en Perfil

**Fase 2 (Esta semana):**
- Motor biológico (alertas de preñez, días abiertos, jubilación)
- Agenda Médica Diaria
- Dashboard KPIs: Reemplazo, Ocupación, Proyección Venta

**Fase 3 (Siguiente semana):**
- Integración Supabase (cuando BD esté lista)
- Export/Report de datos
- Mobile responsiveness

---

## 8. NOTAS FINALES

- Mantén el **aesthetic FUI** (glassmorphism, colores neon-teal, dark theme) en todos los cambios
- Todas las **mutaciones de estado** deben ser type-safe y validadas
- Las **alertas** deben ser dismissibles pero registradas en historial
- El **cumplimiento de cuotas** (reemplazo, capacidad) es crítico para operaciones de granja

**En caso de dudas, consulta esta especificación antes de hacer cambios estructurales.**

---

*Documento versión 3.0 | Última actualización: 30 de Mayo, 2026*
