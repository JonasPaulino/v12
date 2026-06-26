import { useContext, useEffect, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import {
  deleteVenda,
  generateBoletoVenda,
  getVendas,
  sendBoletoWhatsAppVenda,
} from "./api";

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
            "Não foi possível carregar a lista de pedidos.",
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
      "Deseja remover esse pedido de venda? Os títulos financeiros vinculados também serão cancelados se não houver baixas."
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
          "Não foi possível remover o pedido selecionado.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  };

  const handleDownloadBoletos = async (venda) => {
    try {
      showLoading("Gerando boletos...");
      const response = await generateBoletoVenda(venda.pedido_venda_id);
      const boletos = response?.data?.boletos || [];

      if (!boletos.length) {
        showAlert({
          title: "Nenhum boleto disponível",
          text: "Não há boletos em aberto para este pedido.",
          icon: "warning",
        });
        return;
      }

      boletos.forEach((boleto) => {
        if (boleto?.bank_slip_url) {
          window.open(boleto.bank_slip_url, "_blank", "noopener,noreferrer");
        }
      });

      showAlert({
        title: "Boletos prontos",
        text:
          boletos.length === 1
            ? "O boleto foi aberto em uma nova aba."
            : `${boletos.length} boletos foram abertos em novas abas.`,
        icon: "success",
        timer: 1800,
      });
    } catch (error) {
      showAlert({
        title: "Falha ao gerar boletos",
        text:
          error?.response?.data?.message ||
          "Não foi possível gerar os boletos do pedido.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  };

  const handleEnviarBoletoWhatsApp = async (venda) => {
    if (!venda?.financeiro_titulo_id) {
      showAlert({
        title: "Título financeiro não encontrado",
        text: "Este pedido ainda não possui título financeiro para envio do boleto.",
        icon: "warning",
      });
      return;
    }

    try {
      showLoading("Enviando boleto por WhatsApp...");
      const response = await sendBoletoWhatsAppVenda(venda.financeiro_titulo_id);
      showAlert({
        title: "Boleto enviado",
        text: response?.message || "Boleto enviado por WhatsApp com sucesso.",
        icon: "success",
        timer: 1800,
      });
    } catch (error) {
      showAlert({
        title: "Falha ao enviar boleto",
        text:
          error?.response?.data?.message ||
          "Não foi possível enviar o boleto por WhatsApp.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  };

  return {
    vendas,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
    handleDelete,
    handleDownloadBoletos,
    handleEnviarBoletoWhatsApp,
  };
};
