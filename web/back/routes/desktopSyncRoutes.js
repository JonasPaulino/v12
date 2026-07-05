import express from "express";
import { pool } from "../config/conexao.js";
import desktopSyncAuth from "../middleware/desktopSyncAuth.js";
import DesktopSyncDAO from "../model/desktopSyncDAO.js";
import loginDAO from "../model/loginDAO.js";
import { verifyPassword } from "../utils/password.js";

const router = express.Router();

router.use("/desktop/sync", desktopSyncAuth);

const buildPublicSetupUser = (usuario) => ({
  usuario_id: usuario.usuario_id,
  usuario_nome: usuario.usuario_nome,
  usuario_email: usuario.usuario_email,
  usuario_master: !!usuario.usuario_master,
});

const buildTenantPayload = (tenant) => ({
  tenant_id: tenant.tenant_id,
  tenant_nome: tenant.tenant_nome,
  tenant_slug: tenant.tenant_slug,
  tenant_documento: tenant.tenant_documento,
  perfil: tenant.perfil || null,
  tenant_ativo: tenant.tenant_ativo ?? tenant.ativo ?? true,
  tenant_acesso_bloqueado: !!tenant.tenant_acesso_bloqueado,
  tenant_bloqueio_motivo: tenant.tenant_bloqueio_motivo || null,
});

router.post("/desktop/sync/setup-login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const senha = String(req.body?.senha || "");

    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: "E-mail e senha são obrigatórios.",
      });
    }

    const usuario = await loginDAO.buscarUsuarioPorEmail(pool, email);
    if (!usuario || !usuario.usuario_ativo || !verifyPassword(senha, usuario.usuario_senha)) {
      return res.status(401).json({
        success: false,
        message: "E-mail ou senha incorretos.",
      });
    }

    let tenants = [];
    if (usuario.usuario_master) {
      const { rows } = await pool.query(
        `
          SELECT
            tenant_id,
            tenant_nome,
            tenant_slug,
            tenant_documento,
            tenant_ativo,
            COALESCE(tenant_acesso_bloqueado, FALSE) AS tenant_acesso_bloqueado,
            tenant_bloqueio_motivo,
            'master' AS perfil
          FROM tenant
          WHERE tenant_ativo = TRUE
            AND COALESCE(tenant_acesso_bloqueado, FALSE) = FALSE
          ORDER BY tenant_nome
        `,
      );
      tenants = rows;
    } else {
      tenants = await loginDAO.listarTenantsDoUsuario(pool, usuario.usuario_id);
      tenants = tenants.filter(
        (tenant) => tenant.tenant_ativo && !tenant.tenant_acesso_bloqueado,
      );
    }

    return res.json({
      success: true,
      data: {
        user: buildPublicSetupUser(usuario),
        tenants: tenants.map(buildTenantPayload),
      },
    });
  } catch (error) {
    console.error("[desktop-sync] Falha no login de setup:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível validar o acesso para setup.",
    });
  }
});

router.get("/desktop/sync/produtos", async (req, res) => {
  try {
    const tenantId = Number(req.query.tenant_id);
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      return res.status(400).json({
        success: false,
        message: "tenant_id obrigatório.",
      });
    }

    const tenantAtivo = await DesktopSyncDAO.validarTenantAtivo(pool, tenantId);
    if (!tenantAtivo) {
      return res.status(403).json({
        success: false,
        message: "Filial inativa, bloqueada ou não encontrada.",
      });
    }

    const data = await DesktopSyncDAO.listarProdutos(pool, {
      tenantId,
      since: req.query.since || null,
      limit: Number(req.query.limit || 1000),
    });

    return res.json({
      success: true,
      data,
      count: data.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[desktop-sync] Falha ao sincronizar produtos:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível sincronizar produtos.",
    });
  }
});

router.get("/desktop/sync/usuarios", async (req, res) => {
  try {
    const tenantId = Number(req.query.tenant_id);
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      return res.status(400).json({
        success: false,
        message: "tenant_id obrigatório.",
      });
    }

    const tenantAtivo = await DesktopSyncDAO.validarTenantAtivo(pool, tenantId);
    if (!tenantAtivo) {
      return res.status(403).json({
        success: false,
        message: "Filial inativa, bloqueada ou não encontrada.",
      });
    }

    const data = await DesktopSyncDAO.listarUsuariosPdv(pool, { tenantId });

    return res.json({
      success: true,
      data,
      count: data.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[desktop-sync] Falha ao sincronizar usuários PDV:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível sincronizar usuários do PDV.",
    });
  }
});

export default router;
