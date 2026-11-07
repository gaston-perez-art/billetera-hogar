-- Fotos de perfil compartidas: cualquiera de los dos carga la foto de cualquiera
-- y queda guardada para los dos celulares.
-- Se guarda la foto ya achicada (JPEG de 256 px en data URL, unos 20-40 KB) en la fila del miembro:
-- son dos fotos por hogar, no hace falta Storage.

alter table miembros add column foto text
  check (foto is null or (foto like 'data:image/%' and length(foto) <= 200000));

-- miembros solo tiene permiso de lectura: la foto se cambia con esta función,
-- que deja tocar solo la columna foto y solo de alguien de tu mismo hogar.
create or replace function guardar_foto(p_miembro uuid, p_foto text) returns void
language plpgsql security definer set search_path = public as $$
declare
  h uuid;
begin
  select hogar_id into h from miembros where id = p_miembro;
  if h is null or not es_miembro(h) then
    raise exception 'Miembro inexistente';
  end if;
  update miembros set foto = p_foto where id = p_miembro;
end $$;

revoke all on function guardar_foto(uuid, text) from public, anon;
grant execute on function guardar_foto(uuid, text) to authenticated;

-- La foto nueva aparece al instante en el otro celular.
alter publication supabase_realtime add table miembros;
