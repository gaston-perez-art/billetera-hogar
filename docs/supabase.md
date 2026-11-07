# Configurar Supabase

Pasos para pasar la app de modo demo a datos reales compartidos. Se hacen una sola vez.

## 1. Proyecto

1. Crear un proyecto en [supabase.com](https://supabase.com) (plan gratis). Región: São Paulo.
2. **Project Settings → API**: copiar la **Project URL** y la clave **anon / publishable**. La service role key no se usa.

## 2. Base

En **SQL Editor**, correr en orden:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_app.sql`
3. `supabase/migrations/0003_vigencias.sql`
4. `supabase/migrations/0004_fotos.sql` (fotos de perfil compartidas)
5. `supabase/migrations/0005_alta_pagos.sql` (agregar pagos fijos desde Ajustes)

## 3. Cuentas

Login con mail y contraseña. No usa mails: el SMTP que trae Supabase en el plan gratis solo manda a los miembros del equipo, con pocos envíos por hora, y no deja editar las plantillas.

1. **Authentication → Users → Add user → Create new user**: mail y contraseña de cada uno, con **Auto Confirm User** tildado.
2. **Authentication → Sign In / Providers**: desactivar **Allow new users to sign up**, para que nadie más pueda crear cuenta.

## 4. Hogar

1. En **SQL Editor**, pegar `supabase/seed/crear-hogar.sql` con los dos mails reemplazados y correrlo (sin guardar los mails en el repo).
2. Entrar a la app con cualquiera de las dos cuentas.

## 5. Datos

- Desde cero: cargar ingresos, techos y pagos fijos en Ajustes.
- Con los datos reales que ya se usaban en el POC: en la app conectada, Ajustes → Importar archivo .json con ese mismo `.json` (vive fuera del repo). Reemplaza todo lo del hogar; los nombres de los miembros del archivo tienen que coincidir con los del hogar.

## 6. Variables

- Local: copiar `.env.example` a `.env.local` y completar.
- Sitio publicado: en GitHub, **Settings → Secrets and variables → Actions → Variables**, crear `SUPABASE_URL` y `SUPABASE_ANON_KEY`. Volver a correr el workflow de Pages.

Sin variables, la app arranca en modo demo (datos ficticios en el navegador).
