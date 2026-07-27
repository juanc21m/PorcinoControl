-- =============================================================================
-- Agrocomercial Moreno · CARGA INICIAL DE INVENTARIO REAL (914 animales)
-- =============================================================================
-- Ejecutar completo en Supabase → SQL Editor.
--
--  ⚠️  BORRA TODO EL CONTENIDO DE public.animals ANTES DE INSERTAR.
--      (Verificado el 2026-07-27: la tabla estaba vacía, 0 filas.)
--
-- Distribución (verificada: 88 + 23 + 136 + 246 + 421 = 914 cabezas):
--   → FILAS en la tabla: 778 (88 + 23 + 246 + 421)
--   → Los 136 lechones van como conteo en su madre, no como filas.
--     Cabezas totales = 778 + 136 = 914.
--   Gestación   88  cerdas → 69 gestantes, 8 vacías, 11 reemplazos
--   Maternidad  23  madres paridas (parideras 1..23) + 136 lechones como camada
--   Destete    246  cerdos
--   Ceba       421  cerdos
--
-- Cómo se representan los "estados" que pediste: el sistema separa tres ejes,
-- así que cada estado se mapea a la combinación correcta y no se pierde nada:
--   Gestante   → etapa 'Gestación',  heat_status 'Embarazada'
--   Vacía      → etapa 'Gestación',  heat_status 'Vacía',  role 'Madre'
--   Reemplazo  → etapa 'Gestación',  heat_status 'Vacía',  role NULL  (+ nota)
--   Parida     → etapa 'Maternidad', heat_status 'Lactante'
--   Destetado  → etapa 'Destete'
--   En Ceba    → etapa 'Ceba'
-- `status` queda 'Activo' en todos (ese eje es Activo/Despachado/Muerto/Descarte).
--
-- Los 136 lechones van como CONTEO de la camada de cada madre
-- (litter_males / litter_females), no como filas propias: así la cerda es la
-- única que ocupa su paridera. Reciben arete individual al destetarlos desde
-- el módulo de Movilización.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Alinea las restricciones de la tabla con el modelo actual
--    (si quedaron las viejas, los INSERT fallarían: p.ej. feed_type solo
--     aceptaba 3 tipos y ahora hay 7)
-- -----------------------------------------------------------------------------
alter table public.animals alter column role drop not null;

alter table public.animals drop constraint if exists animals_etapa_actual_check;
alter table public.animals add constraint animals_etapa_actual_check
  check (etapa_actual in ('Gestación','Maternidad','Recién Nacidos','Destete','Ceba'));

alter table public.animals drop constraint if exists animals_feed_type_check;
alter table public.animals add constraint animals_feed_type_check
  check (feed_type in ('Gestación','Lactancia','Crecimiento','Engorde','Fase 1','Fase 2','Fase 3'));

alter table public.animals drop constraint if exists animals_status_check;
alter table public.animals add constraint animals_status_check
  check (status in ('Activo','Despachado','Muerto','Descarte/Matadero'));

-- -----------------------------------------------------------------------------
-- 1) Carga
-- -----------------------------------------------------------------------------
do $$
declare
  -- Fecha operativa de la app (su "hoy" simulado). Todas las fechas quedan
  -- en el pasado respecto a ella para que las edades nunca salgan negativas.
  v_hoy    date := date '2026-05-30';
  v_nac_ad date := date '2024-06-01';  -- nacimiento de las adultas (~2 años)
  v_nac_de date := date '2026-04-25';  -- destetados (~35 días)
  v_nac_ce date := date '2026-02-15';  -- ceba (~104 días)

  i        int;
  v_insem  date;
  v_lit    int;
  v_m      int;
  v_f      int;

  -- Lechones por paridera (índice = número de paridera 1..23). Suma = 136.
  v_camadas int[] := array[
    11, 8, 0, 9, 10, 0, 9, 12, 8, 8, 10, 8, 0, 10, 0, 0, 0, 12, 0, 10, 11, 0, 0
  ];
