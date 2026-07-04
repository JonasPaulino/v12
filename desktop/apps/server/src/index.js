import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { runMigrations } from "./db/migrate.js";

runMigrations();

const app = createApp();

app.listen(env.port, () => {
  console.log(`[desktop-server] V12 local rodando na porta ${env.port}`);
});
