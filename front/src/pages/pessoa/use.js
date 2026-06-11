import { useCallback, useEffect, useState } from "react";

export const usePessoaPage = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [selectedPessoaId, setSelectedPessoaId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search]);

  const handleOpenNovo = useCallback(() => {
    setSelectedPessoaId(null);
    setOpenModal(true);
  }, []);

  const handleEditar = useCallback((pessoaId) => {
    setSelectedPessoaId(pessoaId);
    setOpenModal(true);
  }, []);

  const handleCloseModal = useCallback((shouldRefresh = false) => {
    setOpenModal(false);
    setSelectedPessoaId(null);

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
    selectedPessoaId,
    refreshKey,
    handleOpenNovo,
    handleEditar,
    handleCloseModal,
    handleRefreshList,
  };
};
