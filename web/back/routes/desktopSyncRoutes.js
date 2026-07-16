import express from "express";
import crypto from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import multer from "multer";
import { pool } from "../config/conexao.js";
import desktopSyncAuth from "../middleware/desktopSyncAuth.js";
import DesktopSyncDAO from "../model/desktopSyncDAO.js";
import FinanceiroDAO from "../model/financeiroDAO.js";
import ConfiguracaoFiscalDAO from "../model/configuracaoFiscalDAO.js";
import GestaoBackupDAO from "../model/gestaoBackupDAO.js";
import GestaoPdvReleaseDAO from "../model/gestaoPdvReleaseDAO.js";
import PdvDAO from "../model/pdvDAO.js";
import loginDAO from "../model/loginDAO.js";
import { uploadBackupToGoogleDrive } from "../services/googleDriveBackupService.js";
import { openReleaseReadStream } from "../services/pdvReleaseStorageService.js";
import { processarEventoDesktopSync } from "../services/pdvSyncProcessor.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { decryptSecret } from "../utils/secret.js";

const router = express.Router();
const backupUpload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: Number(process.env.PDV_BACKUP_MAX_FILE_SIZE || 1024 * 1024 * 1024),
  },
});

router.use("/desktop/sync", desktopSyncAuth);

const parseBooleanFlag = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "sim", "yes", "t"].includes(normalized)) return true;
  if (["false", "0", "nao", "não", "no", "f"].includes(normalized)) return false;
  return defaultValue;
};

const buildTenantGuardPayload = (tenant) => ({
  tenant_id: Number(tenant.tenant_id),
  tenant_ativo: parseBooleanFlag(tenant.tenant_ativo ?? tenant.ativo, true),
  tenant_usa_pdv: parseBooleanFlag(tenant.tenant_usa_pdv, false),
  tenant_acesso_bloqueado: parseBooleanFlag(tenant.tenant_acesso_bloqueado, false),
  tenant_bloqueio_motivo: tenant.tenant_bloqueio_motivo || null,
  issued_at: new Date().toISOString(),
});

const encodeTenantAccessGuard = (tenant) => {
  const secret = String(process.env.DESKTOP_SYNC_TOKEN || "").trim();
  const guardPayload = buildTenantGuardPayload(tenant);
  const payload = Buffer.from(JSON.stringify(guardPayload), "utf8").toString("base64url");

  const signature = secret
    ? crypto.createHmac("sha256", secret).update(payload).digest("hex")
    : "";

  return {
    sync_guard_payload: payload,
    sync_guard_signature: signature,
    sync_guard_issued_at: guardPayload.issued_at,
  };
};

const sha256File = async (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
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

const parseVersionParts = (version) =>
  String(version || "")
    .trim()
    .replace(/^v/i, "")
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));

const compareVersions = (left, right) => {
  const a = parseVersionParts(left);
  const b = parseVersionParts(right);
  const length = Math.max(a.length, b.length, 3);

  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] || 0) - (b[index] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
};

const buildReleasePayload = (release, req) => {
  const query = new URLSearchParams({
    tenantId: String(req.query?.tenantId || req.body?.tenantId || ""),
  });

  return {
    release_id: release.pdv_release_id,
    versao: release.versao,
    canal: release.canal,
    plataforma: release.plataforma,
    obrigatorio: release.obrigatorio === true,
    arquivo_nome: release.arquivo_nome,
    arquivo_original: release.arquivo_original,
    arquivo_sha256: release.arquivo_sha256,
    tamanho_bytes: Number(release.tamanho_bytes || 0),
    notas: release.notas || "",
    publicado_em: release.publicado_em,
    download_url: `/desktop/sync/releases/${release.pdv_release_id}/download?${query.toString()}`,
  };
};

