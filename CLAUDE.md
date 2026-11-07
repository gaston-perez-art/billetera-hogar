# CLAUDE.md — Billetera Hogar

## Qué es

Webapp tipo billetera (estilo Mercado Pago) para que Gastón y Jime (pareja) carguen los gastos del hogar desde el celular y vean cada mes cuánto le toca poner a cada uno y cuánto le queda. Reemplaza la planilla de Google Sheets "Reestructuración Económica FIN".

Leer antes de tocar lógica:
- `docs/reglas-de-negocio.md` — fórmulas de la planilla que la app tiene que respetar (fuente de verdad del negocio).
- `docs/modelo-de-datos.md` y `supabase/migrations/0001_init.sql` — esquema.

## Stack

- Next.js (App Router) + TypeScript + Tailwind, PWA instalable en el celular.
- Supabase: Auth (2 usuarios), Postgres con RLS por hogar, Realtime.
- Deploy en GitHub Pages como sitio estático (`output: "export"`): no hay servidor, todo va del navegador a Supabase con la clave pública y RLS. El workflow compila y sube `out/` a la rama `gh-pages`, que es la fuente de Pages (el deploy por Actions se colgaba).

## Convenciones

- UI en español rioplatense (voseo). Montos en pesos con formato es-AR: `$1.234.567` (sin decimales en pantalla). Fechas `DD/MM/AAAA`.
- Montos en DB como `numeric(14,2)`, nunca float.
- Mes = primer día del mes (`date`).
- Toda tabla de datos tiene `hogar_id` y RLS con `es_miembro(hogar_id)`. No crear tablas sin RLS.
- Cálculos de mes, categorías y reparto en vistas SQL (`v_categorias_mes`, `v_reparto_mes`), no duplicados en el frontend.

## Diseño

- Limpio, claro, moderno y que se sienta premium. Referencia principal: la interfaz nueva de MODO (saldo centrado en tarjeta, botones pastilla verdes). En claro, como Galicia: fondo gris apenas marcado y todo lo que agrupa en tarjetas blancas. En oscuro: casi negro, tarjetas con un brillo muy leve arriba y filo de luz (`.superficie` + `shadow-tarjeta`). También ARQ, Mercado Pago, Ualá.
- Sistema visual (`src/app/globals.css`, `src/components/ui.tsx`, `src/components/Iconos.tsx`). Paleta cerrada: fondo gris claro, tarjeta blanca, tres tintas (texto, tenue, sutil), un gris de relleno, verde de marca y su versión suave. Verde/rojo de montos solo como semáforo. No agregar colores fuera de los tokens.
- Cada pantalla: encabezado con saludo y ajustes, chip del mes, y el número principal en `Resumen` (tarjeta blanca, centrado, leyenda abajo, cifras chicas debajo). Listas con `Grupo` + `FilaLista`, filas sin divisores dentro de una tarjeta (`TarjetaLista`); la actividad de Inicio, una tarjeta por día. Toda tarjeta usa `superficie shadow-tarjeta ring-1 ring-linea`; los botones redondos del encabezado, igual. Íconos de categoría en círculo con borde fino y sin relleno, como MP (`IconoCategoria`); fechas de pagos igual (`Fecha`, roja si venció). Botones pastilla (`Boton` / `estiloBoton`).
- **Un solo gráfico por pantalla**, en la tarjeta de arriba. Las listas no llevan barras: dicen el estado con palabras ("Usaron el 31%", "Ojo, ya usaron el 85%", "Te pasaste" en rojo).
- Montos: `MontoMovimiento` como MP, "- $14.900" en el color del texto y "+ $900.000" en verde solo si entra. `MontoGrande` con el "$" chico y arriba. Plata puesta en cero se muestra "$0", no "–".
- Montos editables con `CampoMonto`: formato en vivo "5.000.000,32", el "$" en la misma línea que la cifra (más chico y tenue) y el campo del ancho del texto, para que quede centrado. Todo lo que se edita lleva un lápiz sutil (filas de Ajustes, monto de la hoja, monto y categoría en "Revisá y guardá"). Ningún campo con letra de menos de 16 px (iPhone hace zoom). Editar en Ajustes = tocar la fila y abrir `Hoja` desde abajo. Secciones largas con `Seccion` (cerrada, con su total a la vista).
- Transiciones cortas (≤ 250 ms) que no bloquean: pantalla que entra (`app/template.tsx`), pasos de Cargar que deslizan, hojas que suben y bajan, tarjeta de Reparto que gira. Todas se apagan con "reducir movimiento". Sombras solo en lo que flota (tarjeta principal, hojas).
- Pensar en Jime: tiene que poder usarla todos los días sin saber Excel. Frases en criollo antes que gráficos; Inicio responde "¿cuánto podemos gastar?" y "¿vamos bien?" (`planMes`).
- Modo oscuro: los mismos tokens con otros valores en `globals.css` (sigue al celular; Ajustes → Apariencia lo fija en claro u oscuro con `data-tema` en `<html>`). Nunca usar colores fijos como `text-white` o `#fff` en componentes: sobre el verde de marca va `text-sobre-marca`.
- Cada pantalla tiene identidad: Inicio saluda; el resto lleva título grande y su propio gráfico (Pagos: línea del mes; Reparto: las dos fotos con la división). En Inicio, Categorías y Pagos el número principal queda fijo arriba al bajar (`SaldoFijo`).
- Inicio prioriza la actividad: Próximos pagos va plegado (cuántos, cuánto y cuándo vence el primero) y se acuerda si lo abriste.
- Reparto: tocar la tarjeta de cada uno la da vuelta (el mismo giro que la de arriba, `TarjetaQueGira` con `mismoAlto`) y muestra en qué gasta (`estadisticasPersona`: top 3 categorías, gasto más grande, comparación con el mes anterior, sin pagos fijos), sin cambiar el alto. El dato del INDEC va chico, en dos líneas.
- **Los dos / Solo yo** (`src/lib/vista.ts`, selector junto al mes): preferencia de cada celular. En Inicio y Categorías, "Solo yo" muestra solo lo que cargó quien usa la app (`gastosDe`). Pagos y Reparto se ven igual. No hay vista "solo el otro": no se mira lo ajeno.
- **Recordatorio** (`components/Recordatorio.tsx`, regla en `lib/recordatorio.ts`): hoja al abrir Inicio si no cargaste nada en 24 h, o pasadas las 23 sin carga del día. Se calla hasta el día siguiente (o hasta las 23). A Gastón se le muestra una vez por celular como prueba aunque no toque (`CLAVE_PRUEBA`); después sigue la regla. No hay notificaciones push: harían falta service worker, claves VAPID y algo que mande a horario (Edge Function + cron).
- Tacto: todo botón se hunde apenas al presionarlo y las filas se oscurecen (`globals.css`); `Tactil` vibra corto al tocar (Android con `navigator.vibrate`, iPhone con iOS 18+ vía interruptor nativo). No agregar animaciones decorativas.
- **Exportar para la planilla** (Ajustes, `src/lib/exportar.ts`): CSV con las columnas de "Base de datos" (Fecha DD/MM/AAAA, Monto con punto decimal, Categoría, Detalle, Medio de pago, Pagó) para el período elegido (desde/hasta con calendario, atajos de mes). La planilla queda solo para revisar: no se carga en los dos lados.
- Fotos de perfil: se cargan en Reparto (cualquiera carga la de cualquiera), achicadas a 256 px, y se guardan en `miembros.foto` con `guardar_foto` (`0004_fotos.sql`): las ven los dos. Las viejas que quedaron en un navegador se suben solas una vez (`src/lib/fotos.ts`). Nunca al repo.
- Nada de etiquetas en mayúsculas ni metadatos con "·": usar comas o una segunda línea.
- Verde = lo que queda; rojo = te pasaste. Ceros como "–", salvo plata puesta o saldos ("$0").
- Carga de gasto en 3 toques: monto → categoría → detalle. Fecha = hoy y "pagó" = usuario logueado por defecto.
- Nada de métricas que no sirvan (se sacó "gasto por día" de la planilla por inútil).

