import { useContext, useEffect, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { atualizarDevolucao, getDevolucao } from "../api";

const formatDateInput = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

export const useModalEditarDevolucao = ({ devolucaoId, isOpen, onClose }) => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [form, setForm] = useState({
    data_devolucao: new Date().toISOString().slice(0, 10),
    motivo: "",
    observacao: "",
  });
  const [devolucao, setDevolucao] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !devolucaoId) return undefined;

    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        showLoading();
        const response = await getDevolucao(devolucaoId);
        if (!mounted) return;
        const loaded = response?.data?.devolucao;
        setDevolucao(loaded || null);
        setForm({
          data_devolucao: formatDateInput(loaded?.data_devolucao),
          motivo: loaded?.motivo || "",
          observacao: loaded?.observacao || "",
        });
      } catch (error) {
        if (!mounted) return;
        showAlert({
          title: "Falha ao carregar",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar os dados da devolução.",
          icon: "error",
        });
        onClose(false);
      } finally {
        if (mounted) setLoading(false);
        hideLoading();
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [devolucaoId, hideLoading, isOpen, onClose, showAlert, showLoading]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.data_devolucao) {
      showAlert({
        title: "Data obrigatória",
        text: "Informe a data da devolução.",
        icon: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      showLoading("Salvando devolução...");
      const response = await atualizarDevolucao(devolucaoId, form);
      showAlert({
        title: "Devolução atualizada",
        text: response?.message || "Os dados foram atualizados com sucesso.",
        icon: "success",
        timer: 1800,
      });
      onClose(true);
    } catch (error) {
      showAlert({
        title: "Falha ao salvar",
        text:
          error?.response?.data?.message ||
          "Não foi possível atualizar a devolução selecionada.",
        icon: "error",
      });
    } finally {
      setSubmitting(false);
      hideLoading();
    }
  };

  return {
    form,
    devolucao,
    loading,
    submitting,
    updateField,
    handleSubmit,
  };
};
