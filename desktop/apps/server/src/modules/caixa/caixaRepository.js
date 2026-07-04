import { caixaStatus, syncEventTypes } from "@v12-desktop/shared";
import { getDb } from "../../db/connection.js";
import { enqueueSyncEvent } from "../../services/syncQueueService.js";

export function getCaixaAberto() {
  const db = getDb();
  return db
    .prepare(
      `SELECT caixa_id, operador_nome, status, valor_abertura, valor_fechamento, aberto_em, fechado_em
       FROM caixa
       WHERE status = ?
       ORDER BY caixa_id DESC
       LIMIT 1`,
    )
    .get(caixaStatus.ABERTO);
}

export function abrirCaixa({ operadorNome, valorAbertura }) {
  const db = getDb();
  const aberto = getCaixaAberto();
  if (aberto) return aberto;

  const result = db
    .prepare(
      `INSERT INTO caixa (operador_nome, status, valor_abertura)
       VALUES (?, ?, ?)`,
    )
    .run(operadorNome, caixaStatus.ABERTO, Number(valorAbertura || 0));

  const caixa = getCaixaAberto();
  enqueueSyncEvent(syncEventTypes.CAIXA_ABERTO, caixa);
  return caixa;
}

export function fecharCaixa({ valorFechamento }) {
  const db = getDb();
  const caixa = getCaixaAberto();
  if (!caixa) return null;

  db.prepare(
    `UPDATE caixa
     SET status = ?, valor_fechamento = ?, fechado_em = CURRENT_TIMESTAMP
     WHERE caixa_id = ?`,
  ).run(caixaStatus.FECHADO, Number(valorFechamento || 0), caixa.caixa_id);

  const fechado = db
    .prepare("SELECT * FROM caixa WHERE caixa_id = ?")
    .get(caixa.caixa_id);

  enqueueSyncEvent(syncEventTypes.CAIXA_FECHADO, fechado);
  return fechado;
}
