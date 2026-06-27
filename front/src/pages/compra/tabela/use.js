import { useContext, useEffect, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { deleteCompra, getCompras } from "./api";

export const useTabelaCompras = ({ search, refreshKey, onDeleted }) => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [compras, setCompras] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState({ pedido_compra_id: "DESC" });

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
        const response = await getCompras(page, 12, search, sort);
        if (!mounted) return;
        if ((response.totalPages || 1) < page) {
          setPage(response.totalPages || 1);
          return;
        }
        setCompras(response.data || []);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        if (!mounted) return;
        setCompras([]);
        setTotalPages(1);
        showAlert({
          title: "Falha ao carregar",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar a lista de pedidos de compra.",
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

  const handleDelete = async (compra) => {
    const confirmed = await askYesNoQuestion(
      "Cancelar pedido?",
      "Deseja cancelar esse pedido de compra? O contas a pagar vinculado também será cancelado se não houver baixas."
    );

    if (!confirmed) return;

    try {
      showLoading("Cancelando pedido...");
      const response = await deleteCompra(compra.pedido_compra_id);
      showAlert({
        title: "Pedido cancelado",
        text: response?.message || "O pedido foi cancelado com sucesso.",
        icon: "success",
        timer: 1800,
      });
      onDeleted?.();
      if (compras.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      }
    } catch (error) {
      showAlert({
        title: "Falha ao cancelar",
        text:
          error?.response?.data?.message ||
          "Não foi possível cancelar o pedido selecionado.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  };

  return {
    compras,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
    handleDelete,
  };
};

