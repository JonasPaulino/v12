import { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { deleteVenda, getVendas } from "./api";

export const useTabelaVendas = ({ search, refreshKey, onDeleted }) => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [vendas, setVendas] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState({ pedido_venda_id: "DESC" });

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
        const response = await getVendas(page, 12, search, sort);
        if (!mounted) return;
        if ((response.totalPages || 1) < page) {
          setPage(response.totalPages || 1);
          return;
        }
        setVendas(response.data || []);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        if (!mounted) return;
        setVendas([]);
        setTotalPages(1);
        showAlert({
          title: "Falha ao carregar",
          text:
            error?.response?.data?.message ||
            "Nao foi possivel carregar a lista de pedidos.",
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
  }, [hideLoading, page, refreshKey, search, showAlert, showLoading, sort]);

  const handleDelete = async (venda) => {
    const confirmed = await askYesNoQuestion(
      "Remover pedido?",
      "Deseja remover esse pedido de venda? Os titulos financeiros vinculados tambem serao cancelados se nao houver baixas."
    );

    if (!confirmed) return;

    try {
      showLoading("Removendo pedido...");
      const response = await deleteVenda(venda.pedido_venda_id);
      showAlert({
        title: "Pedido removido",
        text: response?.message || "O pedido foi removido com sucesso.",
        icon: "success",
        timer: 1800,
      });
      onDeleted?.();
      if (vendas.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      }
    } catch (error) {
      showAlert({
        title: "Falha ao remover",
        text:
          error?.response?.data?.message ||
          "Nao foi possivel remover o pedido selecionado.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  };

  const paginationItems = useMemo(() => {
    const items = [];
    for (let current = 1; current <= totalPages; current += 1) {
      if (current === 1 || current === totalPages || Math.abs(current - page) <= 1) {
        items.push({ type: "page", value: current });
      } else if (items[items.length - 1]?.type !== "dots") {
        items.push({ type: "dots", value: `dots-${current}` });
      }
    }
    return items;
  }, [page, totalPages]);

  return {
    vendas,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
    paginationItems,
    handleDelete,
  };
};
