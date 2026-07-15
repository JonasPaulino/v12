import { Router } from "express";
import caixaRoutes from "./caixaRoutes.js";
import configuracaoRoutes from "./configuracaoRoutes.js";
import healthRoutes from "./healthRoutes.js";
import operadorRoutes from "./operadorRoutes.js";
import pedidoRoutes from "./pedidoRoutes.js";
import pessoaRoutes from "./pessoaRoutes.js";
import produtoRoutes from "./produtoRoutes.js";
import syncRoutes from "./syncRoutes.js";
import vendaRoutes from "./vendaRoutes.js";

const router = Router();

router.use(healthRoutes);
router.use("/caixa", caixaRoutes);
router.use("/configuracao", configuracaoRoutes);
router.use("/operadores", operadorRoutes);
router.use("/pedidos", pedidoRoutes);
router.use("/pessoas", pessoaRoutes);
router.use("/produtos", produtoRoutes);
router.use("/sync", syncRoutes);
router.use("/vendas", vendaRoutes);

export default router;
