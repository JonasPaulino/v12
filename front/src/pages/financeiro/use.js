import { useCallback, useEffect, useState } from "react";
import { useSweetAlert } from "context/sweet_alert";
import { cancelarTituloFinanceiro } from "./api";

export const useFinanceiroPage = () => {
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [openBaixaModal, setOpenBaixaModal] = useState(false);
  const [selectedTituloId, setSelectedTituloId] = useState(null);
  const [selectedBaixaTituloId, setSelectedBaixaTituloId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search]);

  const handleOpenNovo = useCallback(() => {
    setSelectedTituloId(null);
    setOpenModal(true);
  }, []);

  const handleEditar = useCallback((financeiroTituloId) => {
    setSelectedTituloId(financeiroTituloId);
    setOpenModal(true);
  }, []);

  const handleOpenBaixa = useCallback((financeiroTituloId) => {
    setSelectedBaixaTituloId(financeiroTituloId);
    setOpenBaixaModal(true);
  }, []);

  const handleCloseModal = useCallback((shouldRefresh = false) => {
    setOpenModal(false);
    setSelectedTituloId(null);

    if (shouldRefresh) {
      setRefreshKey((prev) => prev + 1);
    }
  }, []);

  const handleCloseBaixaModal = useCallback((shouldRefresh = false) => {
    setOpenBaixaModal(false);
    setSelectedBaixaTituloId(null);

    if (shouldRefresh) {
      setRefreshKey((prev) => prev + 1);
    }
  }, []);

  const handleCancelar = useCallback(
    async (financeiroTituloId) => {
      const confirmed = await askYesNoQuestion(
        "Cancelar título",
        "Deseja realmente cancelar este título? Ele deixará de aparecer nas rotinas financeiras."
      );

      if (!confirmed) return;

      try {
        const response = await cancelarTituloFinanceiro(financeiroTituloId);
        setRefreshKey((prev) => prev + 1);

        showAlert({
          title: "Sucesso",
          text: response?.message || "Título financeiro cancelado com sucesso.",
          icon: "success",
          timer: 1800,
        });
      } catch (error) {
        showAlert({
          title: "Falha ao cancelar",
          text:
            error?.response?.data?.message ||
            "Não foi possível cancelar o título financeiro.",
          icon: "error",
        });
      }
    },
    [askYesNoQuestion, showAlert]
  );

  return {
    search,
    setSearch,
    debouncedSearch,
    tipo,
    setTipo,
    status,
    setStatus,
    openModal,
    openBaixaModal,
    selectedTituloId,
    selectedBaixaTituloId,
    refreshKey,
    handleOpenNovo,
    handleEditar,
    handleOpenBaixa,
    handleCancelar,
    handleCloseModal,
    handleCloseBaixaModal,
  };
};
