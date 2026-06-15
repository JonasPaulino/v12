import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { emitFileAsBase64 } from "./utils";
import { emitirNfe, getPedidosEmitirSelect, importarXmlNfe } from "./api";

const buildInitialEmitForm = () => ({
  pedido_venda_id: "",
  natureza_operacao: "",
  finalidade: "normal",
  tipo_operacao: "saida",
  observacao: "",
});

const buildInitialImportForm = () => ({
  xml_conteudo: "",
  chave_acesso: "",
  natureza_operacao: "XML importado",
  origem: "manual",
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
  const [activeTab, setActiveTab] = useState("emitir");
  const [submitting, setSubmitting] = useState(false);
  const [emitForm, setEmitForm] = useState(buildInitialEmitForm());
  const [importForm, setImportForm] = useState(buildInitialImportForm());
  const [selectedPedido, setSelectedPedido] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("emitir");
      setSubmitting(false);
      setEmitForm(buildInitialEmitForm());
      setImportForm(buildInitialImportForm());
      setSelectedPedido(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

  const updateEmitField = (field, value) => {
    setEmitForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateImportField = (field, value) => {
    setImportForm((prev) => ({ ...prev, [field]: value }));
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

  const handleFileXml = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await emitFileAsBase64(file, false);
      updateImportField("xml_conteudo", content);
    } catch (error) {
      showAlert({
        title: "Falha ao ler XML",
        text: error.message || "Não foi possível ler o XML informado.",
        icon: "error",
      });
    }
  };

  const submitEmitir = async () => {
    if (!emitForm.pedido_venda_id) {
      throw new Error("Selecione um pedido de venda para emitir a NF-e.");
    }

    return emitirNfe(emitForm);
  };

  const submitImportar = async () => {
    if (!String(importForm.xml_conteudo || "").trim()) {
      throw new Error("Informe o conteúdo XML da NF-e para importar.");
    }

    return importarXmlNfe(importForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      showLoading(activeTab === "emitir" ? "Registrando NF-e..." : "Importando XML...");

      const response = activeTab === "emitir" ? await submitEmitir() : await submitImportar();

      showAlert({
        title: "Sucesso",
        text:
          response?.message ||
          (activeTab === "emitir"
            ? "NF-e registrada com sucesso."
            : "XML importado com sucesso."),
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
    activeTab,
    setActiveTab,
    submitting,
    emitForm,
    importForm,
    selectedPedido,
    fileInputRef,
    prontidao,
    updateEmitField,
    updateImportField,
    loadPedidosOptions,
    handleSelectPedido,
    handleFileXml,
    handleSubmit,
  };
};
