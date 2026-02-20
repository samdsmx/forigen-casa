-- =============================================================
-- Migración: Catálogo geográfico SEPOMEX + campos geo en actividad y beneficiario
-- =============================================================

-- 1) Tablas del catálogo SEPOMEX

create table if not exists cat_estado (
  clave text primary key,
  nombre text not null unique
);

create table if not exists cat_municipio (
  id text primary key,
  clave_estado text not null references cat_estado(clave),
  clave_municipio text not null,
  nombre text not null,
  unique (clave_estado, clave_municipio)
);

create table if not exists cat_asentamiento (
  id serial primary key,
  codigo_postal text not null,
  nombre text not null,
  tipo_asentamiento text,
  municipio_id text not null references cat_municipio(id),
  ciudad text
);

create index if not exists idx_asentamiento_cp on cat_asentamiento(codigo_postal);
create index if not exists idx_asentamiento_municipio on cat_asentamiento(municipio_id);

-- RLS: lectura para todos los autenticados, escritura solo admin
alter table cat_estado enable row level security;
alter table cat_municipio enable row level security;
alter table cat_asentamiento enable row level security;

create policy cat_estado_read on cat_estado for select using (true);
create policy cat_estado_admin_write on cat_estado
  for all using (exists(select 1 from app_user u where u.auth_user_id=auth.uid() and u.role='admin'))
  with check (exists(select 1 from app_user u where u.auth_user_id=auth.uid() and u.role='admin'));

create policy cat_municipio_read on cat_municipio for select using (true);
create policy cat_municipio_admin_write on cat_municipio
  for all using (exists(select 1 from app_user u where u.auth_user_id=auth.uid() and u.role='admin'))
  with check (exists(select 1 from app_user u where u.auth_user_id=auth.uid() and u.role='admin'));

create policy cat_asentamiento_read on cat_asentamiento for select using (true);
create policy cat_asentamiento_admin_write on cat_asentamiento
  for all using (exists(select 1 from app_user u where u.auth_user_id=auth.uid() and u.role='admin'))
  with check (exists(select 1 from app_user u where u.auth_user_id=auth.uid() and u.role='admin'));

-- 2) Alterar tabla actividad: reemplazar ubicacion con campos geo estructurados
alter table actividad drop column if exists ubicacion;
alter table actividad add column if not exists estado_clave text references cat_estado(clave);
alter table actividad add column if not exists municipio_id text references cat_municipio(id);
alter table actividad add column if not exists codigo_postal text;
alter table actividad add column if not exists localidad_colonia text;

-- 3) Alterar tabla beneficiario: agregar procedencia geográfica
alter table beneficiario add column if not exists estado_clave text references cat_estado(clave);
alter table beneficiario add column if not exists municipio_id text references cat_municipio(id);
alter table beneficiario add column if not exists codigo_postal text;
alter table beneficiario add column if not exists localidad_colonia text;

-- 4) Índices para reportes de cobertura
create index if not exists idx_actividad_estado on actividad(estado_clave);
create index if not exists idx_actividad_municipio on actividad(municipio_id);
create index if not exists idx_beneficiario_estado on beneficiario(estado_clave);
create index if not exists idx_beneficiario_municipio on beneficiario(municipio_id);
