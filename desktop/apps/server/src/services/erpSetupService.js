import { env } from "../config/env.js";
import {
  getTerminalConfig,
  limparTerminalConfigInicial,
  salvarTerminalConfig,
} from "../modules/configuracao/localConfigRepository.js";
import { syncFinanceiroSupportDataFromErp } from "./financeiroSupportDataSyncService.js";
import { syncProdutosFromErp } from "./produtoSyncService.js";
import { syncUsuariosFromErp } from "./usuarioSyncService.js";

function getErpBaseUrl() {
  if (!env.erpApiUrl) {
    throw new Error("URL do ERP web não configurada no desktop.");
  }

  return env.erpApiUrl.replace(/\/$/, "");
}

export async function loginErpWeb({ email, senha }) {
  if (!env.erpSyncToken) {
    throw new Error("Token de sincronização do ERP não configurado no desktop.");
  }

  const response = await fetch(`${getErpBaseUrl()}/desktop/sync/setup-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.erpSyncToken}`,
    },
    body: JSON.stringify({
      email,
      senha,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Não foi possível autenticar no ERP web.");
  }

  return {
    user: result.data?.user,
    tenants: Array.isArray(result.data?.tenants) ? result.data.tenants : [],
  };
}

async function fetchTenantConfigFromErp(tenantId) {
  if (!env.erpSyncToken) {
    throw new Error("Token de sincronização do ERP não configurado no desktop.");
  }

  const params = new URLSearchParams({
    tenant_id: String(tenantId),
  });
  const response = await fetch(`${getErpBaseUrl()}/desktop/sync/tenant-config?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${env.erpSyncToken}`,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Não foi possível carregar a filial do ERP web.");
  }

  return result.data || null;
}

export async function configurarTerminalPorTenant({
  tenant,
  terminal_codigo,
  terminal_nome,
}) {
  if (!tenant?.tenant_id) {
    throw new Error("Selecione a filial do ERP web para parear este terminal.");
  }

  try {
    const config = salvarTerminalConfig({
      tenant_erp_id: tenant.tenant_id,
      tenant_nome: tenant.tenant_nome,
      tenant_documento: tenant.tenant_documento,
      tenant_endereco: tenant.tenant_endereco || null,
      tenant_inscricao_estadual: tenant.tenant_inscricao_estadual || null,
      tenant_inscricao_municipal: tenant.tenant_inscricao_municipal || null,
      tenant_ativo: tenant.tenant_ativo !== false,
      tenant_acesso_bloqueado: !!tenant.tenant_acesso_bloqueado,
      tenant_bloqueio_motivo: tenant.tenant_bloqueio_motivo || null,
      terminal_codigo,
      terminal_nome,
      ambiente: "producao",
    });

    const usuarios = await syncUsuariosFromErp();
    if (usuarios.success === false) {
      throw new Error(usuarios.message || "Não foi possível sincronizar operadores do ERP.");
    }

    const produtos = await syncProdutosFromErp({ full: true });
    if (produtos.success === false) {
      throw new Error(produtos.message || "Não foi possível sincronizar produtos do ERP.");
    }

    const financeiro = await syncFinanceiroSupportDataFromErp({
      tipo: "receber",
      refresh: true,
    });
    if (financeiro.success === false) {
      throw new Error(financeiro.message || "Não foi possível sincronizar as formas de pagamento.");
    }

    if (!usuarios.imported) {
      throw new Error(
        "Filial configurada, mas nenhum operador de caixa foi sincronizado. Marque pelo menos um usuário com perfil de PDV no ERP web.",
      );
    }

    return {
      config,
      usuarios,
      produtos,
      financeiro,
    };
  } catch (error) {
    limparTerminalConfigInicial();
    throw error;
  }
}

export async function atualizarDadosFilialAtual() {
  const configAtual = getTerminalConfig();
  if (!configAtual?.tenant_erp_id) {
    throw new Error("PDV local ainda não pareado com uma filial do ERP.");
  }

  const tenant = await fetchTenantConfigFromErp(configAtual.tenant_erp_id);
  if (!tenant?.tenant_id) {
    throw new Error("ERP não retornou os dados atuais da filial.");
  }

  const config = salvarTerminalConfig({
    tenant_erp_id: tenant.tenant_id,
    tenant_nome: tenant.tenant_nome,
    tenant_documento: tenant.tenant_documento,
    tenant_endereco: tenant.tenant_endereco || null,
    tenant_inscricao_estadual: tenant.tenant_inscricao_estadual || null,
    tenant_inscricao_municipal: tenant.tenant_inscricao_municipal || null,
    tenant_ativo: tenant.tenant_ativo !== false,
    tenant_acesso_bloqueado: !!tenant.tenant_acesso_bloqueado,
    tenant_bloqueio_motivo: tenant.tenant_bloqueio_motivo || null,
    terminal_codigo: configAtual.terminal_codigo,
    terminal_nome: configAtual.terminal_nome,
    ambiente: configAtual.ambiente || "producao",
  });

  return {
    config,
    tenant,
  };
}
