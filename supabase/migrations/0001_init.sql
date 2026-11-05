-- Billetera Hogar: esquema inicial

create table hogares (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

create table miembros (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  unique (hogar_id, user_id)
);

create table categorias (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares(id) on delete cascade,
  nombre text not null,
  orden int not null default 0,
  unique (hogar_id, nombre)
);

create table techos (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares(id) on delete cascade,
  categoria_id uuid not null references categorias(id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  monto numeric(14,2) not null default 0,
  unique (categoria_id, mes)
);

create table ingresos (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares(id) on delete cascade,
  miembro_id uuid not null references miembros(id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  concepto text not null,
  monto numeric(14,2) not null
);

create table movimientos (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares(id) on delete cascade,
  fecha date not null default current_date,
  monto numeric(14,2) not null,
  categoria_id uuid not null references categorias(id),
  detalle text,
  medio text,
  pago_por uuid not null references miembros(id),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index on movimientos (hogar_id, fecha);

create table pagos_fijos (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares(id) on delete cascade,
  concepto text not null,
  categoria_id uuid not null references categorias(id),
  dia int not null check (dia between 1 and 31),
  monto numeric(14,2) not null,
  es_deuda boolean not null default false, -- suma al techo de Deuda del mes
  activo boolean not null default true
);

create table pagos_mes (
  id uuid primary key default gen_random_uuid(),
  hogar_id uuid not null references hogares(id) on delete cascade,
  pago_fijo_id uuid not null references pagos_fijos(id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  monto numeric(14,2) not null,
  pagado boolean not null default false,
  movimiento_id uuid references movimientos(id) on delete set null,
  unique (pago_fijo_id, mes)
);

-- RLS: solo miembros del hogar
create or replace function es_miembro(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros where hogar_id = h and user_id = auth.uid())
$$;

do $$
declare t text;
begin
  foreach t in array array['categorias','techos','ingresos','movimientos','pagos_fijos','pagos_mes'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all using (es_miembro(hogar_id)) with check (es_miembro(hogar_id))', t || '_miembros', t);
  end loop;
end $$;

alter table hogares enable row level security;
create policy hogares_miembros on hogares for select using (es_miembro(id));
alter table miembros enable row level security;
create policy miembros_del_hogar on miembros for select using (es_miembro(hogar_id));

-- Vista: en qué se va (por categoría y mes)
create or replace view v_categorias_mes with (security_invoker = true) as
select c.hogar_id, m.mes, c.id as categoria_id, c.nombre, c.orden,
  coalesce(g.gastado, 0) as gastado,
  coalesce(t.monto, 0)
    + case when c.nombre = 'Deuda'
        then coalesce((select sum(pm.monto) from pagos_mes pm join pagos_fijos pf on pf.id = pm.pago_fijo_id
                       where pf.es_deuda and pm.mes = m.mes and pm.hogar_id = c.hogar_id), 0)
        else 0 end as techo
from categorias c
cross join (select distinct date_trunc('month', fecha)::date as mes from movimientos
            union select distinct mes from techos) m
left join techos t on t.categoria_id = c.id and t.mes = m.mes
left join lateral (
  select sum(mv.monto) as gastado from movimientos mv
  where mv.categoria_id = c.id and date_trunc('month', mv.fecha)::date = m.mes
) g on true;

-- Vista: reparto por persona (plan vs real)
create or replace view v_reparto_mes with (security_invoker = true) as
with previsto as (
  select hogar_id, mes, sum(greatest(techo, gastado)) as total from v_categorias_mes group by 1, 2
), ing as (
  select hogar_id, mes, miembro_id, sum(monto) as ingresa from ingresos group by 1, 2, 3
), puso as (
  select hogar_id, date_trunc('month', fecha)::date as mes, pago_por as miembro_id, sum(monto) as puso
  from movimientos group by 1, 2, 3
)
select i.hogar_id, i.mes, i.miembro_id, i.ingresa,
  i.ingresa / nullif(sum(i.ingresa) over (partition by i.hogar_id, i.mes), 0) as proporcion,
  p.total * i.ingresa / nullif(sum(i.ingresa) over (partition by i.hogar_id, i.mes), 0) as le_toca,
  coalesce(pu.puso, 0) as puso
from ing i
join previsto p on p.hogar_id = i.hogar_id and p.mes = i.mes
left join puso pu on pu.hogar_id = i.hogar_id and pu.mes = i.mes and pu.miembro_id = i.miembro_id;
-- le_queda_plan = ingresa - le_toca; le_queda_real = ingresa - puso; diferencia = le_toca - puso
