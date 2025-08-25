
-- Enable useful extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Roles (logical, not DB roles)
create table if not exists app_role (
  name text primary key
);
insert into app_role (name) values
  ('admin'), ('supervisor_central'), ('coordinador_sede'), ('facilitador')
on conflict do nothing;

-- Sede
create table if not exists sede (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  estado text,
  created_at timestamp with time zone default now()
);

-- Catálogos
create table if not exists actividad_tipo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamp with time zone default now()
);

create table if not exists actividad_subtipo (
  id uuid primary key default gen_random_uuid(),
  tipo_id uuid not null references actividad_tipo(id) on delete cascade,
  nombre text not null,
  unique (tipo_id, nombre),
  created_at timestamp with time zone default now()
);

create table if not exists tema (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamp with time zone default now()
);

create table if not exists poblacion_grupo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamp with time zone default now()
);

-- Usuarios de aplicación (mapeo con auth.users)
create table if not exists app_user (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null references app_role(name),
  sede_id uuid references sede(id),
  is_active boolean not null default true,
  created_at timestamp with time zone default now()
);

-- Beneficiario
create table if not exists beneficiario (
  id uuid primary key default gen_random_uuid(),
  curp text unique, -- único cuando no sea NULL
  nombre text not null,
  primer_apellido text not null,
  segundo_apellido text,
  fecha_nacimiento date not null,
  sexo text not null, -- cat simple: F/M/X
  poblacion_indigena text, -- Sí/No/Prefiere no decir
  lengua_indigena text,
  condicion_migrante text, -- Sí/No/Prefiere no decir
  escolaridad text,
  created_at timestamp with time zone default now()
);

-- Normaliza CURP a mayúsculas
create or replace function trg_curp_upper() returns trigger as $$
begin
  if new.curp is not null then
    new.curp := upper(trim(new.curp));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tg_curp_upper on beneficiario;
create trigger tg_curp_upper before insert or update on beneficiario
for each row execute procedure trg_curp_upper();

