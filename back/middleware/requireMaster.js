import { pool } from "../config/conexao.js";
import loginDAO from "../model/loginDAO.js";

const requireMaster = async (req, res, next) => {
  try {
    const isMaster = await loginDAO.usuarioEhMaster(pool, req.user.userId);

    if (!isMaster) {
      return res.status(403).json({
        success: false,
        message: "Acesso restrito ao usuário master.",
      });
    }

    req.user.usuario_master = true;
    return next();
  } catch (error) {
    console.error("[auth] Falha ao validar permissão master:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível validar a permissão do usuário.",
    });
  }
};

export default requireMaster;
