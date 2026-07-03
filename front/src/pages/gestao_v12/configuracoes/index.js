import React, { useCallback, useContext, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { api } from "api/axiosConfig";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { GestaoV12Layout } from "layouts/gestao_v12";
import * as C from "./style";

const initialAsaasForm = {
  ativo: false,
  ambiente: "sandbox",
  api_key: "",
};

const initialWhatsAppForm = {
  provider: "evolution",
  whatsapp_ativo: false,
  instance_name: "",
  remetente_numero: "",
  mensagem_boleto_padrao: "",
  mensagem_pix_padrao: "",
};

const initialChatForm = {
  chat_ativo: true,
  horario_inicio: "08:00",
  horario_fim: "18:00",
  mensagem_fora_horario: "",
};

const normalizeWhatsAppStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "open") return "open";
  if (/connected|online|session_connected|logged/.test(normalized)) return "open";
  if (normalized === "connecting") return "connecting";
  if (/qr|pair|scan|pending|pairing/.test(normalized)) return "connecting";
  if (normalized === "close") return "close";
  if (/closed|disconnected|offline|logout/.test(normalized)) return "close";
  if (normalized === "not_found") return "not_found";

  return "unknown";
};

const extractWhatsAppState = (payload = {}) => {
  const candidates = [
    payload?.state,
    payload?.connection,
    payload?.status,
    payload?.instance?.state,
    payload?.instance?.status,
    payload?.data?.state,
    payload?.data?.connection,
    payload?.data?.status,
    payload?.data?.data?.state,
    payload?.data?.data?.connection,
    payload?.data?.data?.status,
    payload?.raw?.state,
    payload?.raw?.connection,
    payload?.raw?.status,
    payload?.raw?.instance?.state,
    payload?.raw?.instance?.status,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeWhatsAppStatus(candidate);
    if (normalized !== "unknown") return normalized;
  }

  return "unknown";
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildWhatsAppQrHtml = ({ image = "", pairingCode = "" } = {}) => `
  <div style="display:grid;gap:14px;justify-items:center;text-align:center;">
    ${
      image
        ? `<img src="${image}" alt="QR Code do WhatsApp" style="width:240px;height:240px;object-fit:contain;border:1px solid #d8e1f0;border-radius:20px;padding:12px;background:#fff;" />`
        : ""
    }
    ${
      pairingCode
        ? `<div style="display:grid;gap:6px;justify-items:center;">
             <span style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7a96;">Código</span>
             <strong style="font-size:18px;color:#13233f;">${escapeHtml(pairingCode)}</strong>
           </div>`
        : ""
    }
    <p style="margin:0;color:#667085;font-size:14px;line-height:1.5;">
      Abra o WhatsApp no celular, escaneie o QR Code e aguarde a confirmação.
    </p>
  </div>
`;

const statusLabel = (status) => {
  if (status === "open") return "Conectado";
  if (status === "connecting") return "Aguardando leitura";
  if (status === "not_found") return "Instância não encontrada";
  if (status === "close") return "Desconectado";

  return "Sem status";
};

export const GestaoV12Configuracoes = () => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [activeTab, setActiveTab] = useState("cobranca");
  const [activeMensagemTab, setActiveMensagemTab] = useState("conectar");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [whatsAppState, setWhatsAppState] = useState({
    loading: false,
    state: "unknown",
    image: "",
    pairingCode: "",
  });
  const [asaasConfig, setAsaasConfig] = useState(null);
  const [asaasForm, setAsaasForm] = useState(initialAsaasForm);
  const [whatsAppForm, setWhatsAppForm] = useState(initialWhatsAppForm);
  const [chatForm, setChatForm] = useState(initialChatForm);
  const [chatCategorias, setChatCategorias] = useState([]);
  const [savingChat, setSavingChat] = useState(false);

  const loadAsaasConfig = useCallback(async () => {
    setLoading(true);
    showLoading("Carregando configurações...");
    try {
      const { data } = await api.get("/gestao/financeiro/configuracao/asaas");
      const config = data.data || {};
      setAsaasConfig(config);
      setAsaasForm({
        ativo: config.ativo === true,
        ambiente: config.ambiente || "sandbox",
        api_key: "",
      });
    } catch (error) {
      hideLoading();
      showAlert?.({
        title: "Falha ao carregar configuração",
        text: error?.response?.data?.message || "Não foi possível carregar o Asaas da V12.",
        icon: "error",
      });
    } finally {
      setLoading(false);
      hideLoading();
    }
  }, [hideLoading, showAlert, showLoading]);

  useEffect(() => {
    loadAsaasConfig();
  }, [loadAsaasConfig]);

  const applyWhatsAppConfig = useCallback((config = {}) => {
    if (!config || typeof config !== "object") return;

    setWhatsAppForm({
      provider: config.provider || "evolution",
      whatsapp_ativo: config.whatsapp_ativo === true,
      instance_name: config.instance_name || "",
      remetente_numero: config.remetente_numero || "",
      mensagem_boleto_padrao: config.mensagem_boleto_padrao || "",
      mensagem_pix_padrao: config.mensagem_pix_padrao || "",
    });
  }, []);

  const applyWhatsAppConnection = useCallback((payload = {}) => {
    const nextState = normalizeWhatsAppStatus(payload.state);

    setWhatsAppState((current) => ({
      ...current,
      state: nextState,
      image: nextState === "open" ? "" : payload.image || current.image || "",
      pairingCode: nextState === "open" ? "" : payload.pairingCode || current.pairingCode || "",
    }));

    return nextState;
  }, []);

  const loadWhatsAppConfig = useCallback(async () => {
    try {
      const { data } = await api.get("/gestao/mensagens/whatsapp/configuracao");
      const config = data.data || {};
      applyWhatsAppConfig(config);

      if (config.instance_name) {
        try {
          const statusResponse = await api.get("/gestao/mensagens/whatsapp/status", {
            params: { instance_name: config.instance_name },
          });
          applyWhatsAppConnection({ state: extractWhatsAppState(statusResponse?.data) });
        } catch {
          applyWhatsAppConnection({ state: "unknown" });
        }
      }
    } catch (error) {
      showAlert?.({
        title: "Falha ao carregar WhatsApp",
        text:
          error?.response?.data?.message ||
          "Não foi possível carregar a configuração de mensagens da V12.",
        icon: "error",
      });
    }
  }, [applyWhatsAppConfig, applyWhatsAppConnection, showAlert]);

  useEffect(() => {
    loadWhatsAppConfig();
  }, [loadWhatsAppConfig]);

  const loadChatConfig = useCallback(async () => {
    try {
      const { data } = await api.get("/gestao/chat/configuracao");
      const config = data?.data?.configuracao || {};
      setChatForm({
        chat_ativo: config.chat_ativo !== false,
        horario_inicio: String(config.horario_inicio || "08:00").slice(0, 5),
        horario_fim: String(config.horario_fim || "18:00").slice(0, 5),
        mensagem_fora_horario: config.mensagem_fora_horario || "",
      });
      setChatCategorias(data?.data?.categorias || []);
    } catch (error) {
      showAlert?.({
        title: "Falha ao carregar chat",
        text: error?.response?.data?.message || "Não foi possível carregar as configurações do chat.",
        icon: "error",
      });
    }
  }, [showAlert]);

  useEffect(() => {
    loadChatConfig();
  }, [loadChatConfig]);

  const updateAsaasField = (field, value) => {
    setAsaasForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateWhatsAppField = (field, value) => {
    setWhatsAppForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateChatField = (field, value) => {
    setChatForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateChatCategoria = (categoriaId, field, value) => {
    setChatCategorias((current) =>
      current.map((categoria) =>
        categoria.categoria_id === categoriaId ? { ...categoria, [field]: value } : categoria
      )
    );
  };

  const addChatCategoria = () => {
    setChatCategorias((current) => [
      ...current,
      {
        categoria_id: `nova-${Date.now()}`,
        slug: "",
        nome: "",
        descricao: "",
        ativo: true,
        ordem: (current.length + 1) * 10,
      },
    ]);
  };

  const handleSaveChat = async () => {
    setSavingChat(true);
    showLoading("Salvando chat...");
    try {
      await api.put("/gestao/chat/configuracao", chatForm);

      for (const categoria of chatCategorias) {
        await api.post("/gestao/chat/categorias", categoria);
      }

      hideLoading();
      await loadChatConfig();
      showAlert?.({
        title: "Chat salvo",
        text: "As configurações do chat foram atualizadas.",
        icon: "success",
        timer: 1800,
      });
    } catch (error) {
      hideLoading();
      showAlert?.({
        title: "Falha ao salvar chat",
        text: error?.response?.data?.message || "Não foi possível salvar o chat.",
        icon: "error",
      });
    } finally {
      setSavingChat(false);
      hideLoading();
    }
  };

  const handleSubmitAsaas = async (event) => {
    event.preventDefault();
    setSaving(true);
    showLoading("Salvando configurações...");
    try {
      const { data } = await api.put("/gestao/financeiro/configuracao/asaas", asaasForm);
      const config = data.data || {};
      setAsaasConfig(config);
      setAsaasForm((current) => ({
        ...current,
        api_key: "",
      }));
      hideLoading();
      showAlert?.({
        title: "Configuração salva",
        text: "A conta Asaas da Gestão V12 foi atualizada.",
        icon: "success",
        timer: 1800,
      });
    } catch (error) {
      hideLoading();
      showAlert?.({
        title: "Falha ao salvar configuração",
        text: error?.response?.data?.message || "Não foi possível salvar a conta Asaas.",
        icon: "error",
      });
    } finally {
      setSaving(false);
      hideLoading();
    }
  };

  const handleSaveWhatsApp = useCallback(async () => {
    setSavingWhatsApp(true);
    try {
      const { data } = await api.put(
        "/gestao/mensagens/whatsapp/configuracao",
        whatsAppForm
      );
      applyWhatsAppConfig(data.data);

      showAlert?.({
        title: "Configuração salva",
        text: "As mensagens da Gestão V12 foram atualizadas.",
        icon: "success",
        timer: 1800,
      });
    } catch (error) {
      showAlert?.({
        title: "Falha ao salvar WhatsApp",
        text:
          error?.response?.data?.message ||
          "Não foi possível salvar a configuração de mensagens.",
        icon: "error",
      });
    } finally {
      setSavingWhatsApp(false);
    }
  }, [applyWhatsAppConfig, showAlert, whatsAppForm]);

  const fetchWhatsAppStatus = useCallback(async () => {
    const instanceName = String(whatsAppForm.instance_name || "").trim();
    if (!instanceName) return null;

    const { data } = await api.get("/gestao/mensagens/whatsapp/status", {
      params: { instance_name: instanceName },
    });
    const state = extractWhatsAppState(data);
    applyWhatsAppConnection({ state });
    return {
      ...(data?.data || {}),
      state,
    };
  }, [applyWhatsAppConnection, whatsAppForm.instance_name]);

  const handleConnectWhatsApp = useCallback(async () => {
    const instanceName = String(whatsAppForm.instance_name || "").trim();
    if (!instanceName) {
      showAlert?.({
        title: "Instância obrigatória",
        text: "Informe o nome da instância do WhatsApp da Gestão V12.",
        icon: "warning",
      });
      return;
    }

    try {
      setWhatsAppState((current) => ({ ...current, loading: true }));

      let currentState = "unknown";
      try {
        const statusData = await fetchWhatsAppStatus();
        currentState = normalizeWhatsAppStatus(statusData?.state);
      } catch {
        currentState = "unknown";
      }

      if (currentState === "open") {
        const { data } = await api.post("/gestao/mensagens/whatsapp/instance", {
          ...whatsAppForm,
          whatsapp_ativo: true,
        });
        applyWhatsAppConfig(data?.config);

        showAlert?.({
          title: "WhatsApp conectado",
          text: "A instância da Gestão V12 já está conectada e pronta para uso.",
          icon: "success",
        });
        return;
      }

      const { data } = await api.post("/gestao/mensagens/whatsapp/instance", {
        ...whatsAppForm,
        whatsapp_ativo: false,
      });
      applyWhatsAppConfig(data?.config);

      const qrResponse = await api.get("/gestao/mensagens/whatsapp/qrcode", {
        params: { instance_name: instanceName },
      });
      const qrImage = qrResponse?.data?.data?.image || "";
      const pairingCode = qrResponse?.data?.data?.pairingCode || "";

      applyWhatsAppConnection({
        state: currentState === "unknown" ? "connecting" : currentState,
        image: qrImage,
        pairingCode,
      });

      let pollingId = null;

      await Swal.fire({
        title: "Escaneie o QR Code",
        html: buildWhatsAppQrHtml({ image: qrImage, pairingCode }),
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: "Cancelar",
        cancelButtonColor: "#0b5fff",
        width: 520,
        didOpen: () => {
          pollingId = window.setInterval(async () => {
            try {
              const liveStatus = await fetchWhatsAppStatus();
              const nextState = normalizeWhatsAppStatus(liveStatus?.state);

              if (nextState === "open") {
                if (pollingId) {
                  window.clearInterval(pollingId);
                  pollingId = null;
                }

                Swal.close();

                const connectedResponse = await api.post(
                  "/gestao/mensagens/whatsapp/instance",
                  {
                    ...whatsAppForm,
                    whatsapp_ativo: true,
                  }
                );
                applyWhatsAppConfig(connectedResponse?.data?.config);

                showAlert?.({
                  title: "WhatsApp conectado",
                  text: "A instância da Gestão V12 foi conectada com sucesso.",
                  icon: "success",
                });
              }
            } catch {}
          }, 4000);
        },
        willClose: () => {
          if (pollingId) window.clearInterval(pollingId);
        },
      });
    } catch (error) {
      showAlert?.({
        title: "Falha no WhatsApp",
        text:
          error?.response?.data?.message ||
          "Não foi possível iniciar a conexão do WhatsApp da Gestão V12.",
        icon: "error",
      });
    } finally {
      setWhatsAppState((current) => ({ ...current, loading: false }));
    }
  }, [
    applyWhatsAppConfig,
    applyWhatsAppConnection,
    fetchWhatsAppStatus,
    showAlert,
    whatsAppForm,
  ]);

  const handleDisconnectWhatsApp = useCallback(async () => {
    try {
      setWhatsAppState((current) => ({ ...current, loading: true }));
      const { data } = await api.delete("/gestao/mensagens/whatsapp/logout", {
        data: { instance_name: whatsAppForm.instance_name },
      });
      applyWhatsAppConfig(data?.config);
      applyWhatsAppConnection({ state: "close", image: "", pairingCode: "" });

      showAlert?.({
        title: "WhatsApp desconectado",
        text: "A instância da Gestão V12 foi desconectada.",
        icon: "success",
      });
    } catch (error) {
      showAlert?.({
        title: "Falha no WhatsApp",
        text:
          error?.response?.data?.message ||
          "Não foi possível desconectar a instância do WhatsApp.",
        icon: "error",
      });
    } finally {
      setWhatsAppState((current) => ({ ...current, loading: false }));
    }
  }, [
    applyWhatsAppConfig,
    applyWhatsAppConnection,
    showAlert,
    whatsAppForm.instance_name,
  ]);

  const handleRestartWhatsApp = useCallback(async () => {
    try {
      setWhatsAppState((current) => ({ ...current, loading: true }));
      await api.put("/gestao/mensagens/whatsapp/restart", {
        instance_name: whatsAppForm.instance_name,
      });
      await fetchWhatsAppStatus();

      showAlert?.({
        title: "Instância reiniciada",
        text: "A conexão do WhatsApp da Gestão V12 foi reiniciada.",
        icon: "success",
      });
    } catch (error) {
      showAlert?.({
        title: "Falha no WhatsApp",
        text:
          error?.response?.data?.message ||
          "Não foi possível reiniciar a instância do WhatsApp.",
        icon: "error",
      });
    } finally {
      setWhatsAppState((current) => ({ ...current, loading: false }));
    }
  }, [fetchWhatsAppStatus, showAlert, whatsAppForm.instance_name]);

  const handleDeleteWhatsApp = useCallback(async () => {
    const confirmed = await askYesNoQuestion?.(
      "Excluir instância",
      "Deseja realmente excluir a instância do WhatsApp da Gestão V12?"
    );

    if (!confirmed) return;

    try {
      setWhatsAppState((current) => ({ ...current, loading: true }));
      const { data } = await api.delete("/gestao/mensagens/whatsapp/instance", {
        data: { instance_name: whatsAppForm.instance_name },
      });
      applyWhatsAppConfig(data?.config);
      applyWhatsAppConnection({ state: "not_found", image: "", pairingCode: "" });

      showAlert?.({
        title: "Instância excluída",
        text: "A instância do WhatsApp da Gestão V12 foi removida.",
        icon: "success",
      });
    } catch (error) {
      showAlert?.({
        title: "Falha no WhatsApp",
        text:
          error?.response?.data?.message ||
          "Não foi possível excluir a instância do WhatsApp.",
        icon: "error",
      });
    } finally {
      setWhatsAppState((current) => ({ ...current, loading: false }));
    }
  }, [
    applyWhatsAppConfig,
    applyWhatsAppConnection,
    askYesNoQuestion,
    showAlert,
    whatsAppForm.instance_name,
  ]);

  const whatsAppStatus = normalizeWhatsAppStatus(whatsAppState.state);
  const isWhatsAppConnected = whatsAppStatus === "open";
  const canRestartWhatsApp = isWhatsAppConnected;
  const canDeleteWhatsApp =
    !!String(whatsAppForm.instance_name || "").trim() &&
    !["not_found", "unknown"].includes(whatsAppStatus);

  return (
    <GestaoV12Layout
      title="Configurações"
      subtitle="Parâmetros próprios da empresa V12, separados das filiais dos clientes."
    >
      <C.Stack>
        <C.Card>
          <C.CardHeader>
            <C.CardTitle>Configurações da Gestão V12</C.CardTitle>
            <C.CardText>
              Esta área configura a operação interna da V12. As credenciais salvas ficam
              mascaradas e não retornam abertas para o navegador.
            </C.CardText>
          </C.CardHeader>

          <C.Tabs>
            <C.TabButton
              type="button"
              $active={activeTab === "cobranca"}
              onClick={() => setActiveTab("cobranca")}
            >
              Cobrança
            </C.TabButton>
            <C.TabButton
              type="button"
              $active={activeTab === "fiscal"}
              onClick={() => setActiveTab("fiscal")}
            >
              Fiscal
            </C.TabButton>
            <C.TabButton
              type="button"
              $active={activeTab === "mensagens"}
              onClick={() => setActiveTab("mensagens")}
            >
              Mensagens
            </C.TabButton>
            <C.TabButton
              type="button"
              $active={activeTab === "chat"}
              onClick={() => setActiveTab("chat")}
            >
              Chat
            </C.TabButton>
          </C.Tabs>

          {activeTab === "cobranca" ? (
            <C.SectionBody as="form" onSubmit={handleSubmitAsaas}>
              <C.CardHeader>
                <C.CardTitle>Gateway de cobrança</C.CardTitle>
                <C.CardText>
                  Conta Asaas usada pela V12 para gerar mensalidades, boletos e Pix dos
                  clientes do sistema. Essa configuração não usa a conta Asaas das filiais.
                </C.CardText>
              </C.CardHeader>

              <C.InfoGrid>
                <C.InfoCard>
                  <C.InfoLabel>Status</C.InfoLabel>
                  <C.InfoValue>{asaasConfig?.ativo ? "Ativa" : "Inativa"}</C.InfoValue>
                </C.InfoCard>
                <C.InfoCard>
                  <C.InfoLabel>Chave atual</C.InfoLabel>
                  <C.InfoValue>{asaasConfig?.api_key_masked || "Não configurada"}</C.InfoValue>
                </C.InfoCard>
              </C.InfoGrid>

              <C.FieldsGrid>
                <C.Field>
                  <C.FieldSpan>Provider</C.FieldSpan>
                  <C.Select value="asaas" disabled>
                    <option value="asaas">Asaas</option>
                  </C.Select>
                </C.Field>

                <C.Field>
                  <C.FieldSpan>Ambiente</C.FieldSpan>
                  <C.Select
                    value={asaasForm.ambiente}
                    onChange={(event) => updateAsaasField("ambiente", event.target.value)}
                    disabled={loading}
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Produção</option>
                  </C.Select>
                </C.Field>

                <C.Field>
                  <C.FieldSpan>API key</C.FieldSpan>
                  <C.Input
                    type="password"
                    value={asaasForm.api_key}
                    onChange={(event) => updateAsaasField("api_key", event.target.value)}
                    placeholder={
                      asaasConfig?.api_key_masked
                        ? `Atual: ${asaasConfig.api_key_masked}`
                        : "Cole a API key da conta Asaas da V12"
                    }
                    disabled={loading}
                  />
                  <C.FieldHint>Deixe em branco para manter a chave já cadastrada.</C.FieldHint>
                </C.Field>
              </C.FieldsGrid>

              <C.ToggleList>
                <C.ToggleRow>
                  <C.Checkbox
                    type="checkbox"
                    checked={asaasForm.ativo}
                    onChange={(event) => updateAsaasField("ativo", event.target.checked)}
                    disabled={loading}
                  />
                  <span>Ativar integração de cobrança da Gestão V12</span>
                </C.ToggleRow>
              </C.ToggleList>

              <C.Actions>
                <C.SecondaryButton type="button" onClick={loadAsaasConfig} disabled={loading}>
                  Recarregar
                </C.SecondaryButton>
                <C.PrimaryButton type="submit" disabled={saving || loading}>
                  {saving ? "Salvando..." : "Salvar configurações"}
                </C.PrimaryButton>
              </C.Actions>
            </C.SectionBody>
          ) : null}

          {activeTab === "fiscal" ? (
            <C.Placeholder>
              Parâmetros fiscais próprios da empresa V12 ficarão aqui quando o módulo de emissão
              fiscal interna for ativado.
            </C.Placeholder>
          ) : null}

          {activeTab === "mensagens" ? (
            <C.SectionBody>
              <C.CardHeader>
                <C.CardTitle>WhatsApp da Gestão V12</C.CardTitle>
                <C.CardText>
                  Conexão usada apenas pela gestão interna para enviar cobranças e avisos aos
                  clientes da V12. Ela não interfere no WhatsApp configurado nas filiais.
                </C.CardText>
              </C.CardHeader>

              <C.SubTabs>
                <C.SubTabButton
                  type="button"
                  $active={activeMensagemTab === "conectar"}
                  onClick={() => setActiveMensagemTab("conectar")}
                >
                  Conexão
                </C.SubTabButton>
                <C.SubTabButton
                  type="button"
                  $active={activeMensagemTab === "mensagens"}
                  onClick={() => setActiveMensagemTab("mensagens")}
                >
                  Mensagens padrão
                </C.SubTabButton>
              </C.SubTabs>

              {activeMensagemTab === "conectar" ? (
                <C.ConnectionCard>
                  <C.FieldsGrid>
                    <C.Field>
                      <C.FieldSpan>Nome da instância</C.FieldSpan>
                      <C.Input
                        value={whatsAppForm.instance_name}
                        onChange={(event) =>
                          updateWhatsAppField("instance_name", event.target.value)
                        }
                        placeholder="Ex.: v12-gestao"
                      />
                    </C.Field>

                    <C.Field>
                      <C.FieldSpan>Status</C.FieldSpan>
                      <C.StatusPill $status={whatsAppStatus}>
                        <C.StatusDot $status={whatsAppStatus} />
                        <span>{statusLabel(whatsAppStatus)}</span>
                      </C.StatusPill>
                    </C.Field>
                  </C.FieldsGrid>

                  <C.FieldsGrid>
                    <C.Field>
                      <C.FieldSpan>Número do WhatsApp</C.FieldSpan>
                      <C.Input
                        value={whatsAppForm.remetente_numero}
                        onChange={(event) =>
                          updateWhatsAppField("remetente_numero", event.target.value)
                        }
                        placeholder="5581999999999"
                      />
                      <C.FieldHint>Informe o número que será conectado ao WhatsApp Web.</C.FieldHint>
                    </C.Field>

                    <C.Field>
                      <C.FieldSpan>Ação</C.FieldSpan>
                      <C.ConnectionActions>
                        <C.PrimaryInlineButton
                          type="button"
                          onClick={
                            isWhatsAppConnected ? handleDisconnectWhatsApp : handleConnectWhatsApp
                          }
                          disabled={whatsAppState.loading}
                        >
                          {whatsAppState.loading
                            ? "Processando..."
                            : isWhatsAppConnected
                            ? "Desconectar"
                            : "Salvar e conectar"}
                        </C.PrimaryInlineButton>

                        {canRestartWhatsApp ? (
                          <C.IconButton
                            type="button"
                            title="Reiniciar conexão"
                            aria-label="Reiniciar conexão"
                            onClick={handleRestartWhatsApp}
                            disabled={whatsAppState.loading}
                          >
                            ↻
                          </C.IconButton>
                        ) : null}

                        {canDeleteWhatsApp ? (
                          <C.IconButton
                            type="button"
                            title="Excluir instância"
                            aria-label="Excluir instância"
                            onClick={handleDeleteWhatsApp}
                            disabled={whatsAppState.loading}
                          >
                            ×
                          </C.IconButton>
                        ) : null}
                      </C.ConnectionActions>
                    </C.Field>
                  </C.FieldsGrid>
                </C.ConnectionCard>
              ) : null}

              {activeMensagemTab === "mensagens" ? (
                <>
                  <C.ToggleList>
                    <C.ToggleRow>
                      <C.Checkbox
                        type="checkbox"
                        checked={whatsAppForm.whatsapp_ativo}
                        onChange={(event) =>
                          updateWhatsAppField("whatsapp_ativo", event.target.checked)
                        }
                      />
                      <span>Ativar envio de mensagens por WhatsApp na Gestão V12</span>
                    </C.ToggleRow>
                  </C.ToggleList>

                  <C.FieldsGrid>
                    <C.Field>
                      <C.FieldSpan>Mensagem padrão do boleto</C.FieldSpan>
                      <C.Textarea
                        value={whatsAppForm.mensagem_boleto_padrao}
                        onChange={(event) =>
                          updateWhatsAppField("mensagem_boleto_padrao", event.target.value)
                        }
                        placeholder="Use {nome} e {link_boleto}"
                      />
                    </C.Field>

                    <C.Field>
                      <C.FieldSpan>Mensagem padrão do PIX</C.FieldSpan>
                      <C.Textarea
                        value={whatsAppForm.mensagem_pix_padrao}
                        onChange={(event) =>
                          updateWhatsAppField("mensagem_pix_padrao", event.target.value)
                        }
                        placeholder="Use {nome}, {valor}, {vencimento} e {pix_copia_cola}"
                      />
                    </C.Field>
                  </C.FieldsGrid>

                  <C.Actions>
                    <C.SecondaryButton
                      type="button"
                      onClick={loadWhatsAppConfig}
                      disabled={savingWhatsApp}
                    >
                      Recarregar
                    </C.SecondaryButton>
                    <C.PrimaryButton
                      type="button"
                      onClick={handleSaveWhatsApp}
                      disabled={savingWhatsApp}
                    >
                      {savingWhatsApp ? "Salvando..." : "Salvar mensagens"}
                    </C.PrimaryButton>
                  </C.Actions>
                </>
              ) : null}
            </C.SectionBody>
          ) : null}

          {activeTab === "chat" ? (
            <C.SectionBody>
              <C.CardHeader>
                <C.CardTitle>Chat interno</C.CardTitle>
                <C.CardText>
                  Controle o atendimento flutuante exibido aos visitantes e usuários do V12.
                  Os atendimentos são respondidos no menu Chat da Gestão V12.
                </C.CardText>
              </C.CardHeader>

              <C.ToggleList>
                <C.ToggleRow>
                  <C.Checkbox
                    type="checkbox"
                    checked={chatForm.chat_ativo}
                    onChange={(event) => updateChatField("chat_ativo", event.target.checked)}
                  />
                  <span>Exibir chat de atendimento no V12</span>
                </C.ToggleRow>
              </C.ToggleList>

              <C.FieldsGrid>
                <C.Field>
                  <C.FieldSpan>Início do atendimento</C.FieldSpan>
                  <C.Input
                    type="time"
                    value={chatForm.horario_inicio}
                    onChange={(event) => updateChatField("horario_inicio", event.target.value)}
                  />
                </C.Field>

                <C.Field>
                  <C.FieldSpan>Fim do atendimento</C.FieldSpan>
                  <C.Input
                    type="time"
                    value={chatForm.horario_fim}
                    onChange={(event) => updateChatField("horario_fim", event.target.value)}
                  />
                </C.Field>

                <C.Field>
                  <C.FieldSpan>Mensagem fora do horário</C.FieldSpan>
                  <C.Textarea
                    value={chatForm.mensagem_fora_horario}
                    onChange={(event) =>
                      updateChatField("mensagem_fora_horario", event.target.value)
                    }
                    placeholder="Mensagem exibida quando o cliente iniciar atendimento fora do horário."
                  />
                </C.Field>
              </C.FieldsGrid>

              <C.CardHeader>
                <C.CardTitle>Categorias de atendimento</C.CardTitle>
                <C.CardText>
                  Admin vê todas. Usuários com perfil vendedor, financeiro ou suporte veem apenas
                  sua respectiva fila.
                </C.CardText>
              </C.CardHeader>

              <C.Actions>
                <C.SecondaryButton type="button" onClick={addChatCategoria}>
                  Nova categoria
                </C.SecondaryButton>
              </C.Actions>

              <C.ToggleList>
                {chatCategorias.map((categoria) => (
                  <C.ConnectionCard key={categoria.categoria_id}>
                    <C.FieldsGrid>
                      <C.Field>
                        <C.FieldSpan>Nome</C.FieldSpan>
                        <C.Input
                          value={categoria.nome || ""}
                          onChange={(event) =>
                            updateChatCategoria(categoria.categoria_id, "nome", event.target.value)
                          }
                        />
                      </C.Field>
                      <C.Field>
                        <C.FieldSpan>Slug</C.FieldSpan>
                        <C.Input
                          value={categoria.slug || ""}
                          disabled={typeof categoria.categoria_id === "number"}
                          onChange={(event) =>
                            updateChatCategoria(
                              categoria.categoria_id,
                              "slug",
                              event.target.value
                            )
                          }
                        />
                      </C.Field>
                      <C.Field>
                        <C.FieldSpan>Ativo</C.FieldSpan>
                        <C.ToggleRow>
                          <C.Checkbox
                            type="checkbox"
                            checked={categoria.ativo !== false}
                            onChange={(event) =>
                              updateChatCategoria(
                                categoria.categoria_id,
                                "ativo",
                                event.target.checked
                              )
                            }
                          />
                          <span>Categoria disponível no chat</span>
                        </C.ToggleRow>
                      </C.Field>
                    </C.FieldsGrid>
                  </C.ConnectionCard>
                ))}
              </C.ToggleList>

              <C.Actions>
                <C.SecondaryButton type="button" onClick={loadChatConfig} disabled={savingChat}>
                  Recarregar
                </C.SecondaryButton>
                <C.PrimaryButton type="button" onClick={handleSaveChat} disabled={savingChat}>
                  {savingChat ? "Salvando..." : "Salvar chat"}
                </C.PrimaryButton>
              </C.Actions>
            </C.SectionBody>
          ) : null}
        </C.Card>
      </C.Stack>
    </GestaoV12Layout>
  );
};
