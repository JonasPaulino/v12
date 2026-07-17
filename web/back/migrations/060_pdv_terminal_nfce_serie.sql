ALTER TABLE pdv.terminal
  ADD COLUMN IF NOT EXISTS nfce_serie INTEGER;

ALTER TABLE pdv.terminal
  ADD COLUMN IF NOT EXISTS nfce_proximo_numero INTEGER;

WITH terminal_rank AS (
  SELECT
    t.pdv_terminal_id,
    t.tenant_id,
    ROW_NUMBER() OVER (
      PARTITION BY t.tenant_id
      ORDER BY t.criado_em, t.pdv_terminal_id
    ) - 1 AS terminal_ordem,
    COALESCE(cfg.serie_nfce_padrao, 1) AS serie_base,
    COALESCE(cfg.proximo_numero_nfce, 1) AS proximo_base
  FROM pdv.terminal t
  LEFT JOIN tenant_configuracao_fiscal cfg
    ON cfg.tenant_id = t.tenant_id
)
UPDATE pdv.terminal t
SET
  nfce_serie = COALESCE(
    t.nfce_serie,
    terminal_rank.serie_base + terminal_rank.terminal_ordem
  ),
  nfce_proximo_numero = COALESCE(
    t.nfce_proximo_numero,
    CASE
      WHEN terminal_rank.terminal_ordem = 0 THEN terminal_rank.proximo_base
      ELSE 1
    END
  )
FROM terminal_rank
WHERE terminal_rank.pdv_terminal_id = t.pdv_terminal_id;

WITH consumo_terminal AS (
  SELECT
    pdv_terminal_id,
    COALESCE(MAX(nfce_numero), 0)::int AS max_numero
  FROM pdv.venda
  WHERE nfce_status IN ('autorizada', 'contingencia', 'cancelada')
    AND nfce_numero IS NOT NULL
  GROUP BY pdv_terminal_id
)
UPDATE pdv.terminal t
SET nfce_proximo_numero = GREATEST(
  COALESCE(t.nfce_proximo_numero, 1),
  consumo_terminal.max_numero + 1
)
FROM consumo_terminal
WHERE consumo_terminal.pdv_terminal_id = t.pdv_terminal_id;

ALTER TABLE pdv.terminal
  ALTER COLUMN nfce_serie SET NOT NULL;

ALTER TABLE pdv.terminal
  ALTER COLUMN nfce_proximo_numero SET NOT NULL;

ALTER TABLE pdv.terminal
  ALTER COLUMN nfce_proximo_numero SET DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pdv_terminal_tenant_nfce_serie
  ON pdv.terminal (tenant_id, nfce_serie);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM (
      SELECT tenant_id, nfce_serie, nfce_numero, COUNT(*) AS total
      FROM pdv.venda
      WHERE nfce_serie IS NOT NULL
        AND nfce_numero IS NOT NULL
      GROUP BY tenant_id, nfce_serie, nfce_numero
      HAVING COUNT(*) > 1
    ) duplicidades
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pdv_venda_tenant_nfce_serie_numero
      ON pdv.venda (tenant_id, nfce_serie, nfce_numero)
      WHERE nfce_serie IS NOT NULL
        AND nfce_numero IS NOT NULL;
  ELSE
    RAISE NOTICE 'Indice unico de NFC-e do PDV nao foi criado por existirem duplicidades historicas em pdv.venda.';
  END IF;
END $$;

