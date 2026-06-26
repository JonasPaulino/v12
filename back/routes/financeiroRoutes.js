import express from "express";
import FinanceiroDAO from "../model/financeiroDAO.js";
import MensagemDAO from "../model/mensagemDAO.js";
import { criarCobrancaBoleto, criarCobrancaPix } from "../services/paymentsGatewayService.js";
import { enviarWhatsAppTexto } from "../services/messageGatewayService.js";

const router = express.Router();

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("pt-BR");
};

const normalizePhoneNumber = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits : "";
};

const findExistingBoletoCharges = async (client, { tenantId, financeiroTituloId }) => {
  const { rows } = await client.query(
    `
      SELECT DISTINCT ON (COALESCE(financeiro_titulo_parcela_id, 0))
        gateway_charge_id,
        financeiro_titulo_parcela_id,
        valor,
        due_date,
        invoice_url,
        payload
      FROM payments.gateway_charge
      WHERE tenant_id = $1
        AND financeiro_titulo_id = $2
        AND billing_type = 'BOLETO'
        AND settled = FALSE
        AND LOWER(status) NOT IN ('deleted', 'cancelled', 'canceled')
      ORDER BY COALESCE(financeiro_titulo_parcela_id, 0), gateway_charge_id DESC
    `,
    [tenantId, financeiroTituloId]
  );

  const byParcela = new Map();
  let tituloCharge = null;

  rows.forEach((row) => {
    const charge = {
      gatewayChargeId: row.gateway_charge_id,
      parcelaId: row.financeiro_titulo_parcela_id
        ? Number(row.financeiro_titulo_parcela_id)
        : null,
      valor: Number(row.valor || 0),
      vencimento: row.due_date,
      linhaDigitavel: row.payload?.identificationField?.identificationField || "",
      boletoUrl: row.invoice_url || "",
    };

    if (charge.parcelaId) {
      byParcela.set(charge.parcelaId, charge);
    } else {
      tituloCharge = charge;
    }
  });

  return { byParcela, tituloCharge };
};

router.get("/support-data", async (req, res) => {
  try {
    const data = await FinanceiroDAO.obterSupportData(req.db, {
      tipo: String(req.query.tipo || "receber"),
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao carregar dados de apoio:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar os dados auxiliares do financeiro.",
    });
  }
});

router.get("/pessoas-select", async (req, res) => {
  try {
    const data = await FinanceiroDAO.listarPessoasSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao pesquisar pessoas:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível pesquisar as pessoas.",
    });
  }
});

router.get("/listar", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const search = String(req.query.search || "");
    const tipo = String(req.query.tipo || "");
    const status = String(req.query.status || "");
    let sort = {};

    try {
      sort = req.query.sort ? JSON.parse(String(req.query.sort)) : {};
    } catch {
      sort = {};
    }

    const result = await FinanceiroDAO.listar(req.db, {
      page,
      limit,
      search,
      tipo,
      status,
      sort,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao listar titulos:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar os títulos financeiros.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await FinanceiroDAO.buscarPorId(req.db, Number(req.params.id));

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Título financeiro não encontrado.",
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao buscar titulo:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar o título financeiro.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = await FinanceiroDAO.criarManual(req.db, {
      payload: req.body || {},
    });

    return res.status(201).json({
      success: true,
      message: "Título financeiro cadastrado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao criar titulo:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cadastrar o título financeiro.",
    });
  }
});

router.post("/:id/baixas", async (req, res) => {
  try {
    const data = await FinanceiroDAO.registrarBaixa(req.db, {
      financeiroTituloId: Number(req.params.id),
      payload: req.body || {},
      actorUserId: Number(req.user?.userId) || null,
    });

    return res.json({
      success: true,
      message: "Baixa financeira registrada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao registrar baixa:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível registrar a baixa financeira.",
    });
  }
});

