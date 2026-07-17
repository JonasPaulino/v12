import { useContext, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { AppContext } from "../context/AppContext.jsx";
import { useSweetAlert } from "../context/SweetAlertContext.jsx";
import { getModuleForCaixa } from "../constants/pdv.js";

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const AUTO_SYNC_LOGIN_DELAY_MS = 15 * 1000;

function buildReleaseMessageFromStatus(statusLocal, details = {}) {
  if (!statusLocal) return null;

  if (statusLocal === "verificando") {
    return "Verificando se existe uma nova versão do PDV.";
  }

  if (statusLocal === "instalando") {
    return "Nova versão encontrada. O PDV será atualizado e reiniciado automaticamente.";
  }

  if (statusLocal === "baixando") {
    const percent = Number(details?.percent || 0);
    return percent > 0
      ? `Baixando atualização do PDV ${Math.round(percent)}%.`
      : "Baixando atualização do PDV.";
  }

  if (statusLocal === "pendente_reinicio") {
    return "Atualização aplicada. Reinicie o PDV para concluir.";
  }

  if (statusLocal === "recursos_aplicado") {
    return "Recursos do PDV atualizados com sucesso.";
  }

  if (statusLocal === "baixado" || statusLocal === "staged") {
    return "Atualização baixada. Ela será aplicada quando o caixa estiver fechado.";
  }

  if (statusLocal === "erro") {
    return details?.ultimo_erro || "Ocorreu uma falha ao preparar a atualização do PDV.";
  }

  return null;
}

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
    releaseMessage: null,
    releaseStatus: null,
    releaseTargetVersion: null,
    version: null,
  });
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const syncLockRef = useRef(false);
  const releaseActionRef = useRef({
    status: null,
    version: null,
  });

  async function refreshReleaseStatus() {
    const releaseStatus = await api.releaseStatus().catch(() => null);
    if (!releaseStatus?.versao_atual) return null;

    const latestLocal = releaseStatus?.latest_local || releaseStatus?.pendente_aplicacao || null;
    const releaseMessage = buildReleaseMessageFromStatus(latestLocal?.status, latestLocal);

    setSyncState((current) => ({
      ...current,
      version: releaseStatus.versao_atual,
      releaseStatus: latestLocal?.status || null,
      releaseTargetVersion: latestLocal?.versao || null,
      releaseMessage: current.running ? current.releaseMessage : releaseMessage,
    }));
    return releaseStatus;
  }

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
        refreshReleaseStatus(),
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
      const result = await api.atualizarPdvCompleto({ full: !silent });
      await loadInitialData({ silent: true, suppressErrorAlert: true });
      setSyncState((current) => ({
        ...current,
        lastSuccessAt: new Date().toISOString(),
        lastError: null,
      }));
      const steps = Array.isArray(result?.steps) ? result.steps.map((step) => step.label) : [];
      const releaseStep = Array.isArray(result?.steps)
        ? result.steps.find((step) => step.key === "release")
        : null;
      const statusLocal = releaseStep?.details?.statusLocal;
      const versaoDisponivel = releaseStep?.details?.versaoDisponivel || null;
      const releaseMessage =
        buildReleaseMessageFromStatus(statusLocal, releaseStep?.details) ||
        (releaseStep?.details?.updateAvailable
          ? `Atualização ${releaseStep.details.versaoDisponivel || ""} disponível.`
          : releaseStep?.success
            ? "PDV sem atualização pendente."
            : releaseStep?.details?.message || null);
      setSyncState((current) => ({
        ...current,
        releaseMessage,
        releaseStatus: statusLocal || null,
        releaseTargetVersion: versaoDisponivel,
      }));
      if (releaseStep?.details?.updateAvailable && window.v12Desktop?.checkForUpdates) {
        void window.v12Desktop.checkForUpdates();
      }
      if (!silent && statusLocal !== "instalando") {
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

  async function prepararAtualizacaoRelease({ reason = "startup" } = {}) {
    if (syncLockRef.current) {
      return { blocked: false, busy: true };
    }

    syncLockRef.current = true;
    setSyncState((current) => ({
      ...current,
      running: true,
      mode: "release",
      reason,
      lastError: null,
      releaseStatus: "verificando",
      releaseTargetVersion: null,
      releaseMessage: buildReleaseMessageFromStatus("verificando"),
    }));

    try {
      const result = await api.prepararAtualizacaoRelease();
      const latestLocal = result?.local || null;
      const statusLocal = result?.statusLocal || latestLocal?.status || null;
      const releaseTargetVersion =
        latestLocal?.versao || result?.release?.versao || result?.latest?.versao || null;
      const releaseMessage =
        buildReleaseMessageFromStatus(statusLocal, latestLocal) ||
        (statusLocal === "baixado"
          ? "Atualização baixada. Ela será aplicada quando o caixa estiver fechado."
          : null);

      setSyncState((current) => ({
        ...current,
        releaseMessage,
        releaseStatus: statusLocal,
        releaseTargetVersion,
        lastSuccessAt: new Date().toISOString(),
      }));

      return {
        blocked: statusLocal === "instalando" || statusLocal === "pendente_reinicio",
        result,
      };
    } catch (error) {
      setSyncState((current) => ({
        ...current,
        lastError: String(error?.message || error),
        releaseMessage: null,
        releaseStatus: null,
        releaseTargetVersion: null,
      }));
      console.error("[pdv-session] Falha ao verificar release", {
        reason,
        message: error?.message,
      });
      return { blocked: false, error };
    } finally {
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
    const unsubscribe = window.v12Desktop?.onReleaseUpdaterState?.((payload = {}) => {
      const status = String(payload.status || "");
      const mappedStatus =
        status === "downloading"
          ? "baixando"
          : status === "available"
            ? "baixando"
            : status === "installing"
              ? "instalando"
              : status === "checking"
                ? "verificando"
                : status === "error"
                  ? "erro"
                  : null;

      setSyncState((current) => ({
        ...current,
        running: ["checking", "available", "downloading", "installing"].includes(status),
        mode: mappedStatus ? "release" : null,
        releaseStatus: mappedStatus,
        releaseTargetVersion: payload.version || current.releaseTargetVersion,
        releaseMessage:
          payload.message ||
          buildReleaseMessageFromStatus(mappedStatus, { percent: payload.percent }),
        lastError: status === "error" ? payload.message || "Falha ao atualizar o PDV." : current.lastError,
      }));
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  useEffect(() => {
    const status = String(syncState?.releaseStatus || "");
    const version = String(syncState?.releaseTargetVersion || "");

    if (!status) {
      releaseActionRef.current = { status: null, version: null };
      return undefined;
    }

    const alreadyHandled =
      releaseActionRef.current.status === status && releaseActionRef.current.version === version;

    if (alreadyHandled) {
      return undefined;
    }

    if (status === "pendente_reinicio" || status === "recursos_aplicado") {
      releaseActionRef.current = { status, version };
      const timeoutId = window.setTimeout(() => {
        if (window.v12Desktop?.restart) {
          void window.v12Desktop.restart();
        }
      }, 2200);
      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [syncState?.releaseStatus, syncState?.releaseTargetVersion]);

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
        const releaseResult = await prepararAtualizacaoRelease({ reason: "startup" });
        if (!active || releaseResult?.blocked) return;
      }
    };

    void boot();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleOperadorLogin(operadorData) {
    let loginCarregado = false;

    try {
      showLoading("Verificando caixa...");
      const caixaData = await api.caixaAtual();
      setCaixa(caixaData);
      setActiveModule(getModuleForCaixa(caixaData));
      setOperador(operadorData);
      loginCarregado = true;
    } catch (error) {
      showAlert({
        title: "Falha ao carregar caixa",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }

    if (loginCarregado) {
      void onCarregarFinanceiroSupportData({ silent: true, refresh: true }).catch((error) => {
        console.error("[pdv-session] Falha ao carregar apoio financeiro em segundo plano", {
          message: error?.message,
        });
      });
    }
  }

  useEffect(() => {
    if (!configStatus?.configurado || configStatus?.bloqueado || !operador) return undefined;

    const runBackgroundSync = () => {
      void atualizarPdvCompleto({
        silent: true,
        reason: "auto",
      });
    };

    const initialSyncId = window.setTimeout(runBackgroundSync, AUTO_SYNC_LOGIN_DELAY_MS);
    const intervalId = window.setInterval(runBackgroundSync, AUTO_SYNC_INTERVAL_MS);
    return () => {
      window.clearTimeout(initialSyncId);
      window.clearInterval(intervalId);
    };
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
