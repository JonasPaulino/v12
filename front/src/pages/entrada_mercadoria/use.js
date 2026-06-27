import { useCallback, useEffect, useState } from "react";

export const useEntradaMercadoriaPage = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
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

  const handleOpenImportModal = useCallback(() => {
    setOpenImportModal(true);
  }, []);

  const handleCloseImportModal = useCallback((shouldRefresh = false) => {
    setOpenImportModal(false);

    if (shouldRefresh) {
      setRefreshKey((prev) => prev + 1);
    }
  }, []);

  return {
    search,
    setSearch,
    debouncedSearch,
    openModal,
    openImportModal,
    refreshKey,
    handleOpenNovo,
    handleCloseModal,
    handleOpenImportModal,
    handleCloseImportModal,
  };
};
