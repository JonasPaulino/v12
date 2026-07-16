import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { runMigrations } from "./db/migrate.js";
import { startBackupScheduler } from "./services/backup/backupScheduler.js";
import { getAcbrLibDiagnostics } from "./services/acbrlib/runtime.js";

runMigrations();

const app = createApp();
const acbrDiagnostics = getAcbrLibDiagnostics();

console.log("[desktop-acbr] Diagnostico inicial", acbrDiagnostics);

app.listen(env.port, () => {
  console.log(`[desktop-server] V12 local rodando na porta ${env.port}`);
  startBackupScheduler();
});