router.post("/desktop/sync", async (req, res) => {
  try {
    const tenantId = Number(req.body?.tenantId);
    const localSyncId = Number(req.body?.localSyncId);
    const eventType = String(req.body?.eventType || "").trim().toUpperCase();
    const terminalCodigo = String(req.body?.terminalCodigo || "").trim() || null;
    const terminalNome = String(req.body?.terminalNome || "").trim() || null;
    const payload = req.body?.payload && typeof req.body.payload === "object" ? req.body.payload : {};

    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      return res.status(400).json({
        success: false,
        message: "tenantId obrigatório.",
      });
    }

    if (!Number.isInteger(localSyncId) || localSyncId <= 0) {
      return res.status(400).json({
        success: false,
        message: "localSyncId obrigatório.",
      });
    }

    if (!eventType) {
      return res.status(400).json({
        success: false,
        message: "eventType obrigatório.",
      });
    }

    const tenantAtivo = await DesktopSyncDAO.validarTenantAtivo(pool, tenantId);
    if (!tenantAtivo) {
      return res.status(403).json({
        success: false,
        message: "Filial inativa, bloqueada, sem integração PDV ou não encontrada.",
      });
    }

    const evento = await DesktopSyncDAO.registrarEventoPdv(pool, {
      tenantId,
      terminalCodigo,
      terminalNome,
      localSyncId,
      eventType,
      payload,
    });

    await processarEventoDesktopSync({
      desktopSyncEventoId: evento.desktop_sync_evento_id,
      tenantId,
      terminalCodigo,
      terminalNome,
      eventType,
      payload,
    });

    return res.json({
      success: true,
      data: evento,
    });
  } catch (error) {
    console.error("[desktop-sync] Falha ao registrar evento do PDV:", {
      tenantId: req.body?.tenantId,
      localSyncId: req.body?.localSyncId,
      eventType: req.body?.eventType,
      terminalCodigo: req.body?.terminalCodigo,
      message: error?.message,
      stack: error?.stack,
    });
    return res.status(500).json({
      success: false,
      message: error?.message || "Não foi possível registrar o evento do PDV.",
    });
  }
});

