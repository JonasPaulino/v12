import { nfceStatus, vendaStatus } from "@v12-desktop/shared";
import { getDb } from "../../db/connection.js";
import { getCaixaAberto } from "../caixa/caixaRepository.js";
import { assertTerminalConfigurado, getTerminalTenantErpId } from "../configuracao/localConfigRepository.js";
import { cancelarNfce, emitirNfce } from "../../services/acbrFiscalService.js";
import {
  aplicarMovimentoEstoque,
  criarVendaPersistida,
  descartarVendaProvisoria,
  garantirRegistroNfce,
  getVendaDetalhe,
  listVendas,
  marcarVendaConcluida,
  normalizeIdentificacaoCliente,
  searchVendas,
  validarItensVenda,
} from "./vendaDataRepository.js";
import { getFiscalConfig } from "../configuracao/localFiscalConfigRepository.js";
import { buildNfceCancelPolicy } from "./nfceCancelPolicy.js";
import {
  registrarResultadoFiscal,
  registrarVendaCancelada,
  registrarVendaCriada,
} from "./vendaSyncService.js";

function buildContingenciaDecisionError(vendaId, fiscal) {
  const error = new Error(
    fiscal?.message || "Não foi possível transmitir a NFC-e. A emissão em contingência offline está disponível.",
  );
  error.code = "NFCE_CONTINGENCIA_DISPONIVEL";
  error.data = {
    vendaId: Number(vendaId),
    fiscal,
  };
  return error;
}

function getTenantCaixaContext() {
  assertTerminalConfigurado();
  const caixa = getCaixaAberto();
  const tenantErpId = getTerminalTenantErpId();

  if (!caixa) {
    throw new Error("Não existe caixa aberto.");
  }

  if (!tenantErpId || Number(caixa.tenant_erp_id) !== Number(tenantErpId)) {
    throw new Error("O caixa aberto não pertence à filial configurada neste PDV.");
  }

  return { caixa, tenantErpId };
}

function finalizarVendaFiscalLocal({ db, tenantErpId, vendaId, itens }) {
  return db.transaction(() => {
    aplicarMovimentoEstoque(db, tenantErpId, itens, "saida");
    marcarVendaConcluida(db, tenantErpId, vendaId);
    return getVendaDetalhe(vendaId);
  })();
}

function descartarVendaRascunhoLocal({ db, tenantErpId, vendaId }) {
  db.transaction(() => {
    descartarVendaProvisoria(db, tenantErpId, vendaId);
  })();
}

async function emitirFiscalVenda(venda, { permitirContingenciaAutomatica = true } = {}) {
  let fiscal = await emitirNfce(venda, { mode: "normal" });

  if (fiscal.requiresOfflineDecision) {
    if (!permitirContingenciaAutomatica) {
      throw buildContingenciaDecisionError(venda.venda_id, fiscal);
    }

    fiscal = await emitirNfce(venda, {
      mode: "contingencia_offline",
      contingenciaJustificativa: fiscal.message,
    });
  }

  return fiscal;
}

export async function criarVenda({
  pessoaId,
  cliente,
  items = [],
  pagamentos = [],
  subtotal = null,
  desconto = 0,
  totalLiquido = null,
  emitirFiscal = false,
  permitirContingenciaAutomatica = false,
}) {
  const { caixa, tenantErpId } = getTenantCaixaContext();

  if (!items.length) {
    throw new Error("Informe ao menos um item.");
  }

  const db = getDb();
  const clienteIdentificado = normalizeIdentificacaoCliente(cliente);
  const itensValidados = validarItensVenda(db, tenantErpId, items);
  let venda = db.transaction(() =>
    criarVendaPersistida({
      db,
      tenantErpId,
      caixaId: caixa.caixa_id,
      pessoaId,
      cliente: clienteIdentificado,
      itensValidados,
      pagamentos,
      subtotal,
      desconto,
      totalLiquido,
      emitirFiscal,
    }),
  )();

  if (!emitirFiscal) {
    registrarVendaCriada(venda);
    return { venda, fiscal: null };
  }

  const fiscal = await emitirFiscalVenda(venda, { permitirContingenciaAutomatica });

  if (fiscal.success || fiscal.status === nfceStatus.CONTINGENCIA) {
    venda = finalizarVendaFiscalLocal({
      db,
      tenantErpId,
      vendaId: venda.venda_id,
      itens: itensValidados,
    });
    registrarVendaCriada(venda);
    registrarResultadoFiscal(fiscal);
    return { venda, fiscal };
  }

  descartarVendaRascunhoLocal({
    db,
    tenantErpId,
    vendaId: venda.venda_id,
  });

  throw new Error(
    fiscal?.message || "A NFC-e não foi autorizada e a venda local foi descartada para evitar pendência fiscal.",
  );
}

