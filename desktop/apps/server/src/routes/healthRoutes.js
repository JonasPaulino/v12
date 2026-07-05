import { Router } from "express";
import { env } from "../config/env.js";
import { getTerminalConfig } from "../modules/configuracao/localConfigRepository.js";
import { consultarStatusFiscal } from "../services/acbrFiscalService.js";

const router = Router();

router.get("/healthz", async (_req, res) => {
  const fiscal = await consultarStatusFiscal();
  res.json({
    status: "ok",
    service: "v12-desktop-server",
    station: env.estacaoNome,
    config: getTerminalConfig(),
    fiscal,
  });
});

export default router;
