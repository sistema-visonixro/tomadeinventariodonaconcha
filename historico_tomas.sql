-- ══════════════════════════════════════════════════════════════════
--  Tabla: historico_tomas_inventario
--  Ejecutar en: Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS historico_tomas_inventario (
  id               uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha            timestamptz  NOT NULL DEFAULT now(),
  usuario_id       uuid,                                   -- referencia a usuarios.id
  usuario_nombre   text         NOT NULL,
  datos            jsonb        NOT NULL DEFAULT '[]',     -- [{producto_id, nombre, stock_sistema, conteo, diferencia}]
  total_productos  int          NOT NULL DEFAULT 0,
  total_ajustes    int          NOT NULL DEFAULT 0,
  created_at       timestamptz  DEFAULT now()
);

-- Índices para búsqueda rápida por fecha
CREATE INDEX IF NOT EXISTS idx_hist_tomas_fecha
  ON historico_tomas_inventario (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_hist_tomas_usuario
  ON historico_tomas_inventario (usuario_id);

-- ── Row Level Security ────────────────────────────────────────────
ALTER TABLE historico_tomas_inventario ENABLE ROW LEVEL SECURITY;

-- Permite acceso completo con la anon key (ajusta si usas auth de Supabase)
CREATE POLICY "anon_full_access"
  ON historico_tomas_inventario
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