export { listVendas, searchVendas, getVendaDetalhe };

export function cancelarVenda(vendaId, { motivo = "Cancelamento manual no PDV." } = {}) {
  assertTerminalConfigurado();
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const saleId = Number(vendaId);
  const cancelReason = String(motivo || "").trim() || "Cancelamento manual no PDV.";

  const vendaCancelada = db.transaction(() => {
    const venda = getVendaDetalhe(saleId);

    if (venda.status === vendaStatus.CANCELADA) {
      throw new Error("Esta venda já está cancelada.");
    }

    if (venda.nfce_status === nfceStatus.AUTORIZADA) {
      const fiscalConfig = getFiscalConfig();
      const cancelPolicy = buildNfceCancelPolicy(venda, {
        emitenteUf: fiscalConfig?.emitente_uf,
      });
      throw new Error(
        cancelPolicy?.applies && !cancelPolicy.canCancelFiscal
          ? cancelPolicy.message
          : "A venda possui NFC-e autorizada. Use a opção Cancelar NFC-e para enviar o evento fiscal à SEFAZ.",
      );
    }

    if ([nfceStatus.CONTINGENCIA, nfceStatus.REJEITADA].includes(venda.nfce_status)) {
      throw new Error(
        "A venda possui NFC-e em contingência ou rejeitada. Regularize primeiro a situação fiscal antes do cancelamento.",
      );
    }

    aplicarMovimentoEstoque(db, tenantErpId, venda.itens || [], "entrada");

    db.prepare(
      `UPDATE venda
       SET status = ?, cancelada_em = CURRENT_TIMESTAMP, cancelamento_motivo = ?
       WHERE tenant_erp_id = ?
         AND venda_id = ?`,
    ).run(vendaStatus.CANCELADA, cancelReason, tenantErpId, saleId);

    db.prepare(
      `UPDATE nfce
       SET status = ?, motivo = ?, atualizado_em = CURRENT_TIMESTAMP
       WHERE tenant_erp_id = ?
         AND venda_id = ?`,
    ).run(nfceStatus.CANCELADA, cancelReason, tenantErpId, saleId);

    return getVendaDetalhe(saleId);
  })();

  registrarVendaCancelada(vendaCancelada);
  return vendaCancelada;
}

export async function cancelarFiscalVenda(
  vendaId,
  { motivo = "Cancelamento solicitado pelo operador do PDV." } = {},
) {
  assertTerminalConfigurado();
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const saleId = Number(vendaId);
  const cancelReason = String(motivo || "").trim() || "Cancelamento solicitado pelo operador do PDV.";
  const venda = getVendaDetalhe(saleId);

  if (venda.status === vendaStatus.CANCELADA) {
    throw new Error("Esta venda já está cancelada.");
  }

  if (venda.nfce_status !== nfceStatus.AUTORIZADA) {
    throw new Error("Somente NFC-e autorizada pode passar pelo cancelamento fiscal.");
  }

  const fiscalConfig = getFiscalConfig();
  const cancelPolicy = buildNfceCancelPolicy(venda, {
    emitenteUf: fiscalConfig?.emitente_uf,
  });

  if (cancelPolicy?.applies && !cancelPolicy.canCancelFiscal) {
    throw new Error(cancelPolicy.message || "Prazo de cancelamento da NFC-e expirado.");
  }

  const fiscal = await cancelarNfce(venda, {
    motivo: cancelReason,
  });

  if (!fiscal.success || fiscal.status !== nfceStatus.CANCELADA) {
    throw new Error(fiscal.message || "Cancelamento fiscal da NFC-e não foi homologado.");
  }

  const vendaCancelada = db.transaction(() => {
    aplicarMovimentoEstoque(db, tenantErpId, venda.itens || [], "entrada");

    db.prepare(
      `UPDATE venda
       SET status = ?, cancelada_em = CURRENT_TIMESTAMP, cancelamento_motivo = ?
       WHERE tenant_erp_id = ?
         AND venda_id = ?`,
    ).run(vendaStatus.CANCELADA, fiscal.message || cancelReason, tenantErpId, saleId);

    return getVendaDetalhe(saleId);
  })();

  registrarVendaCancelada(vendaCancelada);
  return {
    venda: vendaCancelada,
    fiscal,
  };
}

