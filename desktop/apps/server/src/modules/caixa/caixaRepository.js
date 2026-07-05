import { caixaStatus, syncEventTypes } from "@v12-desktop/shared";
import { getDb } from "../../db/connection.js";
import { assertTerminalConfigurado } from "../configuracao/localConfigRepository.js";
import { OPERADOR_PERFIS, getOperadorById, operadorTemPerfil } from "../operadores/operadorRepository.js";
import { enqueueSyncEvent } from "../../services/syncQueueService.js";

export function getCaixaAberto() {
  const db = getDb();
  const caixa = db
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

  return enrichCaixaDiaOperacional(caixa);
}

function localDateOnly(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value instanceof Date ? value : new Date(value));
}

function enrichCaixaDiaOperacional(caixa) {
  if (!caixa) return null;

  const dataAbertura = localDateOnly(caixa.aberto_em);
  const dataAtual = localDateOnly();
  return {
    ...caixa,
    data_operacional: dataAbertura,
    data_atual: dataAtual,
    caixa_pendente_dia_anterior: dataAbertura !== dataAtual,
  };
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
  if (aberto?.caixa_pendente_dia_anterior) {
    throw new Error(
      `Existe um caixa aberto do dia ${aberto.data_operacional}. Feche esse caixa antes de abrir o caixa de hoje.`,
    );
  }

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

export function registrarMovimentoCaixa({ operadorId, tipo, valor, motivo }) {
  const caixa = getCaixaAberto();
  if (!caixa) {
    throw new Error("Nao existe caixa aberto.");
  }

  const normalizedTipo = String(tipo || "").trim().toLowerCase();
  if (!["sangria", "suprimento"].includes(normalizedTipo)) {
    throw new Error("Tipo de movimento de caixa invalido.");
  }

  const valorMovimento = Number(valor || 0);
  if (valorMovimento <= 0) {
    throw new Error("Informe um valor maior que zero.");
  }

  const operador = getOperadorById(Number(operadorId || caixa.operador_id));
  if (!operador || !Number(operador.ativo)) {
    throw new Error("Operador local invalido ou inativo.");
  }

  const result = getDb()
    .prepare(
      `INSERT INTO caixa_movimento (caixa_id, operador_id, tipo, valor, motivo)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(caixa.caixa_id, operador.operador_id, normalizedTipo, valorMovimento, motivo || null);

  const movimento = getDb()
    .prepare("SELECT * FROM caixa_movimento WHERE movimento_id = ?")
    .get(result.lastInsertRowid);

  enqueueSyncEvent(syncEventTypes.CAIXA_MOVIMENTO, movimento);
  return movimento;
}

export function getResumoCaixa() {
  const caixa = getCaixaAberto();
  if (!caixa) return null;

  const db = getDb();
  const pagamentos = db
    .prepare(
      `SELECT
        LOWER(vp.forma) AS forma,
        COALESCE(SUM(vp.valor), 0) AS total
       FROM venda_pagamento vp
       JOIN venda v ON v.venda_id = vp.venda_id
       WHERE v.caixa_id = ?
         AND v.status = 'concluida'
       GROUP BY LOWER(vp.forma)`,
    )
    .all(caixa.caixa_id);

  const movimentos = db
    .prepare(
      `SELECT tipo, COALESCE(SUM(valor), 0) AS total
       FROM caixa_movimento
       WHERE caixa_id = ?
       GROUP BY tipo`,
    )
    .all(caixa.caixa_id);

  const totalPorForma = Object.fromEntries(
    pagamentos.map((row) => [row.forma, Number(row.total || 0)]),
  );
  const totalMovimento = Object.fromEntries(
    movimentos.map((row) => [row.tipo, Number(row.total || 0)]),
  );

  const dinheiroVendas = Number(totalPorForma.dinheiro || 0);
  const suprimentos = Number(totalMovimento.suprimento || 0);
  const sangrias = Number(totalMovimento.sangria || 0);
  const dinheiroEsperado =
    Number(caixa.valor_abertura || 0) + dinheiroVendas + suprimentos - sangrias;

  return {
    caixa,
    pagamentos: totalPorForma,
    movimentos: totalMovimento,
    dinheiro_vendas: dinheiroVendas,
    suprimentos,
    sangrias,
    dinheiro_esperado: dinheiroEsperado,
  };
}

export function fecharCaixa({ valorFechamento, observacao }) {
  const db = getDb();
  assertTerminalConfigurado();
  const caixa = getCaixaAberto();
  if (!caixa) return null;

  const valorFinal = Number(valorFechamento || 0);
  const resumo = getResumoCaixa();
  const diferenca = valorFinal - Number(resumo?.dinheiro_esperado || 0);

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
