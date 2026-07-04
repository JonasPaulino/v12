import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import internalRoutes from "./routes/internalRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";

dotenv.config();

if (!process.env.CHAVE_TOKEN) {
  throw new Error("CHAVE_TOKEN não definida.");
}

const app = express();
const port = Number(process.env.PORT || 4200);

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
    service: "v12-payments",
  });
});

app.use("/internal", internalRoutes);
app.use("/webhooks", webhookRoutes);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Rota não encontrada.",
  });
});

app.listen(port, () => {
  console.log(`[payments] Servidor de pagamentos rodando na porta ${port}`);
});
