-- ==============================================================================
-- SCRIPT DE SIMPLIFICACIÓN RADICAL DE RLS (Solución de Estabilidad)
-- ==============================================================================
-- Ejecuta este script en el Editor SQL de Supabase para eliminar cuellos de botella.
-- Esto PERMITE que cualquier usuario autenticado LEA toda la información y
-- que cualquier usuario con registro en app_user pueda ESCRIBIR.
--
-- Objetivo: Eliminar recursión infinita y latencia de conexión.
-- ==============================================================================

-- 1. Eliminar políticas existentes (limpieza total)
DROP POLICY IF EXISTS "sede_select_all" ON sede;
DROP POLICY IF EXISTS "sede_admin_write" ON sede;

DROP POLICY IF EXISTS "cat_read_all_tipo" ON actividad_tipo;
DROP POLICY IF EXISTS "cat_write_tipo" ON actividad_tipo;
DROP POLICY IF EXISTS "cat_read_all_subtipo" ON actividad_subtipo;
DROP POLICY IF EXISTS "cat_write_subtipo" ON actividad_subtipo;
DROP POLICY IF EXISTS "cat_read_all_tema" ON tema;
DROP POLICY IF EXISTS "cat_write_tema" ON tema;
DROP POLICY IF EXISTS "cat_read_all_pob" ON poblacion_grupo;
DROP POLICY IF EXISTS "cat_write_pob" ON poblacion_grupo;

DROP POLICY IF EXISTS "app_user_self" ON app_user;
DROP POLICY IF EXISTS "app_user_admin_all" ON app_user;

DROP POLICY IF EXISTS "benef_read" ON beneficiario;
DROP POLICY IF EXISTS "benef_insert" ON beneficiario;
DROP POLICY IF EXISTS "benef_update" ON beneficiario;

DROP POLICY IF EXISTS "benefsede_read" ON beneficiario_sede;
DROP POLICY IF EXISTS "benefsede_write" ON beneficiario_sede;

DROP POLICY IF EXISTS "programa_select" ON programa;
DROP POLICY IF EXISTS "programa_insert" ON programa;
DROP POLICY IF EXISTS "programa_update" ON programa;

DROP POLICY IF EXISTS "actividad_select" ON actividad;
DROP POLICY IF EXISTS "actividad_insert" ON actividad;
DROP POLICY IF EXISTS "actividad_update" ON actividad;

DROP POLICY IF EXISTS "asistencia_select" ON asistencia;
DROP POLICY IF EXISTS "asistencia_insert" ON asistencia;

-- 2. Asegurar índices clave (Optimización de lectura)
CREATE INDEX IF NOT EXISTS idx_app_user_auth_id ON app_user(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_programa_sede ON programa(sede_id);
CREATE INDEX IF NOT EXISTS idx_actividad_programa ON actividad(programa_id);
CREATE INDEX IF NOT EXISTS idx_actividad_sede ON actividad(sede_id);
CREATE INDEX IF NOT EXISTS idx_actividad_fecha ON actividad(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencia_actividad ON asistencia(actividad_id);
CREATE INDEX IF NOT EXISTS idx_beneficiario_sede_ben ON beneficiario_sede(beneficiario_id);

-- 3. Crear Políticas Simplificadas ("Fast Track")

-- > app_user: Lectura pública (para autenticados) para evitar recursión al consultar roles
CREATE POLICY "fast_read_app_user" ON app_user FOR SELECT TO authenticated USING (true);
CREATE POLICY "fast_write_app_user" ON app_user FOR ALL TO authenticated USING (auth.uid() = auth_user_id); -- Cada quien edita lo suyo (o admin via dashboard)

-- > Tablas de Datos: Lectura TOTAL para autenticados (Velocidad máxima)
CREATE POLICY "fast_read_sede" ON sede FOR SELECT TO authenticated USING (true);
CREATE POLICY "fast_read_programa" ON programa FOR SELECT TO authenticated USING (true);
CREATE POLICY "fast_read_actividad" ON actividad FOR SELECT TO authenticated USING (true);
CREATE POLICY "fast_read_beneficiario" ON beneficiario FOR SELECT TO authenticated USING (true);
CREATE POLICY "fast_read_asistencia" ON asistencia FOR SELECT TO authenticated USING (true);
CREATE POLICY "fast_read_cat_tipo" ON actividad_tipo FOR SELECT TO authenticated USING (true);
CREATE POLICY "fast_read_cat_subtipo" ON actividad_subtipo FOR SELECT TO authenticated USING (true);

-- > Escritura: Permitida para cualquier usuario autenticado (Desactivando validación de rol estricta por ahora)
--   Nota: En el futuro, puedes reintroducir `exists(select 1 from app_user where ...)` pero optimizado.
CREATE POLICY "fast_write_all_sede" ON sede FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "fast_write_all_programa" ON programa FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "fast_write_all_actividad" ON actividad FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "fast_write_all_beneficiario" ON beneficiario FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "fast_write_all_asistencia" ON asistencia FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "fast_write_all_cat" ON actividad_tipo FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Notificar éxito
SELECT 'Políticas RLS simplificadas aplicadas correctamente' as mensaje;
