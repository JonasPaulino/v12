import cors from "cors";
import express from "express";
import helmet from "helmet";
import routes from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  app.use("/api/local", routes);

  app.use((req, res) => {
    res.status(404).json({ success: false, message: "Rota local nao encontrada." });
  });

  app.use((error, req, res, _next) => {
    console.error("[desktop-server] Falha na requisicao", {
      method: req.method,
      path: req.originalUrl,
      message: error?.message,
      stack: error?.stack,
    });

    res.status(400).json({
      success: false,
      message: error.message || "Falha local.",
    });
  });

  return app;
}
