import crypto from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { Readable } from "node:stream";
import { env } from "../../config/env.js";
import { getCaixaAberto } from "../../modules/caixa/caixaRepository.js";
import { assertTerminalConfigurado } from "../../modules/configuracao/localConfigRepository.js";
import {
  getLatestReleaseUpdate,
  getPendingApplicableRelease,
  getReleaseUpdateByReleaseId,
  markReleaseApplied,
  markReleaseDownloaded,
  markReleaseError,
  markReleaseInstalled,
  markReleaseStaged,
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

const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }

      resolve({ stdout, stderr });
    });
  });

const isInstallerPackage = (filePath = "") => {
  const extension = path.extname(String(filePath || "")).toLowerCase();
  return extension === ".exe" || extension === ".msi";
};

const assertSemCaixaAberto = () => {
  const caixa = getCaixaAberto();
  if (caixa) {
    throw new Error("Atualização baixada. Ela será aplicada após o fechamento do caixa.");
  }
};

async function extractArchive({ filePath, targetDir }) {
  await fs.rm(targetDir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(targetDir, { recursive: true });

  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".zip" && process.platform === "win32") {
    await runCommand("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Expand-Archive -LiteralPath ${JSON.stringify(filePath)} -DestinationPath ${JSON.stringify(
        targetDir,
      )} -Force`,
    ]);
    return;
  }

  if (extension === ".zip") {
    await runCommand("unzip", ["-o", filePath, "-d", targetDir]);
    return;
  }

  if (extension === ".7z") {
    await runCommand(env.backupSevenZipPath || "7z", ["x", "-y", `-o${targetDir}`, filePath]);
    return;
  }

  throw new Error("Este tipo de pacote não pode ser aplicado automaticamente.");
}

const writeJsonFile = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
};

const preservePreviousVersion = async (activeFile) => {
  const previousFile = path.join(path.dirname(activeFile), "previous.json");
  try {
    const current = await fs.readFile(activeFile, "utf8");
    await fs.writeFile(previousFile, current, "utf8");
    return previousFile;
  } catch {
    return null;
  }
};

async function stageRelease(release) {
  if (!release?.arquivo_local) {
    throw new Error("Baixe o release antes de aplicar.");
  }

  const baseDir =
    release.tipo_release === "recursos" ? env.pdvResourceDir : env.pdvVersionDir;
  const stagingDir = path.join(baseDir, `v${release.versao}`);
  await extractArchive({ filePath: release.arquivo_local, targetDir: stagingDir });

  return markReleaseStaged({
    releaseId: release.release_id,
    stagingDir,
    rollbackDir: null,
  });
}

async function applyStagedRelease(release) {
  assertSemCaixaAberto();

  const staged = release.staging_dir ? release : await stageRelease(release);
  const activeFile =
    staged.tipo_release === "recursos"
      ? path.join(env.pdvResourceDir, "current.json")
      : path.join(env.pdvVersionDir, "current.json");

  const payload = {
    release_id: staged.release_id,
    versao: staged.versao,
    tipo_release: staged.tipo_release,
    staging_dir: staged.staging_dir,
    manifest: staged.manifest || {},
    aplicado_em: new Date().toISOString(),
  };

  const rollbackFile = staged.rollback_habilitado ? await preservePreviousVersion(activeFile) : null;
  await writeJsonFile(activeFile, payload);
  return markReleaseApplied({
    releaseId: staged.release_id,
    status: staged.tipo_release === "recursos" ? "recursos_aplicado" : "pendente_reinicio",
    rollbackDir: rollbackFile,
  });
}

export async function verificarAtualizacaoPdv() {
  assertSyncToken();
  const config = assertTerminalConfigurado();

  const consultar = async ({ tipoRelease, currentVersion = "" }) => {
    const params = new URLSearchParams({
      tenantId: String(config.tenant_erp_id),
      platform: env.pdvReleasePlatform,
      channel: env.pdvReleaseChannel,
      type: tipoRelease,
      currentVersion,
    });

    const response = await fetch(`${getErpBaseUrl()}/desktop/sync/releases/latest?${params}`, {
      headers: buildAuthHeaders(),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(result.message || "Não foi possível consultar atualização do PDV.");
    }

    return result.data || {};
  };

  const appResult = await consultar({ tipoRelease: "app", currentVersion: env.pdvVersion });
  const recursoResult = await consultar({ tipoRelease: "recursos" });
  const candidate = appResult.release || recursoResult.release || null;
  const localCandidate = candidate ? getReleaseUpdateByReleaseId(candidate.release_id) : null;
  const localPending =
    localCandidate && ["baixado", "staged"].includes(String(localCandidate.status || ""));
  const alreadyApplied =
    localCandidate &&
    ["aplicado", "recursos_aplicado", "pendente_reinicio", "instalando"].includes(
      localCandidate.status,
    );
  const release = alreadyApplied || localPending ? null : candidate;

  if (release) {
    upsertReleaseUpdate(release, { status: "disponivel" });
  }

  return {
    versao_atual: env.pdvVersion,
    canal: env.pdvReleaseChannel,
    plataforma: env.pdvReleasePlatform,
    update_available: !!release,
    release,
    latest: appResult.latest || recursoResult.latest || null,
    local:
      localCandidate ||
      (release ? getReleaseUpdateByReleaseId(release.release_id) : getLatestReleaseUpdate()),
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

  const downloaded = markReleaseDownloaded({
    releaseId,
    arquivoLocal: targetPath,
  });
  console.info("[desktop-release] Release baixado", {
    releaseId: downloaded.release_id,
    versao: downloaded.versao,
    arquivoLocal: downloaded.arquivo_local,
    tipoRelease: downloaded.tipo_release,
    modoAplicacao: downloaded.modo_aplicacao,
  });

  if (
    ["app", "recursos"].includes(downloaded.tipo_release) &&
    ["auto_inicio", "auto_fechamento"].includes(downloaded.modo_aplicacao)
  ) {
    try {
      if (isInstallerPackage(downloaded.arquivo_local)) {
        assertSemCaixaAberto();
        console.info("[desktop-release] Iniciando instalador automático", {
          releaseId: downloaded.release_id,
          versao: downloaded.versao,
          arquivoLocal: downloaded.arquivo_local,
        });
        return await instalarAtualizacaoPdv(downloaded.release_id);
      }

      console.info("[desktop-release] Aplicando pacote local automaticamente", {
        releaseId: downloaded.release_id,
        versao: downloaded.versao,
        arquivoLocal: downloaded.arquivo_local,
      });
      return await aplicarAtualizacaoPdv(downloaded.release_id);
    } catch (error) {
      if (/fechamento do caixa/i.test(error?.message || "")) {
        return downloaded;
      }
      throw error;
    }
  }

  return downloaded;
}

export async function instalarAtualizacaoPdv(releaseId) {
  const release = getReleaseUpdateByReleaseId(releaseId);
  if (!release?.arquivo_local) {
    throw new Error("Baixe o release antes de instalar.");
  }

  assertSemCaixaAberto();
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

    console.info("[desktop-release] Instalador disparado", {
      releaseId: release.release_id,
      versao: release.versao,
      arquivoLocal: release.arquivo_local,
    });
    return markReleaseInstalled(releaseId);
  } catch (error) {
    markReleaseError({ releaseId, error: error?.message || error });
    throw error;
  }
}

export async function aplicarAtualizacaoPdv(releaseId = null) {
  const release = releaseId
    ? getReleaseUpdateByReleaseId(releaseId)
    : getPendingApplicableRelease();

  if (!release) {
    return {
      applied: false,
      message: "Não existe atualização baixada para aplicar.",
    };
  }

  if (release.tipo_release === "instalador") {
    throw new Error("Instalador inicial não é aplicado automaticamente pelo PDV.");
  }

  try {
    return await applyStagedRelease(release);
  } catch (error) {
    if (!/fechamento do caixa/i.test(error?.message || "")) {
      markReleaseError({ releaseId: release.release_id, error: error?.message || error });
    }
    throw error;
  }
}

export function getStatusAtualizacaoPdv() {
  return {
    versao_atual: env.pdvVersion,
    canal: env.pdvReleaseChannel,
    plataforma: env.pdvReleasePlatform,
    release_dir: env.pdvReleaseDir,
    version_dir: env.pdvVersionDir,
    resource_dir: env.pdvResourceDir,
    latest_local: getLatestReleaseUpdate(),
    pendente_aplicacao: getPendingApplicableRelease(),
  };
}
