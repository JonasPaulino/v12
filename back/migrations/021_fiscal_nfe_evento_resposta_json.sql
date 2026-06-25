ALTER TABLE fiscal.nfe_evento
  ADD COLUMN IF NOT EXISTS resposta_json JSONB;
