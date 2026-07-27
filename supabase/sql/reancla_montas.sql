-- =============================================================================
-- Agrocomercial Moreno · Re-anclaje de fechas de monta (OPCIÓN A, provisional)
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor.
--
-- Las fechas de monta que trajo la carga inicial estaban ancladas al 30-may-2026
-- (la fecha simulada que tenía la app). Al pasar la app a la fecha real, esas
-- gestaciones quedaban por encima de los 114 días y salían como PARTO VENCIDO.
--
-- Esto las re-escalona entre 5 y 100 días antes de HOY:
--   · 0 partos vencidos (nada supera los 114 días)
--   · 0 alertas de traslado a paridera hoy (el umbral es 111 días)
--   · ~11 días de margen antes de la primera alerta de traslado, tiempo para
--     destetar y liberar paridera (Maternidad está a 23/23)
--   · ~12 cerdas paren dentro de los próximos 30 días
--
--  ⚠️  Son fechas ESTIMADAS, no reales. Quedan marcadas como tal en el historial
--      de cada cerda para que nadie las confunda con un registro de campo.
--      Cuando tengas las montas reales, se actualizan una por una.
-- =============================================================================

with g as (
  select id,
         row_number() over (order by tag) - 1 as n
  from public.animals
  where etapa_actual = 'Gestación'
    and heat_status  = 'Embarazada'
    and status       = 'Activo'
),
calc as (
  -- Escalona entre 5 y 100 días atrás (69 cerdas → paso de ~1.4 días)
  select id, (current_date - (5 + (n * 95 / 68))::int) as f_monta
  from g
)
update public.animals a
set insemination_date       = c.f_monta,
    expected_farrowing_date = c.f_monta + 114,
    history = coalesce(a.history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'date',  current_date,
        'event', 'Fecha de monta re-estimada al pasar el sistema a fecha real ('
                 || c.f_monta || '). Pendiente de confirmar con el registro de campo.'
      ))
from calc c
where a.id = c.id;

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN
-- -----------------------------------------------------------------------------
-- (a) Resumen: 69 gestantes, 0 vencidas, 0 en umbral de traslado
select
  count(*)                                                              as gestantes,
  min(current_date - insemination_date)                                 as dias_min,
  max(current_date - insemination_date)                                 as dias_max,
  count(*) filter (where current_date - insemination_date > 114)        as partos_vencidos,
  count(*) filter (where current_date - insemination_date >= 111)       as alerta_traslado_hoy,
  count(*) filter (where expected_farrowing_date <= current_date + 30)  as paren_en_30_dias
from public.animals
where etapa_actual = 'Gestación' and heat_status = 'Embarazada';

-- (b) Calendario de partos por mes (para planificar las 23 parideras)
select to_char(expected_farrowing_date, 'YYYY-MM') as mes, count(*) as partos_previstos
from public.animals
where etapa_actual = 'Gestación' and heat_status = 'Embarazada'
group by 1 order by 1;

-- (c) Las 10 más próximas a parir
select tag, insemination_date, expected_farrowing_date,
       (current_date - insemination_date) as dias_gestacion,
       (expected_farrowing_date - current_date) as dias_para_parto
from public.animals
where etapa_actual = 'Gestación' and heat_status = 'Embarazada'
order by expected_farrowing_date limit 10;
