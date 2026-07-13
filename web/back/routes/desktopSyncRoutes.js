import express from "express";
import { pool } from "../config/conexao.js";
import desktopSyncAuth from "../middleware/desktopSyncAuth.js";
import DesktopSyncDAO from "../model/desktopSyncDAO.js";
import FinanceiroDAO from "../model/financeiroDAO.js";
import loginDAO from "../model/loginDAO.js";
import { processarEventoDesktopSync } from "../services/pdvSyncProcessor.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const router = express.Router();

router.use("/desktop/sync", desktopSyncAuth);

router.post("/desktop/sync", async (req, res) => {
  try {
    const tenantId = Number(req.body?.tenantId);
    const localSyncId = Number(req.body?.localSyncId);
    const eventType = String(req.body?.eventType || "").trim().toUpperCase();
    const terminalCodigo = String(req.body?.terminalCodigo || "").trim() || null;
    const terminalNome = String(req.body?.terminalNome || "").trim() || null;
    const payload = req.body?.payload && typeof req.body.payload === "object" ? req.body.payload : {};

    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      return res.status(400).json({
        success: false,
        message: "tenantId obrigatorio.",
      });
    }

    if (!Number.isInteger(localSyncId) || localSyncId <= 0) {
      return res.status(400).json({
        success: false,
        message: "localSyncId obrigatorio.",
      });
    }

    if (!eventType) {
      return res.status(400).json({
        success: false,
        message: "eventType obrigatorio.",
      });
    }

    const tenantAtivo = await DesktopSyncDAO.validarTenantAtivo(pool, tenantId);
    if (!tenantAtivo) {
      return res.status(403).json({
        success: false,
        message: "Filial inativa, bloqueada, sem integração PDV ou não encontrada.",
      });
    }

    const evento = await DesktopSyncDAO.registrarEventoPdv(pool, {
      tenantId,
      terminalCodigo,
      terminalNome,
      localSyncId,
      eventType,
      payload,
    });

    await processarEventoDesktopSync({
      desktopSyncEventoId: evento.desktop_sync_evento_id,
      tenantId,
      terminalCodigo,
      terminalNome,
      eventType,
      payload,
    });

    return res.json({
      success: true,
      data: evento,
    });
  } catch (error) {
    console.error("[desktop-sync] Falha ao registrar evento do PDV:", {
      tenantId: req.body?.tenantId,
      localSyncId: req.body?.localSyncId,
      eventType: req.body?.eventType,
      terminalCodigo: req.body?.terminalCodigo,
      message: error?.message,
      stack: error?.stack,
    });
    return res.status(500).json({
      success: false,
      message: error?.message || "Nao foi possivel registrar o evento do PDV.",
    });
  }
});

const buildPublicSetupUser = (usuario) => ({
  usuario_id: usuario.usuario_id,
  usuario_nome: usuario.usuario_nome,
  usuario_email: usuario.usuario_email,
  usuario_master: !!usuario.usuario_master,
});

const buildTenantAddress = (tenant) => {
  const street = [tenant.logradouro, tenant.numero, tenant.complemento]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
  const district = String(tenant.bairro || "").trim();
  const cityState = [tenant.cidade, tenant.uf]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("/");
  const zipCode = String(tenant.cep || "").trim();

  return [street, district, cityState, zipCode].filter(Boolean).join(" - ");
};

const buildTenantPayload = (tenant) => ({
  tenant_id: tenant.tenant_id,
  tenant_nome: tenant.tenant_nome,
  tenant_slug: tenant.tenant_slug,
  tenant_documento: tenant.tenant_documento,
  tenant_inscricao_estadual: tenant.tenant_inscricao_estadual || "",
  tenant_inscricao_municipal: tenant.tenant_inscricao_municipal || "",
  tenant_endereco: tenant.tenant_endereco || buildTenantAddress(tenant),
  perfil: tenant.perfil || null,
  tenant_ativo: tenant.tenant_ativo ?? tenant.ativo ?? true,
  tenant_usa_pdv: !!tenant.tenant_usa_pdv,
  tenant_acesso_bloqueado: !!tenant.tenant_acesso_bloqueado,
  tenant_bloqueio_motivo: tenant.tenant_bloqueio_motivo || null,
});

