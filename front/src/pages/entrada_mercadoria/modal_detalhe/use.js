import { useContext, useEffect, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { getEntradaMercadoria } from "../api";

export const useModalDetalheEntradaMercadoria = ({ entradaMercadoriaId }) => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!entradaMercadoriaId) {
      setData(null);
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        showLoading("Carregando entrada...");
        const response = await getEntradaMercadoria(entradaMercadoriaId);
        if (!mounted) return;
        setData(response?.data || null);
      } catch (error) {
        if (!mounted) return;
        setData(null);
        showAlert({
          title: "Falha ao carregar",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar os detalhes da entrada.",
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
  }, [entradaMercadoriaId, hideLoading, showAlert, showLoading]);

  return {
    data,
  };
};

