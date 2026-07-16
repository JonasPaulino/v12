import crypto from "node:crypto";
import { createReadStream, openAsBlob } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";
import { getDb } from "../../db/connection.js";
import { getTerminalConfig, getTerminalTenantErpId } from "../../modules/configuracao/localConfigRepository.js";
import {
  createBackupExecution,
  getLastBackupExecutions,
  hasBackupItemHash,
  insertBackupItems,
  updateBackupExecution,
} from "../../modules/backup/backupRepository.js";
import { createSevenZipArchive } from "./sevenZipService.js";

const BACKUP_UPLOAD_TIMEOUT_MS = 120000;
const BACKUP_MIME_7Z = "application/x-7z-compressed";

function pad(value) {
  return String(value).padStart(2, "0");
}

function timestampForFile(date = new Date()) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function safeName(value) {
  return String(value || "pdv")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .toLowerCase();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function copyFileToStage({ sourcePath, targetPath }) {
  await ensureDir(path.dirname(targetPath));
  await fs.copyFile(sourcePath, targetPath);
}

async function listXmlFiles(rootDir) {
  if (!(await pathExists(rootDir))) return [];

  const output = [];
  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith(".xml")) {
        output.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return output;
}

async function createDatabaseSnapshot(stagingDir) {
  const dbSnapshotPath = path.join(stagingDir, "database", "v12-pdv.sqlite");
  await ensureDir(path.dirname(dbSnapshotPath));

  const db = getDb();
  if (typeof db.backup === "function") {
    await db.backup(dbSnapshotPath);
    return dbSnapshotPath;
  }

  await fs.copyFile(env.dbPath, dbSnapshotPath);
  return dbSnapshotPath;
}

async function collectDatabaseItem({ tenantErpId, stagingDir }) {
  const snapshotPath = await createDatabaseSnapshot(stagingDir);
  const stat = await fs.stat(snapshotPath);
  const sha256 = await hashFile(snapshotPath);
  const origemChave = "sqlite:v12-pdv";

  if (
    hasBackupItemHash({
      tenantErpId,
      origemTipo: "database",
      origemChave,
      sha256,
    })
  ) {
    await fs.rm(path.dirname(snapshotPath), { recursive: true, force: true });
    return null;
  }

  return {
    origemTipo: "database",
    origemChave,
    sourcePath: env.dbPath,
    sourceMtimeMs: stat.mtimeMs,
    sourceSize: stat.size,
    sha256,
    stagedPath: snapshotPath,
    relativePath: "database/v12-pdv.sqlite",
  };
}

async function collectXmlItems({ tenantErpId, stagingDir }) {
  const xmlFiles = await listXmlFiles(env.acbrLibTempDir);
  const items = [];

  for (const sourcePath of xmlFiles) {
    const stat = await fs.stat(sourcePath);
    const sha256 = await hashFile(sourcePath);
    const relativeSource = path.relative(env.acbrLibTempDir, sourcePath).replaceAll("\\", "/");
    const origemChave = `acbr:${relativeSource}`;

    if (
      hasBackupItemHash({
        tenantErpId,
        origemTipo: "xml",
        origemChave,
        sha256,
      })
    ) {
      continue;
    }

    const relativePath = path.posix.join("xml", relativeSource);
    const stagedPath = path.join(stagingDir, ...relativePath.split("/"));
    await copyFileToStage({ sourcePath, targetPath: stagedPath });

    items.push({
      origemTipo: "xml",
      origemChave,
      sourcePath,
      sourceMtimeMs: stat.mtimeMs,
      sourceSize: stat.size,
      sha256,
      stagedPath,
      relativePath,
    });
  }

  return items;
}

async function writeManifest({ stagingDir, manifest }) {
  const manifestPath = path.join(stagingDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

async function cleanupOldLocalBackups() {
  const days = Number(env.backupLocalRetentionDays || 0);
  if (days <= 0 || !(await pathExists(env.backupDir))) return;

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const entries = await fs.readdir(env.backupDir, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".7z"))
      .map(async (entry) => {
        const filePath = path.join(env.backupDir, entry.name);
        const stat = await fs.stat(filePath);
        if (stat.mtimeMs < cutoff) {
          await fs.rm(filePath, { force: true });
        }
      }),
  );
}

async function uploadBackupToRetaguarda({ filePath, archiveName, archiveSha256, archiveSize, manifest }) {
  if (!env.erpApiUrl || !env.erpSyncToken) {
    throw new Error("Sincronização com a retaguarda não configurada para envio do backup.");
  }

  const terminal = getTerminalConfig();
  const form = new FormData();
  const blob = await openAsBlob(filePath, { type: BACKUP_MIME_7Z });
  form.append("arquivo", blob, archiveName);
  form.append("tenantId", String(manifest.tenant_erp_id));
  form.append("terminalCodigo", terminal?.terminal_codigo || "");
  form.append("terminalNome", terminal?.terminal_nome || "");
  form.append("arquivoSha256", archiveSha256);
  form.append("tamanhoBytes", String(archiveSize));
  form.append("manifest", JSON.stringify(manifest));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BACKUP_UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.erpApiUrl.replace(/\/$/, "")}/desktop/sync/backups`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.erpSyncToken}`,
      },
      body: form,
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(result.message || `Retaguarda respondeu ${response.status} ao receber backup.`);
    }

    return result.data || result;
  } finally {
    clearTimeout(timer);
  }
}

