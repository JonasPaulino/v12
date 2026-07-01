import { useCallback, useEffect, useMemo, useState } from "react";
import { useLoading } from "context/LoadingContext";
import { useSweetAlert } from "context/sweet_alert";
import {
  getManifestacoesNfe,
  importarXmlNfeRecebida,
  manifestarNfeRecebida,
  sincronizarManifestacoesNfe,
} from "./api";

const useDebounced = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export const useNfeManifestacaoPage = () => {
  const { showLoading, hideLoading } = useLoading();
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await getManifestacoesNfe(page, 12, debouncedSearch, {
        atualizado_em: "DESC",
      });
      setItems(response.data || []);
      setPagination({
        total: response.total || 0,
        totalPages: response.totalPages || 1,
      });
    } catch (error) {
      setItems([]);
      showAlert({
        icon: "error",
        title: "Falha ao carregar NF-e",
        text:
          error?.response?.data?.message ||
          "Não foi possível carregar as NF-e recebidas.",
      });
    }
  }, [debouncedSearch, page, showAlert]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  const handleSync = useCallback(async () => {
    try {
      showLoading("Consultando SEFAZ...");
      const response = await sincronizarManifestacoesNfe();
      hideLoading();
      showAlert({
        icon: "success",
        title: "Consulta concluída",
        text: `${response?.data?.documentos?.length || 0} documento(s) retornado(s).`,
      });
      refresh();
    } catch (error) {
      hideLoading();
      showAlert({
        icon: "error",
        title: "Falha na consulta",
        text:
          error?.response?.data?.message ||
          "Não foi possível consultar as NF-e emitidas contra a filial.",
      });
    }
  }, [hideLoading, refresh, showAlert, showLoading]);

  const handleManifestar = useCallback(
    async (item, tipoEvento) => {
      let justificativa = "";
      if (tipoEvento === "operacao_nao_realizada") {
        justificativa =
          window.prompt("Informe a justificativa da operação não realizada:") || "";
        if (justificativa.trim().length < 15) {
          showAlert({
            icon: "warning",
            title: "Justificativa obrigatória",
            text: "Informe uma justificativa com pelo menos 15 caracteres.",
          });
          return;
        }
      } else {
        const confirmed = await askYesNoQuestion(
          "Enviar manifestação?",
          "Esta ação será enviada para a SEFAZ com o certificado da filial."
        );
        if (!confirmed) return;
      }

      try {
        showLoading("Enviando manifestação...");
        const response = await manifestarNfeRecebida(item.nfe_recebida_distribuicao_id, {
          tipo_evento: tipoEvento,
          justificativa,
        });
        hideLoading();
        showAlert({
          icon: response.success ? "success" : "warning",
          title: response.success ? "Manifestação enviada" : "Manifestação rejeitada",
          text: response?.data?.retorno?.xMotivo || response.message,
        });
        refresh();
      } catch (error) {
        hideLoading();
        showAlert({
          icon: "error",
          title: "Falha ao manifestar",
          text:
            error?.response?.data?.message ||
            "Não foi possível enviar a manifestação.",
        });
      }
    },
    [askYesNoQuestion, hideLoading, refresh, showAlert, showLoading]
  );

  const handleImportar = useCallback(
    async (item) => {
      const confirmed = await askYesNoQuestion(
        "Importar XML?",
        "O XML completo será importado como entrada de mercadoria."
      );
      if (!confirmed) return;

      try {
        showLoading("Importando XML...");
        await importarXmlNfeRecebida(item.nfe_recebida_distribuicao_id);
        hideLoading();
        showAlert({
          icon: "success",
          title: "XML importado",
          text: "A entrada de mercadoria foi criada a partir da NF-e.",
        });
        refresh();
      } catch (error) {
        hideLoading();
        showAlert({
          icon: "error",
          title: "Falha ao importar",
          text:
            error?.response?.data?.message ||
            "Não foi possível importar o XML da NF-e.",
        });
      }
    },
    [askYesNoQuestion, hideLoading, refresh, showAlert, showLoading]
  );

  return useMemo(
    () => ({
      search,
      setSearch,
      items,
      page,
      setPage,
      pagination,
      handleSync,
      handleManifestar,
      handleImportar,
    }),
    [handleImportar, handleManifestar, handleSync, items, page, pagination, search]
  );
};
