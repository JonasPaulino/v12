import { spawn } from "node:child_process";
import { env } from "../../config/env.js";

export function createSevenZipArchive({ sourceDir, archivePath }) {
  return new Promise((resolve, reject) => {
    const child = spawn(env.backupSevenZipPath, ["a", "-t7z", "-mx=9", archivePath, "."], {
      cwd: sourceDir,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(
        new Error(
          `Não foi possível executar o 7z. Configure V12_BACKUP_7Z_PATH ou instale o 7-Zip. ${error.message}`,
        ),
      );
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`Falha ao compactar backup com 7z. Código ${code}. ${stderr || stdout}`));
    });
  });
}
