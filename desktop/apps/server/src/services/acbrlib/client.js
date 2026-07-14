import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";
import { buildNfceResponseMetadata } from "./parser.js";
import { getAcbrLibDiagnostics } from "./runtime.js";

const execFileAsync = promisify(execFile);

async function safeReadJsonFile(targetPath) {
  try {
    const raw = await fs.readFile(targetPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function runNfceEmissionWorker({
  tenantId,
  vendaId,
  context,
  certificadoBase64,
  certificadoSenha,
}) {
  const workerPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "nfceWorker.js");
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "v12-pdv-nfce-"));
  const inputPath = path.join(workDir, "input.json");
  const outputPath = path.join(workDir, "output.json");

  await fs.writeFile(
    inputPath,
    JSON.stringify({
      tenantId,
      vendaId,
      context,
      certificadoBase64,
      certificadoSenha,
    }),
    "utf8",
  );

  try {
    const { stderr } = await execFileAsync(
      process.execPath,
      [workerPath, inputPath, outputPath],
      {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 8,
        timeout: 180000,
      },
    );

    if (stderr) {
      console.error(stderr.trim());
    }

    const result = await safeReadJsonFile(outputPath);
    if (!result?.ok) {
      throw new Error(result?.lastReturn || result?.message || "Falha na emissão da NFC-e pela ACBrLib.");
    }

    return result;
  } catch (error) {
    const result = await safeReadJsonFile(outputPath);
    const stderr = String(error.stderr || "").trim();
    const message =
      result?.lastReturn ||
      result?.message ||
      stderr ||
      error.message ||
      "Falha na emissão da NFC-e pela ACBrLib.";

    const wrapped = new Error(message);
    wrapped.details = {
      workerResult: result,
      stderr,
      signal: error.signal || null,
    };
    throw wrapped;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

export function getAcbrLibReadiness() {
  const diagnostics = getAcbrLibDiagnostics();

  if (String(env.acbrMode || "").trim().toLowerCase() !== "lib") {
    return {
      ready: false,
      diagnostics,
      reason: "O PDV está configurado para outro adaptador fiscal. Defina V12_ACBR_MODE=lib.",
    };
  }

  if (!diagnostics.libExists) {
    return {
      ready: false,
      diagnostics,
      reason: `ACBrLibNFe não encontrada em ${diagnostics.libPath}.`,
    };
  }

  if (!diagnostics.schemaExists) {
    return {
      ready: false,
      diagnostics,
      reason: `Schemas da NFC-e não encontrados em ${diagnostics.schemaPath}.`,
    };
  }

  if (!diagnostics.iniServicosExists) {
    return {
      ready: false,
      diagnostics,
      reason: `Arquivo ACBrNFeServicos.ini não encontrado em ${diagnostics.iniServicosPath}.`,
    };
  }

  return {
    ready: true,
    diagnostics,
    reason: null,
  };
}

export function parseWorkerNfceResult(rawResponse, vendaId) {
  return buildNfceResponseMetadata(rawResponse, vendaId);
}