router.post("/:id/cobrancas/pix", async (req, res) => {
  try {
    const contexto = await FinanceiroDAO.prepararCobrancaPix(req.db, {
      financeiroTituloId: Number(req.params.id),
      payload: req.body || {},
    });

    const response = await criarCobrancaPix({
      tenantId: Number(req.user?.tenantId),
      financeiroTituloId: Number(contexto.titulo.financeiro_titulo_id),
      financeiroTituloParcelaId: contexto.parcela?.financeiro_titulo_parcela_id || null,
      financeiroFormaPagamentoId:
        contexto.forma_pagamento.financeiro_forma_pagamento_id,
      customer: {
        pessoaId: contexto.pessoa.pessoa_id,
        nome: contexto.pessoa.pessoa_nome_razao,
        documento: contexto.pessoa.pessoa_cpf_cnpj,
        email: contexto.pessoa.pessoa_email,
        telefone: contexto.pessoa.pessoa_telefone,
        whatsapp: contexto.pessoa.pessoa_whatsapp,
      },
      charge: {
        valor: contexto.cobranca.valor,
        dueDate: contexto.cobranca.data_vencimento,
        description: contexto.cobranca.descricao,
      },
    });

    return res.status(201).json({
      success: true,
      message: response?.message || "Cobrança PIX gerada com sucesso.",
      data: response?.data || null,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao gerar cobrança PIX:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível gerar a cobrança PIX.",
    });
  }
});

router.post("/:id/cobrancas/boleto", async (req, res) => {
  try {
    const contexto = await FinanceiroDAO.prepararCobrancaBoleto(req.db, {
      financeiroTituloId: Number(req.params.id),
      payload: req.body || {},
    });

    const response = await criarCobrancaBoleto({
      tenantId: Number(req.user?.tenantId),
      financeiroTituloId: Number(contexto.titulo.financeiro_titulo_id),
      financeiroTituloParcelaId: contexto.parcela?.financeiro_titulo_parcela_id || null,
      financeiroFormaPagamentoId:
        contexto.forma_pagamento.financeiro_forma_pagamento_id,
      customer: {
        pessoaId: contexto.pessoa.pessoa_id,
        nome: contexto.pessoa.pessoa_nome_razao,
        documento: contexto.pessoa.pessoa_cpf_cnpj,
        email: contexto.pessoa.pessoa_email,
        telefone: contexto.pessoa.pessoa_telefone,
        whatsapp: contexto.pessoa.pessoa_whatsapp,
      },
      charge: {
        valor: contexto.cobranca.valor,
        dueDate: contexto.cobranca.data_vencimento,
        description: contexto.cobranca.descricao,
      },
    });

    return res.status(201).json({
      success: true,
      message: response?.message || "Boleto gerado com sucesso.",
      data: response?.data || null,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao gerar boleto:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível gerar o boleto.",
    });
  }
});

