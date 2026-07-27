-- =============================================================================
-- Agrocomercial Moreno · CARGA INICIAL DE INVENTARIO REAL
-- =============================================================================
-- Ejecutar completo en Supabase → SQL Editor.
--
--  ⚠️  BORRA TODO EL CONTENIDO DE public.animals ANTES DE INSERTAR.
--      (Verificado: la tabla estaba vacía, 0 filas.)
--
-- ARETES: estándar de la app, secuencia global de 6 dígitos por sexo.
--   Hembras → H-000001 … H-000444   (444 en total)
--   Machos  → M-000001 … M-000334   (334 en total)
--   Gestación y Maternidad son 100% hembras. Destete y Ceba van 50/50.
--
-- Distribución (88 + 23 + 136 + 246 + 421 = 914 cabezas):
--   → FILAS en la tabla: 778 (88 + 23 + 246 + 421)
--   → Los 136 lechones van como CONTEO de la camada en su madre
--     (litter_males / litter_females), no como filas: así la cerda es la única
--     que ocupa su paridera. Reciben arete al destetarlos desde Movilización.
--     Cabezas totales = 778 filas + 136 lechones = 914.
--
-- Mapeo de los "estados" a los tres ejes del modelo:
--   Gestante   → etapa 'Gestación',  heat_status 'Embarazada', role 'Madre'
--   Vacía      → etapa 'Gestación',  heat_status 'Vacía',      role 'Madre'
--   Reemplazo  → etapa 'Gestación',  heat_status 'Vacía',      role NULL (+nota)
--   Parida     → etapa 'Maternidad', heat_status 'Lactante',   paridera 1..23
--   Destetado  → etapa 'Destete'
--   En Ceba    → etapa 'Ceba'
-- `status` = 'Activo' en todos (ese eje es Activo/Despachado/Muerto/Descarte).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) ESQUEMA: crea las columnas que faltaban y realinea las restricciones
--
--    Verificado contra la base: faltaban room_number, litter_males y
--    litter_females (la migración de zonas/salas nunca se corrió). Los nombres
--    son los que mapea la app en src/lib/db.ts, así que se crean con ese nombre
--    exacto — renombrarlas rompería el frontend.
-- -----------------------------------------------------------------------------
alter table public.animals add column if not exists room_number    int;
alter table public.animals add column if not exists litter_males    int;
alter table public.animals add column if not exists litter_females  int;

-- Por si tampoco se corrieron migraciones anteriores:
alter table public.animals add column if not exists birth_time      text;
alter table public.animals add column if not exists fecha_muerte    date;
alter table public.animals add column if not exists causa_muerte    text;

alter table public.animals alter column role drop not null;

alter table public.animals drop constraint if exists animals_etapa_actual_check;
alter table public.animals add constraint animals_etapa_actual_check
  check (etapa_actual in ('Gestación','Maternidad','Lechones','Destete','Ceba'));

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
  -- Fecha operativa de la app ("hoy" simulado). Todas las fechas quedan en el
  -- pasado respecto a ella para que ninguna edad salga negativa.
  v_hoy    date := date '2026-05-30';
  v_nac_ad date := date '2024-06-01';  -- adultas (~2 años)
  v_nac_de date := date '2026-04-25';  -- destetados (~35 días)
  v_nac_ce date := date '2026-02-15';  -- ceba (~104 días)

  i        int;
  v_insem  date;
  v_lit    int;
  v_lm     int;   -- lechones macho de la camada
  v_lf     int;   -- lechones hembra de la camada

  -- Contadores de arete (secuencia global por sexo)
  v_seq_h  int := 0;
  v_seq_m  int := 0;

  v_sexo   text;
  v_tag    text;

  -- Lechones por paridera (índice = paridera 1..23). Suma = 136.
  v_camadas int[] := array[
    11, 8, 0, 9, 10, 0, 9, 12, 8, 8, 10, 8, 0, 10, 0, 0, 0, 12, 0, 10, 11, 0, 0
  ];
