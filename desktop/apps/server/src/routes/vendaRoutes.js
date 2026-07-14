import { Router } from "express";
import { assertTerminalConfigurado } from "../modules/configuracao/localConfigRepository.js";
import {
  cancelarVenda,
  criarVenda,
  descartarVendaRascunho,
  emitirVendaEmContingencia,
  getVendaDetalhe,
  reenviarContingenciasNfce,
  searchVendas,
  transmitirVendaContingencia,
} from "../modules/vendas/vendaRepository.js";

const router = Router();

router.use((_req, _res, next) => {
  try {
    assertTerminalConfigurado();
    next();
  } catch (error) {
    next(error);
  }
});

router.get("/", (req, res) => {
  res.json({
    success: true,
    data: searchVendas({
      search: req.query.search || "",
      status: req.query.status || "",
      limit: Number(req.query.limit || 50),
    }),
  });
});

router.post("/", async (req, res, next) => {
  try {
    const data = await criarVenda(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error?.code === "NFCE_CONTINGENCIA_DISPONIVEL") {
      return res.status(409).json({
        success: false,
        code: error.code,
        message: error.message,
        data: error.data,
      });
    }
    next(error);
  }
});

router.get("/:vendaId", (req, res, next) => {
  try {
    const data = getVendaDetalhe(req.params.vendaId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/:vendaId/cancelar", (req, res, next) => {
  try {
    const data = cancelarVenda(req.params.vendaId, {
      motivo: req.body?.motivo,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/:vendaId/descartar-rascunho", (req, res, next) => {
  try {
    const data = descartarVendaRascunho(req.params.vendaId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/:vendaId/nfce/emitir-contingencia", async (req, res, next) => {
  try {
    const data = await emitirVendaEmContingencia(req.params.vendaId, {
      contingenciaJustificativa: req.body?.contingenciaJustificativa,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/:vendaId/nfce/transmitir", async (req, res, next) => {
  try {
    const data = await transmitirVendaContingencia(req.params.vendaId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/nfce/contingencias/enviar", async (_req, res, next) => {
  try {
    const data = await reenviarContingenciasNfce();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
