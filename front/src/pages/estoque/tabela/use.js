import { useContext, useEffect, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { getMovimentacoesEstoque, getSaldosEstoque } from "../api";

export const useTabelaEstoque = ({ activeTab, search, refreshKey }) => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState(
    activeTab === "movimentacoes" ? { data_movimento: "DESC" } : { descricao: "ASC" }
  );

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
  }, [activeTab, search]);

  useEffect(() => {
    setSort(activeTab === "movimentacoes" ? { data_movimento: "DESC" } : { descricao: "ASC" });
  }, [activeTab]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        showLoading();
        const response =
          activeTab === "movimentacoes"
            ? await getMovimentacoesEstoque(page, 12, search, sort)
            : await getSaldosEstoque(page, 12, search, sort);

        if (!mounted) return;

        if ((response.totalPages || 1) < page) {
          setPage(response.totalPages || 1);
          return;
        }

        setRows(response.data || []);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        if (!mounted) return;
        setRows([]);
        setTotalPages(1);
        showAlert({
          title: "Falha ao carregar",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar os dados de estoque.",
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
  }, [activeTab, hideLoading, page, refreshKey, search, showAlert, showLoading, sort]);

  return {
    rows,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
  };
};