begin
  -- LIMPIEZA de datos de prueba
  delete from public.animals;
  raise notice 'Tabla animals vaciada.';

  -- ---------------------------------------------------------------------------
  -- ZONA GESTACIÓN — 88 cerdas (todas hembras)
  --   1..69 gestantes | 70..77 vacías | 78..88 reemplazos
  -- ---------------------------------------------------------------------------
  for i in 1..88 loop
    v_seq_h := v_seq_h + 1;
    v_tag := 'H-' || lpad(v_seq_h::text, 6, '0');

    -- Escalona la monta entre 5 y 110 días atrás para no acumular los partos.
    v_insem := v_hoy - (5 + ((i - 1) * 105 / 68))::int;

    insert into public.animals (
      id, tag, role, gender, breed, birth_date, weight,
      etapa_actual, room_number, feed_type, daily_consumption,
      status, heat_status, insemination_date, expected_farrowing_date,
      weights, vaccinations, history
    ) values (
      gen_random_uuid(), v_tag,
      case when i <= 77 then 'Madre' else null end,   -- 78..88 = reemplazo
      'Hembra', 'Landrace', v_nac_ad, 400,
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
               else 'reemplazo' end || ')'))
    );
  end loop;
  raise notice 'Gestación: 88 hembras (69 gestantes, 8 vacías, 11 reemplazos).';

  -- ---------------------------------------------------------------------------
  -- ZONA MATERNIDAD — 23 madres paridas (hembras), parideras 1..23,
  -- con su camada como conteo (total 136 lechones)
  -- ---------------------------------------------------------------------------
  for i in 1..23 loop
    v_seq_h := v_seq_h + 1;
    v_tag := 'H-' || lpad(v_seq_h::text, 6, '0');

    v_lit := v_camadas[i];
    v_lm  := ceil(v_lit / 2.0)::int;   -- sobrante al macho
    v_lf  := v_lit - v_lm;

    insert into public.animals (
      id, tag, role, gender, breed, birth_date, weight,
      etapa_actual, room_number, litter_males, litter_females,
      feed_type, daily_consumption, status, heat_status,
      last_farrowing_date, total_farrowings,
      weights, vaccinations, history
    ) values (
      gen_random_uuid(), v_tag, 'Madre', 'Hembra', 'Landrace', v_nac_ad, 420,
      'Maternidad', i, nullif(v_lm, 0), nullif(v_lf, 0),
      'Lactancia', 12, 'Activo', 'Lactante',
      v_hoy - 10, 1,
      jsonb_build_array(jsonb_build_object('date', v_nac_ad, 'weight', 420)),
      '[]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'date', v_hoy,
        'event', 'Carga inicial de inventario — Maternidad paridera ' || i ||
                 ', camada de ' || v_lit || ' lechones (' || v_lm || 'M/' || v_lf || 'H)'))
    );
  end loop;
  raise notice 'Maternidad: 23 madres paridas, 136 lechones como camada.';

  -- ---------------------------------------------------------------------------
  -- ZONA DESTETE — 246 cerdos, 50/50 hembras y machos
  -- ---------------------------------------------------------------------------
  for i in 1..246 loop
    if i % 2 = 0 then
      v_sexo := 'Hembra';
      v_seq_h := v_seq_h + 1;
      v_tag := 'H-' || lpad(v_seq_h::text, 6, '0');
    else
      v_sexo := 'Macho';
      v_seq_m := v_seq_m + 1;
      v_tag := 'M-' || lpad(v_seq_m::text, 6, '0');
    end if;

    insert into public.animals (
      id, tag, role, gender, breed, birth_date, weight,
      etapa_actual, room_number, feed_type, daily_consumption,
      status, weights, vaccinations, history
    ) values (
      gen_random_uuid(), v_tag, 'Ceba', v_sexo, 'Landrace', v_nac_de, 15,
      'Destete', 1, 'Fase 1', 2, 'Activo',
      jsonb_build_array(jsonb_build_object('date', v_nac_de, 'weight', 15)),
      '[]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'date', v_hoy, 'event', 'Carga inicial de inventario — Destete'))
    );
  end loop;
  raise notice 'Destete: 246 cerdos (123 hembras / 123 machos).';

  -- ---------------------------------------------------------------------------
  -- ZONA CEBA — 421 cerdos, 50/50 (impar: 210 hembras / 211 machos)
  -- ---------------------------------------------------------------------------
  for i in 1..421 loop
    if i % 2 = 0 then
      v_sexo := 'Hembra';
      v_seq_h := v_seq_h + 1;
      v_tag := 'H-' || lpad(v_seq_h::text, 6, '0');
    else
      v_sexo := 'Macho';
      v_seq_m := v_seq_m + 1;
      v_tag := 'M-' || lpad(v_seq_m::text, 6, '0');
    end if;

    insert into public.animals (
      id, tag, role, gender, breed, birth_date, weight,
      etapa_actual, room_number, feed_type, daily_consumption,
      status, weights, vaccinations, history
    ) values (
      gen_random_uuid(), v_tag, 'Ceba', v_sexo, 'Landrace', v_nac_ce, 150,
      'Ceba', 1, 'Engorde', 5, 'Activo',
      jsonb_build_array(jsonb_build_object('date', v_nac_ce, 'weight', 150)),
      '[]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'date', v_hoy, 'event', 'Carga inicial de inventario — Ceba'))
    );
  end loop;
  raise notice 'Ceba: 421 cerdos (210 hembras / 211 machos).';

  raise notice 'CARGA COMPLETA: % hembras (H-000001..H-%), % machos (M-000001..M-%).',
    v_seq_h, lpad(v_seq_h::text, 6, '0'), v_seq_m, lpad(v_seq_m::text, 6, '0');
end $$;

notify pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- 2) VERIFICACIÓN
-- -----------------------------------------------------------------------------
-- (a) Filas = 778 · lechones = 136 · cabezas = 914
select
  (select count(*) from public.animals) as filas,
  (select coalesce(sum(coalesce(litter_males,0) + coalesce(litter_females,0)),0)
     from public.animals) as lechones_en_camadas,
  (select count(*) from public.animals)
  + (select coalesce(sum(coalesce(litter_males,0) + coalesce(litter_females,0)),0)
       from public.animals) as cabezas_totales;

-- (b) Por zona: Gestación 88 · Maternidad 23 · Destete 246 · Ceba 421
select etapa_actual, count(*) from public.animals group by etapa_actual order by 1;

-- (c) Por sexo: 444 hembras / 334 machos
select gender, count(*) from public.animals group by gender order by 1;

-- (d) Aretes: rango por prefijo, sin huecos ni duplicados
select left(tag,1) as prefijo, count(*), min(tag), max(tag)
from public.animals group by left(tag,1) order by 1;

select count(*) as aretes_duplicados
from (select tag from public.animals group by tag having count(*) > 1) d;

-- (e) Desglose de Gestación (69 Embarazada + 19 Vacía) y los 11 reemplazos
select heat_status, role, count(*) from public.animals
where etapa_actual = 'Gestación' group by heat_status, role order by 1,2;

select count(*) as reemplazos from public.animals
where etapa_actual = 'Gestación' and role is null;

-- (f) Camada por paridera (debe sumar 136)
select room_number as paridera, tag,
       coalesce(litter_males,0) + coalesce(litter_females,0) as lechones
from public.animals where etapa_actual = 'Maternidad' order by room_number;
