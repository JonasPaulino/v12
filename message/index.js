import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env.js";
import internalRoutes from "./routes/internalRoutes.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.get("/healthz", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "v12-message",
  });
});

app.use("/internal", internalRoutes);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Rota não encontrada.",
  });
});

app.listen(env.port, () => {
  console.log(`[message] Servidor de mensagens rodando na porta ${env.port}`);
  console.log(`[message] Evolution API base: ${env.evolutionApiBaseUrl}`);
});
