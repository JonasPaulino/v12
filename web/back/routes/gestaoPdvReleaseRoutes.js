import express from "express";
import fs from "node:fs/promises";
import os from "node:os";
import multer from "multer";
import { pool } from "../config/conexao.js";
import GestaoPdvReleaseDAO from "../model/gestaoPdvReleaseDAO.js";
import {
  openReleaseReadStream,
  storeReleaseUpload,
  validateReleaseFileName,
} from "../services/pdvReleaseStorageService.js";

const router = express.Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: Number(process.env.PDV_RELEASE_MAX_FILE_SIZE || 1024 * 1024 * 1024),
  },
});

const withClient = async (handler) => {
  const client = await pool.connect();
  try {
    return await handler(client);
  } finally {
    client.release();
  }
};

router.get("/pdv/releases", async (req, res) => {
  try {
    const data = await withClient((client) =>
      GestaoPdvReleaseDAO.listarReleases(client, {
        canal: req.query.canal,
        plataforma: req.query.plataforma,
        status: req.query.status,
        limit: req.query.limit,
      }),
    );

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[gestao:pdv-release] Falha ao listar releases:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar os releases do PDV.",
    });
  }
});

router.post("/pdv/releases", upload.single("arquivo"), async (req, res) => {
  let uploadedPath = req.file?.path || null;
  let storedPath = null;

  try {
    const versao = String(req.body?.versao || "").trim();
    const canal = String(req.body?.canal || "stable").trim();
    const plataforma = String(req.body?.plataforma || "win32-x64").trim();
    const status = String(req.body?.status || "rascunho").trim();

    if (!versao) {
      return res.status(400).json({ success: false, message: "Versão é obrigatória." });
    }

    if (!req.file?.path) {
      return res.status(400).json({ success: false, message: "Arquivo do release é obrigatório." });
    }

    validateReleaseFileName(req.file.originalname);

    const storedFile = await storeReleaseUpload({
      file: req.file,
      versao,
      canal,
      plataforma,
    });
    uploadedPath = null;
    storedPath = storedFile.arquivoPath;

    const data = await withClient((client) =>
      GestaoPdvReleaseDAO.criarRelease(client, {
        versao,
        canal,
        plataforma,
        status: status === "publicado" ? "publicado" : "rascunho",
        obrigatorio: req.body?.obrigatorio,
        notas: req.body?.notas,
        criadoPor: Number(req.user?.userId) || null,
        ...storedFile,
      }),
    );

    return res.status(201).json({
      success: true,
      message: "Release do PDV cadastrado.",
      data,
    });
  } catch (error) {
    if (storedPath) {
      await fs.rm(storedPath, { force: true }).catch(() => {});
    }
    console.error("[gestao:pdv-release] Falha ao cadastrar release:", error);
    return res.status(400).json({
      success: false,
      message: error?.message || "Não foi possível cadastrar o release do PDV.",
    });
  } finally {
    if (uploadedPath) {
      await fs.rm(uploadedPath, { force: true }).catch(() => {});
    }
  }
});

router.put("/pdv/releases/:releaseId/publicar", async (req, res) => {
  try {
    const data = await withClient((client) =>
      GestaoPdvReleaseDAO.publicarRelease(client, {
        releaseId: Number(req.params.releaseId),
        usuarioId: Number(req.user?.userId) || null,
      }),
    );

    if (!data) {
      return res.status(404).json({ success: false, message: "Release não encontrado." });
    }

    return res.json({ success: true, message: "Release publicado.", data });
  } catch (error) {
    console.error("[gestao:pdv-release] Falha ao publicar release:", error);
    return res.status(400).json({
      success: false,
      message: error?.message || "Não foi possível publicar o release.",
    });
  }
});

router.put("/pdv/releases/:releaseId/desativar", async (req, res) => {
  try {
    const data = await withClient((client) =>
      GestaoPdvReleaseDAO.desativarRelease(client, Number(req.params.releaseId)),
    );

    if (!data) {
      return res.status(404).json({ success: false, message: "Release não encontrado." });
    }

    return res.json({ success: true, message: "Release desativado.", data });
  } catch (error) {
    console.error("[gestao:pdv-release] Falha ao desativar release:", error);
    return res.status(400).json({
      success: false,
      message: error?.message || "Não foi possível desativar o release.",
    });
  }
});

router.get("/pdv/releases/:releaseId/download", async (req, res) => {
  try {
    const release = await withClient((client) =>
      GestaoPdvReleaseDAO.buscarReleasePorId(client, Number(req.params.releaseId)),
    );

    if (!release) {
      return res.status(404).json({ success: false, message: "Release não encontrado." });
    }

    const stream = await openReleaseReadStream(release);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${String(release.arquivo_original || release.arquivo_nome).replace(
        /"/g,
        "",
      )}"`,
    );
    res.setHeader("X-V12-Release-Sha256", release.arquivo_sha256);
    stream.pipe(res);
  } catch (error) {
    console.error("[gestao:pdv-release] Falha ao baixar release:", error);
    return res.status(400).json({
      success: false,
      message: error?.message || "Não foi possível baixar o release.",
    });
  }
});

export default router;
