import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import corsOptions from "./config/corsOptions.js";
import verificarToken from "./middleware/authMiddleware.js";
import { withTenantContext } from "./middleware/withTenantContext.js";
import nfeReportRoutes from "./routes/nfeReportRoutes.js";

dotenv.config();

if (!process.env.CHAVE_TOKEN) {
  throw new Error("CHAVE_TOKEN não definida.");
}

const app = express();
const port = Number(process.env.PORT || 4400);

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.get("/healthz", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "v12-reports",
  });
});

const privateRouter = express.Router();
privateRouter.use(verificarToken);
privateRouter.use(withTenantContext);
privateRouter.use("/nfe", nfeReportRoutes);

app.use(privateRouter);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Rota não encontrada.",
  });
});

app.listen(port, () => {
  console.log(`[reports] Servidor de relatórios rodando na porta ${port}`);
});
