import { Router } from "express";
import { assertTerminalConfigurado } from "../modules/configuracao/localConfigRepository.js";
import {
  cancelarVenda,
  criarVenda,
  getVendaDetalhe,
  searchVendas,
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

export default router;