router.post("/desktop/sync/backups", backupUpload.single("arquivo"), async (req, res) => {
  const uploadedPath = req.file?.path || null;
  let backup = null;

  try {
    const tenantId = Number(req.body?.tenantId);
    const terminalCodigo = String(req.body?.terminalCodigo || "").trim() || null;
    const terminalNome = String(req.body?.terminalNome || "").trim() || terminalCodigo;
    const arquivoSha256 = String(req.body?.arquivoSha256 || "").trim().toLowerCase();
    const tamanhoBytes = Number(req.body?.tamanhoBytes || req.file?.size || 0);
    const manifest = parseJsonField(req.body?.manifest, {});

    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      return res.status(400).json({ success: false, message: "tenantId obrigatório." });
    }

    if (!req.file?.path) {
      return res.status(400).json({ success: false, message: "Arquivo de backup obrigatório." });
    }

    if (!/^[a-f0-9]{64}$/.test(arquivoSha256)) {
      return res.status(400).json({ success: false, message: "Hash SHA-256 do backup inválido." });
    }

    const realSha256 = await sha256File(req.file.path);
    if (realSha256 !== arquivoSha256) {
      return res.status(400).json({
        success: false,
        message: "Hash do arquivo de backup não confere.",
      });
    }

    const tenantPermitido = await DesktopSyncDAO.validarTenantParaBackup(pool, tenantId);
    if (!tenantPermitido) {
      return res.status(403).json({
        success: false,
        message: "Filial sem integração PDV ou não encontrada para retenção fiscal.",
      });
    }

    const existing = await GestaoBackupDAO.buscarBackupPorHash(pool, {
      tenantId,
      arquivoSha256,
    });

    if (existing?.status === "concluido") {
      return res.json({
        success: true,
        data: {
          backup_id: existing.pdv_backup_fiscal_id,
          status: existing.status,
          drive_file_id: existing.drive_file_id,
          drive_web_view_link: existing.drive_web_view_link,
          reused: true,
        },
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const terminal = terminalCodigo
        ? await PdvDAO.ensureTerminal(client, { tenantId, terminalCodigo, terminalNome })
        : null;

      backup = await GestaoBackupDAO.registrarBackupRecebido(client, {
        tenantId,
        terminal,
        terminalCodigo,
        terminalNome,
        arquivoNome: req.file.originalname,
        arquivoSha256,
        tamanhoBytes,
        manifest,
      });
      await GestaoBackupDAO.substituirItensBackup(client, {
        tenantId,
        backupId: backup.pdv_backup_fiscal_id,
        itens: Array.isArray(manifest.itens) ? manifest.itens : [],
      });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const config = await GestaoBackupDAO.buscarConfiguracaoGoogleDrive(pool);
    const driveFile = await uploadBackupToGoogleDrive({
      config,
      filePath: req.file.path,
      name: req.file.originalname,
      sha256: arquivoSha256,
      tenantId,
      terminalCodigo,
    });

    const updateClient = await pool.connect();
    try {
      const updated = await GestaoBackupDAO.marcarBackupEnviadoDrive(updateClient, {
        backupId: backup.pdv_backup_fiscal_id,
        driveFile,
        payload: driveFile,
      });

      return res.json({
        success: true,
        data: {
          backup_id: updated.pdv_backup_fiscal_id,
          status: updated.status,
          drive_file_id: updated.drive_file_id,
          drive_web_view_link: updated.drive_web_view_link,
          reused: false,
        },
      });
    } finally {
      updateClient.release();
    }
  } catch (error) {
    if (backup?.pdv_backup_fiscal_id) {
      const errorClient = await pool.connect();
      try {
        await GestaoBackupDAO.marcarBackupErro(errorClient, {
          backupId: backup.pdv_backup_fiscal_id,
          erro: error?.message || error,
        });
      } catch {
      } finally {
        errorClient.release();
      }
    }

    console.error("[desktop-sync:backup] Falha ao receber backup fiscal:", {
      tenantId: req.body?.tenantId,
      terminalCodigo: req.body?.terminalCodigo,
      file: req.file?.originalname,
      message: error?.message,
      stack: error?.stack,
    });

    return res.status(400).json({
      success: false,
      message: error?.message || "Não foi possível processar o backup fiscal do PDV.",
    });
  } finally {
    if (uploadedPath) {
      await fs.rm(uploadedPath, { force: true }).catch(() => {});
    }
  }
});

router.get("/desktop/sync/releases/latest", async (req, res) => {
  try {
    const tenantId = Number(req.query?.tenantId);
    const canal = String(req.query?.channel || req.query?.canal || "stable").trim();
    const plataforma = String(req.query?.platform || req.query?.plataforma || "win32-x64").trim();
    const currentVersion = String(req.query?.currentVersion || req.query?.versaoAtual || "").trim();

    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      return res.status(400).json({ success: false, message: "tenantId obrigatório." });
    }

    const tenantAtivo = await DesktopSyncDAO.validarTenantAtivo(pool, tenantId);
    if (!tenantAtivo) {
      return res.status(403).json({
        success: false,
        message: "Filial inativa, bloqueada, sem integração PDV ou não encontrada.",
      });
    }

    const release = await GestaoPdvReleaseDAO.buscarReleasePublicado(pool, {
      canal,
      plataforma,
    });

    if (!release) {
      return res.json({
        success: true,
        data: {
          update_available: false,
          release: null,
        },
      });
    }

    const updateAvailable =
      !currentVersion || compareVersions(release.versao, currentVersion) > 0;

    return res.json({
      success: true,
      data: {
        update_available: updateAvailable,
        current_version: currentVersion || null,
        release: updateAvailable ? buildReleasePayload(release, req) : null,
        latest: buildReleasePayload(release, req),
      },
    });
  } catch (error) {
    console.error("[desktop-sync:release] Falha ao consultar release:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível consultar atualização do PDV.",
    });
  }
});

