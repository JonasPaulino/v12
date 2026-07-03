import express from "express";
import { pool } from "../config/conexao.js";
import GestaoFinanceiroDAO from "../model/gestaoFinanceiroDAO.js";
import GestaoMensagemDAO from "../model/gestaoMensagemDAO.js";
import { enviarWhatsAppTexto } from "../services/messageGatewayService.js";

const router = express.Router();

const withClient = async (handler) => {
  const client = await pool.connect();
  try {
    return await handler(client);
  } finally {
    client.release();
  }
};

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
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits.length >= 12 ? digits : "";
};

const resolveParcelaLink = (parcela = {}) =>
  parcela.asaas_invoice_url ||
  parcela.asaas_payload?.payment?.bankSlipUrl ||
  parcela.asaas_payload?.payment?.invoiceUrl ||
  parcela.asaas_payload?.boleto?.bankSlipUrl ||
  "";

const resolveLinhaDigitavel = (parcela = {}) =>
  parcela.asaas_payload?.boleto?.identificationField ||
  parcela.asaas_payload?.boleto?.barCode ||
  "";

const parcelaTemCobrancaAtiva = (parcela = {}) =>
  !!parcela.asaas_charge_id &&
  !["quitado", "cancelado"].includes(String(parcela.status || "").toLowerCase()) &&
  Number(parcela.valor_pago || 0) <= 0;

router.get("/financeiro/listar", async (req, res) => {
  try {
    const result = await withClient((client) =>
      GestaoFinanceiroDAO.listarParcelas(client, {
        page: req.query.page,
        limit: req.query.limit,
        search: String(req.query.search || ""),
        status: String(req.query.status || ""),
        syncAsaas: req.query.sync_asaas === "true",
      })
    );

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[gestao:financeiro] Falha ao listar financeiro:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar o financeiro da Gestão V12.",
    });
  }
});

router.get("/financeiro/configuracao/asaas", async (_req, res) => {
  try {
    const config = await withClient((client) => GestaoFinanceiroDAO.buscarConfiguracaoAsaas(client));

    return res.json({
      success: true,
      data: {
        ativo: config.ativo,
        ambiente: config.ambiente,
        api_key_masked: config.apiKeyMasked,
      },
    });
  } catch (error) {
    console.error("[gestao:financeiro] Falha ao buscar configuração Asaas:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível buscar a configuração Asaas da Gestão V12.",
    });
  }
});

router.put("/financeiro/configuracao/asaas", async (req, res) => {
  try {
    const config = await withClient((client) =>
      GestaoFinanceiroDAO.salvarConfiguracaoAsaas(
        client,
        req.body || {},
        Number(req.user?.userId) || null
      )
    );

    return res.json({
      success: true,
      message: "Configuração Asaas da Gestão V12 salva com sucesso.",
      data: {
        ativo: config.ativo,
        ambiente: config.ambiente,
        api_key_masked: config.apiKeyMasked,
      },
    });
  } catch (error) {
    console.error("[gestao:financeiro] Falha ao salvar configuração Asaas:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível salvar a configuração Asaas.",
    });
  }
});

router.post("/financeiro/parcelas/:id/cobranca", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await GestaoFinanceiroDAO.gerarCobranca(client, Number(req.params.id), {
      tipo: req.body?.tipo,
      forceNew: req.body?.force_new === true,
    });
    await client.query("COMMIT");

    return res.json({
      success: true,
      message: result.reused ? "Cobrança já existente reutilizada." : "Cobrança gerada no Asaas.",
      data: result,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[gestao:financeiro] Falha ao gerar cobrança:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível gerar a cobrança.",
    });
  } finally {
    client.release();
  }
});

router.post("/financeiro/titulos/:id/carne", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await GestaoFinanceiroDAO.gerarCarneTitulo(client, Number(req.params.id));
    await client.query("COMMIT");

    return res.json({
      success: true,
      message: result.reused ? "Carnê já existente reutilizado." : "Carnê gerado no Asaas.",
      data: result,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[gestao:financeiro] Falha ao gerar carnê:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível gerar o carnê.",
    });
  } finally {
    client.release();
  }
});

