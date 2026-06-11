import { useCallback, useEffect, useState } from "react";

export const useUsuarioPage = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search]);

  const handleOpenNovo = useCallback(() => {
    setSelectedUserId(null);
    setOpenModal(true);
  }, []);

  const handleEditar = useCallback((usuarioId) => {
    setSelectedUserId(usuarioId);
    setOpenModal(true);
  }, []);

  const handleCloseModal = useCallback((shouldRefresh = false) => {
    setOpenModal(false);
    setSelectedUserId(null);

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
    selectedUserId,
    refreshKey,
    handleOpenNovo,
    handleEditar,
    handleCloseModal,
    handleRefreshList,
  };
};
