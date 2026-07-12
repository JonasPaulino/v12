import { atualizarDadosFilialAtual } from "./erpSetupService.js";
import { processSyncQueue } from "./erpSyncService.js";
import { syncFinanceiroSupportDataFromErp } from "./financeiroSupportDataSyncService.js";
import { syncProdutosFromErp } from "./produtoSyncService.js";
import { syncUsuariosFromErp } from "./usuarioSyncService.js";

export async function atualizarPdvCompleto() {
  const steps = [];

  const filial = await atualizarDadosFilialAtual();
  steps.push({
    key: "filial",
    label: "Filial",
    success: true,
    details: {
      tenantId: filial?.config?.tenant_erp_id || null,
      terminalCodigo: filial?.config?.terminal_codigo || null,
    },
  });

  const usuarios = await syncUsuariosFromErp();
  if (usuarios.success === false) {
    throw new Error(usuarios.message || "Nao foi possivel sincronizar os operadores.");
  }
  steps.push({
    key: "usuarios",
    label: "Operadores",
    success: true,
    details: {
      imported: Number(usuarios.imported || 0),
    },
  });

  const produtos = await syncProdutosFromErp({ full: true });
  if (produtos.success === false) {
    throw new Error(produtos.message || "Nao foi possivel sincronizar os produtos.");
  }
  steps.push({
    key: "produtos",
    label: "Produtos",
    success: true,
    details: {
      imported: Number(produtos.imported || 0),
      full: true,
    },
  });

  const financeiro = await syncFinanceiroSupportDataFromErp({
    tipo: "receber",
    refresh: true,
  });
  if (financeiro.success === false) {
    throw new Error(financeiro.message || "Nao foi possivel sincronizar as formas de pagamento.");
  }
  steps.push({
    key: "financeiro",
    label: "Financeiro",
    success: true,
    details: {
      formasPagamento: Array.isArray(financeiro.data?.formasPagamento)
        ? financeiro.data.formasPagamento.length
        : 0,
      condicoesPagamento: Array.isArray(financeiro.data?.condicoesPagamento)
        ? financeiro.data.condicoesPagamento.length
        : 0,
    },
  });

  const pendencias = await processSyncQueue();
  if (pendencias.success === false) {
    throw new Error(
      pendencias.message ||
        `Nao foi possivel sincronizar as pendencias locais. Falhas: ${Number(pendencias.failed || 0)}.`,
    );
  }
  steps.push({
    key: "pendencias",
    label: "Pendencias locais",
    success: true,
    details: {
      processed: Number(pendencias.processed || 0),
      pending: Number(pendencias.pending || 0),
    },
  });

  return {
    success: true,
    steps,
    syncedAt: new Date().toISOString(),
  };
}
