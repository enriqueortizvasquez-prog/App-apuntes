-- Only the owner may destroy a shared space. Cascades are defined in schema.sql.
create or replace function public.delete_space(p_space uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión.'; end if;
  delete from public.shared_spaces where id=p_space and owner_id=auth.uid();
  if not found then
    raise exception 'Solo el propietario puede eliminar este espacio, o ya no existe.';
  end if;
end;
$$;
revoke all on function public.delete_space(uuid) from public, anon;
grant execute on function public.delete_space(uuid) to authenticated;
