import { useCallback, useEffect, useState } from "react";

export const useEstoquePage = () => {
  const [activeTab, setActiveTab] = useState("saldos");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openAjusteModal, setOpenAjusteModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search]);

  const handleOpenAjuste = useCallback(() => {
    setOpenAjusteModal(true);
  }, []);

  const handleCloseAjuste = useCallback((shouldRefresh = false) => {
    setOpenAjusteModal(false);

    if (shouldRefresh) {
      setRefreshKey((prev) => prev + 1);
    }
  }, []);

  return {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    debouncedSearch,
    openAjusteModal,
    refreshKey,
    handleOpenAjuste,
    handleCloseAjuste,
  };
};
