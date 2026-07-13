import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "../config/conexao.js";
import getCookieOptions from "../config/cookieOptions.js";
import loginDAO from "../model/loginDAO.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import verificarToken from "../middleware/authMiddleware.js";

const router = express.Router();
const authDebugEnabled = process.env.AUTH_DEBUG === "true";

const authDebugLog = (event, payload = null) => {
  if (!authDebugEnabled) return;

  if (payload !== null) {
    console.log(`[auth:debug] ${event}`, payload);
    return;
  }

  console.log(`[auth:debug] ${event}`);
};

const buildPublicUser = (usuario) => ({
  usuario_id: usuario.usuario_id,
  usuario_nome: usuario.usuario_nome,
  usuario_email: usuario.usuario_email,
  usuario_username: usuario.usuario_username,
  usuario_primeiro_login: !!usuario.usuario_primeiro_login,
  usuario_master: !!usuario.usuario_master,
});

const buildTenantPayload = (tenant) => ({
  tenant_id: tenant.tenant_id,
  tenant_nome: tenant.tenant_nome,
  tenant_slug: tenant.tenant_slug,
  tenant_documento: tenant.tenant_documento,
  perfil: tenant.perfil,
  tenant_ativo: tenant.tenant_ativo ?? tenant.ativo ?? true,
  tenant_usa_pdv: !!tenant.tenant_usa_pdv,
  tenant_acesso_bloqueado: !!tenant.tenant_acesso_bloqueado,
  tenant_bloqueio_motivo: tenant.tenant_bloqueio_motivo || null,
});

router.post("/login", async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    const loginEmail = String(email || username || "").trim().toLowerCase();

    if (authDebugEnabled) {
      const { rows } = await pool.query(`
        SELECT
          current_database() AS current_database,
          current_user AS current_user,
          inet_server_addr()::text AS server_addr,
          inet_server_port() AS server_port
      `);

      authDebugLog("login:start", {
        email: loginEmail || null,
        passwordLength: password ? String(password).length : 0,
        dbHost: process.env.DB_HOST || null,
        dbPort: process.env.DB_PORT || null,
        dbName: process.env.DB_DATABASE || null,
        dbRuntime: rows[0] || null,
      });
    }

    if (!loginEmail || !password) {
      authDebugLog("login:denied", { reason: "missing-credentials" });
      return res.status(400).json({ error: "E-mail e senha não informados." });
    }

    const usuario = await loginDAO.buscarUsuarioPorEmail(pool, loginEmail);
    authDebugLog("login:user-loaded", {
      found: !!usuario,
      usuarioId: usuario?.usuario_id || null,
      usuarioUsername: usuario?.usuario_username || null,
      usuarioAtivo: usuario?.usuario_ativo ?? null,
      passwordInfo: usuario?.usuario_senha
        ? {
            validFormat: String(usuario.usuario_senha).includes(":"),
            saltLength: String(usuario.usuario_senha).split(":")[0]?.length || 0,
            hashLength: String(usuario.usuario_senha).split(":")[1]?.length || 0,
            preview: `${String(usuario.usuario_senha).slice(0, 12)}...`,
          }
        : null,
    });
    const passwordOk = !!usuario && verifyPassword(password, usuario.usuario_senha);
    authDebugLog("login:password-check", {
      foundUser: !!usuario,
      passwordOk,
    });

    if (!usuario || !passwordOk) {
      authDebugLog("login:denied", {
        reason: !usuario ? "user-not-found" : "password-mismatch",
      });
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    if (!usuario.usuario_ativo) {
      authDebugLog("login:denied", {
        reason: "inactive-user",
        usuarioId: usuario.usuario_id,
      });
      return res.status(403).json({ error: "Conta inativa." });
    }

    const tenants = await loginDAO.listarTenantsDoUsuario(pool, usuario.usuario_id);
    authDebugLog("login:tenants-loaded", {
      usuarioId: usuario.usuario_id,
      tenantCount: tenants.length,
      tenantIds: tenants.map((item) => item.tenant_id),
    });

    const isMaster = !!usuario.usuario_master;
    const erpTenantIds = isMaster
      ? null
      : new Set(await loginDAO.listarTenantIdsComPerfil(pool, usuario.usuario_id, "usuario"));
    const activeTenants = tenants.filter(
      (item) =>
        item.tenant_ativo &&
        (isMaster || !item.tenant_acesso_bloqueado) &&
        (isMaster || erpTenantIds.has(Number(item.tenant_id)))
    );
    const loginTenants = activeTenants;

    if (!loginTenants.length) {
      authDebugLog("login:denied", {
        reason: tenants.length ? "no-erp-profile" : "no-active-tenants",
        usuarioId: usuario.usuario_id,
      });
      return res.status(403).json({
        error: tenants.length
          ? "Seu usuário não tem acesso ao ERP web. Use o PDV ou solicite liberação ao administrador."
          : "Usuário sem filiais ativas disponíveis.",
      });
    }
    const activeTenant =
      loginTenants.find((item) => item.tenant_id === usuario.tenant_id_default) ||
      loginTenants[0];

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
    authDebugLog("login:success", {
      usuarioId: usuario.usuario_id,
      tenantId: Number(activeTenant.tenant_id),
    });

    return res.json({
      success: true,
      user: buildPublicUser(usuario),
      tenant: buildTenantPayload(activeTenant),
      tenants: activeTenants.map(buildTenantPayload),
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
    if (!usuario) {
      return res.json({ valid: false });
    }

    const tenants = await loginDAO.listarTenantsDoUsuario(pool, req.user.userId);
    const isMaster = !!usuario.usuario_master;
    const erpTenantIds = !isMaster
      ? new Set(await loginDAO.listarTenantIdsComPerfil(pool, usuario.usuario_id, "usuario"))
      : null;
    const activeTenants = tenants.filter(
      (item) =>
        item.tenant_ativo &&
        (isMaster || !item.tenant_acesso_bloqueado) &&
        (isMaster || erpTenantIds.has(Number(item.tenant_id)))
    );
    const tenant = tenants.find((item) => item.tenant_id === req.user.tenantId) || null;
    const tenantBlocked = !!tenant?.tenant_acesso_bloqueado;
    const missingErpProfile = !isMaster && !erpTenantIds?.has(Number(req.user.tenantId));
    const blockedInCurrentMode = tenantBlocked && !isMaster;

    if (!usuario || !tenant || !tenant.tenant_ativo || blockedInCurrentMode || missingErpProfile) {
      return res.json({ valid: false });
    }

    return res.json({
      valid: true,
      user: buildPublicUser(usuario),
      tenant: buildTenantPayload(tenant),
      tenants: activeTenants.map(buildTenantPayload),
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
        error: "Usuário não encontrado.",
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
