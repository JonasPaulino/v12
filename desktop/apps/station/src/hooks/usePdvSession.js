import { useContext, useEffect, useState } from "react";
import { api } from "../api.js";
import { AppContext } from "../context/AppContext.jsx";
import { useSweetAlert } from "../context/SweetAlertContext.jsx";
import { getModuleForCaixa } from "../constants/pdv.js";

export function usePdvSession({ onResetVenda, onCarregarFinanceiroSupportData }) {
  const [health, setHealth] = useState(null);
  const [configStatus, setConfigStatus] = useState(null);
  const [operador, setOperador] = useState(null);
  const [caixa, setCaixa] = useState(null);
  const [activeModule, setActiveModule] = useState("abertura");
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();

  async function loadInitialData({ silent = false } = {}) {
    try {
      if (!silent) showLoading("Atualizando PDV...");
      const [healthData, statusData, caixaData] = await Promise.all([
        api.health(),
        api.configuracaoStatus(),
        api.caixaAtual(),
      ]);
      setHealth(healthData);
      setConfigStatus(statusData);
      setCaixa(caixaData);
      setActiveModule(getModuleForCaixa(caixaData));
      if (!silent) {
        showAlert({
          title: "PDV atualizado",
          text: "Dados locais atualizados com sucesso.",
          icon: "success",
        });
      }
    } catch (error) {
      showAlert({
        title: "Falha ao atualizar",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  useEffect(() => {
    loadInitialData({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!operador) return;
    setActiveModule(getModuleForCaixa(caixa));
  }, [caixa, operador]);

  async function atualizarPdvCompleto() {
    try {
      showLoading("Atualizando PDV...");
      const result = await api.atualizarPdvCompleto();
      await loadInitialData({ silent: true });
      const steps = Array.isArray(result?.steps) ? result.steps.map((step) => step.label) : [];
      showAlert({
        title: "PDV atualizado",
        text: steps.length
          ? `${steps.join(", ")} atualizados com sucesso.`
          : "Filial, operadores, produtos, financeiro e pendencias locais foram atualizados.",
        icon: "success",
      });
    } catch (error) {
      showAlert({
        title: "Falha na atualizacao",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  async function handleOperadorLogin(operadorData) {
    try {
      showLoading("Verificando caixa...");
      const caixaData = await api.caixaAtual();
      setCaixa(caixaData);
      setActiveModule(getModuleForCaixa(caixaData));
      setOperador(operadorData);
      await onCarregarFinanceiroSupportData({ silent: true, refresh: true });
    } catch (error) {
      showAlert({
        title: "Falha ao carregar caixa",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  function openModule(module) {
    if (
      !["configuracao", "historico_vendas"].includes(module) &&
      caixa?.caixa_pendente_dia_anterior &&
      module !== "fechamento"
    ) {
      showAlert({
        title: "Fechamento pendente",
        text: `Existe um caixa aberto do dia ${caixa.data_operacional}. Feche esse caixa antes de continuar.`,
        icon: "warning",
      });
      setActiveModule("fechamento");
      return;
    }

    if (!caixa && !["abertura", "configuracao", "historico_vendas"].includes(module)) {
      showAlert({
        title: "Caixa fechado",
        text: "Abra o caixa antes de acessar esta operacao.",
        icon: "info",
      });
      setActiveModule("abertura");
      return;
    }

    setActiveModule(module);
  }

  function handleCaixaAberto(data) {
    setCaixa(data);
    setActiveModule(data?.caixa_pendente_dia_anterior ? "fechamento" : "venda");
  }

  function handleCaixaFechado() {
    onResetVenda();
    setCaixa(null);
    setActiveModule("abertura");
  }

  async function sairDoSistema() {
    const confirmed = await askYesNoQuestion(
      "Sair do sistema",
      "Deseja encerrar a sessao do operador atual?",
    );

    if (!confirmed) return;

    onResetVenda();
    setOperador(null);
    setActiveModule(getModuleForCaixa(caixa));
  }

  function alternarTelaCheia() {
    if (window.v12Desktop?.toggleFullscreen) {
      window.v12Desktop.toggleFullscreen();
      return;
    }

    showAlert({
      title: "Opcao indisponivel",
      text: "Tela cheia esta disponivel somente no app Electron.",
      icon: "info",
    });
  }

  return {
    health,
    configStatus,
    operador,
    caixa,
    activeModule,
    caixaPendenteDiaAnterior: !!caixa?.caixa_pendente_dia_anterior,
    loadInitialData,
    atualizarPdvCompleto,
    handleOperadorLogin,
    openModule,
    handleCaixaAberto,
    handleCaixaFechado,
    sairDoSistema,
    alternarTelaCheia,
  };
}
