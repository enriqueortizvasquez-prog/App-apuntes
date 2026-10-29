-- Authorized admin verification only; all fixtures and deletions roll back.
do $verify$
declare
  a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
  space uuid; other uuid; task uuid; invite jsonb; blocked boolean;
  payload jsonb:='{"title":"Prueba eliminación con rollback","course_name":"Curso de prueba","color":"#a9c2e8","due":"2030-01-01","time":"18:00","priority":"normal","notes":"","link":""}'::jsonb;
begin
 begin
  insert into auth.users(id) values(a),(b),(c);
  perform set_config('request.jwt.claim.sub',a::text,true);
  set local role authenticated;
  space:=public.create_space('Prueba eliminación','course',jsonb_build_array(payload));
  select id into strict task from public.shared_tasks where space_id=space;
  invite:=public.create_invite(space,'member');
  perform public.set_task_progress(task,true);
  blocked:=false;
  begin perform public.leave_space(space);exception when raise_exception then blocked:=true;end;
  if not blocked then raise exception 'El propietario puede abandonar sin eliminar';end if;
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform public.accept_invite((invite->>'token')::uuid);
  perform public.set_task_progress(task,true);
  blocked:=false;
  begin perform public.delete_space(space);exception when raise_exception then blocked:=true;end;
  if not blocked then raise exception 'Un miembro puede borrar todo';end if;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.change_member(space,b,'admin');
  perform set_config('request.jwt.claim.sub',b::text,true);
  blocked:=false;
  begin perform public.delete_space(space);exception when raise_exception then blocked:=true;end;
  if not blocked then raise exception 'Un administrador no propietario puede borrar todo';end if;
  perform set_config('request.jwt.claim.sub',c::text,true);
  blocked:=false;
  begin perform public.delete_space(space);exception when raise_exception then blocked:=true;end;
  if not blocked then raise exception 'Un extraño puede borrar todo';end if;
  other:=public.create_space('Curso ajeno preservado','course',jsonb_build_array(payload));
  set local role anon;
  blocked:=false;
  begin perform public.delete_space(space);exception when insufficient_privilege then blocked:=true;end;
  if not blocked then raise exception 'Un anónimo puede ejecutar eliminación';end if;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub','',true);
  blocked:=false;
  begin perform public.delete_space(space);exception when raise_exception then blocked:=true;end;
  if not blocked then raise exception 'Una sesión sin identidad puede borrar';end if;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.delete_space(space);
  blocked:=false;
  begin perform public.preview_invite((invite->>'token')::uuid);exception when raise_exception then blocked:=true;end;
  if not blocked then raise exception 'La invitación eliminada sigue funcionando';end if;
  reset role;
  if exists(select 1 from public.shared_spaces where id=space)
     or exists(select 1 from public.shared_tasks where space_id=space)
     or exists(select 1 from public.space_members where space_id=space)
     or exists(select 1 from public.space_invites where space_id=space)
     or exists(select 1 from public.task_progress where task_id=task)
  then raise exception 'La eliminación dejó datos relacionados';end if;
  if not exists(select 1 from public.shared_spaces where id=other) then raise exception 'Se eliminó un curso ajeno';end if;
  raise exception using errcode='ZX001',message='DELETE_SPACE_VERIFICATION_PASSED';
 exception when sqlstate 'ZX001' then
  if sqlerrm<>'DELETE_SPACE_VERIFICATION_PASSED' then raise;end if;
 end;
end;
$verify$;
select 'PASSED: solo propietario, no miembros/administradores/extraños/anónimos, cascada completa e invitación inválida, curso ajeno conservado; todas las fixtures revertidas' as resultado;
