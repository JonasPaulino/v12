import { Router } from "express";
import {
  cancelarPedidoLocal,
  criarPedidoLocal,
  getPedidoLocalDetalhe,
  listarPedidosLocais,
  marcarPedidoLocalImportado,
} from "../modules/pedidos/pedidoLocalRepository.js";

const router = Router();

router.get("/", (req, res, next) => {
  try {
    const data = listarPedidosLocais({
      status: req.query.status || "enviado",
      search: req.query.search || "",
      limit: Number(req.query.limit || 80),
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/", (req, res, next) => {
  try {
    const data = criarPedidoLocal(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/:pedidoId", (req, res, next) => {
  try {
    const data = getPedidoLocalDetalhe(req.params.pedidoId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/:pedidoId/importar", (req, res, next) => {
  try {
    const data = marcarPedidoLocalImportado(req.params.pedidoId, {
      vendaId: req.body?.venda_id,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/:pedidoId/cancelar", (req, res, next) => {
  try {
    const data = cancelarPedidoLocal(req.params.pedidoId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
