import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "../config/conexao.js";
import getCookieOptions from "../config/cookieOptions.js";
import loginDAO from "../model/loginDAO.js";

const router = express.Router();

const buildTenantPayload = (tenant) => ({
  tenant_id: tenant.tenant_id,
  tenant_nome: tenant.tenant_nome,
  tenant_slug: tenant.tenant_slug,
  tenant_documento: tenant.tenant_documento,
  perfil: tenant.perfil,
});

const buildUserPayload = (usuario) => ({
  usuario_id: usuario.usuario_id,
  usuario_nome: usuario.usuario_nome,
  usuario_email: usuario.usuario_email,
  usuario_username: usuario.usuario_username,
  usuario_primeiro_login: !!usuario.usuario_primeiro_login,
});

router.get("/", async (req, res) => {
  try {
    const tenants = await loginDAO.listarTenantsDoUsuario(pool, req.user.userId);

    return res.json({
      success: true,
      currentTenantId: req.user.tenantId,
      data: tenants.map(buildTenantPayload),
    });
  } catch (error) {
    console.error("[tenant] Falha ao listar filiais:", error);
    return res.status(500).json({ error: "Erro ao listar filiais." });
  }
});

router.post("/switch", async (req, res) => {
  try {
    const { tenantId } = req.body || {};

    if (!tenantId) {
      return res.status(400).json({ error: "Filial nao informada." });
    }

    const hasAccess = await loginDAO.usuarioPossuiTenant(pool, req.user.userId, Number(tenantId));

    if (!hasAccess) {
      return res.status(403).json({ error: "Acesso a filial negado." });
    }

    const usuario = await loginDAO.buscarUsuarioPorId(pool, req.user.userId);
    const tenants = await loginDAO.listarTenantsDoUsuario(pool, req.user.userId);
    const activeTenant = tenants.find((item) => item.tenant_id === Number(tenantId));

    const token = jwt.sign(
      {
        userId: req.user.userId,
        tenantId: Number(tenantId),
        username: usuario.usuario_username,
      },
      process.env.CHAVE_TOKEN,
      { expiresIn: process.env.TOKEN_EXPIRES_IN || "8h" }
    );

    await loginDAO.atualizarUltimoAcessoTenant(pool, req.user.userId, Number(tenantId));
    await loginDAO.salvarSessaoUsuario(
      pool,
      req.user.userId,
      Number(tenantId),
      token,
      req.headers["user-agent"] || null,
      req.ip || null
    );

    res.cookie("token", token, getCookieOptions());
    res.set("Cache-Control", "no-store");

    return res.json({
      success: true,
      user: buildUserPayload(usuario),
      tenant: buildTenantPayload(activeTenant),
      tenants: tenants.map(buildTenantPayload),
    });
  } catch (error) {
    console.error("[tenant] Falha ao trocar filial:", error);
    return res.status(500).json({ error: "Erro ao trocar filial." });
  }
});

export default router;
