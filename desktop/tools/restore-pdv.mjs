import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

function resolveUserDataDir() {
  if (process.env.V12_PDV_USER_DATA) {
    return process.env.V12_PDV_USER_DATA;
  }

  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || os.homedir(), "V12 PDV");
  }

  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "V12 PDV");
  }

  return path.join(os.homedir(), ".config", "V12 PDV");
}

async function restorePointer(kind) {
  const baseDir = path.join(resolveUserDataDir(), "data", kind);
  const currentFile = path.join(baseDir, "current.json");
  const previousFile = path.join(baseDir, "previous.json");

  try {
    const previous = await fs.readFile(previousFile, "utf8");
    await fs.writeFile(currentFile, previous, "utf8");
    return true;
  } catch {
    return false;
  }
}

const restoredApp = await restorePointer("versions");
const restoredResources = await restorePointer("resources");

if (!restoredApp && !restoredResources) {
  console.log("Nenhuma versão anterior encontrada para restaurar.");
  process.exitCode = 1;
} else {
  console.log("Restauração concluída. Abra o V12 PDV novamente.");
}
