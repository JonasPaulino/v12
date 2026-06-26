import { useContext, useEffect, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { getFinanceiro, sendBoletoWhatsApp, sendPixWhatsApp } from "./api";

export const useTabelaFinanceiro = ({ search, tipo, status, refreshKey }) => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [titulos, setTitulos] = useState([]);
  const [resumo, setResumo] = useState({
    quantidadeTitulos: 0,
    totalReceber: 0,
    totalPagar: 0,
    totalVencido: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState({ data_vencimento: "ASC" });

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
  }, [search, status, tipo]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        showLoading();
        const response = await getFinanceiro(page, 14, search, tipo, status, sort);
        if (!mounted) return;

        if ((response.totalPages || 1) < page) {
          setPage(response.totalPages || 1);
          return;
        }

        setTitulos(response.data || []);
        setResumo(
          response.resumo || {
            quantidadeTitulos: 0,
            totalReceber: 0,
            totalPagar: 0,
            totalVencido: 0,
          }
        );
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        if (!mounted) return;
        setTitulos([]);
        setTotalPages(1);
        setResumo({
          quantidadeTitulos: 0,
          totalReceber: 0,
          totalPagar: 0,
          totalVencido: 0,
        });
        showAlert({
          title: "Falha ao carregar",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar os títulos financeiros.",
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
  }, [hideLoading, page, refreshKey, search, showAlert, showLoading, sort, status, tipo]);

  const handleEnviarBoletoWhatsApp = async (financeiroTituloId) => {
    try {
      showLoading();
      const response = await sendBoletoWhatsApp(financeiroTituloId);
      showAlert({
        title: "Envio concluído",
        text: response?.message || "Boletos enviados por WhatsApp com sucesso.",
        icon: "success",
      });
    } catch (error) {
      showAlert({
        title: "Falha ao enviar",
        text:
          error?.response?.data?.message ||
          "Não foi possível enviar os boletos por WhatsApp.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  };

  const handleEnviarPixWhatsApp = async (financeiroTituloId) => {
    try {
      showLoading();
      const response = await sendPixWhatsApp(financeiroTituloId);
      showAlert({
        title: "Envio concluído",
        text: response?.message || "PIX enviado por WhatsApp com sucesso.",
        icon: "success",
      });
    } catch (error) {
      showAlert({
        title: "Falha ao enviar",
        text:
          error?.response?.data?.message || "Não foi possível enviar o PIX por WhatsApp.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  };

  return {
    titulos,
    resumo,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
    handleEnviarBoletoWhatsApp,
    handleEnviarPixWhatsApp,
  };
};
