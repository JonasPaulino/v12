UPDATE fiscal.nfe_item ni
SET
  ncm = COALESCE(NULLIF(BTRIM(ni.ncm), ''), pf.ncm),
  cest = COALESCE(NULLIF(BTRIM(ni.cest), ''), pf.cest),
  cfop = COALESCE(
    NULLIF(BTRIM(ni.cfop), ''),
    pf.cfop_venda_interna,
    pf.cfop_venda_interestadual,
    pf.cfop_compra
  ),
  unidade_comercial = COALESCE(
    NULLIF(BTRIM(ni.unidade_comercial), ''),
    um.sigla,
    'UN'
  ),
  origem_mercadoria = COALESCE(
    NULLIF(BTRIM(ni.origem_mercadoria), ''),
    pf.origem_mercadoria,
    '0'
  )
FROM produto_fiscal pf
LEFT JOIN produto_unidade pu
  ON pu.produto_id = pf.produto_id
 AND pu.tenant_id = pf.tenant_id
LEFT JOIN unidade_medida um
  ON um.unidade_medida_id = pu.unidade_comercial_id
WHERE ni.produto_id = pf.produto_id
  AND ni.tenant_id = pf.tenant_id
  AND (
    NULLIF(BTRIM(ni.ncm), '') IS NULL
    OR NULLIF(BTRIM(ni.cfop), '') IS NULL
    OR NULLIF(BTRIM(ni.unidade_comercial), '') IS NULL
    OR NULLIF(BTRIM(ni.origem_mercadoria), '') IS NULL
  );
