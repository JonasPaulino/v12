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

function sanitizeAcbrWorkerMessage(message = "", diagnostics = null) {
  const raw = String(message || "").trim();

  if (/depend[êe]ncia node da acbrlibnfe n[aã]o est[aá] instalada no desktop/i.test(raw)) {
    return "A integração fiscal local não está completa. Instale as dependências do desktop antes de emitir NFC-e.";
  }

  if (/Pacote @projetoacbr\/acbrlib-nfe-node/i.test(raw) || /Cannot find module '@projetoacbr\/acbrlib-nfe-node'/i.test(raw)) {
    return "A integração fiscal local não está completa. O componente fiscal não foi encontrado no terminal.";
  }

  if (/ACBrLibNFe n[aã]o encontrada em/i.test(raw) && diagnostics?.libPath) {
    return `A biblioteca fiscal da NFC-e não foi encontrada no terminal. Verifique o arquivo em ${diagnostics.libPath}.`;
  }

  return raw.replace(/ACBrLibNFe|ACBrLib|ACBr/gi, "integração fiscal");
}

export async function runNfceEmissionWorker({
  tenantId,
  vendaId,
  context,
  certificadoBase64,
  certificadoSenha,
  operation = "emitir_normal",
  formaEmissao = "0",
  xmlContent = null,
  cancelamento = null,
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
        operation,
        formaEmissao,
        xmlContent,
        cancelamento,
      }),
    "utf8",
  );

  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [workerPath, inputPath, outputPath],
      {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 8,
        timeout: 180000,
      },
    );

    if (stdout) {
      console.log(stdout.trim());
    }

    if (stderr) {
      console.error(stderr.trim());
    }

    const result = await safeReadJsonFile(outputPath);
    if (!result?.ok) {
      throw new Error(result?.lastReturn || result?.message || "Falha na emissão da NFC-e pela integração fiscal.");
    }

    return result;
  } catch (error) {
    const result = await safeReadJsonFile(outputPath);
    const stdout = String(error.stdout || "").trim();
    const stderr = String(error.stderr || "").trim();
    const diagnostics = getAcbrLibDiagnostics();

    if (stdout) {
      console.log(stdout);
    }

    if (stderr) {
      console.error(stderr);
    }

    const message =
      sanitizeAcbrWorkerMessage(
        result?.lastReturn ||
          result?.message ||
          stderr ||
          error.message ||
          "Falha na emissão da NFC-e pela integração fiscal.",
        diagnostics,
      ) || "Falha na emissão da NFC-e pela integração fiscal.";

    const wrapped = new Error(message);
    wrapped.details = {
      workerResult: result,
      stdout,
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
      reason: "O PDV está configurado para um emissor fiscal incompatível. Verifique a configuração da integração fiscal.",
    };
  }

  if (!diagnostics.packageAvailable) {
    console.error("[desktop-acbr] Pacote Node da ACBrLib indisponivel", diagnostics);
    return {
      ready: false,
      diagnostics,
      reason: sanitizeAcbrWorkerMessage(diagnostics.packageMessage, diagnostics),
    };
  }

  if (!diagnostics.libExists) {
    console.error("[desktop-acbr] Biblioteca nativa da ACBrLib nao encontrada", diagnostics);
    return {
      ready: false,
      diagnostics,
      reason: "Componente fiscal da NFC-e não encontrado no terminal. Verifique a instalação do PDV.",
    };
  }

  if (!diagnostics.schemaExists) {
    console.error("[desktop-acbr] Schemas da ACBrLib nao encontrados", diagnostics);
    return {
      ready: false,
      diagnostics,
      reason: `Schemas da NFC-e não encontrados em ${diagnostics.schemaPath}.`,
    };
  }

  if (!diagnostics.iniServicosExists) {
    console.error("[desktop-acbr] INI de servicos da ACBrLib nao encontrado", diagnostics);
    return {
      ready: false,
      diagnostics,
      reason: "O arquivo de serviços da SEFAZ não foi encontrado no terminal. Verifique a instalação do PDV.",
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
