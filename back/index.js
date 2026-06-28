import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import corsOptions from "./config/corsOptions.js";
import verificarToken from "./middleware/authMiddleware.js";
import { withTenantContext } from "./middleware/withTenantContext.js";
import authRoutes from "./routes/authRoutes.js";
import tenantRoutes from "./routes/tenantRoutes.js";
import tenantSetupRoutes from "./routes/tenantSetupRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import produtoRoutes from "./routes/produtoRoutes.js";
import pessoaRoutes from "./routes/pessoaRoutes.js";
import vendaRoutes from "./routes/vendaRoutes.js";
import compraRoutes from "./routes/compraRoutes.js";
import estoqueRoutes from "./routes/estoqueRoutes.js";
import entradaMercadoriaRoutes from "./routes/entradaMercadoriaRoutes.js";
import financeiroRoutes from "./routes/financeiroRoutes.js";
import configuracaoFiscalRoutes from "./routes/configuracaoFiscalRoutes.js";
import regraFiscalRoutes from "./routes/regraFiscalRoutes.js";
import operacaoFiscalRoutes from "./routes/operacaoFiscalRoutes.js";
import paymentIntegrationRoutes from "./routes/paymentIntegrationRoutes.js";
import messageIntegrationRoutes from "./routes/messageIntegrationRoutes.js";
import tenantCertificateRoutes from "./routes/tenantCertificateRoutes.js";
import requireMaster from "./middleware/requireMaster.js";

dotenv.config();

if (!process.env.CHAVE_TOKEN) {
  throw new Error("CHAVE_TOKEN não definida.");
}

const app = express();
const port = Number(process.env.PORT || 4000);
const authDebugEnabled = process.env.AUTH_DEBUG === "true";

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
  },
});

app.use("/auth/login", loginLimiter);
app.use("/auth", authRoutes);
app.use("/tenant", verificarToken, tenantRoutes);
app.use("/tenant-setup", verificarToken, requireMaster, tenantSetupRoutes);
app.use("/tenant-certificate", verificarToken, requireMaster, tenantCertificateRoutes);
app.use("/integracoes/pagamentos", paymentIntegrationRoutes);

const privateRouter = express.Router();
privateRouter.use(verificarToken);
privateRouter.use(withTenantContext);
privateRouter.use("/dashboard", dashboardRoutes);
privateRouter.use("/usuario", usuarioRoutes);
privateRouter.use("/produto", produtoRoutes);
privateRouter.use("/pessoa", pessoaRoutes);
privateRouter.use("/venda", vendaRoutes);
privateRouter.use("/compra", compraRoutes);
privateRouter.use("/estoque", estoqueRoutes);
privateRouter.use("/entrada-mercadoria", entradaMercadoriaRoutes);
privateRouter.use("/financeiro", financeiroRoutes);
privateRouter.use("/configuracao-fiscal", configuracaoFiscalRoutes);
privateRouter.use("/regra-fiscal", regraFiscalRoutes);
privateRouter.use("/operacao-fiscal", operacaoFiscalRoutes);
privateRouter.use("/integracoes/mensagens", messageIntegrationRoutes);

app.use(privateRouter);

app.use((req, res) => {
  return res.status(404).json({ error: "Rota não encontrada." });
});

app.listen(port, () => {
  if (authDebugEnabled) {
    console.log("[auth:debug] runtime", {
      nodeEnv: process.env.NODE_ENV || null,
      dbHost: process.env.DB_HOST || null,
      dbPort: process.env.DB_PORT || null,
      dbDatabase: process.env.DB_DATABASE || null,
      cookieDomain: process.env.COOKIE_DOMAIN || null,
      cookieSecure: process.env.COOKIE_SECURE || null,
      corsOrigins: process.env.CORS_ORIGINS || null,
    });
  }
  console.log(`[api] Servidor v12 rodando na porta ${port}`);
});