begin
  -- ---------------------------------------------------------------------------
  -- LIMPIEZA de datos de prueba
  -- ---------------------------------------------------------------------------
  delete from public.animals;
  raise notice 'Tabla animals vaciada.';

  -- ---------------------------------------------------------------------------
  -- ZONA GESTACIÓN — 88 cerdas (GES-001 … GES-088)
  -- ---------------------------------------------------------------------------
  -- 1..69  gestantes  |  70..77  vacías  |  78..88  reemplazos
  for i in 1..88 loop
    -- Escalona la monta de las gestantes entre 5 y 110 días atrás, para que no
    -- caigan todos los partos el mismo día.
    v_insem := v_hoy - (5 + ((i - 1) * 105 / 68))::int;

    insert into public.animals (
      id, tag, role, gender, breed, birth_date, weight,
      etapa_actual, room_number, feed_type, daily_consumption,
      status, heat_status, insemination_date, expected_farrowing_date,
      weights, vaccinations, history
    ) values (
      gen_random_uuid(),
      'GES-' || lpad(i::text, 3, '0'),
      case when i <= 77 then 'Madre' else null end,          -- 78..88 = reemplazo
      'Hembra',
      'Landrace',
      v_nac_ad,
      400,
      'Gestación', 1, 'Gestación', 6,
      'Activo',
      case when i <= 69 then 'Embarazada' else 'Vacía' end,
      case when i <= 69 then v_insem else null end,
      case when i <= 69 then v_insem + 114 else null end,
      jsonb_build_array(jsonb_build_object('date', v_nac_ad, 'weight', 400)),
      '[]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'date', v_hoy,
        'event', 'Carga inicial de inventario — Gestación (' ||
          case when i <= 69 then 'gestante'
               when i <= 77 then 'vacía'
               else 'reemplazo' end || ')'
      ))
    );
  end loop;
  raise notice 'Gestación: 88 cerdas (69 gestantes, 8 vacías, 11 reemplazos).';

  -- ---------------------------------------------------------------------------
  -- ZONA MATERNIDAD — 23 madres paridas (MAT-001 … MAT-023), parideras 1..23
  -- con su camada como conteo (total 136 lechones)
  -- ---------------------------------------------------------------------------
  for i in 1..23 loop
    v_lit := v_camadas[i];
    -- Reparto por sexo: mitad y mitad, el sobrante va a machos.
    v_m := ceil(v_lit / 2.0)::int;
    v_f := v_lit - v_m;

    insert into public.animals (
      id, tag, role, gender, breed, birth_date, weight,
      etapa_actual, room_number, litter_males, litter_females,
      feed_type, daily_consumption, status, heat_status,
      last_farrowing_date, total_farrowings,
      weights, vaccinations, history
    ) values (
      gen_random_uuid(),
      'MAT-' || lpad(i::text, 3, '0'),
      'Madre',
      'Hembra',
      'Landrace',
      v_nac_ad,
      420,
      'Maternidad',
      i,                                    -- paridera 1..23
      nullif(v_m, 0),
      nullif(v_f, 0),
      'Lactancia', 12, 'Activo', 'Lactante',
      v_hoy - 10,                           -- parió hace ~10 días
      1,
      jsonb_build_array(jsonb_build_object('date', v_nac_ad, 'weight', 420)),
      '[]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'date', v_hoy,
        'event', 'Carga inicial de inventario — Maternidad paridera ' || i ||
                 ', camada de ' || v_lit || ' lechones (' || v_m || 'M/' || v_f || 'H)'
      ))
    );
  end loop;
  raise notice 'Maternidad: 23 madres paridas con 136 lechones como camada.';

  -- ---------------------------------------------------------------------------
  -- ZONA DESTETE — 246 cerdos (DES-001 … DES-246)
  -- ---------------------------------------------------------------------------
  for i in 1..246 loop
    insert into public.animals (
      id, tag, role, gender, breed, birth_date, weight,
      etapa_actual, room_number, feed_type, daily_consumption,
      status, weights, vaccinations, history
    ) values (
      gen_random_uuid(),
      'DES-' || lpad(i::text, 3, '0'),
      'Ceba',
      case when i % 2 = 0 then 'Hembra' else 'Macho' end,   -- 50/50 alternado
      'Landrace',
      v_nac_de,
      15,
      'Destete', 1, 'Fase 1', 2,
      'Activo',
      jsonb_build_array(jsonb_build_object('date', v_nac_de, 'weight', 15)),
      '[]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'date', v_hoy, 'event', 'Carga inicial de inventario — Destete'))
    );
  end loop;
  raise notice 'Destete: 246 cerdos.';

  -- ---------------------------------------------------------------------------
  -- ZONA CEBA — 421 cerdos (CEB-001 … CEB-421)
  -- ---------------------------------------------------------------------------
  for i in 1..421 loop
    insert into public.animals (
      id, tag, role, gender, breed, birth_date, weight,
      etapa_actual, room_number, feed_type, daily_consumption,
      status, weights, vaccinations, history
    ) values (
      gen_random_uuid(),
      'CEB-' || lpad(i::text, 3, '0'),
      'Ceba',
      case when i % 2 = 0 then 'Hembra' else 'Macho' end,
      'Landrace',
      v_nac_ce,
      150,
      'Ceba', 1, 'Engorde', 5,
      'Activo',
      jsonb_build_array(jsonb_build_object('date', v_nac_ce, 'weight', 150)),
      '[]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'date', v_hoy, 'event', 'Carga inicial de inventario — Ceba'))
    );
  end loop;
  raise notice 'Ceba: 421 cerdos.';

  raise notice 'CARGA COMPLETA.';
end $$;

notify pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- 2) VERIFICACIÓN
-- -----------------------------------------------------------------------------
-- (a) FILAS insertadas: deben ser 778 (88 + 23 + 246 + 421).
--     Ojo: los 136 lechones NO son filas, son conteo de camada en la madre.
--     Cabezas totales = 778 filas + 136 lechones = 914.
select count(*) as filas_animales from public.animals;

select
  (select count(*) from public.animals) as filas,
  (select coalesce(sum(coalesce(litter_males,0) + coalesce(litter_females,0)), 0)
     from public.animals) as lechones_en_camadas,
  (select count(*) from public.animals)
  + (select coalesce(sum(coalesce(litter_males,0) + coalesce(litter_females,0)), 0)
       from public.animals) as cabezas_totales;  -- debe dar 914

-- (b) Por zona: Gestación 88 · Maternidad 23 · Destete 246 · Ceba 421
select etapa_actual, count(*) from public.animals group by etapa_actual order by 1;

-- (c) Desglose de Gestación: 69 Embarazada + 19 Vacía (8 vacías + 11 reemplazos)
select heat_status, role, count(*)
from public.animals where etapa_actual = 'Gestación'
group by heat_status, role order by 1, 2;

-- (d) Los 11 reemplazos (etapa Gestación sin rol asignado)
select count(*) as reemplazos
from public.animals where etapa_actual = 'Gestación' and role is null;

-- (e) Lechones por paridera y total (debe sumar 136)
select room_number as paridera, tag,
       coalesce(litter_males,0) + coalesce(litter_females,0) as lechones
from public.animals where etapa_actual = 'Maternidad' order by room_number;

select sum(coalesce(litter_males,0) + coalesce(litter_females,0)) as total_lechones
from public.animals where etapa_actual = 'Maternidad';
