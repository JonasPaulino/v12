import express from "express";
import { pool } from "../config/conexao.js";
import GestaoFinanceiroDAO from "../model/gestaoFinanceiroDAO.js";

const router = express.Router();

const withClient = async (handler) => {
  const client = await pool.connect();
  try {
    return await handler(client);
  } finally {
    client.release();
  }
};

router.get("/financeiro/listar", async (req, res) => {
  try {
    const result = await withClient((client) =>
      GestaoFinanceiroDAO.listarParcelas(client, {
        page: req.query.page,
        limit: req.query.limit,
        search: String(req.query.search || ""),
        status: String(req.query.status || ""),
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
