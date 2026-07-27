-- =============================================================================
-- Agrocomercial Moreno · REDISTRIBUCIÓN FORZOSA DEL INVENTARIO
-- =============================================================================
-- NO borra animales. Reasigna etiquetas de zona y crea los lechones faltantes.
--
--   Antes:  Gestación 88 · Maternidad 23 · [Ceba 667]              = 778 filas
--   Después: Gestación 88 · Maternidad 23 · Lechones 136 ·
--            Destete 246 · Ceba 421                                = 914 filas
--
-- Los 667 se parten en 246 + 421 (UPDATE).
-- Los 136 lechones NO existen como filas (en la carga v1 quedaron como conteo
-- en litter_males/litter_females de cada madre), por eso se INSERTAN.
--
-- Todo corre en una sola transacción: si algo no cuadra, revierte completo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 1 · Quitar el DEFAULT y ampliar la columna
-- -----------------------------------------------------------------------------
alter table public.animals alter column etapa_actual drop default;
alter table public.animals alter column etapa_actual type varchar(20);

-- La columna id es UUID SIN default: hasta ahora siempre lo generaba el
-- navegador (crypto.randomUUID) y por eso nunca se notó. Cualquier INSERT
-- hecho desde SQL fallaba con "null value in column id".
alter table public.animals alter column id set default gen_random_uuid();

