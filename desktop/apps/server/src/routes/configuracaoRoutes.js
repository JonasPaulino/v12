import { Router } from "express";
import { getTerminalConfig } from "../modules/configuracao/localConfigRepository.js";
import { configurarTerminalPorTenant, loginErpWeb } from "../services/erpSetupService.js";
import { getPrinterConfig, savePrinterConfig } from "../services/printerConfigService.js";

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

router.get("/impressora", (_req, res) => {
  res.json({
    success: true,
    data: getPrinterConfig(),
  });
});

router.put("/impressora", (req, res, next) => {
  try {
    const data = savePrinterConfig(req.body || {});
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/login-web", async (req, res, next) => {
  try {
    const data = await loginErpWeb({
      email: req.body?.email,
      senha: req.body?.senha,
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/setup-web", async (req, res, next) => {
  try {
    const data = await configurarTerminalPorTenant({
      tenant: req.body?.tenant,
      terminal_codigo: req.body?.terminal_codigo,
      terminal_nome: req.body?.terminal_nome,
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
