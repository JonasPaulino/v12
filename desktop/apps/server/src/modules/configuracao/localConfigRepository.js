import { getDb } from "../../db/connection.js";
import {
  getSignedTenantAccessState,
  normalizeBlockMessage,
} from "./tenantAccessGuard.js";

export function getTerminalConfig() {
  return getDb()
    .prepare(
      `SELECT
        config_id,
        tenant_erp_id,
        tenant_nome,
        tenant_documento,
        tenant_endereco,
        tenant_inscricao_estadual,
        tenant_inscricao_municipal,
        tenant_ativo,
        tenant_usa_pdv,
        tenant_acesso_bloqueado,
        tenant_bloqueio_motivo,
        terminal_codigo,
        terminal_nome,
        ambiente,
        sync_guard_payload,
        sync_guard_signature,
        sync_guard_issued_at,
        configurado_em,
        sincronizado_em
       FROM terminal_config
       WHERE config_id = 1`,
    )
    .get() || null;
}

export function getTerminalConfigStatus() {
  const config = getTerminalConfig();
  const access = getSignedTenantAccessState(config);

  return {
    configurado: !!config,
    bloqueado: !access.acesso_liberado,
    motivo_bloqueio: access.acesso_liberado
      ? null
      : normalizeBlockMessage(
          access.tenant_bloqueio_motivo ||
            "Este terminal não conseguiu validar a situação da filial com a retaguarda.",
        ),
    integridade_local_ok: !!access.integridade_ok,
    config,
  };
}

export function getTerminalTenantErpId() {
  const tenantErpId = Number(getTerminalConfig()?.tenant_erp_id || 0);
  return Number.isInteger(tenantErpId) && tenantErpId > 0 ? tenantErpId : null;
}

export function assertTerminalConfigurado() {
  const config = getTerminalConfig();
  if (!config) {
    throw new Error("PDV local ainda não configurado para uma filial.");
  }

  const access = getSignedTenantAccessState(config);

  if (!access.tenant_ativo) {
    throw new Error("A filial configurada está inativa no ERP.");
  }

  if (access.tenant_acesso_bloqueado) {
    throw new Error(normalizeBlockMessage(access.tenant_bloqueio_motivo));
  }

  if (!access.tenant_usa_pdv) {
    throw new Error("A filial configurada não está habilitada para integração com PDV.");
  }

  return config;
}

export function salvarTerminalConfig(payload = {}) {
  const tenantErpId = Number(payload.tenant_erp_id || 0);
  const tenantNome = String(payload.tenant_nome || "").trim();
  const terminalCodigo = String(payload.terminal_codigo || "PDV-01").trim();
  const terminalNome = String(payload.terminal_nome || "Caixa 01").trim();

  if (!tenantErpId || !tenantNome) {
    throw new Error("Informe a filial que será pareada com este PDV.");
  }

  const db = getDb();
  db.prepare(
    `INSERT INTO terminal_config (
      config_id,
      tenant_erp_id,
      tenant_nome,
      tenant_documento,
      tenant_endereco,
      tenant_inscricao_estadual,
      tenant_inscricao_municipal,
      tenant_ativo,
      tenant_usa_pdv,
      tenant_acesso_bloqueado,
      tenant_bloqueio_motivo,
      terminal_codigo,
      terminal_nome,
      ambiente,
      sync_guard_payload,
      sync_guard_signature,
      sync_guard_issued_at,
      sincronizado_em
    )
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(config_id) DO UPDATE SET
      tenant_erp_id = excluded.tenant_erp_id,
      tenant_nome = excluded.tenant_nome,
      tenant_documento = excluded.tenant_documento,
      tenant_endereco = excluded.tenant_endereco,
      tenant_inscricao_estadual = excluded.tenant_inscricao_estadual,
      tenant_inscricao_municipal = excluded.tenant_inscricao_municipal,
      tenant_ativo = excluded.tenant_ativo,
      tenant_usa_pdv = excluded.tenant_usa_pdv,
      tenant_acesso_bloqueado = excluded.tenant_acesso_bloqueado,
      tenant_bloqueio_motivo = excluded.tenant_bloqueio_motivo,
      terminal_codigo = excluded.terminal_codigo,
      terminal_nome = excluded.terminal_nome,
      ambiente = excluded.ambiente,
      sync_guard_payload = excluded.sync_guard_payload,
      sync_guard_signature = excluded.sync_guard_signature,
      sync_guard_issued_at = excluded.sync_guard_issued_at,
      sincronizado_em = CURRENT_TIMESTAMP`,
  ).run(
    tenantErpId,
    tenantNome,
    payload.tenant_documento || null,
    payload.tenant_endereco || null,
    payload.tenant_inscricao_estadual || null,
    payload.tenant_inscricao_municipal || null,
    payload.tenant_ativo === false ? 0 : 1,
    payload.tenant_usa_pdv === false ? 0 : 1,
    payload.tenant_acesso_bloqueado ? 1 : 0,
    payload.tenant_acesso_bloqueado
      ? normalizeBlockMessage(payload.tenant_bloqueio_motivo)
      : null,
    terminalCodigo,
    terminalNome,
    payload.ambiente || "producao",
    payload.sync_guard_payload || null,
    payload.sync_guard_signature || null,
    payload.sync_guard_issued_at || null,
  );

  return getTerminalConfig();
}

export function limparTerminalConfigInicial() {
  const db = getDb();
  const clear = db.transaction(() => {
    db.prepare("DELETE FROM caixa_movimento").run();
    db.prepare("DELETE FROM venda_pagamento").run();
    db.prepare("DELETE FROM venda_item").run();
    db.prepare("DELETE FROM nfce").run();
    db.prepare("DELETE FROM venda").run();
    db.prepare("DELETE FROM caixa").run();
    db.prepare("DELETE FROM operador_perfil").run();
    db.prepare("DELETE FROM operador_local").run();
    db.prepare("DELETE FROM pessoa").run();
    db.prepare("DELETE FROM produto").run();
    db.prepare("DELETE FROM sync_queue").run();
    db.prepare("DELETE FROM fiscal_config").run();
    db.prepare("DELETE FROM config_local").run();
    db.prepare("DELETE FROM terminal_config WHERE config_id = 1").run();
  });

  clear();
}
