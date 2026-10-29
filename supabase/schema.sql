-- Run once in an empty Supabase project, SQL editor. No service_role key is used by the app.
begin;
create table public.shared_spaces (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 120), kind text not null check(kind in ('task','course')),
 created_at timestamptz not null default now()
);
create table public.space_members (
 space_id uuid not null references public.shared_spaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('member','admin')), primary key(space_id,user_id)
);
create table public.shared_tasks (
 id uuid primary key default gen_random_uuid(), space_id uuid not null references public.shared_spaces(id) on delete cascade,
 title text not null check(length(title)<=120 and length(btrim(title))>=1),
 client_ref text check(length(client_ref)<=150),
 course_name text not null check(length(course_name)<=60 and length(btrim(course_name))>=1),
 color text not null check(color ~ '^#[0-9a-fA-F]{6}$'),
 due date not null check(due between date '1900-01-01' and date '9999-12-31'), due_time time not null default '23:59' check(due_time>=time '00:00' and due_time<=time '23:59' and extract(second from due_time)=0),
 priority text not null default 'normal' check(priority in ('normal','high')),
 notes text not null default '' check(length(notes)<=2000),
 link text not null default '' check(length(link)<=2000 and (link='' or link ~* '^https?://[^[:space:]]+$')),
 version integer not null default 1, updated_at timestamptz not null default now()
);
create table public.task_progress (
 task_id uuid not null references public.shared_tasks(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, done boolean not null default false,
 primary key(task_id,user_id)
);
create table public.space_invites (
 token uuid primary key default gen_random_uuid(),space_id uuid not null references public.shared_spaces(id) on delete cascade,
 role text not null check(role in ('member','admin')),expires_at timestamptz not null default now()+interval '7 days',revoked boolean not null default false
);
create index on public.space_members(user_id);
create index on public.shared_tasks(space_id);
create index on public.space_invites(space_id);
create or replace function public.is_member(p_space uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from space_members where space_id=p_space and user_id=auth.uid());
$$;
create or replace function public.is_admin(p_space uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from space_members where space_id=p_space and user_id=auth.uid() and role='admin');
$$;
alter table public.shared_spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.shared_tasks enable row level security;
alter table public.task_progress enable row level security;
alter table public.space_invites enable row level security;
-- No table writes are exposed; all mutations go through checked RPCs.
revoke all on public.shared_spaces,public.space_members,public.shared_tasks,public.task_progress,public.space_invites from anon,authenticated;
grant select on public.shared_spaces,public.space_members,public.shared_tasks,public.task_progress to authenticated;
create policy spaces_read on public.shared_spaces for select to authenticated using(public.is_member(id));
create policy members_read on public.space_members for select to authenticated using(user_id=auth.uid());
create policy tasks_read on public.shared_tasks for select to authenticated using(public.is_member(space_id));
create policy progress_read on public.task_progress for select to authenticated using(user_id=auth.uid() and exists(select 1 from shared_tasks t where t.id=task_id));

create function public.add_shared_task(p_space uuid,p_data jsonb) returns public.shared_tasks language plpgsql security definer set search_path=public as $$
declare result shared_tasks;
begin
 if not is_admin(p_space) then raise exception 'No tienes permiso para editar este espacio.';end if;
 insert into shared_tasks(space_id,title,course_name,color,due,due_time,priority,notes,link,client_ref)
 values(p_space,p_data->>'title',p_data->>'course_name',p_data->>'color',(p_data->>'due')::date,(p_data->>'time')::time,p_data->>'priority',coalesce(p_data->>'notes',''),coalesce(p_data->>'link',''),p_data->>'client_ref') returning * into result;
 return result;
end;$$;
create function public.create_space(p_title text,p_kind text,p_tasks jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare space uuid;item jsonb;
begin
 if auth.uid() is null then raise exception 'Inicia sesión.';end if;
 if jsonb_typeof(p_tasks)<>'array' or jsonb_array_length(p_tasks) not between 1 and 100 then raise exception 'Comparte entre 1 y 100 deberes.';end if;
 insert into shared_spaces(owner_id,title,kind) values(auth.uid(),p_title,p_kind) returning id into space;
 insert into space_members values(space,auth.uid(),'admin');
 for item in select value from jsonb_array_elements(p_tasks) loop perform add_shared_task(space,item);end loop;
 return space;
end;$$;
create function public.create_invite(p_space uuid,p_role text) returns jsonb language plpgsql security definer set search_path=public as $$
declare i space_invites;
begin
 if not is_admin(p_space) then raise exception 'Solo administradores pueden invitar.';end if;
 insert into space_invites(space_id,role) values(p_space,p_role) returning * into i;
 return jsonb_build_object('token',i.token,'expires_at',i.expires_at);
end;$$;
create function public.preview_invite(p_token uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare i space_invites;s shared_spaces;
begin
 select * into i from space_invites where token=p_token and not revoked and expires_at>now();
 if not found then raise exception 'El enlace caducó, fue revocado o no existe.';end if;
 select * into s from shared_spaces where id=i.space_id;
 return jsonb_build_object('title',s.title,'kind',s.kind,'role',i.role,'expires_at',i.expires_at,'count',(select count(*) from shared_tasks where space_id=s.id));
end;$$;
create function public.accept_invite(p_token uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare i space_invites;
begin
 if auth.uid() is null then raise exception 'Inicia sesión.';end if;
 select * into i from space_invites where token=p_token and not revoked and expires_at>now() for update;
 if not found then raise exception 'El enlace caducó, fue revocado o no existe.';end if;
 insert into space_members values(i.space_id,auth.uid(),i.role) on conflict do nothing;
 return i.space_id;
end;$$;
create function public.set_task_progress(p_task uuid,p_done boolean) returns void language plpgsql security definer set search_path=public as $$
declare space uuid;
begin
 select space_id into space from shared_tasks where id=p_task;
 if not is_member(space) then raise exception 'No tienes acceso a este deber.';end if;
 insert into task_progress values(p_task,auth.uid(),p_done) on conflict(task_id,user_id) do update set done=excluded.done;
end;$$;
create function public.update_shared_task(p_task uuid,p_version integer,p_data jsonb) returns public.shared_tasks language plpgsql security definer set search_path=public as $$
declare t shared_tasks;
begin
 select * into t from shared_tasks where id=p_task for update;
 if not found or not is_admin(t.space_id) then raise exception 'No tienes permiso para editar.';end if;
 if t.version<>p_version then raise exception 'Otro administrador cambió este deber. Sincroniza y vuelve a intentarlo.';end if;
 update shared_tasks set title=p_data->>'title',course_name=p_data->>'course_name',color=p_data->>'color',due=(p_data->>'due')::date,due_time=(p_data->>'time')::time,priority=p_data->>'priority',notes=coalesce(p_data->>'notes',''),link=coalesce(p_data->>'link',''),version=version+1,updated_at=now() where id=p_task returning * into t;
 return t;
end;$$;
create function public.delete_shared_task(p_task uuid) returns void language plpgsql security definer set search_path=public as $$
declare space uuid;
begin
 select space_id into space from shared_tasks where id=p_task;
 if not is_admin(space) then raise exception 'No tienes permiso para eliminar.';end if;
 delete from shared_tasks where id=p_task;
end;$$;
create function public.revoke_invites(p_space uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not is_admin(p_space) then raise exception 'No tienes permiso para revocar invitaciones.';end if;
 update space_invites set revoked=true where space_id=p_space;
end;$$;
create function public.leave_space(p_space uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not is_member(p_space) then raise exception 'No perteneces a este espacio.';end if;
 if exists(select 1 from shared_spaces where id=p_space and owner_id=auth.uid()) then
   raise exception 'El propietario no puede abandonar el espacio. Puedes revocar invitaciones o retirar miembros.';
 end if;
 delete from task_progress where user_id=auth.uid() and task_id in(select id from shared_tasks where space_id=p_space);
 delete from space_members where space_id=p_space and user_id=auth.uid();
end;$$;
create function public.list_members(p_space uuid) returns table(user_id uuid,role text,label text) language plpgsql security definer set search_path=public as $$
begin
 if not is_admin(p_space) then raise exception 'Solo administradores pueden ver los miembros.';end if;
 return query select m.user_id,m.role,'Estudiante '||left(m.user_id::text,6) from space_members m where m.space_id=p_space;
end;$$;
create function public.change_member(p_space uuid,p_user uuid,p_role text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not is_admin(p_space) then raise exception 'No tienes permiso.';end if;
 if exists(select 1 from shared_spaces where id=p_space and owner_id=p_user) then raise exception 'No se puede cambiar el acceso del propietario.';end if;
 if p_user=auth.uid() then raise exception 'No puedes cambiar tu propio acceso desde aquí.';end if;
 if p_role='remove' then
   delete from task_progress where user_id=p_user and task_id in(select id from shared_tasks where space_id=p_space);
   delete from space_members where space_id=p_space and user_id=p_user;
 elsif p_role in ('member','admin') then update space_members set role=p_role where space_id=p_space and user_id=p_user;
 else raise exception 'Permiso no válido.';end if;
end;$$;
-- PostgreSQL grants EXECUTE to PUBLIC by default: revoke it explicitly for every app function.
revoke all on function public.is_member(uuid),public.is_admin(uuid),public.add_shared_task(uuid,jsonb),public.create_space(text,text,jsonb),public.create_invite(uuid,text),public.preview_invite(uuid),public.accept_invite(uuid),public.set_task_progress(uuid,boolean),public.update_shared_task(uuid,integer,jsonb),public.delete_shared_task(uuid),public.revoke_invites(uuid),public.leave_space(uuid),public.list_members(uuid),public.change_member(uuid,uuid,text) from public,anon;
grant execute on function public.is_member(uuid),public.is_admin(uuid),public.add_shared_task(uuid,jsonb),public.create_space(text,text,jsonb),public.create_invite(uuid,text),public.accept_invite(uuid),public.set_task_progress(uuid,boolean),public.update_shared_task(uuid,integer,jsonb),public.delete_shared_task(uuid),public.revoke_invites(uuid),public.leave_space(uuid),public.list_members(uuid),public.change_member(uuid,uuid,text) to authenticated;
grant execute on function public.preview_invite(uuid) to anon,authenticated;
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

commit;
