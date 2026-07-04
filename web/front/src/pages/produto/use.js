import { useCallback, useEffect, useState } from "react";

export const useProdutoPage = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [selectedProdutoId, setSelectedProdutoId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search]);

  const handleOpenNovo = useCallback(() => {
    setSelectedProdutoId(null);
    setOpenModal(true);
  }, []);

  const handleEditar = useCallback((produtoId) => {
    setSelectedProdutoId(produtoId);
    setOpenModal(true);
  }, []);

  const handleCloseModal = useCallback((shouldRefresh = false) => {
    setOpenModal(false);
    setSelectedProdutoId(null);

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
    selectedProdutoId,
    refreshKey,
    handleOpenNovo,
    handleEditar,
    handleCloseModal,
    handleRefreshList,
  };
};
