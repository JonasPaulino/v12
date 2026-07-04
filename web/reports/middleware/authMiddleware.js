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

const buscarUsuarioAtivo = async (usuarioId) => {
  const { rows } = await pool.query(
    `
      SELECT usuario_id
      FROM usuario
      WHERE usuario_id = $1
        AND usuario_ativo = TRUE
        AND usuario_excluido = FALSE
      LIMIT 1
    `,
    [usuarioId]
  );

  return rows[0] || null;
};

const buscarTenantAtivo = async (tenantId) => {
  const { rows } = await pool.query(
    `
      SELECT tenant_id
      FROM tenant
      WHERE tenant_id = $1
        AND tenant_ativo = TRUE
      LIMIT 1
    `,
    [tenantId]
  );

  return rows[0] || null;
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

    const activeUser = await buscarUsuarioAtivo(decoded.userId);
    if (!activeUser) {
      return res.status(403).json({ message: "Usuário inativo." });
    }

    const activeTenant = await buscarTenantAtivo(decoded.tenantId);
    if (!activeTenant) {
      return res.status(403).json({ message: "Filial inativa." });
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
