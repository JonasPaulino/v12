import { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { deleteUsuario, getUsuarios } from "./api";

export const useTabelaUsuarios = ({ search, refreshKey, onDeleted }) => {
  const { showLoading, hideLoading, user } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [usuarios, setUsuarios] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState({ usuario_id: "DESC" });

  const toggleSort = (column) => {
    setSort((prev) => {
      const currentDirection = prev[column];
      const nextDirection =
        !currentDirection ? "ASC" : currentDirection === "ASC" ? "DESC" : undefined;

      if (!nextDirection) {
        return {};
      }

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
        const response = await getUsuarios(page, 12, search, sort);
        if (!mounted) return;
        if ((response.totalPages || 1) < page) {
          setPage(response.totalPages || 1);
          return;
        }
        setUsuarios(response.data || []);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        if (!mounted) return;
        setUsuarios([]);
        setTotalPages(1);
        showAlert({
          title: "Falha ao carregar",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar a lista de usuários.",
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

  const handleDelete = async (usuario) => {
    const confirmed = await askYesNoQuestion(
      "Remover usuário?",
      "Deseja remover esse usuário? Ele não conseguirá logar mais no sistema."
    );

    if (!confirmed) return;

    try {
      showLoading("Removendo usuário...");
      const response = await deleteUsuario(usuario.usuario_id);

      showAlert({
        title: "Usuário removido",
        text: response?.message || "O usuário foi removido com sucesso.",
        icon: "success",
        timer: 1800,
      });

      if (typeof onDeleted === "function") {
        onDeleted();
      }

      if (usuarios.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      }
    } catch (error) {
      showAlert({
        title: "Falha ao remover",
        text:
          error?.response?.data?.message ||
          "Não foi possível remover o usuário selecionado.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  };

  const paginationItems = useMemo(() => {
    const items = [];

    for (let current = 1; current <= totalPages; current += 1) {
      if (
        current === 1 ||
        current === totalPages ||
        Math.abs(current - page) <= 1
      ) {
        items.push({ type: "page", value: current });
      } else if (items[items.length - 1]?.type !== "dots") {
        items.push({ type: "dots", value: `dots-${current}` });
      }
    }

    return items;
  }, [page, totalPages]);

  return {
    usuarios,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
    paginationItems,
    handleDelete,
    currentUserId: user?.usuario_id || null,
  };
};
