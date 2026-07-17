import crypto from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
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
  markReleaseFileValidated,
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

async function fetchWithTimeout(url, options = {}, timeoutMs = env.pdvReleaseRequestTimeoutMs) {
  const controller = new AbortController();
  const timeoutValue = Number(timeoutMs || 0);
  const timeout =
    timeoutValue > 0 ? setTimeout(() => controller.abort(), timeoutValue) : null;

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Tempo limite ao comunicar com a retaguarda.");
    }

    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

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

const compareVersions = (left = "", right = "") => {
  const leftParts = String(left || "")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = String(right || "")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;

    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
};

const assertSemCaixaAberto = () => {
  const caixa = getCaixaAberto();
  if (caixa) {
    throw new Error("Atualização baixada. Ela será aplicada após o fechamento do caixa.");
  }
};

async function validateDownloadedReleaseFile(release) {
  const filePath = release?.arquivo_local;
  if (!filePath) {
    return {
      valid: false,
      message: "Release baixado sem caminho do arquivo local.",
    };
  }

  let stat = null;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return {
      valid: false,
      message: "Arquivo de atualização baixado não foi encontrado.",
    };
  }

  const expectedSize = Number(release.tamanho_bytes || 0);
  if (expectedSize > 0 && Number(stat.size || 0) !== expectedSize) {
    return {
      valid: false,
      message: `Tamanho do arquivo inválido. Esperado ${expectedSize} bytes, obtido ${stat.size} bytes.`,
    };
  }

  const expectedHash = String(release.arquivo_sha256 || "").trim().toLowerCase();
  const cachedHash = String(release.arquivo_validado_sha256 || "").trim().toLowerCase();
  const cachedSize = Number(release.arquivo_validado_tamanho || 0);
  const cachedIsValid =
    !!release.arquivo_validado_em &&
    cachedSize === Number(stat.size || 0) &&
    (!expectedHash || cachedHash === expectedHash);

  if (cachedIsValid) {
    return {
      valid: true,
      hash: cachedHash,
      size: Number(stat.size || 0),
      cached: true,
    };
  }

  const hash = await sha256File(filePath);
  if (expectedHash && hash.toLowerCase() !== expectedHash) {
    return {
      valid: false,
      message: "Hash do release baixado não confere.",
    };
  }

  markReleaseFileValidated({
    releaseId: release.release_id,
    arquivoSha256: hash,
    arquivoTamanho: Number(stat.size || 0),
  });

  return {
    valid: true,
    hash,
    size: Number(stat.size || 0),
  };
}

