-- Billetera Hogar: lo que la app necesita sobre el esquema inicial.

-- Ingresos sin mes = se repiten todos los meses (sueldo). Con mes = extra puntual (aguinaldo).
alter table ingresos alter column mes drop not null;

-- Borrar un gasto que venía de un pago fijo deja el pago pendiente otra vez.
create or replace function liberar_pago_mes() returns trigger
language plpgsql set search_path = public as $$
begin
  update pagos_mes set pagado = false, movimiento_id = null where movimiento_id = old.id;
  return old;
end $$;

create trigger movimientos_liberan_pago
before delete on movimientos
for each row execute function liberar_pago_mes();

-- Marcar un pago fijo como pagado CREA el gasto, en una sola transacción.
-- El id del gasto viene del cliente para que la pantalla no tenga que esperar.
create or replace function marcar_pagado(
  p_pago_fijo uuid, p_mes date, p_pago_por uuid, p_fecha date, p_movimiento uuid default gen_random_uuid()
) returns uuid
language plpgsql set search_path = public as $$
declare
  pf pagos_fijos;
  existente pagos_mes;
begin
  select * into pf from pagos_fijos where id = p_pago_fijo;
  if pf.id is null or not es_miembro(pf.hogar_id) then
    raise exception 'Pago fijo inexistente';
  end if;

  select * into existente from pagos_mes where pago_fijo_id = p_pago_fijo and mes = p_mes for update;
  if existente.pagado then
    return existente.movimiento_id;
  end if;

  insert into movimientos (id, hogar_id, fecha, monto, categoria_id, detalle, pago_por)
  values (p_movimiento, pf.hogar_id, p_fecha, coalesce(existente.monto, pf.monto), pf.categoria_id, pf.concepto, p_pago_por);

  insert into pagos_mes (hogar_id, pago_fijo_id, mes, monto, pagado, movimiento_id)
  values (pf.hogar_id, p_pago_fijo, p_mes, coalesce(existente.monto, pf.monto), true, p_movimiento)
  on conflict (pago_fijo_id, mes) do update set pagado = true, movimiento_id = excluded.movimiento_id;

  return p_movimiento;
end $$;

-- Desmarcar borra el gasto; el trigger deja el pago pendiente.
create or replace function desmarcar_pagado(p_pago_fijo uuid, p_mes date) returns void
language plpgsql set search_path = public as $$
begin
  delete from movimientos where id = (
    select movimiento_id from pagos_mes where pago_fijo_id = p_pago_fijo and mes = p_mes and pagado
  );
end $$;

-- Reemplaza todos los datos del hogar con los de un archivo exportado de la app.
-- Los ids ya vienen convertidos a uuid y los miembros ya mapeados a los del hogar.
create or replace function importar_datos(p_hogar uuid, p_datos jsonb) returns void
language plpgsql set search_path = public as $$
begin
  if not es_miembro(p_hogar) then
    raise exception 'No sos miembro de este hogar';
  end if;

  delete from pagos_mes where hogar_id = p_hogar;
  delete from movimientos where hogar_id = p_hogar;
  delete from pagos_fijos where hogar_id = p_hogar;
  delete from ingresos where hogar_id = p_hogar;
  delete from techos where hogar_id = p_hogar;
  delete from categorias where hogar_id = p_hogar;

  insert into categorias (id, hogar_id, nombre, orden)
  select (c->>'id')::uuid, p_hogar, c->>'nombre', (c->>'orden')::int
  from jsonb_array_elements(p_datos->'categorias') c;

  insert into techos (hogar_id, categoria_id, mes, monto)
  select p_hogar, (t->>'categoriaId')::uuid, (t->>'mes')::date, (t->>'monto')::numeric
  from jsonb_array_elements(p_datos->'techos') t;

  insert into ingresos (id, hogar_id, miembro_id, mes, concepto, monto)
  select (i->>'id')::uuid, p_hogar, (i->>'miembroId')::uuid, (i->>'mes')::date, i->>'concepto', (i->>'monto')::numeric
  from jsonb_array_elements(p_datos->'ingresos') i;

  insert into pagos_fijos (id, hogar_id, concepto, categoria_id, dia, monto, es_deuda, activo)
  select (p->>'id')::uuid, p_hogar, p->>'concepto', (p->>'categoriaId')::uuid, (p->>'dia')::int,
         (p->>'monto')::numeric, (p->>'esDeuda')::boolean, (p->>'activo')::boolean
  from jsonb_array_elements(p_datos->'pagosFijos') p;

  insert into movimientos (id, hogar_id, fecha, monto, categoria_id, detalle, medio, pago_por, created_at)
  select (m->>'id')::uuid, p_hogar, (m->>'fecha')::date, (m->>'monto')::numeric, (m->>'categoriaId')::uuid,
         m->>'detalle', m->>'medio', (m->>'pagoPor')::uuid, coalesce((m->>'creadoEn')::timestamptz, now())
  from jsonb_array_elements(p_datos->'movimientos') m;

  insert into pagos_mes (id, hogar_id, pago_fijo_id, mes, monto, pagado, movimiento_id)
  select (p->>'id')::uuid, p_hogar, (p->>'pagoFijoId')::uuid, (p->>'mes')::date, (p->>'monto')::numeric,
         (p->>'pagado')::boolean, (p->>'movimientoId')::uuid
  from jsonb_array_elements(p_datos->'pagosMes') p;
end $$;

-- Realtime: los dos celulares ven los cambios al instante.
alter publication supabase_realtime add table categorias, techos, ingresos, movimientos, pagos_fijos, pagos_mes;
