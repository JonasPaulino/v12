import { useCallback, useEffect, useState } from "react";

export const useFinanceiroPage = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [openModal, setOpenModal] = useState(false);
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

  return {
    search,
    setSearch,
    debouncedSearch,
    tipo,
    setTipo,
    status,
    setStatus,
    openModal,
    refreshKey,
    handleOpenNovo,
    handleCloseModal,
  };
};
