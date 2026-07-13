import { useContext, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { AppContext } from "../context/AppContext.jsx";
import { useSweetAlert } from "../context/SweetAlertContext.jsx";
import { getModuleForCaixa } from "../constants/pdv.js";

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export function usePdvSession({ onResetVenda, onCarregarFinanceiroSupportData }) {
  const [health, setHealth] = useState(null);
  const [configStatus, setConfigStatus] = useState(null);
  const [operador, setOperador] = useState(null);
  const [caixa, setCaixa] = useState(null);
  const [activeModule, setActiveModule] = useState("abertura");
  const [syncState, setSyncState] = useState({
    running: false,
    mode: null,
    reason: null,
    lastSuccessAt: null,
    lastError: null,
  });
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const syncLockRef = useRef(false);

  async function loadInitialData({ silent = false, suppressErrorAlert = false } = {}) {
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
      if (!suppressErrorAlert) {
        showAlert({
          title: "Falha ao atualizar",
          text: error.message,
          icon: "error",
        });
      }
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

  async function atualizarPdvCompleto({ silent = false, reason = "manual" } = {}) {
    if (syncLockRef.current) {
      if (!silent) {
        showAlert({
          title: "Atualizacao em andamento",
          text: "Uma atualizacao automatica esta sendo executada em segundo plano.",
          icon: "info",
        });
      }
      return { success: false, busy: true };
    }

    syncLockRef.current = true;
    setSyncState((current) => ({
      ...current,
      running: true,
      mode: silent ? "background" : "manual",
      reason,
      lastError: null,
    }));

    try {
      if (!silent) showLoading("Atualizando PDV...");
      const result = await api.atualizarPdvCompleto();
      await loadInitialData({ silent: true, suppressErrorAlert: true });
      setSyncState((current) => ({
        ...current,
        lastSuccessAt: new Date().toISOString(),
        lastError: null,
      }));
      const steps = Array.isArray(result?.steps) ? result.steps.map((step) => step.label) : [];
      if (!silent) {
        showAlert({
          title: "PDV atualizado",
          text: steps.length
            ? `${steps.join(", ")} atualizados com sucesso.`
            : "Filial, operadores, produtos, financeiro e pendencias locais foram atualizados.",
          icon: "success",
        });
      }
      return { success: true, result };
    } catch (error) {
      setSyncState((current) => ({
        ...current,
        lastError: String(error?.message || error),
      }));
      if (!silent) {
        showAlert({
          title: "Falha na atualizacao",
          text: error.message,
          icon: "error",
        });
      } else {
        console.error("[pdv-session] Falha na atualizacao automatica", {
          reason,
          message: error?.message,
        });
      }
      return { success: false, error };
    } finally {
      if (!silent) hideLoading();
      syncLockRef.current = false;
      setSyncState((current) => ({
        ...current,
        running: false,
        mode: null,
        reason: null,
      }));
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

  useEffect(() => {
    if (!operador) return undefined;

    const runBackgroundSync = () => {
      void atualizarPdvCompleto({ silent: true, reason: "auto" });
    };

    runBackgroundSync();
    const intervalId = window.setInterval(runBackgroundSync, AUTO_SYNC_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [operador]);

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
    void atualizarPdvCompleto({ silent: true, reason: "caixa_aberto" });
  }

  function handleCaixaFechado() {
    onResetVenda();
    setCaixa(null);
    setActiveModule("abertura");
    void atualizarPdvCompleto({ silent: true, reason: "caixa_fechado" });
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
    syncState,
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
