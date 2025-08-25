-- === HOTFIX: permisos y ejecución para evitar 500 en REST ===

-- Asegura acceso al esquema 'public'
grant usage on schema public to anon, authenticated;

-- Permisos de lectura básicos (RLS seguirá aplicando)
grant select on table app_user to authenticated;
grant select on table sede to authenticated;
grant select on table actividad_tipo to authenticated;
grant select on table actividad_subtipo to authenticated;
grant select on table tema to authenticated;
grant select on table poblacion_grupo to authenticated;
grant select on table programa to authenticated;
grant select on table actividad to authenticated;
grant select on table beneficiario to authenticated;
grant select on table beneficiario_sede to authenticated;
grant select on table asistencia to authenticated;

-- Permisos de escritura necesarios (RLS limita por rol/sede)
grant insert, update, delete on table beneficiario to authenticated;
grant insert, update, delete on table beneficiario_sede to authenticated;
grant insert, update, delete on table programa to authenticated;
grant insert, update, delete on table actividad to authenticated;
grant insert, update on table asistencia to authenticated;

-- Ejecutar funciones helper
grant execute on function is_admin_or_supervisor() to authenticated;
grant execute on function user_sede_id() to authenticated;
grant execute on function user_role() to authenticated;
