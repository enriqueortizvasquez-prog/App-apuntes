-- Run via an authorized admin connection only, after installing schema.sql.
-- All fixture users/data are inside a subtransaction intentionally rolled back.
-- No email is sent, no password/session is created, no real user's data is changed.
do $verify$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
 space uuid; task public.shared_tasks; invite jsonb; expired jsonb; blocked boolean;
 payload jsonb:='{"title":"Prueba transaccional Apuntes","course_name":"Prueba","color":"#a9c2e8","due":"2030-01-01","time":"18:00","priority":"normal","notes":"Texto común","link":"","client_ref":"fixture-rollback"}'::jsonb;
begin
 begin
  insert into auth.users(id) values(a),(b),(c);
  perform set_config('request.jwt.claim.sub',a::text,true);
  set local role authenticated;
  if auth.uid()<>a then raise exception 'Identidad A incorrecta';end if;
  space:=public.create_space('Prueba transaccional','course',jsonb_build_array(payload));
  select * into strict task from public.shared_tasks where space_id=space;
  invite:=public.create_invite(space,'member');
  perform set_config('request.jwt.claim.sub',b::text,true);
  if exists(select 1 from public.shared_tasks where space_id=space) then raise exception 'RLS permite lectura sin pertenencia';end if;
  blocked:=false;
  begin perform public.set_task_progress(task.id,true);exception when raise_exception then blocked:=true;end;
  if not blocked then raise exception 'Se permitió progreso sin pertenencia';end if;
  set local role anon;
  if (public.preview_invite((invite->>'token')::uuid)->>'title')<>'Prueba transaccional' then raise exception 'Vista previa incorrecta';end if;
  blocked:=false;
  begin perform public.accept_invite((invite->>'token')::uuid);exception when insufficient_privilege then blocked:=true;end;
  if not blocked then raise exception 'Se permitió aceptar sin autenticación';end if;
  set local role authenticated;
  perform public.accept_invite((invite->>'token')::uuid);
  if not exists(select 1 from public.shared_tasks where id=task.id) then raise exception 'Miembro no puede consultar su grupo';end if;
  blocked:=false;
  begin update public.shared_tasks set title='No permitido' where id=task.id;exception when insufficient_privilege then blocked:=true;end;
  if not blocked then raise exception 'Se permitió escritura directa';end if;
  blocked:=false;
  begin perform public.update_shared_task(task.id,1,payload);exception when raise_exception then blocked:=true;end;
  if not blocked then raise exception 'Miembro pudo editar como administrador';end if;
  perform public.set_task_progress(task.id,true);
  if not exists(select 1 from public.task_progress where task_id=task.id and done) then raise exception 'No se guardó progreso propio';end if;
  perform set_config('request.jwt.claim.sub',a::text,true);
  if exists(select 1 from public.task_progress where task_id=task.id) then raise exception 'Un usuario puede leer progreso ajeno';end if;
  perform public.update_shared_task(task.id,1,payload||'{"title":"Fecha e información actualizadas"}'::jsonb);
  perform public.change_member(space,b,'admin');
  perform set_config('request.jwt.claim.sub',b::text,true);
  if not exists(select 1 from public.shared_tasks where id=task.id and version=2 and title='Fecha e información actualizadas') then raise exception 'Cambio común no disponible para B';end if;
  blocked:=false;
  begin perform public.update_shared_task(task.id,1,payload);exception when raise_exception then blocked:=true;end;
  if not blocked then raise exception 'No se detectó conflicto de versiones';end if;
  blocked:=false;
  begin perform public.change_member(space,a,'remove');exception when raise_exception then blocked:=true;end;
  if not blocked then raise exception 'Se pudo retirar al propietario';end if;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.revoke_invites(space);
  expired:=public.create_invite(space,'member');
  reset role;
  update public.space_invites set expires_at=now()-interval '1 minute' where token=(expired->>'token')::uuid;
  perform set_config('request.jwt.claim.sub',c::text,true);
  set local role authenticated;
  blocked:=false;
  begin perform public.accept_invite((invite->>'token')::uuid);exception when raise_exception then blocked:=true;end;
  if not blocked then raise exception 'Se aceptó invitación revocada';end if;
  blocked:=false;
  begin perform public.accept_invite((expired->>'token')::uuid);exception when raise_exception then blocked:=true;end;
  if not blocked then raise exception 'Se aceptó invitación caducada';end if;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.change_member(space,b,'remove');
  perform set_config('request.jwt.claim.sub',b::text,true);
  if exists(select 1 from public.shared_tasks where id=task.id) then raise exception 'Miembro retirado conserva lectura';end if;
  if exists(select 1 from public.task_progress where task_id=task.id) then raise exception 'Miembro retirado conserva progreso accesible';end if;
  blocked:=false;
  begin perform public.set_task_progress(task.id,true);exception when raise_exception then blocked:=true;end;
  if not blocked then raise exception 'Miembro retirado conserva escritura';end if;
  reset role;
  -- Only this deliberate exception is caught below. It rolls back ALL fixtures.
  raise exception using errcode='ZX001',message='APUNTES_VERIFICATION_PASSED';
 exception when sqlstate 'ZX001' then
  if sqlerrm<>'APUNTES_VERIFICATION_PASSED' then raise;end if;
 end;
end;
$verify$;
select 'PASSED: pertenencia, permisos, progreso independiente, cambios comunes, conflictos, propietario, revocación, caducidad y retirada; fixtures revertidos' as resultado;
