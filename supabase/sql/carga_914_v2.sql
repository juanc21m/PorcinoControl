-- =============================================================================
-- Agrocomercial Moreno · CARGA DE INVENTARIO v2 — 914 animales, 914 FILAS
-- =============================================================================
-- Ejecutar completo en Supabase → SQL Editor.
--  ⚠️  BORRA public.animals por completo antes de insertar.
--
-- CAMBIO CLAVE frente a la v1: los 136 lechones son FILAS REALES en la zona
-- 'Lechones', cada uno vinculado a su madre por madre_id. Las madres NO llevan
-- conteo almacenado (litter_males/litter_females quedan en NULL) para que no
-- haya duplicación: la app deriva la camada de cada cerda contando sus
-- lechones reales. En Maternidad se ven "arrastrados" desde Lechones.
--
-- CANTIDADES EXACTAS (confirmadas):
--   Gestación   88   (69 gestantes · 8 vacías · 11 reemplazos)
--   Maternidad  23   madres paridas, parideras 1..23
--   Lechones   136   vinculados a 14 madres
--   Destete    246
--   Ceba       421
--   TOTAL      914 filas = 914 cabezas
--
-- ARETES: H-000001..H-000510 (510 hembras) · M-000001..M-000404 (404 machos)
--   (los 136 lechones reparten 70 machos / 66 hembras por el impar de cada camada)
--
-- El bloque TERMINA CON ASSERTS: si alguna cantidad no cuadra, lanza excepción
-- y revierte TODO. Es imposible quedarse con una distribución mal repartida.
-- =============================================================================

-- 0) Esquema: columnas y restricciones alineadas con el modelo actual
alter table public.animals add column if not exists room_number    int;
alter table public.animals add column if not exists litter_males   int;
alter table public.animals add column if not exists litter_females int;
alter table public.animals add column if not exists birth_time     text;
alter table public.animals add column if not exists fecha_muerte   date;
alter table public.animals add column if not exists causa_muerte   text;

alter table public.animals alter column role drop not null;

-- 'Lechones' (8) y 'Descarte/Matadero' (18) superan varchar(12): se amplía.
alter table public.animals alter column etapa_actual type varchar(20);
alter table public.animals alter column status       type varchar(20);
alter table public.animals alter column feed_type    type varchar(20);
-- Un DEFAULT 'Ceba' en etapa_actual podría enmascarar errores: se elimina.
alter table public.animals alter column etapa_actual drop default;

alter table public.animals drop constraint if exists animals_etapa_actual_check;
alter table public.animals add constraint animals_etapa_actual_check
  check (etapa_actual in ('Gestación','Maternidad','Lechones','Destete','Ceba'));

alter table public.animals drop constraint if exists animals_feed_type_check;
alter table public.animals add constraint animals_feed_type_check
  check (feed_type in ('Gestación','Lactancia','Crecimiento','Engorde','Fase 1','Fase 2','Fase 3'));

alter table public.animals drop constraint if exists animals_status_check;
alter table public.animals add constraint animals_status_check
  check (status in ('Activo','Despachado','Muerto','Descarte/Matadero'));

-- 1) Carga
do $$
declare
  v_hoy    date := current_date;
  v_nac_ad date := current_date - 760;   -- adultas (~2 años)
  v_nac_le date := current_date - 12;    -- lechones lactando (~12 días)
  v_nac_de date := current_date - 35;    -- destetados
  v_nac_ce date := current_date - 105;   -- ceba

  i        int;
  k        int;
  v_insem  date;
  v_seq_h  int := 0;
  v_seq_m  int := 0;
  v_sexo   text;
  v_tag    text;
  v_madre  uuid;
  v_n      int;

  -- Lechones por paridera (índice = paridera 1..23). Suma = 136.
  v_camadas int[] := array[
    11, 8, 0, 9, 10, 0, 9, 12, 8, 8, 10, 8, 0, 10, 0, 0, 0, 12, 0, 10, 11, 0, 0
  ];
  v_madres uuid[] := '{}';   -- id de la madre de cada paridera
