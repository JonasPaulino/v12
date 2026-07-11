ALTER TABLE venda ADD COLUMN cancelada_em TEXT;
ALTER TABLE venda ADD COLUMN cancelamento_motivo TEXT;

ALTER TABLE venda_item ADD COLUMN unidade TEXT NOT NULL DEFAULT 'UN';

UPDATE venda_item
SET unidade = COALESCE(
  (
    SELECT NULLIF(TRIM(produto.unidade), '')
    FROM produto
    WHERE produto.produto_id = venda_item.produto_id
  ),
  'UN'
)
WHERE unidade IS NULL
   OR TRIM(unidade) = '';
