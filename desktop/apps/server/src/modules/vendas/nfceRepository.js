import { nfceStatus } from "@v12-desktop/shared";
import { getDb } from "../../db/connection.js";
import { getTerminalTenantErpId } from "../configuracao/localConfigRepository.js";

function getTenantErpIdOrThrow() {
  const tenantErpId = getTerminalTenantErpId();
  if (!tenantErpId) {
    throw new Error("PDV local ainda não pareado com uma filial do ERP.");
  }
  return tenantErpId;
}

export function getNfceByVendaId(vendaId) {
  const db = getDb();
  const tenantErpId = getTenantErpIdOrThrow();

  return (
    db
      .prepare(
        `SELECT
           nfce_id,
           tenant_erp_id,
           venda_id,
           status,
           chave_acesso,
           numero,
           serie,
           ambiente,
           recibo,
           protocolo,
           cstat,
           motivo,
           xml,
           xml_assinado,
           xml_retorno,
           raw_retorno,
           pdf_path,
           lote,
           tp_emis,
           contingencia_em,
           contingencia_justificativa,
           cancelamento_protocolo,
           cancelamento_cstat,
           cancelamento_motivo,
           cancelamento_xml,
           cancelamento_raw_retorno,
           cancelada_em,
           emitida_em,
           atualizado_em
         FROM nfce
         WHERE tenant_erp_id = ?
           AND venda_id = ?
         LIMIT 1`,
      )
      .get(tenantErpId, Number(vendaId)) || null
  );
}

export function reserveNextNfceNumber(vendaId) {
  const db = getDb();
  const tenantErpId = getTenantErpIdOrThrow();

  const reserve = db.transaction(() => {
    const current = db
      .prepare(
        `SELECT
           nfce_id,
           numero,
           serie,
           ambiente,
           lote,
           tp_emis
         FROM nfce
         WHERE tenant_erp_id = ?
           AND venda_id = ?
         LIMIT 1`,
      )
      .get(tenantErpId, Number(vendaId));

    const fiscalConfig = db
      .prepare(
        `SELECT
           serie_nfce_padrao,
           proximo_numero_nfce,
           ambiente_nfce
         FROM fiscal_config
         WHERE config_id = 1
           AND tenant_erp_id = ?
         LIMIT 1`,
      )
      .get(tenantErpId);

    if (!fiscalConfig) {
      throw new Error("Configuração fiscal da NFC-e não encontrada no PDV.");
    }

    if (current?.numero && current?.serie) {
      return {
        nfce_id: current.nfce_id,
        numero: Number(current.numero),
        serie: Number(current.serie),
        ambiente: String(current.ambiente || fiscalConfig.ambiente_nfce || "2"),
        lote: Number(current.lote || 1),
        tp_emis: Number(current.tp_emis || 1),
      };
    }

    const numero = Number(fiscalConfig.proximo_numero_nfce || 1);
    const serie = Number(fiscalConfig.serie_nfce_padrao || 1);
    const ambiente = String(fiscalConfig.ambiente_nfce || "2");

    db.prepare(
      `UPDATE fiscal_config
       SET proximo_numero_nfce = ?,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE config_id = 1
         AND tenant_erp_id = ?`,
    ).run(numero + 1, tenantErpId);

    db.prepare(
      `UPDATE nfce
       SET numero = ?,
           serie = ?,
           ambiente = ?,
           lote = COALESCE(lote, 1),
           atualizado_em = CURRENT_TIMESTAMP
       WHERE tenant_erp_id = ?
         AND venda_id = ?`,
    ).run(numero, serie, ambiente, tenantErpId, Number(vendaId));

    const updated = getNfceByVendaId(vendaId);
    return {
      nfce_id: updated?.nfce_id || null,
      numero,
      serie,
      ambiente,
      lote: Number(updated?.lote || 1),
      tp_emis: Number(updated?.tp_emis || 1),
    };
  });

  return reserve();
}

export function updateNfceResult(vendaId, payload = {}) {
  const db = getDb();
  const tenantErpId = getTenantErpIdOrThrow();
  const vendaLocalId = Number(vendaId);

  db.prepare(
    `UPDATE nfce
     SET
       status = COALESCE(?, status),
       chave_acesso = COALESCE(?, chave_acesso),
       numero = COALESCE(?, numero),
       serie = COALESCE(?, serie),
       ambiente = COALESCE(?, ambiente),
       recibo = COALESCE(?, recibo),
       protocolo = COALESCE(?, protocolo),
       cstat = COALESCE(?, cstat),
       motivo = COALESCE(?, motivo),
       xml = COALESCE(?, xml),
       xml_assinado = COALESCE(?, xml_assinado),
       xml_retorno = COALESCE(?, xml_retorno),
       raw_retorno = COALESCE(?, raw_retorno),
       pdf_path = COALESCE(?, pdf_path),
       tp_emis = COALESCE(?, tp_emis),
       contingencia_em = COALESCE(?, contingencia_em),
       contingencia_justificativa = COALESCE(?, contingencia_justificativa),
       emitida_em = CASE
         WHEN ? IS NOT NULL THEN COALESCE(emitida_em, CURRENT_TIMESTAMP)
         ELSE emitida_em
       END,
       atualizado_em = CURRENT_TIMESTAMP
     WHERE tenant_erp_id = ?
       AND venda_id = ?`,
  ).run(
    payload.status || null,
    payload.chave_acesso || null,
    payload.numero ? Number(payload.numero) : null,
    payload.serie ? Number(payload.serie) : null,
    payload.ambiente || null,
    payload.recibo || null,
    payload.protocolo || null,
    payload.cstat || null,
    payload.motivo || null,
    payload.xml || null,
    payload.xml_assinado || null,
    payload.xml_retorno || null,
    payload.raw_retorno || null,
    payload.pdf_path || null,
    payload.tp_emis ? Number(payload.tp_emis) : null,
    payload.contingencia_em || null,
    payload.contingencia_justificativa || null,
    [nfceStatus.AUTORIZADA, nfceStatus.CONTINGENCIA].includes(payload.status) ? 1 : null,
    tenantErpId,
    vendaLocalId,
  );

  return getNfceByVendaId(vendaLocalId);
}

export function updateNfceCancelResult(vendaId, payload = {}) {
  const db = getDb();
  const tenantErpId = getTenantErpIdOrThrow();
  const vendaLocalId = Number(vendaId);

  db.prepare(
    `UPDATE nfce
     SET
       status = ?,
       cstat = COALESCE(?, cstat),
       motivo = COALESCE(?, motivo),
       cancelamento_protocolo = COALESCE(?, cancelamento_protocolo),
       cancelamento_cstat = COALESCE(?, cancelamento_cstat),
       cancelamento_motivo = COALESCE(?, cancelamento_motivo),
       cancelamento_xml = COALESCE(?, cancelamento_xml),
       cancelamento_raw_retorno = COALESCE(?, cancelamento_raw_retorno),
       cancelada_em = COALESCE(cancelada_em, CURRENT_TIMESTAMP),
       atualizado_em = CURRENT_TIMESTAMP
     WHERE tenant_erp_id = ?
       AND venda_id = ?`,
  ).run(
    nfceStatus.CANCELADA,
    payload.cstat || null,
    payload.motivo || null,
    payload.protocolo || null,
    payload.cstat || null,
    payload.motivo || null,
    payload.xml || null,
    payload.raw_retorno || null,
    tenantErpId,
    vendaLocalId,
  );

  return getNfceByVendaId(vendaLocalId);
}
