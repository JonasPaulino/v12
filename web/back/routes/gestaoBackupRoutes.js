import express from "express";
import { pool } from "../config/conexao.js";
import GestaoBackupDAO from "../model/gestaoBackupDAO.js";

const router = express.Router();

const withClient = async (handler) => {
  const client = await pool.connect();
  try {
    return await handler(client);
  } finally {
    client.release();
  }
};

router.get("/backup/google-drive/configuracao", async (_req, res) => {
  try {
    const config = await withClient((client) =>
      GestaoBackupDAO.buscarConfiguracaoGoogleDrive(client)
    );

    return res.json({
      success: true,
      data: {
        ativo: config.ativo,
        folder_id: config.folderId,
        credential_masked: config.credentialMasked,
        scope: config.scope,
      },
    });
  } catch (error) {
    console.error("[gestao:backup] Falha ao buscar configuração:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível buscar a configuração de backup.",
    });
  }
});

router.put("/backup/google-drive/configuracao", async (req, res) => {
  try {
    const config = await withClient((client) =>
      GestaoBackupDAO.salvarConfiguracaoGoogleDrive(
        client,
        req.body || {},
        Number(req.user?.userId) || null
      )
    );

    return res.json({
      success: true,
      message: "Configuração de backup salva com sucesso.",
      data: {
        ativo: config.ativo,
        folder_id: config.folderId,
        credential_masked: config.credentialMasked,
        scope: config.scope,
      },
    });
  } catch (error) {
    console.error("[gestao:backup] Falha ao salvar configuração:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível salvar a configuração de backup.",
    });
  }
});

export default router;
