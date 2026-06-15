import { useCallback, useEffect, useState } from "react";
import { getNfeSupportData } from "./api";

export const useNfePage = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [supportData, setSupportData] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search]);

  const loadSupportData = useCallback(async () => {
    const response = await getNfeSupportData();
    setSupportData(response.data || null);
    return response.data || null;
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await loadSupportData();
        if (!mounted) return;
        setSupportData(data);
      } catch {
        if (mounted) {
          setSupportData(null);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [loadSupportData]);

  const handleOpenNovo = useCallback(() => {
    setOpenModal(true);
  }, []);

  const handleCloseModal = useCallback(
    async (shouldRefresh = false) => {
      setOpenModal(false);

      if (shouldRefresh) {
        setRefreshKey((prev) => prev + 1);
        try {
          await loadSupportData();
        } catch {
          //
        }
      }
    },
    [loadSupportData]
  );

  const handleRefreshList = useCallback(async () => {
    setRefreshKey((prev) => prev + 1);
    try {
      await loadSupportData();
    } catch {
      //
    }
  }, [loadSupportData]);

  return {
    search,
    setSearch,
    debouncedSearch,
    status,
    setStatus,
    openModal,
    refreshKey,
    supportData,
    handleOpenNovo,
    handleCloseModal,
    handleRefreshList,
  };
};
