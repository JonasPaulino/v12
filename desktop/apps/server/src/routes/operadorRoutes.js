import { Router } from "express";
import { autenticarOperador } from "../modules/operadores/operadorRepository.js";

const router = Router();

router.post("/login", (req, res, next) => {
  try {
    const operador = autenticarOperador({
      email: req.body?.email,
      senha: req.body?.senha,
    });

    res.json({ success: true, data: operador });
  } catch (error) {
    next(error);
  }
});

export default router;
