import { formaPagamento, nfceStatus, syncEventTypes, vendaStatus } from "@v12-desktop/shared";
import { getDb } from "../../db/connection.js";
import { getCaixaAberto } from "../caixa/caixaRepository.js";
import { enqueueSyncEvent } from "../../services/syncQueueService.js";
import { emitirNfce } from "../../services/acbrFiscalService.js";

function normalizePayment(payment) {
  return {
    forma: payment.forma || formaPagamento.DINHEIRO,
    valor: Number(payment.valor || 0),
  };
}

function normalizeIdentificacaoCliente(cliente) {
  const source = cliente || {};
  const tipoDocumento = String(source.tipoDocumento || "").trim().toUpperCase();
  return {
    tipoDocumento: ["CPF", "CNPJ", "ESTRANGEIRO"].includes(tipoDocumento) ? tipoDocumento : null,
    documento: String(source.documento || "").trim() || null,
    nome: String(source.nome || "").trim() || null,
    email: String(source.email || "").trim().toLowerCase() || null,
  };
}

export async function criarVenda({ pessoaId, cliente, items = [], pagamentos = [] }) {
  const caixa = getCaixaAberto();
  if (!caixa) {
    throw new Error("Nao existe caixa aberto.");
  }

  if (!items.length) {
    throw new Error("Informe ao menos um item.");
  }

  const clienteIdentificado = normalizeIdentificacaoCliente(cliente);
  const db = getDb();
  const create = db.transaction(() => {
    const totalProdutos = items.reduce((acc, item) => {
      return acc + Number(item.quantidade || 0) * Number(item.valor_unitario || 0);
    }, 0);

    const vendaResult = db
      .prepare(
        `INSERT INTO venda (
           caixa_id,
           pessoa_id,
           cliente_tipo_documento,
           cliente_documento,
           cliente_nome,
           cliente_email,
           status,
           total_produtos,
           total_liquido,
           concluida_em
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      )
      .run(
        caixa.caixa_id,
        pessoaId || null,
        clienteIdentificado.tipoDocumento,
        clienteIdentificado.documento,
        clienteIdentificado.nome,
        clienteIdentificado.email,
        vendaStatus.CONCLUIDA,
        totalProdutos,
        totalProdutos,
      );

    const vendaId = vendaResult.lastInsertRowid;

    const insertItem = db.prepare(
      `INSERT INTO venda_item (venda_id, produto_id, codigo_produto, descricao, quantidade, valor_unitario, valor_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const item of items) {
      const quantidade = Number(item.quantidade || 0);
      const valorUnitario = Number(item.valor_unitario || 0);
      insertItem.run(
        vendaId,
        item.produto_id,
        item.codigo_produto || null,
        item.descricao,
        quantidade,
        valorUnitario,
        quantidade * valorUnitario,
      );

      db.prepare(
        `UPDATE produto
         SET estoque_atual = estoque_atual - ?, atualizado_em = CURRENT_TIMESTAMP
         WHERE produto_id = ?`,
      ).run(quantidade, item.produto_id);
    }

    const insertPagamento = db.prepare(
      `INSERT INTO venda_pagamento (venda_id, forma, valor)
       VALUES (?, ?, ?)`,
    );

    for (const pagamento of pagamentos.map(normalizePayment)) {
      insertPagamento.run(vendaId, pagamento.forma, pagamento.valor);
    }

    db.prepare(
      `INSERT INTO nfce (venda_id, status)
       VALUES (?, ?)`,
    ).run(vendaId, nfceStatus.PENDENTE);

    return db.prepare("SELECT * FROM venda WHERE venda_id = ?").get(vendaId);
  });

  const venda = create();
  enqueueSyncEvent(syncEventTypes.VENDA_CRIADA, venda);

  const fiscal = await emitirNfce(venda);
  if (fiscal.success) {
    enqueueSyncEvent(syncEventTypes.NFCE_EMITIDA, fiscal);
  }

  return { venda, fiscal };
}

export function listVendas({ limit = 50 } = {}) {
  const db = getDb();
  return db
    .prepare(
      `SELECT venda_id, caixa_id, pessoa_id, cliente_tipo_documento, cliente_documento, cliente_nome, cliente_email, status, total_produtos, total_desconto, total_liquido, criada_em, concluida_em
       FROM venda
       ORDER BY venda_id DESC
       LIMIT ?`,
    )
    .all(limit);
}
