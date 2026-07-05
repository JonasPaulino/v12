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
  ativo: tenant.tenant_ativo ?? tenant.ativo ?? true,
  tenant_ativo: tenant.tenant_ativo ?? tenant.ativo ?? true,
  tenant_acesso_bloqueado: !!tenant.tenant_acesso_bloqueado,
  tenant_bloqueio_motivo: tenant.tenant_bloqueio_motivo || null,
});

const buildUserPayload = (usuario) => ({
  usuario_id: usuario.usuario_id,
  usuario_nome: usuario.usuario_nome,
  usuario_email: usuario.usuario_email,
  usuario_username: usuario.usuario_username,
  usuario_primeiro_login: !!usuario.usuario_primeiro_login,
  usuario_master: !!usuario.usuario_master,
});

router.get("/", async (req, res) => {
  try {
    const tenants = await loginDAO.listarTenantsDoUsuario(pool, req.user.userId);
    const isMaster = await loginDAO.usuarioEhMaster(pool, req.user.userId);
    const erpTenantIds = isMaster
      ? null
      : new Set(await loginDAO.listarTenantIdsComPerfil(pool, req.user.userId, "usuario"));
    const includeAll = req.query.include_all === "true" && isMaster;
    const visibleTenants = includeAll
      ? tenants
      : tenants.filter(
          (item) =>
            item.tenant_ativo &&
            (isMaster || !item.tenant_acesso_bloqueado) &&
            (isMaster || erpTenantIds.has(Number(item.tenant_id)))
        );

    return res.json({
      success: true,
      currentTenantId: req.user.tenantId,
      data: visibleTenants.map(buildTenantPayload),
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
      return res.status(400).json({ error: "Filial não informada." });
    }

    const hasAccess = await loginDAO.usuarioPossuiTenant(pool, req.user.userId, Number(tenantId));

    if (!hasAccess) {
      return res.status(403).json({ error: "Acesso a filial negado." });
    }

    const usuario = await loginDAO.buscarUsuarioPorId(pool, req.user.userId);
    if (!usuario) {
      return res.status(403).json({ error: "Usuário sem acesso ao ERP web." });
    }

    const tenants = await loginDAO.listarTenantsDoUsuario(pool, req.user.userId);
    const isMaster = !!usuario.usuario_master;
    const erpTenantIds = isMaster
      ? null
      : new Set(await loginDAO.listarTenantIdsComPerfil(pool, req.user.userId, "usuario"));
    const activeTenants = tenants.filter(
      (item) =>
        item.tenant_ativo &&
        (isMaster || !item.tenant_acesso_bloqueado) &&
        (isMaster || erpTenantIds.has(Number(item.tenant_id)))
    );
    const activeTenant = tenants.find((item) => item.tenant_id === Number(tenantId));

    if (!activeTenant || !activeTenant.tenant_ativo) {
      return res.status(403).json({ error: "Filial inativa." });
    }

    if (!isMaster && activeTenant.tenant_acesso_bloqueado) {
      return res.status(403).json({ error: "Acesso bloqueado para esta filial." });
    }

    if (!isMaster && !erpTenantIds.has(Number(tenantId))) {
      return res.status(403).json({
        error: "Seu usuário não tem acesso ao ERP web nesta filial.",
      });
    }

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
      tenants: activeTenants.map(buildTenantPayload),
    });
  } catch (error) {
    console.error("[tenant] Falha ao trocar filial:", error);
    return res.status(500).json({ error: "Erro ao trocar filial." });
  }
});

export default router;