begin
  delete from public.animals;

  -- ------------------------------------------------------------------ GESTACIÓN
  for i in 1..88 loop
    v_seq_h := v_seq_h + 1;
    v_tag := 'H-' || lpad(v_seq_h::text, 6, '0');
    v_insem := v_hoy - (5 + ((i - 1) * 95 / 68))::int;   -- 5..100 días

    insert into public.animals (
      id, tag, role, gender, breed, birth_date, weight,
      etapa_actual, room_number, feed_type, daily_consumption,
      status, heat_status, insemination_date, expected_farrowing_date,
      weights, vaccinations, history
    ) values (
      gen_random_uuid(), v_tag,
      case when i <= 77 then 'Madre' else null end,   -- 78..88 reemplazos
      'Hembra', 'Landrace', v_nac_ad, 400,
      'Gestación', 1, 'Gestación', 6, 'Activo',
      case when i <= 69 then 'Embarazada' else 'Vacía' end,
      case when i <= 69 then v_insem else null end,
      case when i <= 69 then v_insem + 114 else null end,
      jsonb_build_array(jsonb_build_object('date', v_nac_ad, 'weight', 400)),
      '[]'::jsonb,
      jsonb_build_array(jsonb_build_object('date', v_hoy,
        'event', 'Carga inicial — Gestación (' ||
          case when i <= 69 then 'gestante' when i <= 77 then 'vacía'
               else 'reemplazo' end || ')'))
    );
  end loop;

  -- ----------------------------------------------------------------- MATERNIDAD
  for i in 1..23 loop
    v_seq_h := v_seq_h + 1;
    v_tag := 'H-' || lpad(v_seq_h::text, 6, '0');
    v_madre := gen_random_uuid();
    v_madres := array_append(v_madres, v_madre);

    insert into public.animals (
      id, tag, role, gender, breed, birth_date, weight,
      etapa_actual, room_number, litter_males, litter_females,
      feed_type, daily_consumption, status, heat_status,
      last_farrowing_date, total_farrowings,
      weights, vaccinations, history
    ) values (
      v_madre, v_tag, 'Madre', 'Hembra', 'Landrace', v_nac_ad, 420,
      'Maternidad', i,
      null, null,                       -- sin conteo: se deriva de Lechones
      'Lactancia', 12, 'Activo', 'Lactante',
      v_nac_le, 1,
      jsonb_build_array(jsonb_build_object('date', v_nac_ad, 'weight', 420)),
      '[]'::jsonb,
      jsonb_build_array(jsonb_build_object('date', v_hoy,
        'event', 'Carga inicial — Maternidad paridera ' || i ||
                 ' (camada de ' || v_camadas[i] || ' lechones en zona Lechones)'))
    );
  end loop;

  -- ------------------------------------------------------------------- LECHONES
  -- 136 filas reales, vinculadas a su madre. Alternan macho/hembra.
  for i in 1..23 loop
    v_n := v_camadas[i];
    for k in 1..v_n loop
      if k % 2 = 0 then
        v_sexo := 'Hembra'; v_seq_h := v_seq_h + 1;
        v_tag := 'H-' || lpad(v_seq_h::text, 6, '0');
      else
        v_sexo := 'Macho';  v_seq_m := v_seq_m + 1;
        v_tag := 'M-' || lpad(v_seq_m::text, 6, '0');
      end if;

      insert into public.animals (
        id, tag, role, gender, breed, birth_date, weight,
        etapa_actual, room_number, feed_type, daily_consumption,
        status, madre_id, weights, vaccinations, history
      ) values (
        gen_random_uuid(), v_tag, 'Ceba', v_sexo, 'Landrace', v_nac_le, 8,
        'Lechones', 1, 'Lactancia', 0, 'Activo',
        v_madres[i],
        jsonb_build_array(jsonb_build_object('date', v_nac_le, 'weight', 8)),
        '[]'::jsonb,
        jsonb_build_array(jsonb_build_object('date', v_hoy,
          'event', 'Carga inicial — Lechones (paridera ' || i || ')'))
      );
    end loop;
  end loop;

  -- -------------------------------------------------------------------- DESTETE
  for i in 1..246 loop
    if i % 2 = 0 then
      v_sexo := 'Hembra'; v_seq_h := v_seq_h + 1;
      v_tag := 'H-' || lpad(v_seq_h::text, 6, '0');
    else
      v_sexo := 'Macho';  v_seq_m := v_seq_m + 1;
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
      jsonb_build_array(jsonb_build_object('date', v_hoy,
        'event', 'Carga inicial — Destete'))
    );
  end loop;

  -- ----------------------------------------------------------------------- CEBA
  for i in 1..421 loop
    if i % 2 = 0 then
      v_sexo := 'Hembra'; v_seq_h := v_seq_h + 1;
      v_tag := 'H-' || lpad(v_seq_h::text, 6, '0');
    else
      v_sexo := 'Macho';  v_seq_m := v_seq_m + 1;
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
      jsonb_build_array(jsonb_build_object('date', v_hoy,
        'event', 'Carga inicial — Ceba'))
    );
  end loop;

  -- ==========================================================================
  -- ASSERTS: si algo no cuadra, se lanza excepción y TODO se revierte.
  -- ==========================================================================
  if (select count(*) from public.animals where etapa_actual='Gestación') <> 88 then
    raise exception 'Gestación quedó con % (esperado 88)',
      (select count(*) from public.animals where etapa_actual='Gestación');
  end if;
  if (select count(*) from public.animals where etapa_actual='Maternidad') <> 23 then
    raise exception 'Maternidad quedó con % (esperado 23)',
      (select count(*) from public.animals where etapa_actual='Maternidad');
  end if;
  if (select count(*) from public.animals where etapa_actual='Lechones') <> 136 then
    raise exception 'Lechones quedó con % (esperado 136)',
      (select count(*) from public.animals where etapa_actual='Lechones');
  end if;
  if (select count(*) from public.animals where etapa_actual='Destete') <> 246 then
    raise exception 'Destete quedó con % (esperado 246)',
      (select count(*) from public.animals where etapa_actual='Destete');
  end if;
  if (select count(*) from public.animals where etapa_actual='Ceba') <> 421 then
    raise exception 'Ceba quedó con % (esperado 421)',
      (select count(*) from public.animals where etapa_actual='Ceba');
  end if;
  if (select count(*) from public.animals) <> 914 then
    raise exception 'Total quedó en % (esperado 914)', (select count(*) from public.animals);
  end if;
  if (select count(*) from public.animals where etapa_actual='Lechones' and madre_id is null) <> 0 then
    raise exception 'Hay lechones sin madre asignada.';
  end if;
  if (select count(*) from (select tag from public.animals group by tag having count(*)>1) d) <> 0 then
    raise exception 'Hay aretes duplicados.';
  end if;

  if v_seq_h <> 510 or v_seq_m <> 404 then
    raise exception 'Reparto por sexo inesperado: % hembras / % machos (esperado 510/404)', v_seq_h, v_seq_m;
  end if;

  raise notice 'CARGA v2 OK — 914 filas. % hembras, % machos.', v_seq_h, v_seq_m;
end $$;

notify pgrst, 'reload schema';

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- (a) Por zona: 88 / 23 / 136 / 246 / 421 = 914
select '[' || etapa_actual || ']' as zona, count(*) as animales,
       count(*) filter (where status='Activo') as activos
from public.animals group by etapa_actual order by 1;

-- (b) Total y sexos: 914 · 510 hembras · 404 machos
select count(*) as total,
       count(*) filter (where gender='Hembra') as hembras,
       count(*) filter (where gender='Macho')  as machos
from public.animals;

-- (c) Lechones por paridera (14 madres, suma 136)
select m.room_number as paridera, m.tag as madre, count(l.id) as lechones
from public.animals m
left join public.animals l on l.madre_id = m.id and l.etapa_actual = 'Lechones'
where m.etapa_actual = 'Maternidad'
group by m.room_number, m.tag order by m.room_number;

-- (d) Rango de aretes
select left(tag,1) as prefijo, count(*), min(tag), max(tag)
from public.animals group by left(tag,1) order by 1;