-- Asociación Beneficiario↔Sede (para RLS por sede)
create table if not exists beneficiario_sede (
  beneficiario_id uuid not null references beneficiario(id) on delete cascade,
  sede_id uuid not null references sede(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (beneficiario_id, sede_id)
);

-- Programa (= proyecto por sede)
create table if not exists programa (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references sede(id) on delete restrict,
  nombre text not null,
  objetivo text,
  fecha_inicio date,
  fecha_fin date,
  metas_clave text,
  tema_id uuid references tema(id),
  poblacion_grupo_id uuid references poblacion_grupo(id),
  estado text not null default 'activo',
  created_at timestamp with time zone default now()
);

-- Actividad (depende de Programa; incluye sede_id para facilitar RLS)
create table if not exists actividad (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null references programa(id) on delete cascade,
  sede_id uuid not null references sede(id) on delete restrict,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  tipo_id uuid not null references actividad_tipo(id),
  subtipo_id uuid references actividad_subtipo(id),
  facilitador_id uuid references app_user(id),
  cupo integer,
  ubicacion text,
  notas text,
  created_at timestamp with time zone default now()
);

-- Mantén sede_id consistente con el programa
create or replace function trg_actividad_set_sede() returns trigger as $$
begin
  if new.programa_id is not null then
    select sede_id into new.sede_id from programa where id = new.programa_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tg_actividad_set_sede on actividad;
create trigger tg_actividad_set_sede before insert or update on actividad
for each row execute procedure trg_actividad_set_sede();

-- Asistencia (Persona x Actividad) + sede_id redundante
create table if not exists asistencia (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references actividad(id) on delete cascade,
  beneficiario_id uuid not null references beneficiario(id) on delete cascade,
  sede_id uuid not null references sede(id) on delete restrict,
  created_at timestamp with time zone default now(),
  unique (actividad_id, beneficiario_id)
);

-- Sede de asistencia desde actividad
create or replace function trg_asistencia_set_sede() returns trigger as $$
begin
  if new.actividad_id is not null then
    select sede_id into new.sede_id from actividad where id = new.actividad_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tg_asistencia_set_sede on asistencia;
create trigger tg_asistencia_set_sede before insert on asistencia
for each row execute procedure trg_asistencia_set_sede();

/* ==================== RLS ==================== */
alter table sede enable row level security;
alter table actividad_tipo enable row level security;
alter table actividad_subtipo enable row level security;
alter table tema enable row level security;
alter table poblacion_grupo enable row level security;
alter table app_user enable row level security;
alter table beneficiario enable row level security;
alter table beneficiario_sede enable row level security;
alter table programa enable row level security;
alter table actividad enable row level security;
alter table asistencia enable row level security;

-- Helper checks
create or replace function is_admin_or_supervisor() returns boolean language sql stable as $$
  select exists(
    select 1 from app_user u
    where u.auth_user_id = auth.uid()
      and u.role in ('admin','supervisor_central')
  );
$$;

create or replace function user_sede_id() returns uuid language sql stable as $$
  select u.sede_id from app_user u where u.auth_user_id = auth.uid();
$$;

create or replace function user_role() returns text language sql stable as $$
  select u.role from app_user u where u.auth_user_id = auth.uid();
$$;

-- Sede: admin/supervisor ven todo; otros sólo su sede
create policy sede_select_all on sede
for select using (
  is_admin_or_supervisor() or id = user_sede_id()
);
-- sólo admin puede escribir sedes
create policy sede_admin_write on sede
for all using (exists(select 1 from app_user u where u.auth_user_id=auth.uid() and u.role='admin'))
with check (exists(select 1 from app_user u where u.auth_user_id=auth.uid() and u.role='admin'));

-- Catálogos: lectura para todos; escritura admin/supervisor
create policy cat_read_all_tipo on actividad_tipo for select using (true);
create policy cat_write_tipo on actividad_tipo
for all using (is_admin_or_supervisor()) with check (is_admin_or_supervisor());

create policy cat_read_all_subtipo on actividad_subtipo for select using (true);
create policy cat_write_subtipo on actividad_subtipo
for all using (is_admin_or_supervisor()) with check (is_admin_or_supervisor());

create policy cat_read_all_tema on tema for select using (true);
create policy cat_write_tema on tema
for all using (is_admin_or_supervisor()) with check (is_admin_or_supervisor());

create policy cat_read_all_pob on poblacion_grupo for select using (true);
create policy cat_write_pob on poblacion_grupo
for all using (is_admin_or_supervisor()) with check (is_admin_or_supervisor());

-- app_user: cada quien ve su fila; admin ve/edita todos
create policy app_user_self on app_user
for select using (auth.uid() = auth_user_id);
create policy app_user_admin_all on app_user
for all using (exists(select 1 from app_user u where u.auth_user_id=auth.uid() and u.role='admin'))
with check (exists(select 1 from app_user u where u.auth_user_id=auth.uid() and u.role='admin'));

-- beneficiario: admin/supervisor ven todo; otros si está vinculado a su sede
create policy benef_read on beneficiario
for select using (
  is_admin_or_supervisor()
  or exists (
    select 1 from beneficiario_sede bs
    where bs.beneficiario_id = beneficiario.id
      and bs.sede_id = user_sede_id()
  )
);
-- Insert permitido si es admin/supervisor o si el usuario tiene sede (se recomienda usar Edge Function para crear también la vinculación)
create policy benef_insert on beneficiario
for insert with check (
  is_admin_or_supervisor()
  or user_role() in ('coordinador_sede','facilitador')
);
-- Update sólo admin/supervisor o si está vinculado a su sede
create policy benef_update on beneficiario
for update using (
  is_admin_or_supervisor()
  or exists (
    select 1 from beneficiario_sede bs
    where bs.beneficiario_id = beneficiario.id
      and bs.sede_id = user_sede_id()
  )
);

-- beneficiario_sede: admin/supervisor todo; otros sólo su sede
create policy benefsede_read on beneficiario_sede
for select using (
  is_admin_or_supervisor()
  or sede_id = user_sede_id()
);
create policy benefsede_write on beneficiario_sede
for all using (
  is_admin_or_supervisor()
  or sede_id = user_sede_id()
) with check (
  is_admin_or_supervisor()
  or sede_id = user_sede_id()
);

-- programa: admin/supervisor todo; coordinador sólo su sede; facilitador lectura de su sede
create policy programa_select on programa
for select using (
  is_admin_or_supervisor() or sede_id = user_sede_id()
);
create policy programa_insert on programa
for insert with check (
  is_admin_or_supervisor() or sede_id = user_sede_id()
);
create policy programa_update on programa
for update using (
  is_admin_or_supervisor() or sede_id = user_sede_id()
);

-- actividad: similar
create policy actividad_select on actividad
for select using (
  is_admin_or_supervisor() or sede_id = user_sede_id()
);
-- insert/update: admin/supervisor o coordinador; facilitador no crea/edita
create policy actividad_insert on actividad
for insert with check (
  is_admin_or_supervisor() or user_role() = 'coordinador_sede'
);
create policy actividad_update on actividad
for update using (
  is_admin_or_supervisor() or user_role() = 'coordinador_sede'
);

-- asistencia: lectura e inserción por sede (facilitador/coordinador); admin/supervisor todo
create policy asistencia_select on asistencia
for select using (
  is_admin_or_supervisor() or sede_id = user_sede_id()
);
create policy asistencia_insert on asistencia
for insert with check (
  is_admin_or_supervisor() or sede_id = user_sede_id()
);

