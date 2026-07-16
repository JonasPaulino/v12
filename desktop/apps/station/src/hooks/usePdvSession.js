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

  function aplicarBloqueioTerminal(statusData) {
    if (!statusData?.bloqueado) return false;
    onResetVenda();
    setOperador(null);
    setCaixa(null);
    setActiveModule("abertura");
    if (statusData.config) {
      setConfigStatus(statusData);
    }
    return true;
  }

  async function loadInitialData({ silent = false, suppressErrorAlert = false } = {}) {
    try {
      if (!silent) showLoading("Atualizando PDV...");
      const [healthData, statusData] = await Promise.all([
        api.health(),
        api.configuracaoStatus(),
      ]);
      setHealth(healthData);
      setConfigStatus(statusData);

      if (!statusData?.configurado) {
        setCaixa(null);
        setActiveModule("abertura");
        return statusData;
      }

      if (aplicarBloqueioTerminal(statusData)) {
        return statusData;
      }

      const caixaData = await api.caixaAtual();
      setCaixa(caixaData);
      setActiveModule(getModuleForCaixa(caixaData));

      if (!silent) {
        showAlert({
          title: "PDV atualizado",
          text: "Dados locais atualizados com sucesso.",
          icon: "success",
        });
      }
      return statusData;
    } catch (error) {
      if (!silent && !suppressErrorAlert) {
        showAlert({
          title: "Falha ao atualizar",
          text: error.message,
          icon: "error",
        });
      }
      return null;
    } finally {
      if (!silent) {
        hideLoading();
      }
    }
  }

  async function atualizarPdvCompleto({ silent = false, reason = "manual" } = {}) {
    if (syncLockRef.current) {
      if (!silent) {
        showAlert({
          title: "Atualização em andamento",
          text: "Uma atualização automática está sendo executada em segundo plano.",
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
            : "Filial, operadores, produtos, financeiro e pendências locais foram atualizados.",
          icon: "success",
        });
      }
      return { success: true, result };
    } catch (error) {
      const statusData = await api.configuracaoStatus().catch(() => null);
      if (statusData?.config) {
        setConfigStatus(statusData);
      }
      const terminalBloqueado = aplicarBloqueioTerminal(statusData);

      setSyncState((current) => ({
        ...current,
        lastError: terminalBloqueado
          ? statusData?.motivo_bloqueio ||
            "A filial está bloqueada na retaguarda."
          : String(error?.message || error),
      }));
      if (!silent && !terminalBloqueado) {
        showAlert({
          title: "Falha na atualização",
          text: error.message,
          icon: "error",
        });
      } else {
        console.error("[pdv-session] Falha na atualização automática", {
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

  useEffect(() => {
    if (!operador) return;
    setActiveModule(getModuleForCaixa(caixa));
  }, [caixa, operador]);

  useEffect(() => {
    let active = true;

    const boot = async () => {
      const statusData = await refreshTerminalStatus({ syncRemote: true, silent: true });
      if (!active) return;

      if (statusData?.configurado && !statusData?.bloqueado) {
        void atualizarPdvCompleto({ silent: true, reason: "startup" });
      }
    };

    void boot();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!configStatus?.configurado || configStatus?.bloqueado) return undefined;

    const runBackgroundSync = () => {
      void atualizarPdvCompleto({
        silent: true,
        reason: operador ? "auto" : "pre_login",
      });
    };

    if (operador) {
      runBackgroundSync();
    }

    const intervalId = window.setInterval(runBackgroundSync, AUTO_SYNC_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [configStatus?.bloqueado, configStatus?.configurado, operador]);

  async function refreshTerminalStatus({ syncRemote = false, silent = true } = {}) {
    try {
      if (syncRemote) {
        await api.sincronizarFilial();
      }
    } catch {
      // segue para refletir o último estado salvo localmente
    }

    return loadInitialData({ silent, suppressErrorAlert: true });
  }

  async function consultarStatusFiscalLocal() {
    try {
      showLoading("Consultando status fiscal...");
      const healthData = await api.health();
      setHealth(healthData);
      showAlert({
        title: "Status fiscal do terminal",
        text:
          healthData?.fiscal?.message ||
          "O terminal respondeu, mas não retornou detalhes fiscais adicionais.",
        icon: healthData?.fiscal?.ready ? "success" : "info",
      });
    } catch (error) {
      showAlert({
        title: "Falha na consulta",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  async function enviarContingenciasFiscais() {
    try {
      showLoading("Reenviando NFC-e em contingência...");
      const data = await api.reenviarContingenciasNfce();
      const total = Number(data?.total || 0);
      const autorizadas = Number(data?.autorizadas || 0);
      const pendentes = Number(data?.em_contingencia || 0);
      const rejeitadas = Number(data?.rejeitadas || 0);
      await loadInitialData({ silent: true, suppressErrorAlert: true });
      showAlert({
        title: "Contingências processadas",
        text:
          total > 0
            ? `${autorizadas} autorizada(s), ${pendentes} ainda em contingência e ${rejeitadas} rejeitada(s).`
            : "Não há NFC-e em contingência neste terminal.",
        icon: total > 0 ? "success" : "info",
      });
    } catch (error) {
      showAlert({
        title: "Falha no reenvio",
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
        text: "Abra o caixa antes de acessar esta operação.",
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
      "Deseja encerrar a sessão do operador atual?",
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
      title: "Opção indisponível",
      text: "Tela cheia está disponível somente no app Electron.",
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
    refreshTerminalStatus,
    consultarStatusFiscalLocal,
    enviarContingenciasFiscais,
    atualizarPdvCompleto,
    handleOperadorLogin,
    openModule,
    handleCaixaAberto,
    handleCaixaFechado,
    sairDoSistema,
    alternarTelaCheia,
  };
}
