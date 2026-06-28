import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import corsOptions from "./config/corsOptions.js";
import verificarToken from "./middleware/authMiddleware.js";
import { withTenantContext } from "./middleware/withTenantContext.js";
import nfeRoutes from "./routes/nfeRoutes.js";
import mdfeRoutes from "./routes/mdfeRoutes.js";
import setupRoutes from "./routes/setupRoutes.js";
import { getAcbrRuntimeDiagnostics } from "./providers/acbrlib/runtime.js";
import { getMdfeRuntimeDiagnostics } from "./providers/acbrlib/mdfeRuntime.js";

dotenv.config();

if (!process.env.CHAVE_TOKEN) {
  throw new Error("CHAVE_TOKEN não definida.");
}

const app = express();
const port = Number(process.env.PORT || 4100);

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors(corsOptions));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(cookieParser());

app.get("/healthz", (_req, res) => {
  let acbrlib = null;

  try {
    acbrlib = getAcbrRuntimeDiagnostics();
  } catch (error) {
    acbrlib = {
      error: String(error?.message || error),
    };
  }

  res.status(200).json({
    status: "ok",
    service: "v12-acbr",
    acbrlib,
    acbrlibMdfe: getMdfeRuntimeDiagnostics(),
  });
});

const privateRouter = express.Router();
privateRouter.use(verificarToken);
privateRouter.use(withTenantContext);
privateRouter.use("/setup", setupRoutes);
privateRouter.use("/nfe", nfeRoutes);
privateRouter.use("/mdfe", mdfeRoutes);

app.use(privateRouter);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Rota não encontrada.",
  });
});

app.listen(port, () => {
  console.log(`[acbr] Servidor fiscal rodando na porta ${port}`);
});
