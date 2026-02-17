-- ==============================================================================
-- Agregar catálogo "Componente" y campo en Programa
-- ==============================================================================
-- EJECUTAR EN: Supabase Dashboard → SQL Editor → New query → Pegar → Run
-- ANTES de desplegar el frontend actualizado.
-- ==============================================================================

-- 1. Tabla: Componente
CREATE TABLE IF NOT EXISTS componente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE componente ENABLE ROW LEVEL SECURITY;

-- RLS: lectura abierta, escritura admin/supervisor
CREATE POLICY "componente_read" ON componente FOR SELECT TO authenticated USING (true);
CREATE POLICY "componente_write" ON componente FOR ALL USING (is_admin_or_supervisor());

-- 2. Seed de componentes
INSERT INTO componente (nombre) VALUES
  ('Desarrollo Humano'),
  ('Económico'),
  ('Comunitario'),
  ('Salud y Bienestar')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Agregar columna componente_id a programa (opcional)
ALTER TABLE programa ADD COLUMN IF NOT EXISTS componente_id uuid REFERENCES componente(id) ON DELETE RESTRICT;

-- 4. Índice
CREATE INDEX IF NOT EXISTS idx_programa_componente_id ON programa(componente_id);
