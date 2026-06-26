import { useContext, useEffect, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { deleteProduto, getProdutos } from "./api";

export const useTabelaProdutos = ({ search, refreshKey, onDeleted }) => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [produtos, setProdutos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState({ descricao: "ASC" });

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
        const response = await getProdutos(page, 12, search, sort);
        if (!mounted) return;
        if ((response.totalPages || 1) < page) {
          setPage(response.totalPages || 1);
          return;
        }
        setProdutos(response.data || []);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        if (!mounted) return;
        setProdutos([]);
        setTotalPages(1);
        showAlert({
          title: "Falha ao carregar",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar a lista de produtos.",
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

  const handleDelete = async (produto) => {
    const confirmed = await askYesNoQuestion(
      "Remover produto?",
      "Deseja remover esse produto? Ele não será mais considerado nas operações do sistema."
    );

    if (!confirmed) return;

    try {
      showLoading("Removendo produto...");
      const response = await deleteProduto(produto.produto_id);
      showAlert({
        title: "Produto removido",
        text: response?.message || "O produto foi removido com sucesso.",
        icon: "success",
        timer: 1800,
      });
      onDeleted?.();
      if (produtos.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      }
    } catch (error) {
      showAlert({
        title: "Falha ao remover",
        text:
          error?.response?.data?.message ||
          "Não foi possível remover o produto selecionado.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  };

  return {
    produtos,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
    handleDelete,
  };
};
