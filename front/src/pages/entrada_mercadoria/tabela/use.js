import { useContext, useEffect, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { getEntradasMercadoria } from "../api";

export const useTabelaEntradasMercadoria = ({ search, refreshKey, onlyNfe = false }) => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [entradas, setEntradas] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState({ entrada_mercadoria_id: "DESC" });

  const toggleSort = (column) => {
    setSort((prev) => {
      const currentDirection = prev[column];
      const nextDirection =
        !currentDirection ? "ASC" : currentDirection === "ASC" ? "DESC" : undefined;

      if (!nextDirection) return {};
      return { [column]: nextDirection };
    });
  };

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        showLoading();
        const response = await getEntradasMercadoria(page, 12, search, sort, { onlyNfe });
        if (!mounted) return;
        if ((response.totalPages || 1) < page) {
          setPage(response.totalPages || 1);
          return;
        }
        setEntradas(response.data || []);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        if (!mounted) return;
        setEntradas([]);
        setTotalPages(1);
        showAlert({
          title: "Falha ao carregar",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar a lista de entradas.",
          icon: "error",
        });
      } finally {
        hideLoading();
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [hideLoading, onlyNfe, page, refreshKey, search, showAlert, showLoading, sort]);

  return {
    entradas,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
  };
};
