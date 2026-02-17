-- ==============================================================================
-- Agregar gestión de Benefactores
-- ==============================================================================
-- EJECUTAR EN: Supabase Dashboard → SQL Editor → New query → Pegar → Run
-- ANTES de desplegar el frontend actualizado.
-- ==============================================================================

-- 1. Catálogo: Tipo de benefactor
CREATE TABLE IF NOT EXISTS benefactor_tipo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Benefactor
CREATE TABLE IF NOT EXISTS benefactor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  tipo_id uuid NOT NULL REFERENCES benefactor_tipo(id) ON DELETE RESTRICT,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. RLS
ALTER TABLE benefactor_tipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefactor ENABLE ROW LEVEL SECURITY;

-- Lectura abierta para autenticados, escritura admin/supervisor
CREATE POLICY "benefactor_tipo_read" ON benefactor_tipo
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "benefactor_tipo_write" ON benefactor_tipo
  FOR ALL TO authenticated
  USING (is_admin_or_supervisor())
  WITH CHECK (is_admin_or_supervisor());

CREATE POLICY "benefactor_read" ON benefactor
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "benefactor_write" ON benefactor
  FOR ALL TO authenticated
  USING (is_admin_or_supervisor())
  WITH CHECK (is_admin_or_supervisor());

-- 4. Permisos
GRANT SELECT ON benefactor_tipo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON benefactor_tipo TO authenticated;
GRANT SELECT ON benefactor TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON benefactor TO authenticated;

-- 5. Seed: tipo "IAP" y benefactor "Origen"
INSERT INTO benefactor_tipo (nombre) VALUES ('IAP')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO benefactor (nombre, tipo_id)
SELECT 'Origen', id FROM benefactor_tipo WHERE nombre = 'IAP'
ON CONFLICT DO NOTHING;

-- 6. Agregar columna benefactor_id a programa (migración segura)
-- Paso A: agregar como nullable
ALTER TABLE programa ADD COLUMN IF NOT EXISTS benefactor_id uuid REFERENCES benefactor(id) ON DELETE RESTRICT;

-- Paso B: asignar "Origen" a programas existentes
UPDATE programa
SET benefactor_id = (SELECT id FROM benefactor WHERE nombre = 'Origen' LIMIT 1)
WHERE benefactor_id IS NULL;

-- Paso C: hacer NOT NULL
ALTER TABLE programa ALTER COLUMN benefactor_id SET NOT NULL;

-- 7. Índice
CREATE INDEX IF NOT EXISTS idx_programa_benefactor ON programa(benefactor_id);

-- Verificación
SELECT 'Benefactores agregados correctamente. Tipo seed: IAP, Benefactor seed: Origen' AS resultado;