export function dispararBackupFiscalAssincrono({ motivo = "evento_fiscal" } = {}) {
  if (!env.backupEnabled) return;

  queueMicrotask(() => {
    executarBackupFiscal({ motivo }).catch((error) => {
      console.error("[desktop-backup] Falha ao executar backup fiscal assíncrono", {
        motivo,
        message: error?.message,
        stack: error?.stack,
      });
    });
  });
}

export function getBackupStatus() {
  return {
    enabled: env.backupEnabled,
    provider: "retaguarda",
    backupDir: env.backupDir,
    sevenZipPath: env.backupSevenZipPath,
    localRetentionDays: env.backupLocalRetentionDays,
    autoIntervalMinutes: env.backupAutoIntervalMinutes,
    destino: "retaguarda",
    erpConfigured: Boolean(env.erpApiUrl && env.erpSyncToken),
    last: getLastBackupExecutions(10),
  };
}

export async function executarBackupFiscal({ motivo = "manual" } = {}) {
  const tenantErpId = getTerminalTenantErpId();
  if (!tenantErpId) {
    throw new Error("PDV local ainda não pareado com uma filial do ERP.");
  }

  await ensureDir(env.backupDir);

  const terminal = getTerminalConfig();
  const startedAt = new Date();
  const stamp = timestampForFile(startedAt);
  const terminalName = safeName(terminal?.terminal_codigo || env.estacaoNome || "pdv");
  const archiveName = `v12-backup-tenant-${tenantErpId}-${terminalName}-${stamp}.7z`;
  const archivePath = path.join(env.backupDir, archiveName);
  const stagingDir = path.join(env.backupDir, `.stage-${process.pid}-${Date.now()}`);
  const backupId = createBackupExecution({ tenantErpId, tipo: "fiscal_pdv" });

  try {
    await ensureDir(stagingDir);

    const databaseItem = await collectDatabaseItem({ tenantErpId, stagingDir });
    const xmlItems = await collectXmlItems({ tenantErpId, stagingDir });
    const items = [databaseItem, ...xmlItems].filter(Boolean);

    const manifest = {
      version: 1,
      sistema: "v12-pdv",
      tipo: "fiscal_pdv",
      motivo,
      tenant_erp_id: tenantErpId,
      terminal_codigo: terminal?.terminal_codigo || null,
      criado_em: startedAt.toISOString(),
      origem: {
        db_path: env.dbPath,
        xml_root: env.acbrLibTempDir,
      },
      totais: {
        itens: items.length,
        xmls: xmlItems.length,
        banco: databaseItem ? 1 : 0,
      },
      itens: items.map((item) => ({
        tipo: item.origemTipo,
        origem_chave: item.origemChave,
        caminho_relativo: item.relativePath,
        tamanho_bytes: item.sourceSize,
        sha256: item.sha256,
      })),
    };

    if (!items.length) {
      updateBackupExecution(backupId, {
        status: "sem_alteracao",
        manifest_json: manifest,
        concluido_em: new Date().toISOString(),
      });
      await fs.rm(stagingDir, { recursive: true, force: true });
      return {
        success: true,
        status: "sem_alteracao",
        message: "Nenhum XML ou banco novo para backup.",
        backupId,
        manifest,
      };
    }

    await writeManifest({ stagingDir, manifest });
    await createSevenZipArchive({ sourceDir: stagingDir, archivePath });

    const archiveStat = await fs.stat(archivePath);
    const archiveSha256 = await hashFile(archivePath);
    const remoteBackup = await uploadBackupToRetaguarda({
      filePath: archivePath,
      archiveName,
      archiveSha256,
      archiveSize: archiveStat.size,
      manifest,
    });
    const enviadoEm = new Date().toISOString();

    insertBackupItems({
      tenantErpId,
      backupId,
      items,
      enviadoEm,
    });
    updateBackupExecution(backupId, {
      status: "concluido",
      arquivo_nome: archiveName,
      arquivo_local: archivePath,
      arquivo_sha256: archiveSha256,
      tamanho_bytes: archiveStat.size,
      retaguarda_backup_id: remoteBackup.backup_id || remoteBackup.backupId || null,
      retaguarda_status: remoteBackup.status || "recebido",
      retaguarda_link: remoteBackup.drive_web_view_link || remoteBackup.webViewLink || null,
      manifest_json: manifest,
      concluido_em: enviadoEm,
    });

    await fs.rm(stagingDir, { recursive: true, force: true });
    await cleanupOldLocalBackups();

    return {
      success: true,
      status: "concluido",
      backupId,
      arquivo: {
        nome: archiveName,
        local: archivePath,
        sha256: archiveSha256,
        tamanhoBytes: archiveStat.size,
      },
      retaguarda: {
        backupId: remoteBackup.backup_id || remoteBackup.backupId || null,
        status: remoteBackup.status || null,
        link: remoteBackup.drive_web_view_link || remoteBackup.webViewLink || null,
      },
      manifest,
    };
  } catch (error) {
    updateBackupExecution(backupId, {
      status: "erro",
      erro: String(error?.message || error),
      concluido_em: new Date().toISOString(),
    });
    await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}
