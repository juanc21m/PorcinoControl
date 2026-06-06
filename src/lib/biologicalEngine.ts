import { differenceInDays } from 'date-fns';
import { safeParseISO } from './date';
import type {
  Animal,
  Alert,
  Mutation,
  KPIUpdate,
  MedicalTask,
  BioEvaluation,
  FeedInventory,
} from '../types';

// ---------------------------------------------------------------------------
// Biological constants (from ESPECIFICACIONES v3.0 — Section 5)
// ---------------------------------------------------------------------------

export const BIO = {
  GESTATION_DAYS: 114,
  PREGNANCY_CHECK_DAY: 21,
  FARROW_COUNTDOWN_DAY: 111,
  WEANING_DAYS: 21,
  CEBA_TRANSITION_DAY: 70,
  OPEN_DAYS_LIMIT: 7,
  MAX_FARROWINGS: 8,
  GESTATION_CAPACITY: 150,
  MATERNITY_CAPACITY: 23,
  REPLACEMENT_QUOTA: 5,
  REPLACEMENT_MIN_AGE: 30,
  CEBA_EXIT_DAY: 150,
  CEBA_EXIT_WEIGHT: 230,
  DAY70_TARGET_WEIGHT: 65,
  LOW_BIRTH_WEIGHT_LB: 2.87, // ≈ 1.3 kg
  SALES_PROJECTION_WINDOW: 14,
} as const;

// Calendario médico (edad en días de vida → tarea)
const MEDICAL_PROTOCOL: { day: number; task: string }[] = [
  { day: 0,  task: 'Inyectar Emicina' },
  { day: 3,  task: 'Inyectar Hierro' },
  { day: 7,  task: 'Antidiarreico Oral' },
  { day: 10, task: 'Capar machos' },
  { day: 21, task: 'Vitamina + Circovirus · Trasladar a pens individuales' },
  { day: 70, task: 'Desparasitante · Forzar pesaje (target 65 lb)' },
];

function ageInDays(birthDate: string, currentDate: string): number {
  return differenceInDays(safeParseISO(currentDate), safeParseISO(birthDate));
}

function daysSince(date: string, currentDate: string): number {
  return differenceInDays(safeParseISO(currentDate), safeParseISO(date));
}

// ---------------------------------------------------------------------------
// Core evaluation engine
// ---------------------------------------------------------------------------

