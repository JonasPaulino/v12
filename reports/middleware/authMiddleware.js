import jwt from "jsonwebtoken";
import { pool } from "../config/conexao.js";

const obterUltimaSessao = async (usuarioId) => {
  const { rows } = await pool.query(
    `
      SELECT usuario_sessao_id, tenant_id, token, criado_em
      FROM usuario_sessao
      WHERE usuario_id = $1
      ORDER BY criado_em DESC, usuario_sessao_id DESC
      LIMIT 1
    `,
    [usuarioId]
  );

  return rows[0] || null;
};

const usuarioPossuiTenant = async (usuarioId, tenantId) => {
  const { rows } = await pool.query(
    `
      SELECT 1
      FROM usuario_tenant
      WHERE usuario_id = $1
        AND tenant_id = $2
        AND ativo = TRUE
      LIMIT 1
    `,
    [usuarioId, tenantId]
  );

  return !!rows[0];
};

const verificarToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.CHAVE_TOKEN);
    const latestSession = await obterUltimaSessao(decoded.userId);

    if (!latestSession || latestSession.token !== token) {
      return res.status(401).json({ message: "Sessão expirada ou inválida" });
    }

    const tenantAllowed = await usuarioPossuiTenant(decoded.userId, decoded.tenantId);

    if (!tenantAllowed) {
      return res.status(401).json({ message: "Acesso à filial inválido" });
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
