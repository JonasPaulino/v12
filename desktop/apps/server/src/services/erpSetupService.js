import { env } from "../config/env.js";
import {
  getTerminalConfig,
  limparTerminalConfigInicial,
  salvarTerminalConfig,
} from "../modules/configuracao/localConfigRepository.js";
import { saveFiscalConfig } from "../modules/configuracao/localFiscalConfigRepository.js";
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

function salvarConfiguracaoFiscalLocal(tenant = {}) {
  const fiscal = tenant.fiscal_nfce || {};
  const emitente = tenant.emitente || {};
  const responsavelTecnico = tenant.responsavel_tecnico || {};
  const certificado = tenant.certificado || {};

  return saveFiscalConfig({
    tenant_erp_id: tenant.tenant_id,
    ambiente_nfe: fiscal.ambiente_nfe || "2",
    ambiente_nfce: fiscal.ambiente_nfce || "2",
    crt: fiscal.crt || "3",
    cnae: fiscal.cnae || "",
    natureza_operacao_padrao: fiscal.natureza_operacao_padrao || "Venda de mercadoria",
    nfce_habilitada: !!fiscal.nfce_habilitada,
    serie_nfce_padrao: Number(fiscal.serie_nfce_padrao || 1),
    proximo_numero_nfce: Number(fiscal.proximo_numero_nfce || 1),
    nfce_id_token_csc: fiscal.nfce_id_token_csc || "",
    nfce_csc: fiscal.nfce_csc || "",
    nfce_ind_pres_padrao: fiscal.nfce_ind_pres_padrao || "1",
    emitente_nome_razao: emitente.nome_razao || "",
    emitente_nome_fantasia: emitente.nome_fantasia || "",
    emitente_cpf_cnpj: emitente.cpf_cnpj || "",
    emitente_inscricao_estadual: emitente.inscricao_estadual || "",
    emitente_inscricao_municipal: emitente.inscricao_municipal || "",
    emitente_email: emitente.email || "",
    emitente_telefone: emitente.telefone || "",
    emitente_cep: emitente.cep || "",
    emitente_logradouro: emitente.logradouro || "",
    emitente_numero: emitente.numero || "",
    emitente_complemento: emitente.complemento || "",
    emitente_bairro: emitente.bairro || "",
    emitente_cidade: emitente.cidade || "",
    emitente_uf: emitente.uf || "",
    emitente_codigo_ibge: emitente.codigo_ibge || "",
    emitente_pais: emitente.pais || "Brasil",
    responsavel_tecnico_cnpj: responsavelTecnico.cnpj || "",
    responsavel_tecnico_nome: responsavelTecnico.nome || "",
    responsavel_tecnico_contato: responsavelTecnico.contato || "",
    responsavel_tecnico_email: responsavelTecnico.email || "",
    responsavel_tecnico_telefone: responsavelTecnico.telefone || "",
    certificado_nome_arquivo: certificado.nome_arquivo || "",
    certificado_conteudo_base64: certificado.conteudo_base64 || "",
    certificado_senha: certificado.senha || "",
  });
}

export async function configurarTerminalPorTenant({
  tenant,
  terminal_codigo,
  terminal_nome,
}) {
  if (!tenant?.tenant_id) {
    throw new Error("Selecione a filial do ERP web para parear este terminal.");
  }

  if (tenant.tenant_usa_pdv !== true) {
    throw new Error("Esta filial não está habilitada para integração com o PDV. Ative a opção no ERP web antes do setup.");
  }

  try {
    const tenantDetalhado = await fetchTenantConfigFromErp(tenant.tenant_id);
    if (!tenantDetalhado?.tenant_id) {
      throw new Error("Não foi possível carregar a configuração completa da filial para o PDV.");
    }

    const config = salvarTerminalConfig({
      tenant_erp_id: tenantDetalhado.tenant_id,
      tenant_nome: tenantDetalhado.tenant_nome,
      tenant_documento: tenantDetalhado.tenant_documento,
      tenant_endereco: tenantDetalhado.tenant_endereco || null,
      tenant_inscricao_estadual: tenantDetalhado.tenant_inscricao_estadual || null,
      tenant_inscricao_municipal: tenantDetalhado.tenant_inscricao_municipal || null,
      tenant_ativo: tenantDetalhado.tenant_ativo !== false,
      tenant_usa_pdv: tenantDetalhado.tenant_usa_pdv !== false,
      tenant_acesso_bloqueado: !!tenantDetalhado.tenant_acesso_bloqueado,
      tenant_bloqueio_motivo: tenantDetalhado.tenant_bloqueio_motivo || null,
      terminal_codigo,
      terminal_nome,
      ambiente: "producao",
    });
    salvarConfiguracaoFiscalLocal(tenantDetalhado);

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
      tenant: tenantDetalhado,
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
    tenant_usa_pdv: tenant.tenant_usa_pdv !== false,
    tenant_acesso_bloqueado: !!tenant.tenant_acesso_bloqueado,
    tenant_bloqueio_motivo: tenant.tenant_bloqueio_motivo || null,
    terminal_codigo: configAtual.terminal_codigo,
    terminal_nome: configAtual.terminal_nome,
    ambiente: configAtual.ambiente || "producao",
  });
  salvarConfiguracaoFiscalLocal(tenant);

  return {
    config,
    tenant,
  };
}
