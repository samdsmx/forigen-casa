
-- Sedes (5) con slugs acordados
insert into sede (nombre, slug, estado) values
('Centro Casa Origen Nayarit', 'nayarit', 'Nayarit'),
('Villa Victoria, Estado de México', 'villa-victoria', 'Estado de México'),
('Tlapa, Guerrero', 'tlapa', 'Guerrero'),
('San Antonio Juárez, Puebla', 'san-antonio-juarez', 'Puebla'),
('Acapulco, Guerrero', 'acapulco', 'Guerrero')
on conflict (slug) do nothing;

-- Catálogos mínimos
insert into actividad_tipo (nombre) values
('Taller'), ('Charla'), ('Sesión de apoyo'), ('Orientación')
on conflict do nothing;

-- Subtipos (opcional)
insert into actividad_subtipo (tipo_id, nombre)
select (select id from actividad_tipo where nombre='Taller'), 'Habilidades socioemocionales'
union all
select (select id from actividad_tipo where nombre='Taller'), 'Alfabetización digital'
union all
select (select id from actividad_tipo where nombre='Charla'), 'Prevención de violencia'
on conflict do nothing;

insert into tema (nombre) values
('Salud emocional'), ('Violencia de género'), ('Inclusión'), ('Educación digital')
on conflict do nothing;

insert into poblacion_grupo (nombre) values
('Mujeres adultas'), ('Adolescentes'), ('Niñas y niños'), ('Personas migrantes')
on conflict do nothing;
