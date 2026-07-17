import { atualizarDadosFilialAtual } from "./erpSetupService.js";
import { processSyncQueue } from "./erpSyncService.js";
import { syncFinanceiroSupportDataFromErp } from "./financeiroSupportDataSyncService.js";
import { reenviarContingenciasNfce } from "../modules/vendas/vendaRepository.js";
import { verificarConectividadeInternet } from "./networkService.js";
import { syncProdutosFromErp } from "./produtoSyncService.js";
import { syncUsuariosFromErp } from "./usuarioSyncService.js";
import { prepararAtualizacaoPdv } from "./atualizacao/releaseUpdateService.js";

export async function atualizarPdvCompleto({ full = true } = {}) {
  const steps = [];

  try {
    const conectividade = await verificarConectividadeInternet();
    if (!conectividade.internetOnline && !conectividade.erpOnline) {
      throw new Error(
        "Não foi possível atualizar o PDV porque o terminal está sem internet ou sem comunicação com a retaguarda.",
      );
    }

    if (!conectividade.erpOnline) {
      throw new Error(
        "A internet está ativa, mas a retaguarda do ERP não respondeu. Tente novamente em instantes.",
      );
    }

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
    console.info("[desktop-sync] Etapa concluida", steps[steps.length - 1]);

    const usuarios = await syncUsuariosFromErp();
    if (usuarios.success === false) {
      throw new Error(usuarios.message || "Não foi possível sincronizar os operadores.");
    }
    steps.push({
      key: "usuarios",
      label: "Operadores",
      success: true,
      details: {
        imported: Number(usuarios.imported || 0),
      },
    });
    console.info("[desktop-sync] Etapa concluida", steps[steps.length - 1]);

    const produtos = await syncProdutosFromErp({ full });
    if (produtos.success === false) {
      throw new Error(produtos.message || "Não foi possível sincronizar os produtos.");
    }
    steps.push({
      key: "produtos",
      label: "Produtos",
      success: true,
      details: {
        imported: Number(produtos.imported || 0),
        full,
      },
    });
    console.info("[desktop-sync] Etapa concluida", steps[steps.length - 1]);

    const financeiro = await syncFinanceiroSupportDataFromErp({
      tipo: "receber",
      refresh: true,
    });
    if (financeiro.success === false) {
      throw new Error(financeiro.message || "Não foi possível sincronizar as formas de pagamento.");
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
    console.info("[desktop-sync] Etapa concluida", steps[steps.length - 1]);

    const pendencias = await processSyncQueue();
    if (pendencias.success === false) {
      const firstErrors = Array.isArray(pendencias.errors) ? pendencias.errors.slice(0, 3) : [];
      const detail = firstErrors.length
        ? ` ${firstErrors
            .map((item) => `#${item.syncId} ${item.tipoEvento}: ${item.message}`)
            .join(" | ")}`
        : "";
      throw new Error(
        pendencias.message ||
          `Não foi possível sincronizar as pendências locais. Falhas: ${Number(
            pendencias.failed || 0,
          )}.${detail}`,
      );
    }
    steps.push({
      key: "pendencias",
      label: "Pendências locais",
      success: true,
      details: {
        processed: Number(pendencias.processed || 0),
        pending: Number(pendencias.pending || 0),
      },
    });
    console.info("[desktop-sync] Etapa concluida", steps[steps.length - 1]);

    const contingencias = await reenviarContingenciasNfce({ limit: 20 });
    steps.push({
      key: "contingencias",
      label: "NFC-e em contingência",
      success: true,
      details: {
        total: Number(contingencias.total || 0),
        autorizadas: Number(contingencias.autorizadas || 0),
        emContingencia: Number(contingencias.em_contingencia || 0),
        rejeitadas: Number(contingencias.rejeitadas || 0),
      },
    });
    console.info("[desktop-sync] Etapa concluida", steps[steps.length - 1]);

    if (Number(contingencias.autorizadas || 0) > 0 || Number(contingencias.rejeitadas || 0) > 0) {
      const pendenciasFiscais = await processSyncQueue();
      if (pendenciasFiscais.success === false) {
        const firstErrors = Array.isArray(pendenciasFiscais.errors)
          ? pendenciasFiscais.errors.slice(0, 3)
          : [];
        const detail = firstErrors.length
          ? ` ${firstErrors
              .map((item) => `#${item.syncId} ${item.tipoEvento}: ${item.message}`)
              .join(" | ")}`
          : "";
        throw new Error(
          pendenciasFiscais.message ||
            `Não foi possível enviar os retornos fiscais do PDV. Falhas: ${Number(
              pendenciasFiscais.failed || 0,
            )}.${detail}`,
        );
      }
      steps.push({
        key: "pendencias_fiscais",
        label: "Retornos fiscais",
        success: true,
        details: {
          processed: Number(pendenciasFiscais.processed || 0),
          pending: Number(pendenciasFiscais.pending || 0),
        },
      });
      console.info("[desktop-sync] Etapa concluida", steps[steps.length - 1]);
    }

    try {
      const release = await prepararAtualizacaoPdv();
      const releaseLocal = release.local || null;
      steps.push({
        key: "release",
        label: "Release do PDV",
        success: true,
        details: {
          versaoAtual: release.versao_atual,
          updateAvailable: release.update_available === true,
          versaoDisponivel: release.release?.versao || release.latest?.versao || null,
          statusLocal: releaseLocal?.status || null,
        },
      });
      console.info("[desktop-sync] Etapa concluida", steps[steps.length - 1]);
    } catch (error) {
      steps.push({
        key: "release",
        label: "Release do PDV",
        success: false,
        details: {
          message: error?.message || "Não foi possível verificar atualização do PDV.",
        },
      });
      console.warn("[desktop-sync] Etapa de release ignorada", steps[steps.length - 1]);
    }
  } catch (error) {
    console.error("[desktop-sync] Falha na atualização completa", {
      completedSteps: steps,
      message: error?.message,
      stack: error?.stack,
    });
    throw error;
  }

  return {
    success: true,
    steps,
    syncedAt: new Date().toISOString(),
  };
}
