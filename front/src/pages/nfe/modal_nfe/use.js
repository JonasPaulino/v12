import { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { emitirNfe, getPedidosEmitirSelect } from "./api";

const buildInitialEmitForm = () => ({
  pedido_venda_id: "",
  natureza_operacao: "",
  finalidade: "normal",
  tipo_operacao: "saida",
  observacao: "",
});

const buildPedidoOption = (pedido) => ({
  value: pedido.pedido_venda_id,
  label: `Pedido #${pedido.pedido_venda_id} - ${pedido.pessoa_nome_razao}`,
  meta: `${pedido.pessoa_cpf_cnpj || "Sem documento"} • ${new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(pedido.total || 0))}`,
  raw: pedido,
});

export const useModalNfe = ({ isOpen, supportData, onClose }) => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [submitting, setSubmitting] = useState(false);
  const [emitForm, setEmitForm] = useState(buildInitialEmitForm());
  const [selectedPedido, setSelectedPedido] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setSubmitting(false);
      setEmitForm(buildInitialEmitForm());
      setSelectedPedido(null);
    }
  }, [isOpen]);

  const updateEmitField = (field, value) => {
    setEmitForm((prev) => ({ ...prev, [field]: value }));
  };

  const loadPedidosOptions = async (search) => {
    const response = await getPedidosEmitirSelect(search);
    return (response.data || []).map((item) => buildPedidoOption(item));
  };

  const handleSelectPedido = (value, option) => {
    setSelectedPedido(option || null);
    setEmitForm((prev) => ({
      ...prev,
      pedido_venda_id: value ? String(value) : "",
      natureza_operacao:
        prev.natureza_operacao || supportData?.configuracao?.natureza_operacao_padrao || "",
    }));
  };

  const submitEmitir = async () => {
    if (!emitForm.pedido_venda_id) {
      throw new Error("Selecione um pedido de venda para emitir a NF-e.");
    }

    return emitirNfe(emitForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      showLoading("Registrando NF-e...");

      const response = await submitEmitir();

      showAlert({
        title: "Sucesso",
        text: response?.message || "NF-e registrada com sucesso.",
        icon: "success",
        timer: 2200,
      });

      onClose(true);
    } catch (error) {
      showAlert({
        title: "Falha ao salvar",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Não foi possível concluir a operação fiscal.",
        icon: "error",
      });
    } finally {
      hideLoading();
      setSubmitting(false);
    }
  };

  const prontidao = useMemo(() => supportData?.pronto_para_emitir ?? false, [supportData]);

  return {
    submitting,
    emitForm,
    selectedPedido,
    prontidao,
    updateEmitField,
    loadPedidosOptions,
    handleSelectPedido,
    handleSubmit,
  };
};