router.get("/desktop/sync/releases/:releaseId/download", async (req, res) => {
  try {
    const tenantId = Number(req.query?.tenantId);
    const releaseId = Number(req.params.releaseId);

    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      return res.status(400).json({ success: false, message: "tenantId obrigatório." });
    }

    const tenantAtivo = await DesktopSyncDAO.validarTenantAtivo(pool, tenantId);
    if (!tenantAtivo) {
      return res.status(403).json({
        success: false,
        message: "Filial inativa, bloqueada, sem integração PDV ou não encontrada.",
      });
    }

    const release = await GestaoPdvReleaseDAO.buscarReleasePorId(pool, releaseId);
    if (!release || release.status !== "publicado") {
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
    console.error("[desktop-sync:release] Falha ao baixar release:", error);
    return res.status(400).json({
      success: false,
      message: error?.message || "Não foi possível baixar atualização do PDV.",
    });
  }
});

const buildPublicSetupUser = (usuario) => ({
  usuario_id: usuario.usuario_id,
  usuario_nome: usuario.usuario_nome,
  usuario_email: usuario.usuario_email,
  usuario_master: parseBooleanFlag(usuario.usuario_master, false),
});

const buildTenantAddress = (tenant) => {
  const street = [tenant.logradouro, tenant.numero, tenant.complemento]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
  const district = String(tenant.bairro || "").trim();
  const cityState = [tenant.cidade, tenant.uf]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("/");
  const zipCode = String(tenant.cep || "").trim();

  return [street, district, cityState, zipCode].filter(Boolean).join(" - ");
};

const buildTenantPayload = (tenant) => ({
  tenant_id: tenant.tenant_id,
  tenant_nome: tenant.tenant_nome,
  tenant_slug: tenant.tenant_slug,
  tenant_documento: tenant.tenant_documento,
  tenant_inscricao_estadual: tenant.tenant_inscricao_estadual || "",
  tenant_inscricao_municipal: tenant.tenant_inscricao_municipal || "",
  tenant_endereco: tenant.tenant_endereco || buildTenantAddress(tenant),
  perfil: tenant.perfil || null,
  tenant_ativo: parseBooleanFlag(tenant.tenant_ativo ?? tenant.ativo, true),
  tenant_usa_pdv: parseBooleanFlag(tenant.tenant_usa_pdv, false),
  tenant_acesso_bloqueado: parseBooleanFlag(tenant.tenant_acesso_bloqueado, false),
  tenant_bloqueio_motivo: tenant.tenant_bloqueio_motivo || null,
  ...encodeTenantAccessGuard(tenant),
});

const buildTenantConfigPayload = (tenant) => ({
  ...buildTenantPayload(tenant),
  emitente: tenant.emitente || null,
  fiscal_nfce: tenant.fiscal_nfce || null,
  responsavel_tecnico: tenant.responsavel_tecnico || null,
  certificado: tenant.certificado || null,
});

async function enrichTenantsWithCompanyData(client, tenants = []) {
  const tenantIds = [...new Set(tenants.map((tenant) => Number(tenant.tenant_id)).filter(Boolean))];
  if (!tenantIds.length) {
    return tenants;
  }

  const { rows } = await client.query(
    `
      SELECT
        t.tenant_id,
        p.pessoa_inscricao_estadual,
        p.pessoa_inscricao_municipal,
        pe.cep,
        pe.logradouro,
        pe.numero,
        pe.complemento,
        pe.bairro,
        pe.cidade,
        pe.uf
      FROM tenant t
      LEFT JOIN pessoa p ON p.pessoa_id = t.pessoa_id
      LEFT JOIN LATERAL (
        SELECT
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf
        FROM pessoa_endereco
        WHERE pessoa_id = t.pessoa_id
          AND endereco_tipo = 'principal'
        ORDER BY atualizado_em DESC, criado_em DESC
        LIMIT 1
      ) pe ON TRUE
      WHERE t.tenant_id = ANY($1::int[])
    `,
    [tenantIds],
  );

  const detailsByTenantId = new Map(
    rows.map((row) => [
      Number(row.tenant_id),
      {
        tenant_inscricao_estadual: row.pessoa_inscricao_estadual || "",
        tenant_inscricao_municipal: row.pessoa_inscricao_municipal || "",
        tenant_endereco: buildTenantAddress(row),
      },
    ]),
  );

  return tenants.map((tenant) => ({
    ...tenant,
    ...(detailsByTenantId.get(Number(tenant.tenant_id)) || {}),
  }));
}