export function evaluateBiologicalRules(animals: Animal[], currentDate: string): BioEvaluation {
  const alerts: Alert[] = [];
  const mutations: Mutation[] = [];

  const active = animals.filter(a => a.status === 'Activo');

  // Accumulators
  const openSows: string[] = [];                                   // días abiertos
  const day0LowWeight: { tag: string; weight: number }[] = [];     // peso bajo al nacer
  const day70Cohort: { tag: string; weight: number }[] = [];       // chequeo target día 70
  const medicalBuckets: Record<number, string[]> = {};             // agenda médica
  const replacementCandidates: Animal[] = [];                      // reemplazos sugeridos
  const salesTags: string[] = [];                                  // proyección de venta

  for (const a of active) {
    const age = ageInDays(a.birthDate, currentDate);

    // ---- Motor de transición biológica: flujo entre etapas productivas ----
    // La camada avanza Maternidad → Destete (día 21) → Ceba (día 70).
    if (a.role === 'Ceba') {
      if (age >= BIO.CEBA_TRANSITION_DAY && a.etapaActual !== 'Ceba') {
        mutations.push({
          animalId: a.id,
          changes: { etapaActual: 'Ceba' },
          reason: `Transición automática a Ceba (día ${age} de vida)`,
        });
      } else if (
        age >= BIO.WEANING_DAYS &&
        age < BIO.CEBA_TRANSITION_DAY &&
        a.etapaActual === 'Maternidad'
      ) {
        mutations.push({
          animalId: a.id,
          changes: { etapaActual: 'Destete' },
          reason: `Destete automático: traslado a etapa Destete (día ${age} de vida)`,
        });
      }
    }

    // ---- AREA 4: Destete & calendario médico automático ----
    for (const p of MEDICAL_PROTOCOL) {
      if (age === p.day && (a.role === 'Ceba' || age <= 70)) {
        (medicalBuckets[p.day] ||= []).push(a.tag);
      }
    }
    if (age === BIO.CEBA_TRANSITION_DAY && a.role === 'Ceba') {
      day70Cohort.push({ tag: a.tag, weight: a.weight });
    }

    // ---- AREA 3 (parte): peso bajo al nacer ----
    if (a.role === 'Ceba' && age <= 2 && a.weight < BIO.LOW_BIRTH_WEIGHT_LB) {
      day0LowWeight.push({ tag: a.tag, weight: a.weight });
    }

    // ---- AREA 5: Ceba — proyección de venta (próximos 14 días a los 150) ----
    if (a.role === 'Ceba' && age >= BIO.CEBA_EXIT_DAY - BIO.SALES_PROJECTION_WINDOW && age <= BIO.CEBA_EXIT_DAY) {
      salesTags.push(a.tag);
    }

    // ---- AREA 1: Reemplazo (hembras Ceba > 30 días) ----
    if (a.gender === 'Hembra' && a.role === 'Ceba' && age > BIO.REPLACEMENT_MIN_AGE) {
      replacementCandidates.push(a);
    }

    if (a.gender !== 'Hembra') continue;

    // ---- AREA 2: Gestación ----
    if (a.inseminationDate && (a.heatStatus === 'Inseminada' || a.heatStatus === 'Embarazada')) {
      const gest = daysSince(a.inseminationDate, currentDate);

      // Revisión preñez (Day 21) — solo si aún Inseminada (no confirmada)
      if (a.heatStatus === 'Inseminada' && gest === BIO.PREGNANCY_CHECK_DAY) {
        alerts.push({
          id: `preg21-${a.id}`,
          type: 'Gestación',
          severity: 'critical',
          title: 'Confirmar Preñez',
          message: `Revisar preñez de ${a.tag} — Confirmar embarazo (21 días post-monta)`,
          action: 'Confirmar Embarazo o Reintentar Monta',
          animalId: a.id,
          animalTag: a.tag,
        });
      }

      // Countdown parto (Day 111 → trasladar a maternidad)
      if (gest === BIO.FARROW_COUNTDOWN_DAY && a.etapaActual !== 'Maternidad') {
        const remaining = BIO.GESTATION_DAYS - gest;
        alerts.push({
          id: `farrow-${a.id}`,
          type: 'Gestación',
          severity: 'critical',
          title: 'Trasladar a Maternidad',
          message: `⚠️ TRASLADAR A MATERNIDAD: ${a.tag} (${remaining} días para parto esperado)`,
          action: 'Trasladar a Maternidad',
          animalId: a.id,
          animalTag: a.tag,
        });
      }

      // Parto vencido
      if (gest >= BIO.GESTATION_DAYS) {
        alerts.push({
          id: `overdue-${a.id}`,
          type: 'Gestación',
          severity: 'critical',
          title: 'Parto Vencido',
          message: `Parto VENCIDO: ${a.tag} lleva ${gest} días de gestación (>${BIO.GESTATION_DAYS})`,
          animalId: a.id,
          animalTag: a.tag,
        });
      }
    }

    // ---- AREA 3: Maternidad — Días Abiertos (post-destete) ----
    if (
      a.role === 'Madre' &&
      a.lastWeaningDate &&
      (a.heatStatus === 'Vacía' || a.heatStatus === 'Abierta' || !a.heatStatus)
    ) {
      const open = daysSince(a.lastWeaningDate, currentDate);
      if (open > BIO.OPEN_DAYS_LIMIT) {
        openSows.push(a.tag);
      }
    }

    // ---- AREA 3: Regla de jubilación (8 partos → descarte) ----
    if (a.role === 'Madre' && (a.totalFarrowings ?? 0) >= BIO.MAX_FARROWINGS) {
      mutations.push({
        animalId: a.id,
        changes: { status: 'Descarte/Matadero' },
        reason: `Jubilación automática: ${a.tag} alcanzó ${a.totalFarrowings} partos (máx ${BIO.MAX_FARROWINGS})`,
      });
      alerts.push({
        id: `jubilar-${a.id}`,
        type: 'Maternidad',
        severity: 'warning',
        title: 'Jubilación de Cerda',
        message: `${a.tag} alcanzó ${a.totalFarrowings} partos → enviada a Descarte/Matadero`,
        animalId: a.id,
        animalTag: a.tag,
      });
    }
  }

  // ---- AREA 3: peso bajo al nacer (agregado) ----
  if (day0LowWeight.length > 0) {
    alerts.push({
      id: 'birthlow',
      type: 'Maternidad',
      severity: 'warning',
      title: 'Peso Bajo al Nacer',
      message: `⚠️ Peso Bajo al Nacer — ${day0LowWeight.length} lechón(es) < 1.3 kg: ${day0LowWeight.map(d => d.tag).join(', ')}`,
    });
  }

  // ---- AREA 3: Días Abiertos — cerdas a preñar (crítico) ----
  if (openSows.length > 0) {
    alerts.push({
      id: 'openlist',
      type: 'Maternidad',
      severity: 'critical',
      title: 'Cerdas a Preñar Esta Semana',
      message: `Cerdas a Preñar Esta Semana: [${openSows.join(', ')}]`,
      action: 'Registrar nuevo celo o evaluar descarte',
    });
  }

  // ---- AREA 4: chequeo target día 70 ----
  if (day70Cohort.length > 0) {
    const avg = day70Cohort.reduce((s, p) => s + p.weight, 0) / day70Cohort.length;
    if (avg < BIO.DAY70_TARGET_WEIGHT) {
      alerts.push({
        id: 'day70cohort',
        type: 'Destete',
        severity: 'warning',
        title: 'Cohort bajo target',
        message: `Cohort por debajo de target: promedio ${avg.toFixed(1)} lb (objetivo ${BIO.DAY70_TARGET_WEIGHT} lb)`,
      });
    }
  }

  // ---- AREA 1: sugerencia de reemplazos ----
  const sortedReplacements = [...replacementCandidates].sort((a, b) => b.weight - a.weight);
  const suggested = sortedReplacements.slice(0, BIO.REPLACEMENT_QUOTA);
  if (suggested.length < BIO.REPLACEMENT_QUOTA) {
    alerts.push({
      id: 'replacement',
      type: 'Reemplazo',
      severity: 'info',
      title: 'Reemplazo Sugerido',
      message: suggested.length
        ? `Reemplazo Sugerido: [${suggested.map(a => a.tag).join(', ')}] (${suggested.length}/${BIO.REPLACEMENT_QUOTA})`
        : `Cuota de reemplazo incompleta: ${suggested.length}/${BIO.REPLACEMENT_QUOTA} — sin candidatas disponibles`,
    });
  }

  // ---- Agenda médica diaria ----
  const medicalAgenda: MedicalTask[] = MEDICAL_PROTOCOL
    .filter(p => medicalBuckets[p.day]?.length)
    .map(p => ({
      id: `med-${p.day}`,
      protocolDay: p.day,
      task: p.task,
      animalTags: medicalBuckets[p.day],
      count: medicalBuckets[p.day].length,
    }));

  // ---- KPIs (una entrada por métrica) ----
  const countEtapa = (etapa: Animal['etapaActual']) => active.filter(a => a.etapaActual === etapa).length;

  const kpis: KPIUpdate[] = [
    { metrica: 'reemplazo',  valor: suggested.length,        total: BIO.REPLACEMENT_QUOTA },
    { metrica: 'gestacion',  valor: countEtapa('Gestación'), total: BIO.GESTATION_CAPACITY },
    { metrica: 'maternidad', valor: countEtapa('Maternidad'), total: BIO.MATERNITY_CAPACITY },
    { metrica: 'destete',    valor: countEtapa('Destete') },
    { metrica: 'ceba',       valor: countEtapa('Ceba') },
  ];

  return { alerts, mutations, kpis, medicalAgenda };
}

