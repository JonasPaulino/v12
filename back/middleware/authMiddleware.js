import jwt from "jsonwebtoken";
import { pool } from "../config/conexao.js";
import loginDAO from "../model/loginDAO.js";

const verificarToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Token nao fornecido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.CHAVE_TOKEN);
    const latestSession = await loginDAO.obterUltimaSessao(pool, decoded.userId);

    if (!latestSession || latestSession.token !== token) {
      return res.status(401).json({ message: "Sessao expirada ou invalida" });
    }

    const tenantAllowed = await loginDAO.usuarioPossuiTenant(
      pool,
      decoded.userId,
      decoded.tenantId
    );

    if (!tenantAllowed) {
      return res.status(401).json({ message: "Acesso a filial invalido" });
    }

    req.user = decoded;
    res.set("Cache-Control", "no-store");
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expirado" });
    }

    return res.status(401).json({ message: "Token invalido" });
  }
};

export default verificarToken;
