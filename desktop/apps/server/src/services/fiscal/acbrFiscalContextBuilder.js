import { getDb } from "../../db/connection.js";
import { getTerminalConfig, getTerminalTenantErpId } from "../../modules/configuracao/localConfigRepository.js";
import {
  calculateFiscalTotals,
  hasClientIdentification,
  normalizeContingenciaJustificativa,
  onlyDigits,
  TP_EMIS_CONTINGENCIA_OFFLINE,
  TP_EMIS_NORMAL,
  validateFiscalItemSupport,
} from "./acbrFiscalSupport.js";

export function loadNfceContext(vendaId, fiscal, sequencial, options = {}) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const terminal = getTerminalConfig();
  const tpEmis = Number(options.tpEmis || TP_EMIS_NORMAL);
  const contingenciaJustificativa =
    tpEmis === TP_EMIS_CONTINGENCIA_OFFLINE
      ? normalizeContingenciaJustificativa(options.contingenciaJustificativa)
      : null;

  const venda = db
    .prepare(
      `SELECT
         v.venda_id,
         v.caixa_id,
         v.pessoa_id,
         v.cliente_tipo_documento,
         v.cliente_documento,
         v.cliente_nome,
         v.cliente_email,
         v.status,
         v.total_produtos,
         v.total_desconto,
         v.total_liquido,
         v.criada_em,
         v.concluida_em,
         c.operador_nome,
         c.terminal_codigo
       FROM venda v
       LEFT JOIN caixa c ON c.caixa_id = v.caixa_id
       WHERE v.tenant_erp_id = ?
         AND v.venda_id = ?
       LIMIT 1`,
    )
    .get(tenantErpId, Number(vendaId));

  if (!venda) {
    throw new Error("Venda local não encontrada para emissão da NFC-e.");
  }

  const itens = db
    .prepare(
      `SELECT
         vi.venda_item_id,
         vi.produto_id,
         vi.codigo_produto,
         vi.descricao,
         vi.unidade,
         vi.quantidade,
         vi.valor_unitario,
         vi.valor_total,
         p.erp_id AS produto_erp_id,
         p.codigo AS produto_codigo_erp,
         p.descricao AS produto_descricao,
         p.descricao_fiscal,
         p.gtin,
         p.ncm,
         p.cest,
         p.origem_mercadoria,
         p.crt_emitente,
         p.cbenef,
         p.cfop_venda_interna,
         p.cfop_venda_interestadual,
         p.icms_cst,
         p.icms_csosn,
         p.icms_aliquota,
         p.icms_reducao_base,
         p.icms_aliquota_fcp,
         p.icms_modalidade_bc,
         p.pis_cst,
         p.pis_aliquota,
         p.cofins_cst,
         p.cofins_aliquota,
         p.ipi_cst,
         p.ipi_enquadramento,
         p.ipi_aliquota
       FROM venda_item vi
       JOIN produto p
         ON p.produto_id = vi.produto_id
        AND p.tenant_erp_id = vi.tenant_erp_id
       WHERE vi.tenant_erp_id = ?
         AND vi.venda_id = ?
       ORDER BY vi.venda_item_id ASC`,
    )
    .all(tenantErpId, Number(vendaId))
    .map((item) => ({
      ...item,
      codigo_produto:
        item.codigo_produto ||
        item.produto_codigo_erp ||
        String(item.produto_erp_id || item.produto_id || ""),
      descricao: item.descricao_fiscal || item.descricao || item.produto_descricao,
      ncm: String(item.ncm || "").trim(),
      cfop: item.cfop_venda_interna || "5102",
      gtin: item.gtin || "SEM GTIN",
      origem_mercadoria: item.origem_mercadoria || "0",
    }));

  if (!itens.length) {
    throw new Error("A venda não possui itens para emissão da NFC-e.");
  }

  const produtoSemNcm = itens.find((item) => !item.ncm);
  if (produtoSemNcm) {
    throw new Error(
      `O produto ${produtoSemNcm.descricao} está sem NCM configurado e não pode ser emitido na NFC-e.`,
    );
  }

  const destinatarioIdentificado = hasClientIdentification(venda)
    ? {
        tipo_documento: venda.cliente_tipo_documento,
        documento: venda.cliente_documento,
        nome: venda.cliente_nome,
        email: venda.cliente_email,
        uf: fiscal.emitente_uf,
      }
    : null;

  itens.forEach((item) => validateFiscalItemSupport(item, fiscal.crt));

  const pagamentos = db
    .prepare(
      `SELECT pagamento_id, forma, valor
       FROM venda_pagamento
       WHERE tenant_erp_id = ?
         AND venda_id = ?
       ORDER BY pagamento_id ASC`,
    )
    .all(tenantErpId, Number(vendaId));

  const totalPago = pagamentos.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const totals = calculateFiscalTotals(itens);
  const emitenteDocumento = onlyDigits(fiscal.emitente_cpf_cnpj);

  if (!emitenteDocumento) {
    throw new Error("Documento do emitente não foi sincronizado para o PDV.");
  }

  if (Number(venda.total_liquido || 0) >= 10000 && !hasClientIdentification(venda)) {
    throw new Error(
      "Vendas de NFC-e com valor igual ou superior a R$ 10.000,00 exigem identificação do consumidor.",
    );
  }

  return {
    configuracao: fiscal,
    emitente: {
      nome_razao: fiscal.emitente_nome_razao,
      nome_fantasia: fiscal.emitente_nome_fantasia,
      cpf_cnpj: emitenteDocumento,
      inscricao_estadual: fiscal.emitente_inscricao_estadual,
      inscricao_municipal: fiscal.emitente_inscricao_municipal,
      email: fiscal.emitente_email,
      telefone: fiscal.emitente_telefone,
      cep: fiscal.emitente_cep,
      logradouro: fiscal.emitente_logradouro,
      numero: fiscal.emitente_numero,
      complemento: fiscal.emitente_complemento,
      bairro: fiscal.emitente_bairro,
      cidade: fiscal.emitente_cidade,
      uf: fiscal.emitente_uf,
      codigo_ibge: fiscal.emitente_codigo_ibge,
      pais: fiscal.emitente_pais || "Brasil",
    },
    destinatario: destinatarioIdentificado,
    responsavel_tecnico: {
      cnpj: fiscal.responsavel_tecnico_cnpj,
      nome: fiscal.responsavel_tecnico_nome,
      contato: fiscal.responsavel_tecnico_contato,
      email: fiscal.responsavel_tecnico_email,
      telefone: fiscal.responsavel_tecnico_telefone,
    },
    nfce: {
      venda_id: venda.venda_id,
      numero: sequencial.numero,
      serie: sequencial.serie,
      ambiente: sequencial.ambiente,
      codigo_numerico: Number(`${venda.venda_id}${sequencial.numero}`.slice(-8)),
      natureza_operacao: fiscal.natureza_operacao_padrao || "Venda NFC-e",
      valor_produtos: Number(venda.total_produtos || 0),
      valor_desconto: Number(venda.total_desconto || 0),
      valor_total: Number(venda.total_liquido || 0),
      total_pago: totalPago,
      ind_pres: fiscal.nfce_ind_pres_padrao || "1",
      operador_nome: venda.operador_nome || "Operador",
      terminal_codigo: venda.terminal_codigo || terminal?.terminal_codigo || "PDV-01",
      tp_emis: tpEmis,
      dh_contingencia:
        tpEmis === TP_EMIS_CONTINGENCIA_OFFLINE ? options.contingenciaEm || new Date().toISOString() : null,
      x_justificativa_contingencia: contingenciaJustificativa,
      observacao: "Documento emitido pelo V12 PDV.",
      ...totals,
    },
    venda,
    itens,
    pagamentos,
  };
}
