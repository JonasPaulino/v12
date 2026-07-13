import { Router } from "express";
import { assertTerminalConfigurado } from "../modules/configuracao/localConfigRepository.js";
import { autenticarOperador } from "../modules/operadores/operadorRepository.js";
import { trocarSenhaPrimeiroAcesso } from "../services/operadorSenhaService.js";

const router = Router();

router.use((_req, _res, next) => {
  try {
    assertTerminalConfigurado();
    next();
  } catch (error) {
    next(error);
  }
});

router.post("/login", (req, res, next) => {
  try {
    const operador = autenticarOperador({
      email: req.body?.email,
      senha: req.body?.senha,
    });

    if (Number(operador.primeiro_acesso)) {
      return res.json({
        success: true,
        data: {
          primeiro_acesso_pendente: true,
          operador,
        },
      });
    }

    res.json({ success: true, data: operador });
  } catch (error) {
    next(error);
  }
});

router.post("/primeiro-acesso", async (req, res, next) => {
  try {
    const operador = autenticarOperador({
      email: req.body?.email,
      senha: req.body?.senha_atual,
    });

    await trocarSenhaPrimeiroAcesso({
      operador,
      novaSenha: req.body?.nova_senha,
    });

    res.json({
      success: true,
      data: {
        senha_atualizada: true,
        primeiro_acesso: false,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
