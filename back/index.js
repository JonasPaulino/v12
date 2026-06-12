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
import dashboardRoutes from "./routes/dashboardRoutes.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import produtoRoutes from "./routes/produtoRoutes.js";
import pessoaRoutes from "./routes/pessoaRoutes.js";
import vendaRoutes from "./routes/vendaRoutes.js";
import financeiroRoutes from "./routes/financeiroRoutes.js";

dotenv.config();

if (!process.env.CHAVE_TOKEN) {
  throw new Error("CHAVE_TOKEN nao definida.");
}

const app = express();
const port = Number(process.env.PORT || 4000);

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

const privateRouter = express.Router();
privateRouter.use(verificarToken);
privateRouter.use(withTenantContext);
privateRouter.use("/dashboard", dashboardRoutes);
privateRouter.use("/usuario", usuarioRoutes);
privateRouter.use("/produto", produtoRoutes);
privateRouter.use("/pessoa", pessoaRoutes);
privateRouter.use("/venda", vendaRoutes);
privateRouter.use("/financeiro", financeiroRoutes);

app.use(privateRouter);

app.use((req, res) => {
  return res.status(404).json({ error: "Rota nao encontrada." });
});

app.listen(port, () => {
  console.log(`[api] Servidor v12 rodando na porta ${port}`);
});
