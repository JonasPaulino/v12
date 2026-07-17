import { env } from "../../config/env.js";
import {
  baixarAtualizacaoPdv,
  verificarAtualizacaoPdv,
} from "./releaseUpdateService.js";

let schedulerStarted = false;
let running = false;

async function runReleaseCheck() {
  if (running) return;
  running = true;

  try {
    const status = await verificarAtualizacaoPdv();
    if (status.update_available && status.release?.release_id) {
      const downloaded = await baixarAtualizacaoPdv(status.release.release_id, {
        autoApply: false,
      });
      console.info("[desktop-release] Release baixado pelo agendador", {
        releaseId: downloaded?.release_id,
        versao: downloaded?.versao,
        status: downloaded?.status,
      });
    }
  } catch (error) {
    console.info("[desktop-release] Verificação automática não aplicada", {
      message: error?.message || String(error),
    });
  } finally {
    running = false;
  }
}

export function startReleaseUpdateScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  setTimeout(runReleaseCheck, 5000);

  const intervalMinutes = Number(env.pdvReleaseAutoCheckMinutes || 0);
  if (intervalMinutes > 0) {
    setInterval(runReleaseCheck, intervalMinutes * 60 * 1000);
  }
}
