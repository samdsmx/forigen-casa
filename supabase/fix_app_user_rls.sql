-- ==============================================================================
-- FIX CRÍTICO: Resolver recursión RLS en app_user
-- ==============================================================================
-- EJECUTAR EN: Supabase Dashboard → SQL Editor → New query → Pegar → Run
--
-- PROBLEMA: Las políticas RLS de app_user causan recursión infinita:
--   1. Query a app_user → ejecuta política RLS
--   2. Política llama a is_admin_or_supervisor() / user_role()
--   3. Esas funciones leen app_user → vuelve al paso 1
--   Resultado: timeout, AbortError, pantalla colgada después de login
--
-- SOLUCIÓN: 
--   A) Funciones helper con SECURITY DEFINER (bypass RLS)
--   B) Política de app_user simplificada (sin recursión)
-- ==============================================================================

-- PASO 1: Recrear funciones helper con SECURITY DEFINER
-- Esto permite que las funciones lean app_user sin pasar por RLS

CREATE OR REPLACE FUNCTION is_admin_or_supervisor() 
RETURNS boolean 
LANGUAGE sql STABLE 
SECURITY DEFINER 
SET search_path = public 
AS $$
  SELECT EXISTS(
    SELECT 1 FROM app_user u
    WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin','supervisor_central')
  );
$$;

CREATE OR REPLACE FUNCTION user_sede_id() 
RETURNS uuid 
LANGUAGE sql STABLE 
SECURITY DEFINER 
SET search_path = public 
AS $$
  SELECT u.sede_id FROM app_user u WHERE u.auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION user_role() 
RETURNS text 
LANGUAGE sql STABLE 
SECURITY DEFINER 
SET search_path = public 
AS $$
  SELECT u.role FROM app_user u WHERE u.auth_user_id = auth.uid();
$$;

-- PASO 2: Reemplazar políticas de app_user (eliminar recursión)

DROP POLICY IF EXISTS "app_user_self" ON app_user;
DROP POLICY IF EXISTS "app_user_admin_all" ON app_user;
DROP POLICY IF EXISTS "fast_read_app_user" ON app_user;
DROP POLICY IF EXISTS "fast_write_app_user" ON app_user;

-- Lectura: cada usuario autenticado puede leer su propia fila
-- Admin puede leer todas (usando SECURITY DEFINER, sin recursión)
CREATE POLICY "app_user_read" ON app_user
  FOR SELECT TO authenticated
  USING (
    auth.uid() = auth_user_id
    OR is_admin_or_supervisor()
  );

-- Escritura: solo admin (via dashboard/API)
CREATE POLICY "app_user_write" ON app_user
  FOR ALL TO authenticated
  USING (is_admin_or_supervisor())
  WITH CHECK (is_admin_or_supervisor());

-- PASO 3: Índice para optimizar la consulta más frecuente
CREATE INDEX IF NOT EXISTS idx_app_user_auth_id ON app_user(auth_user_id);

-- PASO 4: Permisos de ejecución
GRANT EXECUTE ON FUNCTION is_admin_or_supervisor() TO authenticated;
GRANT EXECUTE ON FUNCTION user_sede_id() TO authenticated;
GRANT EXECUTE ON FUNCTION user_role() TO authenticated;

-- Verificación
SELECT 'Fix RLS aplicado correctamente. Las funciones ahora usan SECURITY DEFINER.' AS resultado;
