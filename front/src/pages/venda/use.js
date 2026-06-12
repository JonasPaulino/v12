import { useCallback, useEffect, useState } from "react";

export const useVendaPage = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [selectedVendaId, setSelectedVendaId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search]);

  const handleOpenNovo = useCallback(() => {
    setSelectedVendaId(null);
    setOpenModal(true);
  }, []);

  const handleEditar = useCallback((vendaId) => {
    setSelectedVendaId(vendaId);
    setOpenModal(true);
  }, []);

  const handleCloseModal = useCallback((shouldRefresh = false) => {
    setOpenModal(false);
    setSelectedVendaId(null);

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
    selectedVendaId,
    refreshKey,
    handleOpenNovo,
    handleEditar,
    handleCloseModal,
    handleRefreshList,
  };
};
