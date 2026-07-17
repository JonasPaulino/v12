import express from "express";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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

const parseJsonField = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
};

const assertReleasePackageCompatibility = ({ tipoRelease, modoAplicacao, fileName }) => {
  const extension = path.extname(String(fileName || "")).toLowerCase();
  const isInstaller = extension === ".exe" || extension === ".msi";
  const isArchive = extension === ".zip" || extension === ".7z";
  const autoMode = ["auto_inicio", "auto_fechamento"].includes(String(modoAplicacao || ""));

  if (!isInstaller && !isArchive) {
    throw new Error("Arquivo inválido. Envie .exe, .msi, .zip ou .7z.");
  }

  if (tipoRelease === "instalador" && !isInstaller) {
    throw new Error("Release do tipo instalador deve usar arquivo .exe ou .msi.");
  }

  if (tipoRelease === "recursos" && !isArchive) {
    throw new Error("Release de recursos deve usar pacote .zip ou .7z.");
  }

  if (autoMode && tipoRelease === "recursos" && !isArchive) {
    throw new Error("Atualização automática de recursos exige pacote .zip ou .7z.");
  }
};

const buildReleaseManifest = (body, fileInfo = {}) => {
  const manifest = parseJsonField(body?.manifest_json, {});
  return {
    tipo_release: String(body?.tipo_release || "app").trim(),
    modo_aplicacao: String(body?.modo_aplicacao || "manual").trim(),
    rollback_habilitado: body?.rollback_habilitado !== "false",
    criado_em: new Date().toISOString(),
    arquivo: {
      nome: fileInfo.arquivoNome || null,
      original: fileInfo.arquivoOriginal || null,
      sha256: fileInfo.arquivoSha256 || null,
      tamanho_bytes: Number(fileInfo.tamanhoBytes || 0),
    },
    ...manifest,
  };
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
    const tipoRelease = String(req.body?.tipo_release || "app").trim();
    const modoAplicacao = String(req.body?.modo_aplicacao || "manual").trim();
    const status = String(req.body?.status || "rascunho").trim();

    if (!versao) {
      return res.status(400).json({ success: false, message: "Versão é obrigatória." });
    }

    if (!req.file?.path) {
      return res.status(400).json({ success: false, message: "Arquivo do release é obrigatório." });
    }

    validateReleaseFileName(req.file.originalname);
    assertReleasePackageCompatibility({
      tipoRelease,
      modoAplicacao,
      fileName: req.file.originalname,
    });

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
        tipoRelease,
        modoAplicacao,
        status: status === "publicado" ? "publicado" : "rascunho",
        obrigatorio: req.body?.obrigatorio,
        rollbackHabilitado: req.body?.rollback_habilitado,
        manifest: buildReleaseManifest(req.body, storedFile),
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

router.delete("/pdv/releases/:releaseId", async (req, res) => {
  try {
    const data = await withClient((client) =>
      GestaoPdvReleaseDAO.excluirRelease(client, Number(req.params.releaseId)),
    );

    if (!data) {
      return res.status(404).json({ success: false, message: "Release não encontrado." });
    }

    if (data.arquivo_path) {
      await fs.rm(data.arquivo_path, { force: true }).catch((error) => {
        console.warn("[gestao:pdv-release] Release excluído, mas arquivo não foi removido:", {
          releaseId: data.pdv_release_id,
          arquivoPath: data.arquivo_path,
          message: error?.message || error,
        });
      });
    }

    return res.json({ success: true, message: "Release excluído.", data });
  } catch (error) {
    console.error("[gestao:pdv-release] Falha ao excluir release:", error);
    return res.status(400).json({
      success: false,
      message: error?.message || "Não foi possível excluir o release.",
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
