import cors from "cors";
import express from "express";
import helmet from "helmet";
import routes from "./routes/index.js";
import path from "node:path";
import { resolveStationDistDir } from "./services/stationStaticService.js";

const localCorsOptions = {
  origin: true,
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 86400,
};

export function createApp() {
  const app = express();
  const stationDistDir = resolveStationDistDir();

  app.use(cors(localCorsOptions));
  app.options(/.*/, cors(localCorsOptions));
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      originAgentCluster: false,
    }),
  );
  app.use(express.json({ limit: "2mb" }));

  app.use("/api/local", routes);

  if (stationDistDir) {
    console.info("[desktop-server] Front da estacao publicado", { stationDistDir });

    const assetsDir = path.join(stationDistDir, "assets");
    const stationIndex = path.join(stationDistDir, "index.html");
    const staticOptions = { index: false, fallthrough: true };

    app.use("/assets", express.static(assetsDir, staticOptions));
    app.use("/pedidos/assets", express.static(assetsDir, staticOptions));
    app.use(express.static(stationDistDir, staticOptions));

    app.get(/^\/pedidos(?:\/.*)?$/, (_req, res) => {
      res.sendFile(stationIndex);
    });

    app.get("/", (_req, res) => {
      res.sendFile(stationIndex);
    });
  } else {
    console.warn("[desktop-server] Front da estacao nao encontrado. Rota /pedidos indisponivel.");
  }

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