async function getTenantWithCompanyData(client, tenantId) {
  const result = await client.query(
    `
      SELECT
        t.tenant_id,
        t.tenant_nome,
        t.tenant_slug,
        t.tenant_documento,
        t.tenant_ativo,
        COALESCE(t.tenant_usa_pdv, FALSE) AS tenant_usa_pdv,
        COALESCE(t.tenant_acesso_bloqueado, FALSE) AS tenant_acesso_bloqueado,
        t.tenant_bloqueio_motivo,
        p.pessoa_nome_razao AS emitente_nome_razao,
        p.pessoa_nome_fantasia AS emitente_nome_fantasia,
        COALESCE(p.pessoa_cpf_cnpj, t.tenant_documento) AS emitente_cpf_cnpj,
        p.pessoa_inscricao_estadual AS emitente_inscricao_estadual,
        p.pessoa_inscricao_municipal AS emitente_inscricao_municipal,
        p.pessoa_email AS emitente_email,
        p.pessoa_telefone AS emitente_telefone,
        pe.cep AS emitente_cep,
        pe.logradouro AS emitente_logradouro,
        pe.numero AS emitente_numero,
        pe.complemento AS emitente_complemento,
        pe.bairro AS emitente_bairro,
        pe.cidade AS emitente_cidade,
        pe.uf AS emitente_uf,
        pe.codigo_ibge AS emitente_codigo_ibge,
        pe.pais AS emitente_pais,
        cfg.ambiente_nfe,
        cfg.ambiente_nfce,
        cfg.crt,
        cfg.cnae,
        cfg.natureza_operacao_padrao,
        cfg.nfce_habilitada,
        cfg.serie_nfce_padrao,
        cfg.proximo_numero_nfce,
        cfg.nfce_id_token_csc,
        cfg.nfce_csc_criptografado,
        cfg.nfce_ind_pres_padrao,
        rt.cnpj AS responsavel_tecnico_cnpj,
        rt.nome AS responsavel_tecnico_nome,
        rt.contato AS responsavel_tecnico_contato,
        rt.email AS responsavel_tecnico_email,
        rt.telefone AS responsavel_tecnico_telefone,
        cert.nome_arquivo AS certificado_nome_arquivo,
        cert.conteudo_pfx,
        cert.senha_criptografada
      FROM tenant t
      LEFT JOIN pessoa p ON p.pessoa_id = t.pessoa_id
      LEFT JOIN LATERAL (
        SELECT
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf,
          codigo_ibge,
          pais
        FROM pessoa_endereco
        WHERE pessoa_id = t.pessoa_id
          AND endereco_tipo = 'principal'
        ORDER BY atualizado_em DESC, criado_em DESC
        LIMIT 1
      ) pe ON TRUE
      LEFT JOIN tenant_configuracao_fiscal cfg
        ON cfg.tenant_id = t.tenant_id
      LEFT JOIN tenant_responsavel_tecnico rt
        ON rt.tenant_id = t.tenant_id
      LEFT JOIN tenant_certificado_a1 cert
        ON cert.tenant_id = t.tenant_id
      WHERE t.tenant_id = $1
      LIMIT 1
    `,
    [tenantId],
  );
  const row = result.rows[0] || null;
  if (!row) {
    return null;
  }

  const maxNfceConsumidaResult = await client.query(
    `
      SELECT COALESCE(MAX(nfce_numero), 0)::int AS max_numero
      FROM pdv.venda
      WHERE tenant_id = $1
        AND nfce_status IN ('autorizada', 'contingencia', 'cancelada')
        AND nfce_numero IS NOT NULL
    `,
    [tenantId],
  );

  const maxNfceConsumida = Number(maxNfceConsumidaResult.rows[0]?.max_numero || 0);
  if (maxNfceConsumida > 0) {
    await ConfiguracaoFiscalDAO.avancarProximoNumeroNfce(client, {
      tenantId,
      numeroAtual: maxNfceConsumida,
    });
  }

  const proximoNumeroNfce = Math.max(
    Number(row.proximo_numero_nfce ?? 1),
    maxNfceConsumida > 0 ? maxNfceConsumida + 1 : 1,
  );

  return {
    tenant_id: row.tenant_id,
    tenant_nome: row.tenant_nome,
    tenant_slug: row.tenant_slug,
    tenant_documento: row.tenant_documento,
    tenant_inscricao_estadual: row.emitente_inscricao_estadual || "",
    tenant_inscricao_municipal: row.emitente_inscricao_municipal || "",
    tenant_endereco: buildTenantAddress({
      logradouro: row.emitente_logradouro,
      numero: row.emitente_numero,
      complemento: row.emitente_complemento,
      bairro: row.emitente_bairro,
      cidade: row.emitente_cidade,
      uf: row.emitente_uf,
      cep: row.emitente_cep,
    }),
    tenant_ativo: parseBooleanFlag(row.tenant_ativo, true),
    tenant_usa_pdv: parseBooleanFlag(row.tenant_usa_pdv, false),
    tenant_acesso_bloqueado: parseBooleanFlag(row.tenant_acesso_bloqueado, false),
    tenant_bloqueio_motivo: row.tenant_bloqueio_motivo || null,
    emitente: {
      nome_razao: row.emitente_nome_razao || row.tenant_nome || "",
      nome_fantasia: row.emitente_nome_fantasia || row.tenant_nome || "",
      cpf_cnpj: row.emitente_cpf_cnpj || "",
      inscricao_estadual: row.emitente_inscricao_estadual || "",
      inscricao_municipal: row.emitente_inscricao_municipal || "",
      email: row.emitente_email || "",
      telefone: row.emitente_telefone || "",
      cep: row.emitente_cep || "",
      logradouro: row.emitente_logradouro || "",
      numero: row.emitente_numero || "",
      complemento: row.emitente_complemento || "",
      bairro: row.emitente_bairro || "",
      cidade: row.emitente_cidade || "",
      uf: row.emitente_uf || "",
      codigo_ibge: row.emitente_codigo_ibge || "",
      pais: row.emitente_pais || "Brasil",
    },
    fiscal_nfce: {
      ambiente_nfe: row.ambiente_nfe || "2",
      ambiente_nfce: row.ambiente_nfce || "2",
      crt: row.crt || "3",
      cnae: row.cnae || "",
      natureza_operacao_padrao: row.natureza_operacao_padrao || "Venda de mercadoria",
      nfce_habilitada: parseBooleanFlag(row.nfce_habilitada, false),
      serie_nfce_padrao: Number(row.serie_nfce_padrao ?? 1),
      proximo_numero_nfce: proximoNumeroNfce,
      nfce_id_token_csc: row.nfce_id_token_csc || "",
      nfce_csc: row.nfce_csc_criptografado
        ? decryptSecret(row.nfce_csc_criptografado)
        : "",
      nfce_ind_pres_padrao: row.nfce_ind_pres_padrao || "1",
    },
    responsavel_tecnico: {
      cnpj: row.responsavel_tecnico_cnpj || "",
      nome: row.responsavel_tecnico_nome || "",
      contato: row.responsavel_tecnico_contato || "",
      email: row.responsavel_tecnico_email || "",
      telefone: row.responsavel_tecnico_telefone || "",
    },
    certificado: row.conteudo_pfx && row.senha_criptografada
      ? {
          nome_arquivo: row.certificado_nome_arquivo || `certificado-${row.tenant_id}.pfx`,
          conteudo_base64: Buffer.from(row.conteudo_pfx).toString("base64"),
          senha: decryptSecret(row.senha_criptografada),
        }
      : null,
  };
}