export function descartarVendaRascunho(vendaId) {
  assertTerminalConfigurado();
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const saleId = Number(vendaId);

  return db.transaction(() => {
    const venda = getVendaDetalhe(saleId);

    if (venda.status !== vendaStatus.RASCUNHO) {
      throw new Error("Somente vendas em rascunho podem ser descartadas.");
    }

    descartarVendaProvisoria(db, tenantErpId, saleId);
    return { venda_id: saleId, descartada: true };
  })();
}

export async function emitirVendaEmContingencia(vendaId, options = {}) {
  assertTerminalConfigurado();
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const saleId = Number(vendaId);
  const venda = getVendaDetalhe(saleId);

  if (venda.status !== vendaStatus.RASCUNHO) {
    throw new Error("A venda não está mais disponível para emissão em contingência.");
  }

  const fiscal = await emitirNfce(venda, {
    mode: "contingencia_offline",
    contingenciaJustificativa: options.contingenciaJustificativa,
  });

  if (fiscal.status !== nfceStatus.CONTINGENCIA) {
    throw new Error(fiscal?.message || "Não foi possível emitir a NFC-e em contingência offline.");
  }

  const vendaFinalizada = finalizarVendaFiscalLocal({
    db,
    tenantErpId,
    vendaId: saleId,
    itens: venda.itens || [],
  });

  registrarVendaCriada(vendaFinalizada);
  registrarResultadoFiscal(fiscal);
  return { venda: vendaFinalizada, fiscal };
}

export async function emitirCupomFiscalVenda(vendaId, { permitirContingenciaAutomatica = true } = {}) {
  assertTerminalConfigurado();
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const saleId = Number(vendaId);
  const venda = getVendaDetalhe(saleId);

  if (venda.status !== vendaStatus.CONCLUIDA) {
    throw new Error("Somente vendas concluídas podem ser convertidas em cupom fiscal.");
  }

  if (venda.nfce_status === nfceStatus.AUTORIZADA) {
    throw new Error("Esta venda já possui NFC-e autorizada.");
  }

  if (venda.nfce_status === nfceStatus.CONTINGENCIA) {
    throw new Error("Esta venda já possui NFC-e em contingência. Use a opção de transmitir contingência.");
  }

  if (venda.nfce_status === nfceStatus.CANCELADA) {
    throw new Error("A NFC-e desta venda já foi cancelada e não pode ser emitida novamente.");
  }

  garantirRegistroNfce(db, tenantErpId, saleId);
  const fiscal = await emitirFiscalVenda(venda, { permitirContingenciaAutomatica });
  registrarResultadoFiscal(fiscal);

  return {
    venda: getVendaDetalhe(saleId),
    fiscal,
  };
}

export async function transmitirVendaContingencia(vendaId) {
  assertTerminalConfigurado();
  const saleId = Number(vendaId);
  const venda = getVendaDetalhe(saleId);

  if (venda.status !== vendaStatus.CONCLUIDA || venda.nfce_status !== nfceStatus.CONTINGENCIA) {
    throw new Error("A venda selecionada não possui NFC-e em contingência pendente de transmissão.");
  }

  const fiscal = await emitirNfce(venda, {
    mode: "transmitir_contingencia_xml",
    xmlContent: venda.nfce_xml_assinado || venda.nfce_xml || null,
  });

  registrarResultadoFiscal(fiscal);
  return {
    venda: getVendaDetalhe(saleId),
    fiscal,
  };
}

export async function reenviarContingenciasNfce({ limit = 20 } = {}) {
  assertTerminalConfigurado();
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const pendencias = db
    .prepare(
      `SELECT v.venda_id
       FROM venda v
       JOIN nfce n
         ON n.venda_id = v.venda_id
        AND n.tenant_erp_id = v.tenant_erp_id
       WHERE v.tenant_erp_id = ?
         AND v.status = ?
         AND n.status = ?
       ORDER BY COALESCE(n.atualizado_em, n.emitida_em) ASC, v.venda_id ASC
       LIMIT ?`,
    )
    .all(tenantErpId, vendaStatus.CONCLUIDA, nfceStatus.CONTINGENCIA, Number(limit) || 20);

  const resultados = [];

  for (const item of pendencias) {
    const { fiscal } = await transmitirVendaContingencia(item.venda_id);
    resultados.push({
      venda_id: Number(item.venda_id),
      status: fiscal.status,
      message: fiscal.message,
      chave_acesso: fiscal.chave_acesso || null,
    });
  }

  return {
    total: pendencias.length,
    autorizadas: resultados.filter((item) => item.status === nfceStatus.AUTORIZADA).length,
    em_contingencia: resultados.filter((item) => item.status === nfceStatus.CONTINGENCIA).length,
    rejeitadas: resultados.filter((item) => item.status === nfceStatus.REJEITADA).length,
    resultados,
  };
}
