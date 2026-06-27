import { useCallback, useEffect, useState } from "react";
import { useSweetAlert } from "context/sweet_alert";
import { importarXmlEntradaMercadoria } from "./api";

export const useEntradaMercadoriaPage = () => {
  const { showAlert } = useSweetAlert();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [importingXml, setImportingXml] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search]);

  const handleOpenNovo = useCallback(() => {
    setOpenModal(true);
  }, []);

  const handleCloseModal = useCallback((shouldRefresh = false) => {
    setOpenModal(false);

    if (shouldRefresh) {
      setRefreshKey((prev) => prev + 1);
    }
  }, []);

  const handleImportXml = useCallback(
    async (file) => {
      if (!file) return;

      try {
        setImportingXml(true);
        const response = await importarXmlEntradaMercadoria(file);
        showAlert({
          title: "XML importado",
          text: response?.message || "Entrada registrada com sucesso.",
          icon: "success",
          timer: 1800,
        });
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        showAlert({
          title: "Falha ao importar XML",
          text:
            error?.response?.data?.message ||
            "Não foi possível importar o XML informado.",
          icon: "error",
        });
      } finally {
        setImportingXml(false);
      }
    },
    [showAlert]
  );

  return {
    search,
    setSearch,
    debouncedSearch,
    openModal,
    importingXml,
    refreshKey,
    handleOpenNovo,
    handleCloseModal,
    handleImportXml,
  };
};