router.post("/desktop/sync/setup-login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const senha = String(req.body?.senha || "");

    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: "E-mail e senha são obrigatórios.",
      });
    }

    const usuario = await loginDAO.buscarUsuarioPorEmail(pool, email);
    if (!usuario || !usuario.usuario_ativo || !verifyPassword(senha, usuario.usuario_senha)) {
      return res.status(401).json({
        success: false,
        message: "E-mail ou senha incorretos.",
      });
    }

    let tenants = [];
    if (usuario.usuario_master) {
      const { rows } = await pool.query(
        `
          SELECT
            tenant_id,
            tenant_nome,
            tenant_slug,
            tenant_documento,
            tenant_ativo,
            COALESCE(tenant_usa_pdv, FALSE) AS tenant_usa_pdv,
            COALESCE(tenant_acesso_bloqueado, FALSE) AS tenant_acesso_bloqueado,
            tenant_bloqueio_motivo,
            'master' AS perfil
          FROM tenant
          WHERE tenant_ativo = TRUE
            AND COALESCE(tenant_acesso_bloqueado, FALSE) = FALSE
          ORDER BY tenant_nome
        `,
      );
      tenants = rows;
    } else {
      tenants = await loginDAO.listarTenantsDoUsuario(pool, usuario.usuario_id);
      tenants = tenants.filter(
        (tenant) => tenant.tenant_ativo && !tenant.tenant_acesso_bloqueado,
      );
    }

    tenants = await enrichTenantsWithCompanyData(pool, tenants);

    return res.json({
      success: true,
      data: {
        user: buildPublicSetupUser(usuario),
        tenants: tenants.map(buildTenantPayload),
      },
    });
  } catch (error) {
    console.error("[desktop-sync] Falha no login de setup:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível validar o acesso para setup.",
    });
  }
});

