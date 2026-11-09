# Plan para escalar

Qué hace falta para que la app la use cualquier hogar, no solo Gastón y Jime. Es un plan: nada de esto está hecho. Cada punto dice qué hay hoy en el código y qué cambiar.

## 1. Registro y login

**Hoy:** login con mail y contraseña, cuentas creadas a mano desde el panel de Supabase, registro abierto desactivado, sin mails (`docs/supabase.md`, punto 3). El hogar se crea a mano con `supabase/seed/crear-hogar.sql`.

**Para abrirla:**

1. **Entrar con Google (y Apple si se publica en iPhone como app).** No necesita mandar mails ni guardar contraseñas, y evita el problema del SMTP del plan gratis de Supabase (solo manda al equipo del proyecto).
2. **Si se mantiene mail y contraseña:** SMTP propio (Resend, Postmark o similar) para confirmar la cuenta y recuperar la contraseña. Sin recuperación no se puede abrir a terceros.
3. **Captcha en el registro** (Supabase Auth soporta hCaptcha y Cloudflare Turnstile) para que no creen cuentas en masa.
4. **Primer ingreso = crear o unirse a un hogar.** Pantalla nueva: "Crear mi hogar" (nombre del hogar y tu nombre) o "Tengo un código". Las dos cosas por funciones SQL (`crear_hogar`, `unirse_hogar`), nunca con inserts directos desde el cliente.
5. **Categorías de arranque:** al crear un hogar, cargar las fijas (`CATEGORIAS_FIJAS`: Deuda, Santino, Chicos, Ahorro) y un set base. Santino es de este hogar: pasa a ser una categoría común o se reemplaza por "Chicos".
6. **Legales:** términos y política de privacidad. En Argentina aplica la Ley 25.326 de Protección de Datos Personales (acceso, rectificación y supresión). Botón "Borrar mi cuenta y mis datos" y "Descargar mis datos" (ya existe el export a CSV/JSON; falta el borrado).

## 2. Cuidar los datos

Son dos preguntas distintas: que un hogar no vea los datos de otro, y que vos (dueño del sistema) no los veas.

### 2.1 Que un hogar no vea los de otro

**Hoy ya está resuelto en la base:** toda tabla tiene `hogar_id` y RLS con `es_miembro(hogar_id)` (`0001_init.sql`), las vistas son `security_invoker` y las funciones SQL chequean `es_miembro` antes de tocar nada. Con la clave pública (anon) y RLS, un usuario solo lee y escribe las filas de sus hogares, aunque modifique el JavaScript del navegador.

**Falta para confiar en eso con terceros:**

1. **Test automático de aislamiento:** dos hogares, dos usuarios; el usuario A intenta leer, insertar, editar y borrar en cada tabla y cada función del hogar B, y todo tiene que fallar o devolver vacío. Correrlo en CI contra una base local (Supabase CLI) en cada cambio de migraciones. Hoy no existe.
2. **Regla de migraciones:** ninguna tabla sin RLS (ya está en `CLAUDE.md`), y además: toda función `security definer` con `set search_path`, chequeo de `es_miembro` y `revoke ... from public, anon` (hoy solo `guardar_foto` hace el `revoke`; revisar las demás).
3. **Inserts en `hogares` y `miembros` solo por funciones.** Hoy esas tablas tienen solo política de lectura, lo cual está bien; al abrir el registro, unirse a un hogar tiene que pasar por `unirse_hogar` con un código válido, nunca por un insert del cliente.
4. **Revisar el Security Advisor de Supabase** (Database → Advisors) antes de abrir: avisa de tablas sin RLS y funciones con `search_path` abierto.

### 2.2 Que vos no veas los datos de terceros

RLS **no** protege del dueño del proyecto: desde el panel de Supabase (SQL Editor, Table Editor) o con la service role key se ve todo. Las opciones, de menos a más fuerte:

| Opción | Qué logra | Qué cuesta |
|---|---|---|
| Política y proceso: no entrar a las tablas, logs de acceso del panel, 2FA en la cuenta de Supabase | Reduce el riesgo, no lo elimina. El usuario tiene que confiar en vos | Casi nada |
| Cifrado del lado del servidor (Supabase Vault / pgsodium) | Protege contra un robo del disco o del backup | No sirve contra el dueño: la clave está en el mismo proyecto |
| **Cifrado de punta a punta en el celular** (la clave sale de algo que solo saben los miembros del hogar) | Vos ves filas cifradas, sin montos ni detalles | Los cálculos en SQL (paso 3 de "Próximos pasos": vistas `v_categorias_mes`, `v_reparto_mes`) no se pueden hacer; todo se calcula en el navegador. Si pierden la clave, pierden los datos. Compartir la clave con el otro miembro del hogar requiere un intercambio de claves (invitación con clave pública) |
| Cifrar solo lo más personal (detalle, conceptos, nombres) y dejar montos y fechas en claro | Las vistas SQL siguen funcionando | Los montos se siguen viendo |

