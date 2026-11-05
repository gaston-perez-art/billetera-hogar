# CLAUDE.md — Billetera Hogar

## Qué es

Webapp tipo billetera (estilo Mercado Pago) para que Gastón y Jime (pareja) carguen los gastos del hogar desde el celular y vean cada mes cuánto le toca poner a cada uno y cuánto le queda. Reemplaza la planilla de Google Sheets "Reestructuración Económica FIN".

Leer antes de tocar lógica:
- `docs/reglas-de-negocio.md` — fórmulas de la planilla que la app tiene que respetar (fuente de verdad del negocio).
- `docs/modelo-de-datos.md` y `supabase/migrations/0001_init.sql` — esquema.

## Stack

- Next.js (App Router) + TypeScript + Tailwind, PWA instalable en el celular.
- Supabase: Auth (2 usuarios), Postgres con RLS por hogar, Realtime.
- Deploy en Vercel.

## Convenciones

- UI en español rioplatense (voseo). Montos en pesos con formato es-AR: `$1.234.567` (sin decimales en pantalla). Fechas `DD/MM/AAAA`.
- Montos en DB como `numeric(14,2)`, nunca float.
- Mes = primer día del mes (`date`).
- Toda tabla de datos tiene `hogar_id` y RLS con `es_miembro(hogar_id)`. No crear tablas sin RLS.
- Cálculos de mes, categorías y reparto en vistas SQL (`v_categorias_mes`, `v_reparto_mes`), no duplicados en el frontend.

## Diseño

- Limpio, claro y moderno. Referencia principal: la interfaz nueva de MODO (fondo blanco, saldo centrado en tarjeta, botones pastilla verdes, actividad sin cajas). También ARQ, Mercado Pago, Ualá.
- Sistema visual (`src/app/globals.css`, `src/components/ui.tsx`, `src/components/Iconos.tsx`). Paleta cerrada: fondo blanco, tres tintas (texto, tenue, sutil), un gris de relleno, verde de marca y su versión suave. Verde/rojo de montos solo como semáforo. No agregar colores fuera de los tokens.
- Cada pantalla: encabezado con saludo y ajustes, chip del mes, y el número principal en `Resumen` (tarjeta blanca, centrado, leyenda abajo, cifras chicas debajo). Listas con `Grupo` + `FilaLista`, filas directas sobre blanco. Íconos de categoría en círculo verde suave. Botones pastilla (`Boton` / `estiloBoton`). Montos de movimientos con `MontoMovimiento` (signo en color).
- Nada de etiquetas en mayúsculas ni metadatos con "·": usar comas o una segunda línea.
- Verde = lo que queda; rojo = te pasaste. Ceros como "–".
- Carga de gasto en 3 toques: monto → categoría → detalle. Fecha = hoy y "pagó" = usuario logueado por defecto.
- Nada de métricas que no sirvan (se sacó "gasto por día" de la planilla por inútil).

## Reglas clave (resumen)

- Te queda de verdad = entra − gastado − pagos fijos pendientes.
- Te queda por categoría = techo − gastado.
- Techo de Deuda del mes = suma de cuotas fijas marcadas `es_deuda`.
- Alquiler + AySA + TM se muestran como un solo pago.
- Marcar un pago fijo como pagado **crea el movimiento** (en la planilla se olvidaba cargarlo y el saldo quedaba inflado).
- Reparto: proporción por ingreso. Plan (le toca, le debería quedar) vs. real (puso, le queda) y diferencia. Gasto previsto = Σ max(techo, gastado).
- Un monto negativo es plata que entra sin ser ingreso del mes (ej.: préstamo usado para cancelar deudas).
- Gastos de Santino: categoría Santino (meses viejos: Chicos con detalle que empieza con "Santino"); mostrar total del mes.

## Seguridad

- El repo es (o fue) público: nunca commitear claves, `.env`, datos reales de gastos, montos personales ni números de cuenta.
- Variables en `.env.local` (ignorado). Dejar `.env.example` con nombres de variables vacías.
- La service role key de Supabase nunca en el cliente.

## Estado del código (POC)

- `src/lib/store.tsx`: capa de datos en `localStorage`. Es lo único que se reemplaza al conectar Supabase.
- `src/lib/calculos.ts`: reglas de negocio en TS **solo mientras no haya base**; al conectar Supabase se borran y se usan las vistas SQL. `calculos.test.ts` queda como casos para validar las vistas.
- `src/lib/demo.ts`: datos ficticios. Nunca poner montos reales.
- Datos reales en el POC: se importan desde Ajustes → "Importar datos" con un `.json` que vive fuera del repo (`*.json` de datos reales nunca se commitea). Queda solo en el navegador.

## Próximos pasos

1. ~~Diseño de pantallas y scaffold~~ (POC hecho).
2. Conectar Supabase (cliente, auth con magic link) reemplazando `store.tsx`.
3. Aplicar migración y seed de categorías.
4. Importador desde la planilla (CSV de la hoja "Base de datos": Fecha, Monto, Categoría, Detalle, Medio de pago, Pagó).
5. Explorar actualización de saldo real (ver "Ideas" en README).