async function enrichTenantsWithCompanyData(client, tenants = []) {
  const tenantIds = [...new Set(tenants.map((tenant) => Number(tenant.tenant_id)).filter(Boolean))];
  if (!tenantIds.length) {
    return tenants;
  }

  const { rows } = await client.query(
    `
      SELECT
        t.tenant_id,
        p.pessoa_inscricao_estadual,
        p.pessoa_inscricao_municipal,
        pe.cep,
        pe.logradouro,
        pe.numero,
        pe.complemento,
        pe.bairro,
        pe.cidade,
        pe.uf
      FROM tenant t
      LEFT JOIN pessoa p ON p.pessoa_id = t.pessoa_id
      LEFT JOIN LATERAL (
        SELECT
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf
        FROM pessoa_endereco
        WHERE pessoa_id = t.pessoa_id
          AND endereco_tipo = 'principal'
        ORDER BY atualizado_em DESC, criado_em DESC
        LIMIT 1
      ) pe ON TRUE
      WHERE t.tenant_id = ANY($1::int[])
    `,
    [tenantIds],
  );

  const detailsByTenantId = new Map(
    rows.map((row) => [
      Number(row.tenant_id),
      {
        tenant_inscricao_estadual: row.pessoa_inscricao_estadual || "",
        tenant_inscricao_municipal: row.pessoa_inscricao_municipal || "",
        tenant_endereco: buildTenantAddress(row),
      },
    ]),
  );

  return tenants.map((tenant) => ({
    ...tenant,
    ...(detailsByTenantId.get(Number(tenant.tenant_id)) || {}),
  }));
}

async function getTenantWithCompanyData(client, tenantId) {
  const result = await client.query(
    `
      SELECT
        tenant_id,
        tenant_nome,
        tenant_slug,
        tenant_documento,
        tenant_ativo,
        COALESCE(tenant_usa_pdv, FALSE) AS tenant_usa_pdv,
        COALESCE(tenant_acesso_bloqueado, FALSE) AS tenant_acesso_bloqueado,
        tenant_bloqueio_motivo
      FROM tenant
      WHERE tenant_id = $1
      LIMIT 1
    `,
    [tenantId],
  );
  const tenantBase = result.rows[0] || null;
  if (!tenantBase) {
    return null;
  }

  const tenants = await enrichTenantsWithCompanyData(client, [tenantBase]);

  return tenants[0] || null;
}

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
            COALESCE(tenant_usa_pdv, FALSE) AS tenant_usa_pdv,
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

    tenants = await enrichTenantsWithCompanyData(pool, tenants);

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

router.get("/desktop/sync/tenant-config", async (req, res) => {
  try {
    const tenantId = Number(req.query.tenant_id);
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      return res.status(400).json({
        success: false,
        message: "tenant_id obrigatório.",
      });
    }

    const tenant = await getTenantWithCompanyData(pool, tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Filial não encontrada.",
      });
    }

    return res.json({
      success: true,
      data: buildTenantPayload(tenant),
    });
  } catch (error) {
    console.error("[desktop-sync] Falha ao consultar dados da filial:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível consultar os dados da filial.",
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

router.get("/desktop/sync/financeiro/support-data", async (req, res) => {
  let client;
  let released = false;

  const resetAndRelease = async () => {
    if (!client || released) return;
    released = true;
    try {
      await client.query("RESET app.tenant_id");
    } catch (releaseError) {
      console.error("[desktop-sync] Falha ao limpar contexto do tenant:", releaseError.message);
    } finally {
      client.release();
    }
  };

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

    client = await pool.connect();
    await client.query("SELECT set_config('app.tenant_id', $1, false)", [String(tenantId)]);

    const data = await FinanceiroDAO.obterSupportData(client, {
      tipo: String(req.query.tipo || "receber"),
      syncOnly: true,
    });

    return res.json({
      success: true,
      data,
      count: {
        formasPagamento: Array.isArray(data?.formasPagamento) ? data.formasPagamento.length : 0,
        condicoesPagamento: Array.isArray(data?.condicoesPagamento)
          ? data.condicoesPagamento.length
          : 0,
      },
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[desktop-sync] Falha ao sincronizar apoio financeiro:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Não foi possível sincronizar as formas de pagamento.",
    });
  } finally {
    await resetAndRelease();
  }
});

router.post("/desktop/sync/usuarios/:usuarioId/senha", async (req, res) => {
  try {
    const tenantId = Number(req.body?.tenant_id);
    const usuarioId = Number(req.params.usuarioId);
    const senha = String(req.body?.senha || "").trim();

    if (!Number.isInteger(tenantId) || tenantId <= 0 || !Number.isInteger(usuarioId) || usuarioId <= 0) {
      return res.status(400).json({
        success: false,
        message: "tenant_id e usuário são obrigatórios.",
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        success: false,
        message: "A nova senha precisa ter pelo menos 6 caracteres.",
      });
    }

    const tenantAtivo = await DesktopSyncDAO.validarTenantAtivo(pool, tenantId);
    if (!tenantAtivo) {
      return res.status(403).json({
        success: false,
        message: "Filial inativa, bloqueada ou não encontrada.",
      });
    }

    const usuario = await DesktopSyncDAO.atualizarSenhaUsuarioPdv(pool, {
      tenantId,
      usuarioId,
      senhaHash: hashPassword(senha),
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Operador não encontrado para esta filial.",
      });
    }

    return res.json({
      success: true,
      data: {
        ...usuario,
        ativo: !!usuario.ativo,
        primeiro_acesso: !!usuario.primeiro_acesso,
      },
    });
  } catch (error) {
    console.error("[desktop-sync] Falha ao atualizar senha do operador:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível atualizar a senha do operador.",
    });
  }
});

export default router;
