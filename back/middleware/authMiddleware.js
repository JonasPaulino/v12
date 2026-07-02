import jwt from "jsonwebtoken";
import { pool } from "../config/conexao.js";
import loginDAO from "../model/loginDAO.js";
import tenantDAO from "../model/tenantDAO.js";

const isMasterAdministrativePath = (req) => {
  const path = String(req.originalUrl || req.url || "");

  return (
    path.includes("/auth/validar-token") ||
    path.includes("/tenant") ||
    path.includes("/tenant-setup") ||
    path.includes("/tenant-certificate") ||
    path.includes("/gestao")
  );
};

const verificarToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.CHAVE_TOKEN);
    const latestSession = await loginDAO.obterUltimaSessao(pool, decoded.userId);

    if (!latestSession || latestSession.token !== token) {
      return res.status(401).json({ message: "Sessão expirada ou inválida" });
    }

    const tenantAllowed = await loginDAO.usuarioPossuiTenant(
      pool,
      decoded.userId,
      decoded.tenantId
    );

    if (!tenantAllowed) {
      return res.status(401).json({ message: "Acesso à filial inválido" });
    }

    const currentTenant = await tenantDAO.getById(pool, decoded.tenantId);
    if (!currentTenant) {
      return res.status(403).json({ message: "Filial inativa." });
    }

    if (!currentTenant.tenant_ativo) {
      const isMaster = await loginDAO.usuarioEhMaster(pool, decoded.userId);

      if (!isMaster || !isMasterAdministrativePath(req)) {
        return res.status(403).json({ message: "Filial inativa." });
      }

      decoded.usuario_master = true;
    }

    req.user = decoded;
    res.set("Cache-Control", "no-store");
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expirado" });
    }

    return res.status(401).json({ message: "Token inválido" });
  }
};

export default verificarToken;
