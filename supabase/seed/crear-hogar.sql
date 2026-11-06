-- Crea el hogar, suma a los dos miembros y carga las categorías.
-- Correr UNA vez en el SQL Editor de Supabase, después de crear las dos cuentas
-- en Authentication → Users.
--
-- Reemplazá los dos mails antes de correrlo. No commitees este archivo con mails reales.

do $$
declare
  h uuid;
  mail_gaston text := 'MAIL_DE_GASTON';
  mail_jime   text := 'MAIL_DE_JIME';
begin
  insert into hogares (nombre) values ('Hogar') returning id into h;

  insert into miembros (hogar_id, user_id, nombre)
  select h, id, 'Gastón' from auth.users where email = mail_gaston;
  insert into miembros (hogar_id, user_id, nombre)
  select h, id, 'Jime' from auth.users where email = mail_jime;

  if (select count(*) from miembros where hogar_id = h) <> 2 then
    raise exception 'No encontré a los dos usuarios: ¿están creados en Authentication → Users con esos mails?';
  end if;

  -- Techos en 0: se completan en la app (Ajustes) o importando el .json.
  insert into categorias (hogar_id, nombre, orden)
  select h, nombre, orden - 1
  from unnest(array[
    'Súper y comida', 'Delivery', 'Nafta y transporte', 'Uber', 'Casa y servicios',
    'Izán', 'Santino', 'Entrenamientos', 'Salud', 'Personal', 'Deuda',
    'Salidas con Jime', 'Jardín', 'Otros', 'Seguro del auto'
  ]) with ordinality as t(nombre, orden);
end $$;
