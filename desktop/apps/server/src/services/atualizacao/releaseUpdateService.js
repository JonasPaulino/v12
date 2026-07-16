import crypto from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { env } from "../../config/env.js";
import { assertTerminalConfigurado } from "../../modules/configuracao/localConfigRepository.js";
import {
  getLatestReleaseUpdate,
  getReleaseUpdateByReleaseId,
  markReleaseDownloaded,
  markReleaseError,
  markReleaseInstalled,
  upsertReleaseUpdate,
} from "../../modules/atualizacao/releaseRepository.js";

const getErpBaseUrl = () => {
  if (!env.erpApiUrl) {
    throw new Error("URL da retaguarda não configurada.");
  }

  return env.erpApiUrl.replace(/\/$/, "");
};

const assertSyncToken = () => {
  if (!env.erpSyncToken) {
    throw new Error("Token de sincronização não configurado.");
  }
};

const buildAuthHeaders = () => ({
  Authorization: `Bearer ${env.erpSyncToken}`,
});

const sha256File = async (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });

const sanitizeFileName = (value) =>
  String(value || "v12-pdv-release")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180);

export async function verificarAtualizacaoPdv() {
  assertSyncToken();
  const config = assertTerminalConfigurado();
  const params = new URLSearchParams({
    tenantId: String(config.tenant_erp_id),
    platform: env.pdvReleasePlatform,
    channel: env.pdvReleaseChannel,
    currentVersion: env.pdvVersion,
  });

  const response = await fetch(`${getErpBaseUrl()}/desktop/sync/releases/latest?${params}`, {
    headers: buildAuthHeaders(),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Não foi possível consultar atualização do PDV.");
  }

  const release = result.data?.release || null;
  if (release) {
    upsertReleaseUpdate(release, { status: "disponivel" });
  }

  return {
    versao_atual: env.pdvVersion,
    canal: env.pdvReleaseChannel,
    plataforma: env.pdvReleasePlatform,
    update_available: result.data?.update_available === true,
    release,
    latest: result.data?.latest || null,
    local: release ? getReleaseUpdateByReleaseId(release.release_id) : getLatestReleaseUpdate(),
  };
}

export async function baixarAtualizacaoPdv(releaseId) {
  assertSyncToken();
  assertTerminalConfigurado();
  const localRelease = getReleaseUpdateByReleaseId(releaseId);

  if (!localRelease) {
    throw new Error("Consulte atualizações antes de baixar o release.");
  }

  const release = localRelease.payload || {};
  const downloadUrl = release.download_url;

  if (!downloadUrl) {
    throw new Error("Release sem URL de download.");
  }

  await fs.mkdir(env.pdvReleaseDir, { recursive: true });
  const targetName = sanitizeFileName(release.arquivo_original || release.arquivo_nome);
  const targetPath = path.resolve(env.pdvReleaseDir, targetName);
  const url = downloadUrl.startsWith("http")
    ? downloadUrl
    : `${getErpBaseUrl()}${downloadUrl}`;

  const response = await fetch(url, {
    headers: buildAuthHeaders(),
  });

  if (!response.ok || !response.body) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.message || "Não foi possível baixar o release do PDV.");
  }

  await new Promise((resolve, reject) => {
    const writer = createWriteStream(targetPath);
    const reader = Readable.fromWeb(response.body);
    writer.on("error", reject);
    writer.on("finish", resolve);
    reader.on("error", reject);
    reader.pipe(writer);
  });

  const hash = await sha256File(targetPath);
  if (release.arquivo_sha256 && hash !== release.arquivo_sha256) {
    await fs.rm(targetPath, { force: true }).catch(() => {});
    throw new Error("Hash do release baixado não confere. Download descartado.");
  }

  return markReleaseDownloaded({
    releaseId,
    arquivoLocal: targetPath,
  });
}

export async function instalarAtualizacaoPdv(releaseId) {
  const release = getReleaseUpdateByReleaseId(releaseId);
  if (!release?.arquivo_local) {
    throw new Error("Baixe o release antes de instalar.");
  }

  await fs.access(release.arquivo_local);
  const extension = path.extname(release.arquivo_local).toLowerCase();

  try {
    if (extension === ".msi") {
      spawn("msiexec", ["/i", release.arquivo_local], {
        detached: true,
        stdio: "ignore",
      }).unref();
    } else if (extension === ".exe") {
      spawn(release.arquivo_local, [], {
        detached: true,
        stdio: "ignore",
        shell: false,
      }).unref();
    } else {
      throw new Error("Este tipo de release deve ser instalado manualmente.");
    }

    return markReleaseInstalled(releaseId);
  } catch (error) {
    markReleaseError({ releaseId, error: error?.message || error });
    throw error;
  }
}

export function getStatusAtualizacaoPdv() {
  return {
    versao_atual: env.pdvVersion,
    canal: env.pdvReleaseChannel,
    plataforma: env.pdvReleasePlatform,
    release_dir: env.pdvReleaseDir,
    latest_local: getLatestReleaseUpdate(),
  };
}
