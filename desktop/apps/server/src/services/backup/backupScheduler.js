import { env } from "../../config/env.js";
import { executarBackupFiscal } from "./backupService.js";

let running = false;
let timer = null;

async function runScheduledBackup() {
  if (running) return;
  running = true;

  try {
    const result = await executarBackupFiscal({ motivo: "automatico" });
    console.info("[desktop-backup] Backup fiscal concluído", {
      status: result.status,
      backupId: result.backupId,
      itens: result.manifest?.totais?.itens || 0,
    });
  } catch (error) {
    console.error("[desktop-backup] Falha no backup fiscal automático", {
      message: error?.message,
      stack: error?.stack,
    });
  } finally {
    running = false;
  }
}

export function startBackupScheduler() {
  const intervalMinutes = Number(env.backupAutoIntervalMinutes || 0);
  if (!env.backupEnabled || intervalMinutes <= 0 || timer) {
    return;
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  timer = setInterval(runScheduledBackup, intervalMs);
  timer.unref?.();

  console.info("[desktop-backup] Agendador iniciado", {
    intervalMinutes,
    backupDir: env.backupDir,
  });
}
