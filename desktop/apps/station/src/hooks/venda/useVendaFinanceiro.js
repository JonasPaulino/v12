import { useMemo, useState } from "react";
import { api } from "../../api.js";
import { FALLBACK_FINANCEIRO_SUPPORT_DATA } from "../../constants/pdv.js";

function normalizeSupportData(supportData) {
  const nextFormasPagamento = Array.isArray(supportData?.formasPagamento)
    ? supportData.formasPagamento.filter(Boolean)
    : [];

  return {
    ...FALLBACK_FINANCEIRO_SUPPORT_DATA,
    ...supportData,
    formasPagamento: nextFormasPagamento.length
      ? nextFormasPagamento
      : FALLBACK_FINANCEIRO_SUPPORT_DATA.formasPagamento,
    formaPagamentoPadrao:
      supportData?.formaPagamentoPadrao ||
      nextFormasPagamento.find((item) => item.padrao) ||
      FALLBACK_FINANCEIRO_SUPPORT_DATA.formaPagamentoPadrao,
  };
}

export function useVendaFinanceiro({ showLoading, hideLoading }) {
  const [financeiroSupportData, setFinanceiroSupportData] = useState(null);

  const formasPagamento = useMemo(() => {
    return financeiroSupportData?.formasPagamento?.length
      ? financeiroSupportData.formasPagamento
      : FALLBACK_FINANCEIRO_SUPPORT_DATA.formasPagamento;
  }, [financeiroSupportData]);

  async function carregarFinanceiroSupportData({ silent = false, refresh = false } = {}) {
    try {
      if (!silent) {
        showLoading("Carregando formas de pagamento...");
      }

      const result = refresh
        ? await api.sincronizarFinanceiroSupportData({ tipo: "receber", refresh: true })
        : await api.financeiroSupportData({ tipo: "receber" });

      setFinanceiroSupportData(normalizeSupportData(result || FALLBACK_FINANCEIRO_SUPPORT_DATA));
      return { success: true };
    } catch (error) {
      if (refresh) {
        try {
          const cachedResult = await api.financeiroSupportData({ tipo: "receber" });
          setFinanceiroSupportData(
            normalizeSupportData(cachedResult || FALLBACK_FINANCEIRO_SUPPORT_DATA),
          );
          return { success: true, cached: true };
        } catch {
          // fallback local padrão
        }
      }

      setFinanceiroSupportData(FALLBACK_FINANCEIRO_SUPPORT_DATA);
      return {
        success: false,
        message: String(error?.message || "").trim(),
      };
    } finally {
      if (!silent) {
        hideLoading();
      }
    }
  }

  return {
    financeiroSupportData,
    formasPagamento,
    carregarFinanceiroSupportData,
  };
}