**Recomendación:** arrancar con la primera fila bien hecha y decirlo en la política de privacidad tal cual ("el administrador técnicamente puede acceder; no lo hace"). Pasar a punta a punta solo si la privacidad pasa a ser un argumento de venta, y decidirlo **antes** de mover los cálculos a SQL, porque las dos cosas se contradicen.

## 3. Una, dos o N personas

**Hoy:** el esquema ya admite N miembros por hogar (`miembros` es una tabla, no dos columnas), pero la app asume dos:

- `src/app/reparto/page.tsx`: `const [a, b] = miembros` y textos "entre los dos".
- Vista Pareja / Gastón / Jime (`src/lib/vista.ts`, `ui.tsx`): la opción "Pareja".
- `src/components/Recordatorio.tsx`: `NOMBRE_PRUEBA = "Gastón"`.
- `src/app/layout.tsx` (descripción), `src/components/Iconos.tsx` ("salidas con jime"), `src/lib/demo.ts`.
- `src/lib/store-local.tsx`: usuario por defecto `"gaston"`.

**Cambios:**

1. **Invitar:** tabla `invitaciones` (`hogar_id`, código corto, creada por, vence a las 48 h, usos 1) con RLS por hogar. "Invitar" en Ajustes genera un link `…/unirse?codigo=XXXX` para mandar por WhatsApp. `unirse_hogar(codigo)` crea la fila en `miembros` y marca el código como usado.
2. **Roles:** columna `rol` en `miembros` (`dueno` / `miembro`). Solo el dueño invita y quita. Un hogar de una sola persona funciona igual: Reparto se oculta o dice "100% tuyo".
3. **Quitar a alguien = baja, no borrado.** `movimientos.pago_por` apunta a `miembros` sin cascada, así que borrar un miembro con gastos falla, y aunque no fallara se perdería la historia. Agregar `baja_desde` a `miembros` (igual que los pagos fijos): deja de entrar, no cuenta en el reparto desde ese mes, y los meses anteriores quedan como estaban. `es_miembro` tiene que mirar que no esté dado de baja.
4. **Borrar la cuenta** (pedido de la persona): anonimizar su fila de `miembros` (nombre "Ex miembro", sin foto, `user_id` desvinculado) en vez de borrarla. Hoy `miembros.user_id` tiene `on delete cascade` desde `auth.users`: borrar el usuario de Auth borraría el miembro y chocaría con `pago_por`. Cambiar a `on delete set null`.
5. **Reparto para N:** la proporción por ingreso ya generaliza (cada uno pone su ingreso / ingreso total). Cambia la UI: en vez de dos tarjetas que giran, una por persona en carrusel o lista. Los tests de `cuentas.test.ts` ("las cuentas cierran") tienen que correr con 1, 2 y 3 miembros.
6. **Vista por persona:** "Pareja" pasa a "Todos" (o "El hogar") y el desplegable lista a cada miembro.
7. **¿Una persona en varios hogares?** Decidir. El esquema lo permite (`unique (hogar_id, user_id)`); la app hoy toma un hogar. Recomendación: no en la primera versión.

## 4. Lo demás que aparece al abrir

- **Plan de Supabase:** el gratis pausa el proyecto tras una semana sin actividad y tiene límites de base y de conexiones Realtime. Con usuarios reales, plan pago.
- **Backups:** el plan gratis no tiene restauración a un punto en el tiempo; con datos de terceros hace falta.
- **Hosting:** GitHub Pages alcanza (sitio estático). Dominio propio para que el login con Google muestre un nombre confiable.
- **Errores y uso:** algo tipo Sentry para errores del navegador, sin mandar montos ni detalles.
- **Textos y marca:** "Billetera Hogar de Gastón y Jime" pasa a ser genérica; el ícono y la paleta, decidirlos antes de publicar.

## Orden sugerido

1. Test de aislamiento de RLS en CI y revisión de funciones (`revoke`, `search_path`). Sirve aunque no se abra nunca.
2. Sacar lo hardcodeado (nombres, "Pareja", `[a, b]`) y generalizar Reparto a N con tests.
3. `baja_desde` y `rol` en `miembros`, `on delete set null`, invitaciones con código.
4. Registro con Google, onboarding "crear o unirse", categorías de arranque.
5. Legales, borrar cuenta, plan pago y backups.
6. Decidir cifrado de punta a punta antes de pasar los cálculos a SQL.
