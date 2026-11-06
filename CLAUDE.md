# CLAUDE.md — Billetera Hogar

## Qué es

Webapp tipo billetera (estilo Mercado Pago) para que Gastón y Jime (pareja) carguen los gastos del hogar desde el celular y vean cada mes cuánto le toca poner a cada uno y cuánto le queda. Reemplaza la planilla de Google Sheets "Reestructuración Económica FIN".

Leer antes de tocar lógica:
- `docs/reglas-de-negocio.md` — fórmulas de la planilla que la app tiene que respetar (fuente de verdad del negocio).
- `docs/modelo-de-datos.md` y `supabase/migrations/0001_init.sql` — esquema.

## Stack

- Next.js (App Router) + TypeScript + Tailwind, PWA instalable en el celular.
- Supabase: Auth (2 usuarios), Postgres con RLS por hogar, Realtime.
- Deploy en GitHub Pages como sitio estático (`output: "export"`): no hay servidor, todo va del navegador a Supabase con la clave pública y RLS.

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
- Modo oscuro: los mismos tokens con otros valores en `globals.css` (sigue al celular; Ajustes → Apariencia lo fija en claro u oscuro con `data-tema` en `<html>`). Nunca usar colores fijos como `text-white` o `#fff` en componentes: sobre el verde de marca va `text-sobre-marca`.
- Cada pantalla tiene identidad: Inicio saluda y el saldo queda fijo arriba al bajar (`SaldoFijo`); el resto lleva título grande y su propio gráfico (Pagos: línea del mes; Reparto: las dos fotos con la división).
- Tacto: todo botón se hunde apenas al presionarlo y las filas se oscurecen (`globals.css`); `Tactil` vibra corto al tocar (Android con `navigator.vibrate`, iPhone con iOS 18+ vía interruptor nativo). No agregar animaciones decorativas.
- Fotos de perfil: se cargan en Reparto, se guardan achicadas solo en el navegador (`src/lib/fotos.ts`). Nunca al repo.
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

## Estado del código

- Las pantallas solo usan `useBilletera()` (`src/lib/contexto.tsx`). `src/lib/store.tsx` elige el modo:
  - **Nube** (`store-nube.tsx`) si hay `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`: login con código por mail (`components/Acceso.tsx`), datos del hogar, Realtime y recarga al volver a la app. Cada cambio se muestra al instante con la operación pura y se guarda en la base; la recarga posterior corrige si la base lo rechazó.
  - **Demo** (`store-local.tsx`) sin variables: datos ficticios en `localStorage`.
- `src/lib/operaciones.ts`: cambios como funciones puras, compartidos por los dos modos.
- `src/lib/nube.ts`: filas de Supabase ↔ tipos de la app, techo vigente por mes e importación de `.json`.
- Marcar/desmarcar pagado e importar son funciones SQL (`0002_app.sql`), en una sola transacción. Borrar un gasto que venía de un pago fijo lo deja pendiente (trigger).
- Techos por mes: se guarda en el mes elegido y vale hasta que se cargue otro (`techoVigente`). La vista `v_categorias_mes` todavía usa el techo exacto del mes: ajustarla al pasar los cálculos a SQL.
- `src/lib/calculos.ts`: reglas de negocio en TS por ahora; el plan es pasarlas a las vistas SQL y usar `calculos.test.ts` como casos de validación.
- `src/lib/demo.ts`: datos ficticios. Nunca poner montos reales.
- Configuración de Supabase paso a paso: `docs/supabase.md`.

## Próximos pasos

1. ~~Diseño de pantallas y scaffold~~ (POC hecho).
2. ~~Conectar Supabase (cliente, login, Realtime)~~. Falta hacer la configuración de `docs/supabase.md` y verificar RLS con las dos cuentas.
3. Pasar los cálculos de `calculos.ts` a las vistas SQL (techo vigente incluido).
4. Importador desde la planilla (CSV de la hoja "Base de datos": Fecha, Monto, Categoría, Detalle, Medio de pago, Pagó).
5. Explorar actualización de saldo real (ver "Ideas" en README).
