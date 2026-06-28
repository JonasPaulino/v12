import { useCallback, useEffect, useState } from "react";

export const useDevolucaoPage = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [selectedDevolucaoId, setSelectedDevolucaoId] = useState(null);
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

  const handleEditar = useCallback((devolucaoId) => {
    setSelectedDevolucaoId(devolucaoId);
  }, []);

  const handleCloseModal = useCallback((shouldRefresh = false) => {
    setOpenModal(false);

    if (shouldRefresh) {
      setRefreshKey((prev) => prev + 1);
    }
  }, []);

  const handleCloseEditModal = useCallback((shouldRefresh = false) => {
    setSelectedDevolucaoId(null);

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
    selectedDevolucaoId,
    refreshKey,
    handleOpenNovo,
    handleEditar,
    handleCloseModal,
    handleCloseEditModal,
    handleRefreshList,
  };
};
