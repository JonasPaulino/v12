import express from "express";
import { pool } from "../config/conexao.js";
import verifyServiceToken from "../middleware/serviceTokenMiddleware.js";
import FinanceiroDAO from "../model/financeiroDAO.js";

const router = express.Router();

router.post("/asaas/baixa-automatica", verifyServiceToken, async (req, res) => {
  const tenantId = Number(req.body?.tenant_id);
  let client;

  try {
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      throw new Error("Tenant inválido para a baixa automática.");
    }

    client = await pool.connect();
    await client.query("SELECT set_config('app.tenant_id', $1, false)", [String(tenantId)]);

    const data = await FinanceiroDAO.registrarBaixa(client, {
      financeiroTituloId: Number(req.body?.financeiro_titulo_id),
      actorUserId: null,
      payload: {
        financeiro_titulo_parcela_id: req.body?.financeiro_titulo_parcela_id || null,
        financeiro_forma_pagamento_id: req.body?.financeiro_forma_pagamento_id,
        data_baixa: req.body?.data_baixa,
        valor_baixa: req.body?.valor_baixa,
        observacao: req.body?.observacao || "Baixa automática por integração.",
      },
    });

    return res.json({
      success: true,
      message: "Baixa automática registrada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[integracao:payments] Falha na baixa automática:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível registrar a baixa automática.",
    });
  } finally {
    if (client) {
      try {
        await client.query("RESET app.tenant_id");
      } catch {}
      client.release();
    }
  }
});

export default router;
