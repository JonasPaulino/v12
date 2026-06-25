import express from "express";
import { pool } from "../config/conexao.js";
import { tenantLogoUpload } from "../middleware/tenantLogoUpload.js";
import TenantSetupDAO from "../model/tenantSetupDAO.js";

const router = express.Router();

router.get("/:tenantId", async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    const tenantId = Number(req.params.tenantId);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Filial inválida.",
      });
    }

    const data = await TenantSetupDAO.obterFilialPorId(client, tenantId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Filial não encontrada.",
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[tenant-setup] Falha ao carregar filial:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Não foi possível carregar a filial.",
    });
  } finally {
    client?.release();
  }
});

router.post("/", tenantLogoUpload, async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    const data = await TenantSetupDAO.criarFilial(
      client,
      req.body || {},
      Number(req.user?.userId) || null
    );

    return res.status(201).json({
      success: true,
      message: "Filial cadastrada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[tenant-setup] Falha ao cadastrar filial:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cadastrar a filial.",
    });
  } finally {
    client?.release();
  }
});

router.put("/:tenantId", tenantLogoUpload, async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    const tenantId = Number(req.params.tenantId);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Filial inválida.",
      });
    }

    const data = await TenantSetupDAO.atualizarFilial(client, tenantId, req.body || {});

    return res.json({
      success: true,
      message: "Filial atualizada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[tenant-setup] Falha ao atualizar filial:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível atualizar a filial.",
    });
  } finally {
    client?.release();
  }
});

router.patch("/:tenantId/status", async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    const tenantId = Number(req.params.tenantId);
    const tenantAtivo = !!req.body?.tenant_ativo;
    const currentTenantId = Number(req.user?.tenantId || 0);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Filial inválida.",
      });
    }

    if (currentTenantId && currentTenantId === tenantId && !tenantAtivo) {
      return res.status(403).json({
        success: false,
        message: "Você não pode inativar a filial em que está logado.",
      });
    }

    const data = await TenantSetupDAO.alternarStatusFilial(client, tenantId, tenantAtivo);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Filial não encontrada.",
      });
    }

    return res.json({
      success: true,
      message: tenantAtivo ? "Filial reativada com sucesso." : "Filial inativada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[tenant-setup] Falha ao alterar status da filial:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível alterar o status da filial.",
    });
  } finally {
    client?.release();
  }
});

export default router;
