import { useCallback, useEffect, useRef, useState } from "react";
import { useSweetAlert } from "context/sweet_alert";
import {
  atualizarSolicitacaoXmlEntrada,
  getSolicitacoesXmlEntrada,
  importarSolicitacaoXmlEntrada,
  importarXmlEntradaMercadoria,
  solicitarXmlEntradaPorChave,
} from "../api";

const normalizeAccessKey = (value) => String(value || "").replace(/\D/g, "").slice(0, 44);

const buildConsultaFeedback = (response) => {
  const data = response?.data || {};
  if (data.status === "xml_disponivel") {
    return {
      title: "XML disponível",
      text: "XML disponível para importação.",
      icon: "success",
    };
  }

  if (data.status === "erro") {
    return {
      title: data.cstat === "217" ? "NF-e não encontrada" : "Consulta com rejeição",
      text: data.xmotivo || response?.message || "A SEFAZ retornou rejeição para a chave.",
      icon: "warning",
    };
  }

  return {
    title: "Consulta registrada",
    text: data.xmotivo || response?.message || "Consulta enviada para a SEFAZ.",
    icon: "success",
  };
};

export const useModalImportarNota = ({ isOpen, onClose }) => {
  const { showAlert } = useSweetAlert();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("chave");
  const [search, setSearch] = useState("");
  const [chaveAcesso, setChaveAcesso] = useState("");
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchingKey, setSearchingKey] = useState(false);
  const [importingFile, setImportingFile] = useState(false);

  const loadSolicitacoes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getSolicitacoesXmlEntrada(search, 20);
      setSolicitacoes(response?.data || []);
    } catch (error) {
      showAlert({
        title: "Falha ao carregar consultas",
        text: error?.response?.data?.message || "Não foi possível carregar as solicitações.",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [search, showAlert]);

  useEffect(() => {
    if (!isOpen) return;
    loadSolicitacoes();
  }, [isOpen, loadSolicitacoes]);

  const handleBuscarChave = useCallback(async () => {
    const chave = normalizeAccessKey(chaveAcesso);
    if (!/^\d{44}$/.test(chave)) {
      showAlert({
        title: "Chave inválida",
        text: "Informe uma chave de acesso com 44 dígitos.",
        icon: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      setSearchingKey(true);
      const response = await solicitarXmlEntradaPorChave(chave);
      const feedback = buildConsultaFeedback(response);
      showAlert({
        title: feedback.title,
        text: feedback.text,
        icon: feedback.icon,
        timer: 2200,
      });
      setChaveAcesso("");
      await loadSolicitacoes();
    } catch (error) {
      showAlert({
        title: "Falha ao consultar chave",
        text: error?.response?.data?.message || "Não foi possível consultar a chave informada.",
        icon: "error",
      });
    } finally {
      setSearchingKey(false);
      setSubmitting(false);
    }
  }, [chaveAcesso, loadSolicitacoes, showAlert]);

  const handleAtualizarSolicitacao = useCallback(
    async (solicitacaoId) => {
      try {
        setSubmitting(true);
        const response = await atualizarSolicitacaoXmlEntrada(solicitacaoId);
        const feedback = buildConsultaFeedback(response);
        showAlert({
          title: response?.data?.status === "erro" ? feedback.title : "Consulta atualizada",
          text: feedback.text,
          icon: feedback.icon,
          timer: 2200,
        });
        await loadSolicitacoes();
      } catch (error) {
        showAlert({
          title: "Falha ao atualizar",
          text: error?.response?.data?.message || "Não foi possível atualizar a consulta.",
          icon: "error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [loadSolicitacoes, showAlert]
  );

  const handleImportarSolicitacao = useCallback(
    async (solicitacaoId) => {
      try {
        setSubmitting(true);
        const response = await importarSolicitacaoXmlEntrada(solicitacaoId);
        showAlert({
          title: "XML importado",
          text: response?.message || "Entrada registrada com sucesso.",
          icon: "success",
          timer: 1800,
        });
        onClose(true);
      } catch (error) {
        showAlert({
          title: "Falha ao importar XML",
          text: error?.response?.data?.message || "Não foi possível importar o XML disponível.",
          icon: "error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [onClose, showAlert]
  );

  const handleSelectXml = useCallback(
    async (event) => {
      const file = event.target.files?.[0] || null;
      event.target.value = "";
      if (!file) return;

      try {
        setImportingFile(true);
        const response = await importarXmlEntradaMercadoria(file);
        showAlert({
          title: "XML importado",
          text: response?.message || "Entrada registrada com sucesso.",
          icon: "success",
          timer: 1800,
        });
        onClose(true);
      } catch (error) {
        showAlert({
          title: "Falha ao importar XML",
          text: error?.response?.data?.message || "Não foi possível importar o XML informado.",
          icon: "error",
        });
      } finally {
        setImportingFile(false);
      }
    },
    [onClose, showAlert]
  );

  return {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    chaveAcesso,
    setChaveAcesso: (value) => setChaveAcesso(normalizeAccessKey(value)),
    solicitacoes,
    loading,
    submitting,
    searchingKey,
    importingFile,
    fileInputRef,
    loadSolicitacoes,
    handleBuscarChave,
    handleAtualizarSolicitacao,
    handleImportarSolicitacao,
    handleSelectXml,
  };
};
