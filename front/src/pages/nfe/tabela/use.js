import { useContext, useEffect, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import {
  cancelarNfe,
  consultarStatusNfe,
  getNfes,
  processarNfe,
} from "./api";

export const useTabelaNfe = ({ search, status, refreshKey, onChanged }) => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [nfes, setNfes] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState({ nfe_id: "DESC" });

  const toggleSort = (column) => {
    setSort((prev) => {
      const currentDirection = prev[column];
      const nextDirection =
        !currentDirection ? "ASC" : currentDirection === "ASC" ? "DESC" : undefined;

      if (!nextDirection) return {};
      return { [column]: nextDirection };
    });
  };

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        showLoading();
        const response = await getNfes(page, 12, search, status, sort);
        if (!mounted) return;
        if ((response.totalPages || 1) < page) {
          setPage(response.totalPages || 1);
          return;
        }
        setNfes(response.data || []);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        if (!mounted) return;
        setNfes([]);
        setTotalPages(1);
        showAlert({
          title: "Falha ao carregar",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar a lista de NF-e.",
          icon: "error",
        });
      } finally {
        hideLoading();
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [hideLoading, page, refreshKey, search, showAlert, showLoading, sort, status]);

  const runAction = async (action, successTitle, successFallbackMessage, loadingMessage) => {
    try {
      showLoading(loadingMessage);
      const response = await action();
      const businessFailure = response?.success === false;
      const mappedStatus = String(response?.data?.mappedStatus || "").toLowerCase();
      showAlert({
        title:
          businessFailure && mappedStatus === "rejeitada"
            ? "NF-e rejeitada"
            : businessFailure
              ? "Retorno da SEFAZ"
              : successTitle,
        text: response?.message || successFallbackMessage,
        icon: businessFailure ? "warning" : "success",
        timer: businessFailure ? undefined : 2200,
      });
      onChanged?.();
    } catch (error) {
      showAlert({
        title: "Falha na operação",
        text:
          error?.response?.data?.message ||
          "Não foi possível concluir a operação fiscal.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  };

  const handleProcessar = async (nfe) =>
    runAction(
      () => processarNfe(nfe.nfe_id),
      "Integração iniciada",
      "Processamento enviado para a integração fiscal.",
      "Enviando NF-e para integração fiscal..."
    );

  const handleConsultarStatus = async (nfe) =>
    runAction(
      () => consultarStatusNfe(nfe.nfe_id),
      "Consulta solicitada",
      "Consulta de status enviada com sucesso.",
      "Consultando status da NF-e..."
    );

  const handleCancelar = async (nfe) => {
    const justificativa =
      window.prompt(
        `Informe a justificativa de cancelamento da NF-e #${nfe.nfe_id}:`,
        ""
      ) || "";

    if (!justificativa.trim()) return;

    await runAction(
      () => cancelarNfe(nfe.nfe_id, justificativa.trim()),
      "Cancelamento solicitado",
      "Solicitação de cancelamento enviada com sucesso.",
      "Solicitando cancelamento da NF-e..."
    );
  };

  const handleAbrirDanfe = (nfe) => {
    if (!nfe?.nfe_id) return;
    window.open(`/reports/nfe/${nfe.nfe_id}/danfe`, "_blank", "noopener,noreferrer");
  };

  return {
    nfes,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
    handleProcessar,
    handleConsultarStatus,
    handleAbrirDanfe,
    handleCancelar,
  };
};