router.get("/desktop/sync/tenant-config", async (req, res) => {
  try {
    const tenantId = Number(req.query.tenant_id);
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      return res.status(400).json({
        success: false,
        message: "tenant_id obrigatório.",
      });
    }

    const tenantAtivo = await DesktopSyncDAO.validarTenantAtivo(pool, tenantId);
    if (!tenantAtivo) {
      return res.status(403).json({
        success: false,
        message: "Filial inativa, bloqueada, sem integração PDV ou não encontrada.",
      });
    }

    const tenant = await getTenantWithCompanyData(pool, tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Filial não encontrada.",
      });
    }

    return res.json({
      success: true,
      data: buildTenantConfigPayload(tenant),
    });
  } catch (error) {
    console.error("[desktop-sync] Falha ao consultar dados da filial:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível consultar os dados da filial.",
    });
  }
});

router.get("/desktop/sync/produtos", async (req, res) => {
  try {
    const tenantId = Number(req.query.tenant_id);
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      return res.status(400).json({
        success: false,
        message: "tenant_id obrigatório.",
      });
    }

    const tenantAtivo = await DesktopSyncDAO.validarTenantAtivo(pool, tenantId);
    if (!tenantAtivo) {
      return res.status(403).json({
        success: false,
        message: "Filial inativa, bloqueada ou não encontrada.",
      });
    }

    const data = await DesktopSyncDAO.listarProdutos(pool, {
      tenantId,
      since: req.query.since || null,
      limit: Number(req.query.limit || 1000),
    });

    return res.json({
      success: true,
      data,
      count: data.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[desktop-sync] Falha ao sincronizar produtos:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível sincronizar produtos.",
    });
  }
});