## Reglas clave (resumen)

- Te queda de verdad = entra − gastado − pagos fijos pendientes.
- Te queda por categoría = techo − gastado.
- **Las cuentas cierran entre pantallas** (`src/lib/cuentas.test.ts`): lo libre de todas las categorías, lo de cada persona (`paraGastarPorPersona`) y el "le queda para gastar" de Reparto suman el número de Inicio; lo comprometido en pagos fijos por categoría suma lo que falta pagar en Pagos. Cualquier cálculo nuevo tiene que sumarse a esos tests.
- **Editar no cambia el pasado:** cambiar un sueldo vale desde el mes elegido (cierra el ingreso anterior con `hasta` y abre otro con `desde`); dar de baja un pago fijo guarda `bajaDesde` (y no vuelve a aparecer salvo en meses que se pagó); un pago fijo nuevo (Ajustes → Agregar pago fijo) guarda `altaDesde` y no aparece en meses anteriores; renombrarlo no cambia los gastos ya cargados; los techos ya valían desde el mes en que se cargan; los pagos ya pagados guardan su monto en `pagos_mes`.
- **Tarjeta de Inicio:** plegada muestra el saldo, "tienen entre los dos" = entra − gastado, y lo que le queda a cada uno (= ingresa − puso; suman el saldo). Abierta, la cuenta: entró − ya gastaron = tienen; − pagos que faltan − para cada uno = queda para la casa. El "Te queda / Te quedaba" de cada día es el saldo al cierre de ese día (`saldoPorDia`).
- **Ojito** (encabezado): oculta todos los montos como "$***" en este celular (`src/lib/privacidad.ts`, `fijarMontosOcultos` en `formato.ts`). Toda cifra que se muestre tiene que pasar por `pesos()` para respetarlo; los campos de edición no se ocultan.
- **"Queda para {nombre}"** (Reparto) = lo que gana − su parte de la casa (`leQuedaPlan`). Responde "¿cuánto me queda para mí después de aportar?". Es calculado, no una meta: baja si se pasan de algún techo (sube la parte de cada uno). Entre los dos suman "para cada uno" (`paraCadaUno` = max(entra − gasto previsto, 0)). Si alguien puso más que su parte, Reparto lo dice: sale de lo suyo y se compensa al cerrar el mes.
- Queda para la casa (`paraGastar`) = entra − gastado − pagos que faltan − para cada uno. La tarjeta muestra esa resta renglón por renglón: un solo número arriba, nunca varios "te queda" que compitan. Pasarse en una categoría sale del ahorro.
- La barra de abajo navega al levantar el dedo (`useToqueDirecto`): en iPhone, durante el impulso del scroll, el primer toque no dispara click.
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
  - **Nube** (`store-nube.tsx`) si hay `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`: login con mail y contraseña (`components/Acceso.tsx`; cuentas creadas desde el panel, sin registro abierto ni mails), datos del hogar, Realtime y recarga al volver a la app. Cada cambio se muestra al instante con la operación pura y se guarda en la base; la recarga posterior corrige si la base lo rechazó.
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