// ---------------------------------------------------------------------------
// Inventory alerts (non-biological, evaluated against feed stock)
// ---------------------------------------------------------------------------

export function getInventoryAlerts(inventory: FeedInventory): Alert[] {
  const alerts: Alert[] = [];
  (Object.keys(inventory) as (keyof FeedInventory)[]).forEach(type => {
    if (inventory[type].sacos <= 50) {
      alerts.push({
        id: `inv-${type}`,
        type: 'Inventario',
        severity: inventory[type].sacos <= 30 ? 'critical' : 'warning',
        title: `Stock bajo: ${type}`,
        message: `Inventario Alimento ${type}: ${inventory[type].sacos} sacos disponibles`,
        action: 'Registrar compra de alimento',
      });
    }
  });
  return alerts;
}

/** Proyección de venta para el horizonte de 14 días (AREA 5). */
export function getSalesProjection(animals: Animal[], currentDate: string): { count: number; totalWeight: number; tags: string[] } {
  const tags = animals
    .filter(a => a.status === 'Activo' && a.role === 'Ceba')
    .filter(a => {
      const age = differenceInDays(safeParseISO(currentDate), safeParseISO(a.birthDate));
      return age >= BIO.CEBA_EXIT_DAY - BIO.SALES_PROJECTION_WINDOW && age <= BIO.CEBA_EXIT_DAY;
    })
    .map(a => a.tag);
  return { count: tags.length, totalWeight: tags.length * BIO.CEBA_EXIT_WEIGHT, tags };
}