router.post("/:id/enviar-whatsapp/boleto", async (req, res) => {
  try {
    const financeiroTituloId = Number(req.params.id);
    const detail = await FinanceiroDAO.buscarPorId(req.db, financeiroTituloId);

    if (!detail?.titulo) {
      throw new Error("Título financeiro não encontrado.");
    }

    if (detail.titulo.tipo !== "receber") {
      throw new Error("O envio de boleto só está disponível para contas a receber.");
    }

    const openParcelas = (detail.parcelas || []).filter(
      (parcela) => parcela.status !== "cancelada" && Number(parcela.saldo || 0) > 0
    );

    if (!openParcelas.length) {
      throw new Error("Não há parcelas em aberto para enviar boleto.");
    }

    const pessoaContexto = await req.db.query(
      `
        SELECT
          pessoa_nome_razao,
          pessoa_whatsapp,
          pessoa_telefone,
          pessoa_cpf_cnpj
        FROM pessoa
        WHERE pessoa_id = $1
        LIMIT 1
      `,
      [detail.titulo.pessoa_id]
    );

    const pessoa = pessoaContexto.rows[0];
    if (!pessoa) {
      throw new Error("Pessoa vinculada ao título não encontrada.");
    }

    const toNumber = normalizePhoneNumber(pessoa.pessoa_whatsapp || pessoa.pessoa_telefone);
    if (!toNumber) {
      throw new Error("A pessoa não possui WhatsApp ou telefone válido para envio.");
    }

    const config = await MensagemDAO.buscarConfiguracaoAtivaWhatsApp(req.db);
    const boletos = [];
    const tenantId = Number(req.user?.tenantId);
    const existingBoletos = await findExistingBoletoCharges(req.db, {
      tenantId,
      financeiroTituloId,
    });

    for (const parcela of openParcelas) {
      const parcelaId = Number(parcela.financeiro_titulo_parcela_id);
      let boleto = existingBoletos.byParcela.get(parcelaId);

      if (!boleto && openParcelas.length === 1) {
        boleto = existingBoletos.tituloCharge;
      }

      if (!boleto) {
        try {
          const response = await criarCobrancaBoleto({
            tenantId,
            financeiroTituloId,
            financeiroTituloParcelaId: parcelaId,
            financeiroFormaPagamentoId: null,
            customer: {
              pessoaId: Number(detail.titulo.pessoa_id),
              nome: pessoa.pessoa_nome_razao,
              documento: pessoa.pessoa_cpf_cnpj,
              email: "",
              telefone: pessoa.pessoa_telefone || "",
              whatsapp: pessoa.pessoa_whatsapp || "",
            },
            charge: {
              valor: Number(parcela.saldo || 0),
              dueDate: String(parcela.data_vencimento || "").slice(0, 10),
              description:
                detail.titulo.descricao ||
                `Boleto do título financeiro #${detail.titulo.financeiro_titulo_id}`,
            },
          });

          boleto = {
            valor: Number(parcela.saldo || 0),
            vencimento: parcela.data_vencimento,
            linhaDigitavel: response?.data?.boleto?.identificationField || "",
            boletoUrl: response?.data?.boleto?.bankSlipUrl || response?.data?.invoiceUrl || "",
          };
        } catch (error) {
          if (/integração de contas está inativa/i.test(String(error?.message || ""))) {
            throw new Error(
              "Não existe boleto gerado para este título. Gere o boleto primeiro ou ative a integração de contas para gerar automaticamente."
            );
          }

          throw error;
        }
      }

      boletos.push({
        numeroParcela: Number(parcela.numero_parcela || 0),
        valor: Number(boleto.valor || parcela.saldo || 0),
        vencimento: dateFormatter(boleto.vencimento || parcela.data_vencimento),
        linhaDigitavel: boleto.linhaDigitavel || "",
        boletoUrl: boleto.boletoUrl || "",
      });
    }

    const boletosTexto = boletos
      .map((boleto) => {
        const parts = [
          `Parcela ${boleto.numeroParcela} • ${currencyFormatter.format(boleto.valor)} • vence ${boleto.vencimento}`,
        ];
        if (boleto.linhaDigitavel) parts.push(`Linha digitável: ${boleto.linhaDigitavel}`);
        if (boleto.boletoUrl) parts.push(`Link: ${boleto.boletoUrl}`);
        return parts.join("\n");
      })
      .join("\n\n");

    const text = MensagemDAO.renderTemplate(config.mensagem_boleto_padrao, {
      nome: pessoa.pessoa_nome_razao,
      titulo_id: detail.titulo.financeiro_titulo_id,
      numero_documento: detail.titulo.numero_documento || "",
      descricao: detail.titulo.descricao || "",
      boletos: boletosTexto,
    });

    await enviarWhatsAppTexto({
      instanceName: config.instance_name,
      remetenteNumero: config.remetente_numero,
      toNumber,
      text,
    });

    return res.json({
      success: true,
      message: "Boletos enviados por WhatsApp com sucesso.",
      data: {
        total_boletos: boletos.length,
        toNumber,
      },
    });
  } catch (error) {
    console.error("[financeiro] Falha ao enviar boleto por WhatsApp:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível enviar o boleto por WhatsApp.",
    });
  }
});