router.get("/desktop/sync/usuarios", async (req, res) => {
  try {
    const tenantId = Number(req.query.tenant_id);
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      return res.status(400).json({
        success: false,
        message: "tenant_id obrigatório.",
      });
    }

    const tenantAtivo = await DesktopSyncDAO.validarTenantAtivo(pool, tenantId);
    if (!tenantAtivo) {
      return res.status(403).json({
        success: false,
        message: "Filial inativa, bloqueada ou não encontrada.",
      });
    }

    const data = await DesktopSyncDAO.listarUsuariosPdv(pool, { tenantId });

    return res.json({
      success: true,
      data,
      count: data.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[desktop-sync] Falha ao sincronizar usuários PDV:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível sincronizar usuários do PDV.",
    });
  }
});

router.get("/desktop/sync/financeiro/support-data", async (req, res) => {
  let client;
  let released = false;

  const resetAndRelease = async () => {
    if (!client || released) return;
    released = true;
    try {
      await client.query("RESET app.tenant_id");
    } catch (releaseError) {
      console.error("[desktop-sync] Falha ao limpar contexto do tenant:", releaseError.message);
    } finally {
      client.release();
    }
  };

  try {
    const tenantId = Number(req.query.tenant_id);
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      return res.status(400).json({
        success: false,
        message: "tenant_id obrigatório.",
      });
    }

    const tenantAtivo = await DesktopSyncDAO.validarTenantAtivo(pool, tenantId);
    if (!tenantAtivo) {
      return res.status(403).json({
        success: false,
        message: "Filial inativa, bloqueada ou não encontrada.",
      });
    }

    client = await pool.connect();
    await client.query("SELECT set_config('app.tenant_id', $1, false)", [String(tenantId)]);

    const data = await FinanceiroDAO.obterSupportData(client, {
      tipo: String(req.query.tipo || "receber"),
      syncOnly: true,
    });

    return res.json({
      success: true,
      data,
      count: {
        formasPagamento: Array.isArray(data?.formasPagamento) ? data.formasPagamento.length : 0,
        condicoesPagamento: Array.isArray(data?.condicoesPagamento)
          ? data.condicoesPagamento.length
          : 0,
      },
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[desktop-sync] Falha ao sincronizar apoio financeiro:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Não foi possível sincronizar as formas de pagamento.",
    });
  } finally {
    await resetAndRelease();
  }
});

router.post("/desktop/sync/usuarios/:usuarioId/senha", async (req, res) => {
  try {
    const tenantId = Number(req.body?.tenant_id);
    const usuarioId = Number(req.params.usuarioId);
    const senha = String(req.body?.senha || "").trim();

    if (!Number.isInteger(tenantId) || tenantId <= 0 || !Number.isInteger(usuarioId) || usuarioId <= 0) {
      return res.status(400).json({
        success: false,
        message: "tenant_id e usuário são obrigatórios.",
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        success: false,
        message: "A nova senha precisa ter pelo menos 6 caracteres.",
      });
    }

    const tenantAtivo = await DesktopSyncDAO.validarTenantAtivo(pool, tenantId);
    if (!tenantAtivo) {
      return res.status(403).json({
        success: false,
        message: "Filial inativa, bloqueada ou não encontrada.",
      });
    }

    const usuario = await DesktopSyncDAO.atualizarSenhaUsuarioPdv(pool, {
      tenantId,
      usuarioId,
      senhaHash: hashPassword(senha),
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Operador não encontrado para esta filial.",
      });
    }

    return res.json({
      success: true,
      data: {
        ...usuario,
        ativo: parseBooleanFlag(usuario.ativo, true),
        primeiro_acesso: parseBooleanFlag(usuario.primeiro_acesso, false),
      },
    });
  } catch (error) {
    console.error("[desktop-sync] Falha ao atualizar senha do operador:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível atualizar a senha do operador.",
    });
  }
});

export default router;
