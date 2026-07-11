import { env } from "../config/env.js";
import {
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