async function reconcileInstalledRelease(localRelease) {
  if (!localRelease?.release_id || localRelease.tipo_release !== "app") {
    return localRelease;
  }

  const status = String(localRelease.status || "");
  if (!["disponivel", "baixado", "staged", "instalando", "pendente_reinicio", "erro"].includes(status)) {
    return localRelease;
  }

  if (compareVersions(localRelease.versao, env.pdvVersion) > 0) {
    return localRelease;
  }

  const reconciled = markReleaseApplied({
    releaseId: localRelease.release_id,
    status: "aplicado",
  });

  console.info("[desktop-release] Release local reconciliado com a versão instalada", {
    releaseId: reconciled.release_id,
    versaoRelease: reconciled.versao,
    versaoAtual: env.pdvVersion,
    statusAnterior: localRelease.status,
    statusNovo: reconciled.status,
  });

  return reconciled;
}

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

    const response = await fetchWithTimeout(`${getErpBaseUrl()}/desktop/sync/releases/latest?${params}`, {
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
  const reconciledLatestLocal = await reconcileInstalledRelease(getLatestReleaseUpdate());
  const candidateAlreadyInstalled =
    candidate?.tipo_release === "app" && compareVersions(candidate.versao, env.pdvVersion) <= 0;
  const localCandidate = candidate
    ? await reconcileInstalledRelease(getReleaseUpdateByReleaseId(candidate.release_id))
    : null;
  const localPending =
    localCandidate &&
    ["baixado", "staged"].includes(String(localCandidate.status || ""));
  const localFailed = localCandidate && String(localCandidate.status || "") === "erro";
  const alreadyApplied =
    localCandidate &&
    ["aplicado", "recursos_aplicado", "pendente_reinicio"].includes(
      localCandidate.status,
    );
  const release =
    candidateAlreadyInstalled || alreadyApplied || localPending || localFailed ? null : candidate;

  let installedCandidateLocal = null;
  if (candidateAlreadyInstalled && candidate) {
    upsertReleaseUpdate(candidate, { status: "aplicado" });
    installedCandidateLocal = markReleaseApplied({
      releaseId: candidate.release_id,
      status: "aplicado",
    });
  } else if (release) {
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
      installedCandidateLocal ||
      (release
        ? await reconcileInstalledRelease(getReleaseUpdateByReleaseId(release.release_id))
        : reconciledLatestLocal),
  };
}

export async function baixarAtualizacaoPdv(releaseId, { autoApply = true } = {}) {
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

  const response = await fetchWithTimeout(
    url,
    {
      headers: buildAuthHeaders(),
    },
    env.pdvReleaseDownloadStartTimeoutMs,
  );

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

  const stat = await fs.stat(targetPath);
  const hash = await sha256File(targetPath);
  if (release.arquivo_sha256 && hash !== release.arquivo_sha256) {
    await fs.rm(targetPath, { force: true }).catch(() => {});
    throw new Error("Hash do release baixado não confere. Download descartado.");
  }

  const downloaded = markReleaseDownloaded({
    releaseId,
    arquivoLocal: targetPath,
    arquivoSha256: hash,
    arquivoTamanho: Number(stat.size || 0),
  });
  console.info("[desktop-release] Release baixado", {
    releaseId: downloaded.release_id,
    versao: downloaded.versao,
    arquivoLocal: downloaded.arquivo_local,
    tipoRelease: downloaded.tipo_release,
    modoAplicacao: downloaded.modo_aplicacao,
  });

  if (
    autoApply &&
    ["app", "recursos"].includes(downloaded.tipo_release) &&
    ["auto_inicio", "auto_fechamento"].includes(downloaded.modo_aplicacao)
  ) {
    try {
      if (isInstallerPackage(downloaded.arquivo_local)) {
        console.info("[desktop-release] Instalador baixado; aplicação delegada ao Electron", {
          releaseId: downloaded.release_id,
          versao: downloaded.versao,
          arquivoLocal: downloaded.arquivo_local,
        });
        return downloaded;
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

export async function prepararAtualizacaoPdv() {
  const release = await verificarAtualizacaoPdv();
  let releaseLocal = release.local || null;
  let action = "none";
  const localPendingStatus = String(releaseLocal?.status || "");

  if (["baixado", "staged"].includes(localPendingStatus) && releaseLocal?.release_id) {
    const arquivoLocal = String(releaseLocal?.arquivo_local || "").toLowerCase();
    const isInstaller = arquivoLocal.endsWith(".exe") || arquivoLocal.endsWith(".msi");
    action = isInstaller ? "waiting_next_startup" : "apply";
    try {
      releaseLocal = isInstaller ? releaseLocal : await aplicarAtualizacaoPdv(releaseLocal.release_id);
    } catch (error) {
      if (!/fechamento do caixa/i.test(error?.message || "")) {
        throw error;
      }

      action = "deferred";
    }
  } else if (release.update_available && release.release?.release_id) {
    const remoteFileName = String(
      release.release.arquivo_original || release.release.arquivo_nome || "",
    ).toLowerCase();
    const remoteIsInstaller =
      release.release.tipo_release === "app" &&
      (remoteFileName.endsWith(".exe") || remoteFileName.endsWith(".msi"));

    if (remoteIsInstaller) {
      action = "download_installer";
      releaseLocal = await baixarAtualizacaoPdv(release.release.release_id, { autoApply: false });
    } else {
      action = "download";
      releaseLocal = await baixarAtualizacaoPdv(release.release.release_id);
    }
  }

  return {
    ...release,
    local: releaseLocal,
    action,
    statusLocal: releaseLocal?.status || null,
  };
}

export async function verificarInstaladorProntoPdv() {
  let remoteStatus = null;
  try {
    remoteStatus = await verificarAtualizacaoPdv();
  } catch (error) {
    return {
      ready: false,
      versao_atual: env.pdvVersion,
      message:
        "Não foi possível confirmar atualização na retaguarda. O PDV seguirá sem aplicar atualização.",
      error: error?.message || String(error),
    };
  }

  const latestLocal = await reconcileInstalledRelease(getLatestReleaseUpdate());
  const pendingRelease = getPendingApplicableRelease();

  if (!pendingRelease?.release_id) {
    return {
      ready: false,
      versao_atual: env.pdvVersion,
      latest_local: latestLocal,
      message: "Nenhum instalador de atualização baixado.",
    };
  }

  const remoteLocalReleaseId = remoteStatus?.local?.release_id;
  if (String(remoteLocalReleaseId || "") !== String(pendingRelease.release_id)) {
    return {
      ready: false,
      versao_atual: env.pdvVersion,
      latest_local: latestLocal,
      message: "Instalador baixado não corresponde à release atualmente publicada.",
    };
  }

  const extension = path.extname(String(pendingRelease.arquivo_local || "")).toLowerCase();
  const isInstaller =
    pendingRelease.tipo_release === "app" && (extension === ".exe" || extension === ".msi");

  if (!isInstaller) {
    return {
      ready: false,
      versao_atual: env.pdvVersion,
      latest_local: latestLocal,
      message: "Atualização local não é um instalador do aplicativo.",
    };
  }

  if (compareVersions(pendingRelease.versao, env.pdvVersion) <= 0) {
    const applied = markReleaseApplied({
      releaseId: pendingRelease.release_id,
      status: "aplicado",
    });
    return {
      ready: false,
      versao_atual: env.pdvVersion,
      latest_local: applied,
      message: "Instalador já corresponde à versão instalada.",
    };
  }

  const validation = await validateDownloadedReleaseFile(pendingRelease);
  if (!validation.valid) {
    const erro = markReleaseError({
      releaseId: pendingRelease.release_id,
      error: validation.message,
    });
    return {
      ready: false,
      versao_atual: env.pdvVersion,
      latest_local: erro,
      message: validation.message,
    };
  }

  return {
    ready: true,
    versao_atual: env.pdvVersion,
    release_id: pendingRelease.release_id,
    versao: pendingRelease.versao,
    arquivo_local: pendingRelease.arquivo_local,
    arquivo_original: pendingRelease.arquivo_original,
    arquivo_sha256: pendingRelease.arquivo_sha256,
    tamanho_bytes: pendingRelease.tamanho_bytes,
    validacao: validation,
    message: `Atualização ${pendingRelease.versao} pronta para instalação.`,
  };
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
  const latestLocal = getLatestReleaseUpdate();
  const reconciledLatestLocal =
    latestLocal?.tipo_release === "app" &&
    compareVersions(latestLocal.versao, env.pdvVersion) <= 0
      ? markReleaseApplied({
          releaseId: latestLocal.release_id,
          status: "aplicado",
        })
      : latestLocal;
  const pendingRelease = getPendingApplicableRelease();
  const reconciledPendingRelease =
    pendingRelease?.release_id &&
    reconciledLatestLocal?.release_id === pendingRelease.release_id &&
    reconciledLatestLocal?.status === "aplicado"
      ? null
      : pendingRelease;

  return {
    versao_atual: env.pdvVersion,
    canal: env.pdvReleaseChannel,
    plataforma: env.pdvReleasePlatform,
    release_dir: env.pdvReleaseDir,
    version_dir: env.pdvVersionDir,
    resource_dir: env.pdvResourceDir,
    latest_local: reconciledLatestLocal,
    pendente_aplicacao: reconciledPendingRelease,
  };
}