-- -----------------------------------------------------------------------------
-- PASO 2 · Reemplazar el CHECK de etapa_actual (el viejo no permite 'Lechones')
-- -----------------------------------------------------------------------------
-- Se busca por definición, no por nombre, para no depender de cómo se llame.
do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.animals'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%etapa_actual%'
  loop
    execute format('alter table public.animals drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.animals
  add constraint animals_etapa_actual_check
  check (etapa_actual in ('Gestación','Maternidad','Lechones','Destete','Ceba'));

-- -----------------------------------------------------------------------------
-- PASO 3 · Redistribución
-- -----------------------------------------------------------------------------
do $$
declare
  v_pool      int;
  v_madres    uuid[];
  v_counts    int[];
  v_n         int;
  v_i         int;
  v_k         int;
  v_next_h    int;
  v_next_m    int;
  v_idx       int := 0;   -- contador global de lechones (1..136)
  v_gender    text;
  v_tag       text;
  -- verificación final
  v_ges int; v_mat int; v_lec int; v_des int; v_ceb int; v_tot int;
begin
  ---------------------------------------------------------------------------
  -- 3.1 · Partir los 667 en 246 Destete + 421 Ceba
  ---------------------------------------------------------------------------
  select count(*) into v_pool
  from public.animals
  where status = 'Activo'
    and etapa_actual in ('Ceba','Destete','Lechones');

  if v_pool <> 667 then
    raise exception
      'El grupo a redistribuir tiene % animales y se esperaban 667. No se tocó nada.', v_pool;
  end if;

  -- Orden por peso ascendente: en la carga v1 los destetados pesan ~15 lb y los
  -- de ceba ~150 lb, así que los 246 más livianos son justamente los destetados.
  -- created_at y tag son solo desempates, para que el resultado sea reproducible.
  with pool as (
    select id, row_number() over (order by weight asc, created_at asc, tag asc) as rn
    from public.animals
    where status = 'Activo'
      and etapa_actual in ('Ceba','Destete','Lechones')
  )
  update public.animals a
     set etapa_actual = case when p.rn <= 246 then 'Destete' else 'Ceba' end
    from pool p
   where a.id = p.id;

  ---------------------------------------------------------------------------
  -- 3.2 · Crear los 136 lechones como filas reales en 'Lechones'
  ---------------------------------------------------------------------------
  -- Si ya existen lechones de una corrida anterior, se eliminan primero para
  -- que el script se pueda repetir sin duplicar.
  delete from public.animals where etapa_actual = 'Lechones';

  select array_agg(id order by coalesce(room_number, 999), tag)
    into v_madres
  from public.animals
  where status = 'Activo' and etapa_actual = 'Maternidad';

  v_n := coalesce(array_length(v_madres, 1), 0);
  if v_n <> 23 then
    raise exception 'Se esperaban 23 cerdas en Maternidad y hay %.', v_n;
  end if;

  -- Camada por madre: se usa la que ya está guardada en la ficha de cada cerda.
  select array_agg(coalesce(litter_males,0) + coalesce(litter_females,0)
                   order by coalesce(room_number, 999), tag)
    into v_counts
  from public.animals
  where status = 'Activo' and etapa_actual = 'Maternidad';

  -- Si esos conteos no suman 136 (o están en NULL), se reparte 21×6 + 2×5.
  if (select coalesce(sum(x), 0) from unnest(v_counts) x) <> 136 then
    v_counts := array_fill(6, array[23]);
    v_counts[22] := 5;
    v_counts[23] := 5;
  end if;

  -- Continuar la numeración de aretes existente (H-000000 / M-000000)
  select coalesce(max(substring(tag from 3)::int), 0) into v_next_h
  from public.animals where tag ~ '^H-[0-9]+$';

  select coalesce(max(substring(tag from 3)::int), 0) into v_next_m
  from public.animals where tag ~ '^M-[0-9]+$';

  for v_i in 1..v_n loop
    for v_k in 1..v_counts[v_i] loop
      v_idx := v_idx + 1;

      -- 70 machos / 66 hembras
      if v_idx <= 70 then
        v_gender := 'Macho';
        v_next_m := v_next_m + 1;
        v_tag := 'M-' || lpad(v_next_m::text, 6, '0');
      else
        v_gender := 'Hembra';
        v_next_h := v_next_h + 1;
        v_tag := 'H-' || lpad(v_next_h::text, 6, '0');
      end if;

      -- El id se pasa explícito para no depender del default de la tabla.
      insert into public.animals (
        id, tag, role, gender, breed, birth_date, weight,
        etapa_actual, feed_type, daily_consumption, status,
        madre_id, created_at
      ) values (
        gen_random_uuid(),
        v_tag, 'Ceba', v_gender, 'Landrace x Yorkshire', current_date - 10, 12,
        -- daily_consumption = 0: el lechón lactante no consume alimento propio,
        -- come de la madre. Empieza a consumir Fases al destetarse.
        'Lechones', 'Lactancia', 0, 'Activo',
        v_madres[v_i], now()
      );
    end loop;
  end loop;

  -- Una sola fuente de verdad: el conteo de camada ahora se deriva de las filas
  -- reales de 'Lechones'. Maternidad las refleja, no las almacena.
  update public.animals
     set litter_males = null, litter_females = null
   where etapa_actual = 'Maternidad';

  ---------------------------------------------------------------------------
  -- 3.3 · Verificación (si algo falla, revierte TODO)
  ---------------------------------------------------------------------------
  select count(*) into v_ges from public.animals where status='Activo' and etapa_actual='Gestación';
  select count(*) into v_mat from public.animals where status='Activo' and etapa_actual='Maternidad';
  select count(*) into v_lec from public.animals where status='Activo' and etapa_actual='Lechones';
  select count(*) into v_des from public.animals where status='Activo' and etapa_actual='Destete';
  select count(*) into v_ceb from public.animals where status='Activo' and etapa_actual='Ceba';
  select count(*) into v_tot from public.animals where status='Activo';

  if v_ges <> 88  then raise exception 'Gestación quedó en % (esperado 88)',  v_ges; end if;
  if v_mat <> 23  then raise exception 'Maternidad quedó en % (esperado 23)', v_mat; end if;
  if v_lec <> 136 then raise exception 'Lechones quedó en % (esperado 136)',  v_lec; end if;
  if v_des <> 246 then raise exception 'Destete quedó en % (esperado 246)',   v_des; end if;
  if v_ceb <> 421 then raise exception 'Ceba quedó en % (esperado 421)',      v_ceb; end if;
  if v_tot <> 914 then raise exception 'Total quedó en % (esperado 914)',     v_tot; end if;

  if exists (select 1 from public.animals where etapa_actual='Lechones' and madre_id is null) then
    raise exception 'Hay lechones sin madre asignada';
  end if;

  raise notice 'OK · Gestación 88 · Maternidad 23 · Lechones 136 · Destete 246 · Ceba 421 · Total 914';
end $$;

notify pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- PASO 4 · Resultado final
-- -----------------------------------------------------------------------------
select etapa_actual as zona, count(*) as animales
from public.animals
where status = 'Activo'
group by etapa_actual
order by count(*) desc;
