WITH ultimo_nsu_salvo AS (
  SELECT
    c.nfe_distribuicao_controle_id,
    MAX(d.nsu) AS ultimo_nsu_valido
  FROM nfe_distribuicao_controle c
  LEFT JOIN nfe_recebida_distribuicao d
    ON d.tenant_id = c.tenant_id
   AND d.nsu ~ '^[0-9]{15}$'
  WHERE c.cstat = '656'
  GROUP BY c.nfe_distribuicao_controle_id
)
UPDATE nfe_distribuicao_controle c
SET ult_nsu = COALESCE(u.ultimo_nsu_valido, c.ult_nsu),
    cstat = NULL,
    xmotivo = NULL,
    ultima_consulta_em = NULL
FROM ultimo_nsu_salvo u
WHERE c.nfe_distribuicao_controle_id = u.nfe_distribuicao_controle_id
  AND c.cstat = '656';