router.post("/:id/enviar-whatsapp/pix", async (req, res) => {
  try {
    const financeiroTituloId = Number(req.params.id);
    const detail = await FinanceiroDAO.buscarPorId(req.db, financeiroTituloId);

    if (!detail?.titulo) {
      throw new Error("Título financeiro não encontrado.");
    }

    if (detail.titulo.tipo !== "receber") {
      throw new Error("O envio de PIX só está disponível para contas a receber.");
    }

    const openParcelas = (detail.parcelas || []).filter(
      (parcela) => parcela.status !== "cancelada" && Number(parcela.saldo || 0) > 0
    );

    if (!openParcelas.length) {
      throw new Error("Não há parcelas em aberto para enviar PIX.");
    }

    if (openParcelas.length > 1) {
      throw new Error(
        "Este título possui mais de uma parcela em aberto. Gere o PIX da parcela desejada pelo modal de recebimento."
      );
    }

    const parcela = openParcelas[0];

    const pixFormResult = await req.db.query(
      `
        SELECT financeiro_forma_pagamento_id
        FROM financeiro_forma_pagamento
        WHERE tenant_id = current_setting('app.tenant_id', true)::INTEGER
          AND ativo = TRUE
          AND (tipo = 'receber' OR tipo = 'ambos')
          AND LOWER(unaccent(descricao)) LIKE '%pix%'
        ORDER BY padrao DESC, ordem ASC, financeiro_forma_pagamento_id ASC
        LIMIT 1
      `
    );

    const pixFormaPagamentoId = pixFormResult.rows[0]?.financeiro_forma_pagamento_id;
    if (!pixFormaPagamentoId) {
      throw new Error("Cadastre uma forma de pagamento PIX ativa para enviar a cobrança.");
    }

    const pessoaContexto = await req.db.query(
      `
        SELECT
          pessoa_nome_razao,
          pessoa_whatsapp,
          pessoa_telefone,
          pessoa_cpf_cnpj,
          pessoa_email
        FROM pessoa
        WHERE pessoa_id = $1
        LIMIT 1
      `,
      [detail.titulo.pessoa_id]
    );

    const pessoa = pessoaContexto.rows[0];
    if (!pessoa) {
      throw new Error("Pessoa vinculada ao título não encontrada.");
    }

    const toNumber = normalizePhoneNumber(pessoa.pessoa_whatsapp || pessoa.pessoa_telefone);
    if (!toNumber) {
      throw new Error("A pessoa não possui WhatsApp ou telefone válido para envio.");
    }

    const config = await MensagemDAO.buscarConfiguracaoAtivaWhatsApp(req.db);

    const response = await criarCobrancaPix({
      tenantId: Number(req.user?.tenantId),
      financeiroTituloId,
      financeiroTituloParcelaId: Number(parcela.financeiro_titulo_parcela_id),
      financeiroFormaPagamentoId: Number(pixFormaPagamentoId),
      customer: {
        pessoaId: Number(detail.titulo.pessoa_id),
        nome: pessoa.pessoa_nome_razao,
        documento: pessoa.pessoa_cpf_cnpj,
        email: pessoa.pessoa_email || "",
        telefone: pessoa.pessoa_telefone || "",
        whatsapp: pessoa.pessoa_whatsapp || "",
      },
      charge: {
        valor: Number(parcela.saldo || 0),
        dueDate: String(parcela.data_vencimento || "").slice(0, 10),
        description:
          detail.titulo.descricao ||
          `Cobrança PIX do título financeiro #${detail.titulo.financeiro_titulo_id}`,
      },
    });

    const pixPayload = response?.data?.pix?.payload || "";
    if (!pixPayload) {
      throw new Error("O gateway não retornou o código copia e cola do PIX.");
    }

    const text = MensagemDAO.renderTemplate(config.mensagem_pix_padrao, {
      nome: pessoa.pessoa_nome_razao,
      titulo_id: detail.titulo.financeiro_titulo_id,
      parcela: parcela.numero_parcela,
      valor: currencyFormatter.format(Number(parcela.saldo || 0)),
      vencimento: dateFormatter(parcela.data_vencimento),
      pix_copia_cola: pixPayload,
      descricao: detail.titulo.descricao || "",
      numero_documento: detail.titulo.numero_documento || "",
    });

    await enviarWhatsAppTexto({
      instanceName: config.instance_name,
      remetenteNumero: config.remetente_numero,
      toNumber,
      text,
    });

    return res.json({
      success: true,
      message: "PIX enviado por WhatsApp com sucesso.",
      data: {
        toNumber,
        parcela: parcela.numero_parcela,
      },
    });
  } catch (error) {
    console.error("[financeiro] Falha ao enviar PIX por WhatsApp:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível enviar o PIX por WhatsApp.",
    });
  }
});

router.post("/baixas/:baixaId/estornar", async (req, res) => {
  try {
    const data = await FinanceiroDAO.estornarBaixa(req.db, {
      financeiroTituloBaixaId: Number(req.params.baixaId),
      actorUserId: Number(req.user?.userId) || null,
    });

    return res.json({
      success: true,
      message: "Baixa financeira estornada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao estornar baixa:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível estornar a baixa financeira.",
    });
  }
});

router.post("/:id/cancelar", async (req, res) => {
  try {
    await FinanceiroDAO.cancelarTitulo(req.db, {
      financeiroTituloId: Number(req.params.id),
    });

    return res.json({
      success: true,
      message: "Título financeiro cancelado com sucesso.",
    });
  } catch (error) {
    console.error("[financeiro] Falha ao cancelar título:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cancelar o título financeiro.",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const data = await FinanceiroDAO.atualizarManual(req.db, {
      financeiroTituloId: Number(req.params.id),
      payload: req.body || {},
    });

    return res.json({
      success: true,
      message: "Título financeiro atualizado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao atualizar titulo:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível atualizar o título financeiro.",
    });
  }
});

export default router;
