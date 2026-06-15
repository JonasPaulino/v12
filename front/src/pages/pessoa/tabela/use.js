import { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { deletePessoa, getPessoas } from "./api";

export const useTabelaPessoas = ({ search, refreshKey, onDeleted }) => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [pessoas, setPessoas] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState({ pessoa_nome_razao: "ASC" });

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
        const response = await getPessoas(page, 12, search, sort);
        if (!mounted) return;
        if ((response.totalPages || 1) < page) {
          setPage(response.totalPages || 1);
          return;
        }
        setPessoas(response.data || []);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        if (!mounted) return;
        setPessoas([]);
        setTotalPages(1);
        showAlert({
          title: "Falha ao carregar",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar a lista de pessoas.",
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

  const handleDelete = async (pessoa) => {
    const confirmed = await askYesNoQuestion(
      "Remover pessoa?",
      "Deseja remover essa pessoa? Ela deixará de aparecer nas operações desta filial."
    );

    if (!confirmed) return;

    try {
      showLoading("Removendo pessoa...");
      const response = await deletePessoa(pessoa.pessoa_id);

      showAlert({
        title: "Pessoa removida",
        text: response?.message || "A pessoa foi removida com sucesso.",
        icon: "success",
        timer: 1800,
      });

      onDeleted?.();

      if (pessoas.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      }
    } catch (error) {
      showAlert({
        title: "Falha ao remover",
        text:
          error?.response?.data?.message ||
          "Não foi possível remover a pessoa selecionada.",
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
    pessoas,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
    paginationItems,
    handleDelete,
  };
};