router.get("/financeiro/titulos/:id/carne/pdf", async (req, res) => {
  try {
    const result = await withClient((client) =>
      GestaoFinanceiroDAO.baixarCarneTitulo(client, Number(req.params.id))
    );

    res.setHeader("Content-Type", result.contentType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="carne-v12-titulo-${Number(req.params.id)}.pdf"`
    );
    return res.send(result.buffer);
  } catch (error) {
    console.error("[gestao:financeiro] Falha ao baixar carnê:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível baixar o carnê.",
    });
  }
});

router.post("/financeiro/titulos/:id/carne/enviar-whatsapp", async (req, res) => {
  try {
    const result = await withClient(async (client) => {
      const contexto = await GestaoFinanceiroDAO.buscarTituloContexto(client, Number(req.params.id));
      if (!contexto) throw new Error("Título financeiro não encontrado.");

      const { titulo, parcelas } = contexto;
      if (!titulo.asaas_installment_id) {
        throw new Error("Gere o carnê antes de enviar pelo WhatsApp.");
      }

      const parcelasAtivas = parcelas.filter(parcelaTemCobrancaAtiva);
      if (!parcelasAtivas.length) {
        throw new Error("Este título não possui parcelas de carnê ativas para envio.");
      }

      const toNumber = normalizePhoneNumber(titulo.pessoa_whatsapp || titulo.pessoa_telefone);
      if (!toNumber) {
        throw new Error("O cliente não possui WhatsApp ou telefone válido cadastrado.");
      }

      const config = await GestaoMensagemDAO.buscarConfiguracaoAtivaWhatsApp(client);
      const nomeCliente =
        titulo.pessoa_nome_fantasia || titulo.pessoa_nome_razao || "cliente";

      const boletos = parcelasAtivas
        .map((parcela) => {
          const link = resolveParcelaLink(parcela);
          const linhaDigitavel = resolveLinhaDigitavel(parcela);
          const linhas = [
            `Parcela ${parcela.numero_parcela}`,
            `Valor: ${currencyFormatter.format(Number(parcela.valor || 0))}`,
            `Vencimento: ${dateFormatter(parcela.vencimento)}`,
          ];

          if (link) linhas.push(`Link: ${link}`);
          if (linhaDigitavel) linhas.push(`Linha digitável: ${linhaDigitavel}`);

          return linhas.join("\n");
        })
        .join("\n\n");

      const primeiroLink = resolveParcelaLink(parcelasAtivas[0]);
      const template = config.mensagem_boleto_padrao || "";
      const renderedText = GestaoMensagemDAO.renderTemplate(template, {
        nome: nomeCliente,
        titulo_id: titulo.titulo_id,
        descricao: titulo.descricao || "",
        documento: titulo.documento || "",
        link_boleto: primeiroLink,
        boletos,
        carne: boletos,
      });
      const text = /\{(boletos|carne)\}/.test(template)
        ? renderedText
        : `${renderedText}\n\n${boletos}`;

      await enviarWhatsAppTexto({
        instanceName: config.instance_name,
        remetenteNumero: config.remetente_numero,
        toNumber,
        text,
      });

      return {
        total_parcelas: parcelasAtivas.length,
        telefone_destino: toNumber,
      };
    });

    return res.json({
      success: true,
      message: "Carnê enviado por WhatsApp com sucesso.",
      data: result,
    });
  } catch (error) {
    console.error("[gestao:financeiro] Falha ao enviar carnê por WhatsApp:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível enviar o carnê por WhatsApp.",
    });
  }
});

router.post("/financeiro/titulos/:id/carne/cancelar", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await GestaoFinanceiroDAO.cancelarCarneTitulo(client, Number(req.params.id));
    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Parcelas em aberto do carnê canceladas no Asaas.",
      data: result,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[gestao:financeiro] Falha ao cancelar carnê:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cancelar o carnê.",
    });
  } finally {
    client.release();
  }
});

router.post("/financeiro/titulos/:id/carne/saldo-restante", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await GestaoFinanceiroDAO.gerarCarneSaldoRestante(
      client,
      Number(req.params.id)
    );
    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Novo carnê do saldo restante gerado no Asaas.",
      data: result,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[gestao:financeiro] Falha ao gerar carnê do saldo restante:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível gerar o carnê do saldo restante.",
    });
  } finally {
    client.release();
  }
});

router.post("/financeiro/parcelas/:id/cobranca/cancelar", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await GestaoFinanceiroDAO.cancelarCobrancaParcela(
      client,
      Number(req.params.id)
    );
    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Cobrança da parcela cancelada no Asaas.",
      data: result,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[gestao:financeiro] Falha ao cancelar cobrança:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cancelar a cobrança.",
    });
  } finally {
    client.release();
  }
});

router.post("/financeiro/parcelas/:id/baixar-manual", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await GestaoFinanceiroDAO.registrarBaixaManual(client, Number(req.params.id), req.body || {});
    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Baixa manual registrada com sucesso.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[gestao:financeiro] Falha ao registrar baixa manual:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível registrar a baixa manual.",
    });
  } finally {
    client.release();
  }
});

router.post("/financeiro/parcelas/:id/status", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await GestaoFinanceiroDAO.atualizarStatusCobranca(client, Number(req.params.id));
    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Status da cobrança atualizado.",
      data: result,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[gestao:financeiro] Falha ao atualizar status:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível atualizar o status da cobrança.",
    });
  } finally {
    client.release();
  }
});

export default router;
