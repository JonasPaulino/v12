import { Router } from "express";
import { getTerminalConfig, salvarTerminalConfig } from "../modules/configuracao/localConfigRepository.js";
import { OPERADOR_PERFIS, salvarOperadorLocal } from "../modules/operadores/operadorRepository.js";

const router = Router();

router.get("/status", (_req, res) => {
  const config = getTerminalConfig();
  res.json({
    success: true,
    data: {
      configurado: !!config,
      config,
    },
  });
});

router.post("/setup-local", (req, res, next) => {
  try {
    const config = salvarTerminalConfig(req.body?.filial || {});
    const operador = salvarOperadorLocal({
      ...(req.body?.operador || {}),
      perfis: [OPERADOR_PERFIS.PDV_OPERADOR, OPERADOR_PERFIS.PDV_SUPERVISOR, OPERADOR_PERFIS.ADMIN_LOCAL],
    });

    res.json({
      success: true,
      data: {
        config,
        operador,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
