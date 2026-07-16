import express from "express";
import { Readable } from "node:stream";
import { pool } from "../config/conexao.js";
import GestaoBackupDAO from "../model/gestaoBackupDAO.js";
import { downloadBackupFromGoogleDrive } from "../services/googleDriveBackupService.js";

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

router.get("/backup/fiscal", async (req, res) => {
  try {
    const data = await withClient((client) =>
      GestaoBackupDAO.listarBackups(client, {
        tenantId: req.query.tenantId,
        status: req.query.status,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        limit: req.query.limit,
        offset: req.query.offset,
      })
    );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[gestao:backup] Falha ao listar backups fiscais:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar os backups fiscais.",
    });
  }
});

router.get("/backup/fiscal/:backupId", async (req, res) => {
  try {
    const data = await withClient((client) =>
      GestaoBackupDAO.buscarBackupPorId(client, req.params.backupId)
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Backup fiscal não encontrado.",
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[gestao:backup] Falha ao buscar backup fiscal:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível buscar o backup fiscal.",
    });
  }
});

router.get("/backup/fiscal/:backupId/download", async (req, res) => {
  try {
    const backup = await withClient((client) =>
      GestaoBackupDAO.buscarBackupPorId(client, req.params.backupId)
    );

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: "Backup fiscal não encontrado.",
      });
    }

    if (!backup.drive_file_id) {
      return res.status(409).json({
        success: false,
        message: "Este backup ainda não possui arquivo disponível no Google Drive.",
      });
    }

    const config = await withClient((client) =>
      GestaoBackupDAO.buscarConfiguracaoGoogleDrive(client)
    );
    const driveResponse = await downloadBackupFromGoogleDrive({
      config,
      fileId: backup.drive_file_id,
    });

    res.setHeader("Content-Type", "application/x-7z-compressed");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${String(backup.arquivo_nome || `backup-${backup.pdv_backup_fiscal_id}.7z`).replace(/"/g, "")}"`
    );

    const stream = Readable.fromWeb(driveResponse.body);
    stream.on("error", (error) => {
      console.error("[gestao:backup] Falha durante stream do Google Drive:", error);
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  } catch (error) {
    console.error("[gestao:backup] Falha ao baixar backup fiscal:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível baixar o backup fiscal.",
    });
  }
});

export default router;
