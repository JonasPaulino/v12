import { getDb } from "../../db/connection.js";

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
        tenant_acesso_bloqueado,
        tenant_bloqueio_motivo,
        terminal_codigo,
        terminal_nome,
        ambiente,
        configurado_em,
        sincronizado_em
       FROM terminal_config
       WHERE config_id = 1`,
    )
    .get() || null;
}

export function assertTerminalConfigurado() {
  const config = getTerminalConfig();
  if (!config) {
    throw new Error("PDV local ainda nao configurado para uma filial.");
  }

  if (!Number(config.tenant_ativo)) {
    throw new Error("A filial configurada esta inativa no ERP.");
  }

  if (Number(config.tenant_acesso_bloqueado)) {
    throw new Error(config.tenant_bloqueio_motivo || "A filial configurada esta com acesso bloqueado.");
  }

  return config;
}

export function salvarTerminalConfig(payload = {}) {
  const tenantErpId = Number(payload.tenant_erp_id || 0);
  const tenantNome = String(payload.tenant_nome || "").trim();
  const terminalCodigo = String(payload.terminal_codigo || "PDV-01").trim();
  const terminalNome = String(payload.terminal_nome || "Caixa 01").trim();

  if (!tenantErpId || !tenantNome) {
    throw new Error("Informe a filial que sera pareada com este PDV.");
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
      tenant_acesso_bloqueado,
      tenant_bloqueio_motivo,
      terminal_codigo,
      terminal_nome,
      ambiente,
      sincronizado_em
    )
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(config_id) DO UPDATE SET
      tenant_erp_id = excluded.tenant_erp_id,
      tenant_nome = excluded.tenant_nome,
      tenant_documento = excluded.tenant_documento,
      tenant_endereco = excluded.tenant_endereco,
      tenant_inscricao_estadual = excluded.tenant_inscricao_estadual,
      tenant_inscricao_municipal = excluded.tenant_inscricao_municipal,
      tenant_ativo = excluded.tenant_ativo,
      tenant_acesso_bloqueado = excluded.tenant_acesso_bloqueado,
      tenant_bloqueio_motivo = excluded.tenant_bloqueio_motivo,
      terminal_codigo = excluded.terminal_codigo,
      terminal_nome = excluded.terminal_nome,
      ambiente = excluded.ambiente,
      sincronizado_em = CURRENT_TIMESTAMP`,
  ).run(
    tenantErpId,
    tenantNome,
    payload.tenant_documento || null,
    payload.tenant_endereco || null,
    payload.tenant_inscricao_estadual || null,
    payload.tenant_inscricao_municipal || null,
    payload.tenant_ativo === false ? 0 : 1,
    payload.tenant_acesso_bloqueado ? 1 : 0,
    payload.tenant_bloqueio_motivo || null,
    terminalCodigo,
    terminalNome,
    payload.ambiente || "producao",
  );

  return getTerminalConfig();
}

export function limparTerminalConfigInicial() {
  const db = getDb();
  const clear = db.transaction(() => {
    db.prepare("DELETE FROM operador_perfil").run();
    db.prepare("DELETE FROM operador_local").run();
    db.prepare("DELETE FROM produto").run();
    db.prepare("DELETE FROM terminal_config WHERE config_id = 1").run();
  });

  clear();
}
