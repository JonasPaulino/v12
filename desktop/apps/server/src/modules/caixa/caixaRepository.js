import { caixaStatus, syncEventTypes } from "@v12-desktop/shared";
import { getDb } from "../../db/connection.js";
import { assertTerminalConfigurado } from "../configuracao/localConfigRepository.js";
import { OPERADOR_PERFIS, getOperadorById, operadorTemPerfil } from "../operadores/operadorRepository.js";
import { enqueueSyncEvent } from "../../services/syncQueueService.js";

export function getCaixaAberto() {
  const db = getDb();
  return db
    .prepare(
      `SELECT
        caixa_id,
        tenant_erp_id,
        terminal_codigo,
        operador_id,
        operador_nome,
        sessao_codigo,
        status,
        valor_abertura,
        valor_fechamento,
        observacao_abertura,
        observacao_fechamento,
        diferenca_fechamento,
        aberto_em,
        fechado_em
       FROM caixa
       WHERE status = ?
       ORDER BY caixa_id DESC
       LIMIT 1`,
    )
    .get(caixaStatus.ABERTO);
}

function buildSessaoCodigo({ tenantErpId, terminalCodigo }) {
  const date = new Date();
  const day = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = String(date.getTime()).slice(-6);
  const terminal = String(terminalCodigo || "PDV-01").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return `CX-${tenantErpId}-${terminal}-${day}-${suffix}`;
}

export function abrirCaixa({ operadorId, valorAbertura, observacao }) {
  const db = getDb();
  const config = assertTerminalConfigurado();
  const aberto = getCaixaAberto();
  if (aberto) return aberto;

  const operador = getOperadorById(Number(operadorId));
  if (!operador || !Number(operador.ativo)) {
    throw new Error("Operador local invalido ou inativo.");
  }

  if (!operadorTemPerfil(operador.operador_id, [
    OPERADOR_PERFIS.PDV_OPERADOR,
    OPERADOR_PERFIS.PDV_SUPERVISOR,
    OPERADOR_PERFIS.ADMIN_LOCAL,
  ])) {
    throw new Error("Operador sem permissao para abrir caixa.");
  }

  const sessaoCodigo = buildSessaoCodigo({
    tenantErpId: config.tenant_erp_id,
    terminalCodigo: config.terminal_codigo,
  });

  const result = db
    .prepare(
      `INSERT INTO caixa (
        tenant_erp_id,
        terminal_codigo,
        operador_id,
        operador_nome,
        sessao_codigo,
        status,
        valor_abertura,
        observacao_abertura
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      config.tenant_erp_id,
      config.terminal_codigo,
      operador.operador_id,
      operador.nome,
      sessaoCodigo,
      caixaStatus.ABERTO,
      Number(valorAbertura || 0),
      observacao || null,
    );

  const caixa = getCaixaAberto();
  enqueueSyncEvent(syncEventTypes.CAIXA_ABERTO, caixa);
  return caixa;
}

export function fecharCaixa({ valorFechamento, observacao }) {
  const db = getDb();
  assertTerminalConfigurado();
  const caixa = getCaixaAberto();
  if (!caixa) return null;

  const valorFinal = Number(valorFechamento || 0);
  const diferenca = valorFinal - Number(caixa.valor_abertura || 0);

  db.prepare(
    `UPDATE caixa
     SET
       status = ?,
       valor_fechamento = ?,
       observacao_fechamento = ?,
       diferenca_fechamento = ?,
       fechado_em = CURRENT_TIMESTAMP
     WHERE caixa_id = ?`,
  ).run(caixaStatus.FECHADO, valorFinal, observacao || null, diferenca, caixa.caixa_id);

  const fechado = db
    .prepare("SELECT * FROM caixa WHERE caixa_id = ?")
    .get(caixa.caixa_id);

  enqueueSyncEvent(syncEventTypes.CAIXA_FECHADO, fechado);
  return fechado;
}
