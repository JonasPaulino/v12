import { useCallback, useEffect, useState } from "react";

export const useCompraPage = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [selectedCompraId, setSelectedCompraId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search]);

  const handleOpenNovo = useCallback(() => {
    setSelectedCompraId(null);
    setOpenModal(true);
  }, []);

  const handleEditar = useCallback((compraId) => {
    setSelectedCompraId(compraId);
    setOpenModal(true);
  }, []);

  const handleCloseModal = useCallback((shouldRefresh = false) => {
    setOpenModal(false);
    setSelectedCompraId(null);

    if (shouldRefresh) {
      setRefreshKey((prev) => prev + 1);
    }
  }, []);

  const handleRefreshList = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return {
    search,
    setSearch,
    debouncedSearch,
    openModal,
    selectedCompraId,
    refreshKey,
    handleOpenNovo,
    handleEditar,
    handleCloseModal,
    handleRefreshList,
  };
};

