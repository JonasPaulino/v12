import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "../config/conexao.js";
import getCookieOptions from "../config/cookieOptions.js";
import loginDAO from "../model/loginDAO.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import verificarToken from "../middleware/authMiddleware.js";

const router = express.Router();

const buildPublicUser = (usuario) => ({
  usuario_id: usuario.usuario_id,
  usuario_nome: usuario.usuario_nome,
  usuario_email: usuario.usuario_email,
  usuario_username: usuario.usuario_username,
  usuario_primeiro_login: !!usuario.usuario_primeiro_login,
});

const buildTenantPayload = (tenant) => ({
  tenant_id: tenant.tenant_id,
  tenant_nome: tenant.tenant_nome,
  tenant_slug: tenant.tenant_slug,
  tenant_documento: tenant.tenant_documento,
  perfil: tenant.perfil,
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: "Credenciais nao informadas." });
    }

    const usuario = await loginDAO.buscarUsuarioPorLogin(pool, username);
    const passwordOk = !!usuario && verifyPassword(password, usuario.usuario_senha);

    if (!usuario || !passwordOk) {
      return res.status(401).json({ error: "Usuario ou senha incorretos." });
    }

    if (!usuario.usuario_ativo) {
      return res.status(403).json({ error: "Conta inativa." });
    }

    const tenants = await loginDAO.listarTenantsDoUsuario(pool, usuario.usuario_id);

    if (!tenants.length) {
      return res.status(403).json({ error: "Usuario sem filiais ativas vinculadas." });
    }
    const activeTenant =
      tenants.find((item) => item.tenant_id === usuario.tenant_id_default) || tenants[0];

    const token = jwt.sign(
      {
        userId: usuario.usuario_id,
        tenantId: Number(activeTenant.tenant_id),
        username: usuario.usuario_username,
      },
      process.env.CHAVE_TOKEN,
      { expiresIn: process.env.TOKEN_EXPIRES_IN || "8h" }
    );

    await loginDAO.atualizarUltimoAcessoTenant(
      pool,
      usuario.usuario_id,
      Number(activeTenant.tenant_id)
    );
    await loginDAO.salvarSessaoUsuario(
      pool,
      usuario.usuario_id,
      Number(activeTenant.tenant_id),
      token,
      req.headers["user-agent"] || null,
      req.ip || null
    );

    res.cookie("token", token, getCookieOptions());
    res.set("Cache-Control", "no-store");

    return res.json({
      success: true,
      user: buildPublicUser(usuario),
      tenant: buildTenantPayload(activeTenant),
      tenants: tenants.map(buildTenantPayload),
    });
  } catch (error) {
    console.error("[auth] Falha no login:", error);
    return res.status(500).json({ error: "Erro interno ao autenticar." });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const token = req.cookies?.token;

    if (token) {
      const decoded = jwt.decode(token);
      if (decoded?.userId && decoded?.tenantId) {
        await loginDAO.salvarSessaoUsuario(
          pool,
          decoded.userId,
          decoded.tenantId,
          `revogado-${Date.now()}`,
          req.headers["user-agent"] || null,
          req.ip || null
        );
      }
    }
  } catch (error) {
    console.error("[auth] Falha ao registrar logout:", error);
  }

  res.clearCookie("token", { ...getCookieOptions(), maxAge: 0 });
  return res.json({ ok: true });
});

router.get("/validar-token", verificarToken, async (req, res) => {
  try {
    const usuario = await loginDAO.buscarUsuarioPorId(pool, req.user.userId);
    const tenants = await loginDAO.listarTenantsDoUsuario(pool, req.user.userId);
    const tenant = tenants.find((item) => item.tenant_id === req.user.tenantId) || null;

    if (!usuario || !tenant) {
      return res.json({ valid: false });
    }

    return res.json({
      valid: true,
      user: buildPublicUser(usuario),
      tenant: buildTenantPayload(tenant),
      tenants: tenants.map(buildTenantPayload),
    });
  } catch (error) {
    console.error("[auth] Falha ao validar sessao:", error);
    return res.json({ valid: false });
  }
});

router.post("/change-password", verificarToken, async (req, res) => {
  try {
    const { password } = req.body || {};

    if (!password || String(password).trim().length < 6) {
      return res.status(400).json({
        success: false,
        error: "Informe uma nova senha com pelo menos 6 caracteres.",
      });
    }

    const senhaHash = hashPassword(String(password).trim());
    const usuario = await loginDAO.atualizarSenhaPrimeiroLogin(
      pool,
      req.user.userId,
      senhaHash
    );

    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: "Usuario nao encontrado.",
      });
    }

    return res.json({
      success: true,
      user: buildPublicUser(usuario),
    });
  } catch (error) {
    console.error("[auth] Falha ao atualizar senha inicial:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno ao atualizar a senha.",
    });
  }
});

export default router;
