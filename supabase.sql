-- =========================================================
-- Diario de la Rosa — base de datos en Supabase
-- Pégalo completo en: Supabase → SQL Editor → New query → Run
-- =========================================================

-- ---------- Perfiles (uno por usuario) ----------
create table if not exists public.perfiles (
  id         uuid primary key references auth.users on delete cascade,
  usuario    text unique not null check (usuario ~ '^[a-z0-9_]{3,20}$'),
  bio        text not null default '' check (char_length(bio) <= 160),
  favoritos  text[] not null default '{}' check (coalesce(array_length(favoritos, 1), 0) <= 4),
  creado     timestamptz not null default now()
);

-- ---------- Registros (lo que cada usuario hizo con cada capítulo) ----------
create table if not exists public.registros (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references public.perfiles(id) on delete cascade,
  cap         text not null check (cap ~ '^[0-9]{1,2}x[0-9]{1,3}$'),   -- "15x1" = temporada 15, capítulo 1
  cal         numeric(2,1) check (cal is null or (cal between 0.5 and 5 and cal * 2 = floor(cal * 2))),
  visto       boolean not null default false,
  me_gusta    boolean not null default false,
  por_ver     boolean not null default false,
  resena      text check (char_length(resena) <= 4000),
  visto_el    date,
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  unique (usuario_id, cap)
);

create index if not exists registros_cap_idx         on public.registros (cap);
create index if not exists registros_actualizado_idx on public.registros (actualizado desc);

-- ---------- Crear el perfil automáticamente al registrarse ----------
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, usuario)
  values (new.id, lower(new.raw_user_meta_data ->> 'usuario'));
  return new;
end $$;

drop trigger if exists al_registrarse on auth.users;
create trigger al_registrarse
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- ---------- Fecha de actualización automática ----------
create or replace function public.tocar_actualizado()
returns trigger language plpgsql as $$
begin
  new.actualizado := now();
  return new;
end $$;

drop trigger if exists registros_actualizado on public.registros;
create trigger registros_actualizado
  before update on public.registros
  for each row execute function public.tocar_actualizado();

-- ---------- Seguridad: todos leen, cada quien edita lo suyo ----------
alter table public.perfiles  enable row level security;
alter table public.registros enable row level security;

drop policy if exists "perfiles visibles"     on public.perfiles;
drop policy if exists "editar mi perfil"      on public.perfiles;
drop policy if exists "registros visibles"    on public.registros;
drop policy if exists "crear mis registros"   on public.registros;
drop policy if exists "editar mis registros"  on public.registros;
drop policy if exists "borrar mis registros"  on public.registros;

create policy "perfiles visibles"    on public.perfiles  for select using (true);
create policy "editar mi perfil"     on public.perfiles  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "registros visibles"   on public.registros for select using (true);
create policy "crear mis registros"  on public.registros for insert with check (auth.uid() = usuario_id);
create policy "editar mis registros" on public.registros for update using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);
create policy "borrar mis registros" on public.registros for delete using (auth.uid() = usuario_id);

-- ---------- Permisos explícitos para la API ----------
-- (el proyecto no expone tablas nuevas automáticamente, así que se dan aquí)
grant usage on schema public to anon, authenticated;
grant select on public.perfiles, public.registros to anon, authenticated;
grant insert, update, delete on public.registros to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- El nombre de usuario no se puede cambiar desde la app (evita suplantaciones)
revoke update on public.perfiles from anon, authenticated;
grant  update (bio, favoritos) on public.perfiles to authenticated;
