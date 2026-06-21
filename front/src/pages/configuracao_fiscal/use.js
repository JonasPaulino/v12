import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { useSweetAlert } from "context/sweet_alert";
import {
  createWhatsAppInstance,
  deleteWhatsAppInstance,
  getConfiguracaoFiscal,
  getPessoasEmitenteSelect,
  getWhatsAppQrCode,
  getWhatsAppStatus,
  logoutWhatsAppInstance,
  restartWhatsAppInstance,
  updateConfiguracaoFiscal,
} from "./api";

const buildInitialForm = () => ({
  emitente_pessoa_id: "",
  ambiente_nfe: "2",
  serie_nfe_padrao: "1",
  proximo_numero_nfe: "1",
  crt: "3",
  cnae: "",
  natureza_operacao_padrao: "",
  nfe_habilitada: false,
  observacao: "",
  certificado_senha: "",
  gateway_provider: "asaas",
  gateway_ambiente: "sandbox",
  gateway_wallet_id: "",
  gateway_ativo: false,
  gateway_auto_criar_cliente: true,
  gateway_baixa_automatica_pix: true,
  gateway_baixa_automatica_boleto: true,
  gateway_observacao: "",
  gateway_api_key: "",
  gateway_webhook_auth_token: "",
  whatsapp_provider: "evolution",
  whatsapp_ativo: false,
  whatsapp_instance_name: "",
  whatsapp_remetente_numero: "",
  whatsapp_auto_enviar_boleto_venda: false,
  whatsapp_auto_enviar_pix_venda: false,
  whatsapp_mensagem_boleto_padrao: "",
  whatsapp_mensagem_pix_padrao: "",
});

const formatFileSize = (size) => {
  const bytes = Number(size || 0);
  if (!bytes) return "0 KB";

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(bytes / 1024).toFixed(2)} KB`;
};

const formatDateTime = (value) => {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const normalizeWhatsAppStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "open") return "open";
  if (normalized === "connecting") return "connecting";
  if (normalized === "close") return "close";
  if (normalized === "not_found") return "not_found";

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
    <p style="margin:0;color:#5f6f8f;line-height:1.55;">
      Escaneie o QR Code no WhatsApp da filial para concluir a conexão.
    </p>
  </div>
`;

const buildEmitenteOption = (pessoa) => {
  if (!pessoa?.pessoa_id) return null;

  const documento = pessoa.pessoa_cpf_cnpj || "Sem CNPJ";
  const fantasia = pessoa.pessoa_nome_fantasia
    ? ` • ${pessoa.pessoa_nome_fantasia}`
    : "";

  return {
    value: pessoa.pessoa_id,
    label: `${pessoa.pessoa_nome_razao}${fantasia}`,
    meta: documento,
    raw: pessoa,
  };
};

const buildPendenciasEmitente = (emitente) => {
  if (!emitente?.pessoa_id) {
    return ["Selecione a pessoa emitente da filial."];
  }

  const pendencias = [];

  if (emitente.pessoa_tipo !== "J") {
    pendencias.push("A emitente precisa ser pessoa jurídica.");
  }

  if (!String(emitente.pessoa_cpf_cnpj || "").trim()) {
    pendencias.push("Preencha o CNPJ da emitente.");
  }

  if (!String(emitente.pessoa_inscricao_estadual || "").trim()) {
    pendencias.push("Preencha a inscrição estadual da emitente ou informe ISENTO.");
  }

  const missingAddress = [
    ["cep", "CEP"],
    ["logradouro", "logradouro"],
    ["numero", "número"],
    ["bairro", "bairro"],
    ["cidade", "cidade"],
    ["uf", "UF"],
    ["codigo_ibge", "código IBGE"],
  ].find(([key]) => !String(emitente[key] || "").trim());

  if (missingAddress) {
    pendencias.push(`Endereço principal sem ${missingAddress[1]}.`);
  }

  return pendencias;
};

const formatEndereco = (emitente) => {
  if (!emitente?.pessoa_id) return "--";

  const parts = [
    emitente.logradouro,
    emitente.numero,
    emitente.complemento,
    emitente.bairro,
    emitente.cidade,
    emitente.uf,
    emitente.cep,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "--";
};

const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };

    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo do certificado."));
    reader.readAsDataURL(file);
  });

export const useConfiguracaoFiscalPage = () => {
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [form, setForm] = useState(buildInitialForm());
  const [selectedEmitente, setSelectedEmitente] = useState(null);
  const [certificadoAtual, setCertificadoAtual] = useState({
    configurado: false,
    nome_arquivo: "",
    tamanho_arquivo: 0,
    importado_em: null,
    atualizado_em: null,
  });
  const [gatewayAtual, setGatewayAtual] = useState({
    api_key_configurada: false,
    api_key_masked: "",
    webhook_auth_token_configurado: false,
    webhook_auth_token_masked: "",
  });
  const [whatsAppState, setWhatsAppState] = useState({
    state: "unknown",
    image: "",
    pairingCode: "",
    loading: false,
  });
  const [certificadoFile, setCertificadoFile] = useState(null);

  const applyData = useCallback((payload) => {
    const data = payload || {};
    const fiscal = data.fiscal || {};
    const emitente = data.emitente || null;
    const certificado = data.certificado || {};
    const contas = data.contas || {};
    const whatsapp = data.mensagens?.whatsapp || {};

    setTenant(data.tenant || null);
    setForm({
      emitente_pessoa_id: emitente?.pessoa_id ? String(emitente.pessoa_id) : "",
      ambiente_nfe: fiscal.ambiente_nfe || "2",
      serie_nfe_padrao: String(fiscal.serie_nfe_padrao || 1),
      proximo_numero_nfe: String(fiscal.proximo_numero_nfe || 1),
      crt: fiscal.crt || "3",
      cnae: fiscal.cnae || "",
      natureza_operacao_padrao: fiscal.natureza_operacao_padrao || "",
      nfe_habilitada: !!fiscal.nfe_habilitada,
      observacao: fiscal.observacao || "",
      certificado_senha: "",
      gateway_provider: contas.provider || "asaas",
      gateway_ambiente: contas.ambiente || "sandbox",
      gateway_wallet_id: contas.wallet_id || "",
      gateway_ativo: !!contas.gateway_ativo,
      gateway_auto_criar_cliente: contas.auto_criar_cliente !== false,
      gateway_baixa_automatica_pix: contas.baixa_automatica_pix !== false,
      gateway_baixa_automatica_boleto: contas.baixa_automatica_boleto !== false,
      gateway_observacao: contas.observacao || "",
      gateway_api_key: "",
      gateway_webhook_auth_token: "",
      whatsapp_provider: whatsapp.provider || "evolution",
      whatsapp_ativo: !!whatsapp.whatsapp_ativo,
      whatsapp_instance_name: whatsapp.instance_name || "",
      whatsapp_remetente_numero: whatsapp.remetente_numero || "",
      whatsapp_auto_enviar_boleto_venda: !!whatsapp.auto_enviar_boleto_venda,
      whatsapp_auto_enviar_pix_venda: !!whatsapp.auto_enviar_pix_venda,
      whatsapp_mensagem_boleto_padrao: whatsapp.mensagem_boleto_padrao || "",
      whatsapp_mensagem_pix_padrao: whatsapp.mensagem_pix_padrao || "",
    });
    setSelectedEmitente(buildEmitenteOption(emitente));
    setCertificadoAtual({
      configurado: !!certificado.configurado,
      nome_arquivo: certificado.nome_arquivo || "",
      tamanho_arquivo: Number(certificado.tamanho_arquivo || 0),
      importado_em: certificado.importado_em || null,
      atualizado_em: certificado.atualizado_em || null,
    });
    setGatewayAtual({
      api_key_configurada: !!contas.api_key_configurada,
      api_key_masked: contas.api_key_masked || "",
      webhook_auth_token_configurado: !!contas.webhook_auth_token_configurado,
      webhook_auth_token_masked: contas.webhook_auth_token_masked || "",
    });
    setWhatsAppState((prev) => ({
      ...prev,
      state: "unknown",
      image: "",
      pairingCode: "",
    }));
    setCertificadoFile(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const response = await getConfiguracaoFiscal();

        if (!mounted) return;
        applyData(response.data || null);
      } catch (error) {
        if (!mounted) return;

        showAlert({
          title: "Falha ao carregar configuração",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar as configurações da filial.",
          icon: "error",
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [applyData, showAlert]);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const loadEmitenteOptions = useCallback(async (search) => {
    const response = await getPessoasEmitenteSelect(search);
    return (response.data || []).map((item) => buildEmitenteOption(item));
  }, []);

  const handleSelectEmitente = useCallback((value, option) => {
    updateField("emitente_pessoa_id", value ? String(value) : "");
    setSelectedEmitente(option || null);
  }, [updateField]);

  const handleSelectCertificado = useCallback(
    (event) => {
      const file = event.target.files?.[0] || null;

      if (!file) {
        setCertificadoFile(null);
        return;
      }

      const fileName = String(file.name || "").toLowerCase();
      if (!fileName.endsWith(".pfx") && !fileName.endsWith(".p12")) {
        showAlert({
          title: "Arquivo invalido",
          text: "Selecione um certificado A1 nos formatos .pfx ou .p12.",
          icon: "warning",
        });
        event.target.value = "";
        setCertificadoFile(null);
        return;
      }

      setCertificadoFile(file);
    },
    [showAlert]
  );

  const pendenciasEmitente = useMemo(
    () => buildPendenciasEmitente(selectedEmitente?.raw || null),
    [selectedEmitente]
  );

  const emitenteEndereco = useMemo(
    () => formatEndereco(selectedEmitente?.raw || null),
    [selectedEmitente]
  );

  const certificadoResumo = useMemo(() => {
    if (certificadoFile) {
      return {
        configurado: true,
        nome_arquivo: certificadoFile.name,
        tamanho: formatFileSize(certificadoFile.size),
        importadoEm: "Novo arquivo selecionado",
      };
    }

    return {
      configurado: !!certificadoAtual.configurado,
      nome_arquivo: certificadoAtual.nome_arquivo || "Nenhum certificado importado",
      tamanho: formatFileSize(certificadoAtual.tamanho_arquivo),
      importadoEm: formatDateTime(certificadoAtual.importado_em),
    };
  }, [certificadoAtual, certificadoFile]);

  const contasResumo = useMemo(
    () => ({
      provider: form.gateway_provider || "asaas",
      ambiente: form.gateway_ambiente || "sandbox",
      gateway_ativo: !!form.gateway_ativo,
      apiKeyConfigurada: !!gatewayAtual.api_key_configurada,
      apiKeyMasked: gatewayAtual.api_key_masked || "",
      webhookConfigurado: !!gatewayAtual.webhook_auth_token_configurado,
      webhookMasked: gatewayAtual.webhook_auth_token_masked || "",
    }),
    [form, gatewayAtual]
  );

  const whatsappResumo = useMemo(
    () => ({
      provider: form.whatsapp_provider || "evolution",
      ativo: !!form.whatsapp_ativo,
      instanceName: form.whatsapp_instance_name || "--",
      remetenteNumero: form.whatsapp_remetente_numero || "--",
      status: normalizeWhatsAppStatus(whatsAppState.state),
    }),
    [form, whatsAppState.state]
  );

  const isWhatsAppConnected = whatsappResumo.status === "open";
  const canRestartWhatsApp = isWhatsAppConnected;
  const canDeleteWhatsApp =
    !!String(form.whatsapp_instance_name || "").trim() &&
    !["not_found", "unknown"].includes(whatsappResumo.status);

  const applyWhatsAppConnection = useCallback((payload = {}) => {
    const nextState = normalizeWhatsAppStatus(payload.state);

    setWhatsAppState((prev) => ({
      ...prev,
      state: nextState,
      image: nextState === "open" ? "" : payload.image || prev.image || "",
      pairingCode:
        nextState === "open" ? "" : payload.pairingCode || prev.pairingCode || "",
    }));

    return nextState;
  }, []);

  const fetchWhatsAppStatus = useCallback(
    async ({ silent = false } = {}) => {
      const instanceName = String(form.whatsapp_instance_name || "").trim();

      if (!instanceName) {
        if (!silent) {
          showAlert({
            title: "Nome da instância obrigatório",
            text: "Informe o nome da instância para consultar a conexão do WhatsApp.",
            icon: "warning",
          });
        }
        return null;
      }

      try {
        if (!silent) {
          setWhatsAppState((prev) => ({ ...prev, loading: true }));
        }

        const response = await getWhatsAppStatus(instanceName);
        const nextState = applyWhatsAppConnection({
          state: response?.data?.state,
        });

        if (!silent && nextState === "open") {
          showAlert({
            title: "WhatsApp conectado",
            text: "A instância está conectada e pronta para envio.",
            icon: "success",
          });
        }

        return response?.data || null;
      } catch (error) {
        if (!silent) {
          showAlert({
            title: "Falha no WhatsApp",
            text:
              error?.response?.data?.message ||
              "Não foi possível consultar o status do WhatsApp.",
            icon: "error",
          });
        }
        return null;
      } finally {
        if (!silent) {
          setWhatsAppState((prev) => ({ ...prev, loading: false }));
        }
      }
    },
    [applyWhatsAppConnection, form.whatsapp_instance_name, showAlert]
  );

  const handleConnectWhatsApp = useCallback(async () => {
    const instanceName = String(form.whatsapp_instance_name || "").trim();

    if (!instanceName) {
      showAlert({
        title: "Nome da instância obrigatório",
        text: "Informe o nome da instância antes de conectar o WhatsApp.",
        icon: "warning",
      });
      return;
    }

    try {
      setWhatsAppState((prev) => ({ ...prev, loading: true }));
      const statusData = await getWhatsAppStatus(instanceName);
      const currentState = applyWhatsAppConnection({
        state: statusData?.data?.state,
      });

      if (currentState === "open") {
        showAlert({
          title: "WhatsApp conectado",
          text: "A instância já está conectada e pronta para uso.",
          icon: "success",
        });
        return;
      }

      if (currentState === "not_found") {
        await createWhatsAppInstance({
          instance_name: instanceName,
          remetente_numero: form.whatsapp_remetente_numero,
        });
      }

      const qrResponse = await getWhatsAppQrCode(instanceName);
      const qrImage = qrResponse?.data?.image || "";
      const pairingCode = qrResponse?.data?.pairingCode || "";

      applyWhatsAppConnection({
        state: currentState === "unknown" ? "connecting" : currentState,
        image: qrImage,
        pairingCode,
      });

      let pollingId = null;

      await Swal.fire({
        title: "Escaneie o QR Code",
        html: buildWhatsAppQrHtml({
          image: qrImage,
          pairingCode,
        }),
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: "Cancelar",
        cancelButtonColor: "#0b5fff",
        width: 520,
        didOpen: () => {
          pollingId = window.setInterval(async () => {
            try {
              const liveStatus = await getWhatsAppStatus(instanceName);
              const nextState = applyWhatsAppConnection({
                state: liveStatus?.data?.state,
              });

              if (nextState === "open") {
                if (pollingId) {
                  window.clearInterval(pollingId);
                  pollingId = null;
                }

                Swal.close();
                showAlert({
                  title: "WhatsApp conectado",
                  text: "A instância foi conectada com sucesso.",
                  icon: "success",
                });
              }
            } catch {}
          }, 4000);
        },
        willClose: () => {
          if (pollingId) {
            window.clearInterval(pollingId);
          }
        },
      });
    } catch (error) {
      showAlert({
        title: "Falha no WhatsApp",
        text:
          error?.response?.data?.message ||
          "Não foi possível iniciar a conexão do WhatsApp.",
        icon: "error",
      });
    } finally {
      setWhatsAppState((prev) => ({ ...prev, loading: false }));
    }
  }, [
    applyWhatsAppConnection,
    form.whatsapp_instance_name,
    form.whatsapp_remetente_numero,
    showAlert,
  ]);

  const handleDisconnectWhatsApp = useCallback(async () => {
    try {
      setWhatsAppState((prev) => ({ ...prev, loading: true }));

      await logoutWhatsAppInstance(form.whatsapp_instance_name);
      applyWhatsAppConnection({
        state: "close",
        image: "",
        pairingCode: "",
      });

      showAlert({
        title: "WhatsApp desconectado",
        text: "A instância foi desconectada com sucesso.",
        icon: "success",
      });
    } catch (error) {
      showAlert({
        title: "Falha no WhatsApp",
        text:
          error?.response?.data?.message ||
          "Não foi possível desconectar a instância do WhatsApp.",
        icon: "error",
      });
    } finally {
      setWhatsAppState((prev) => ({ ...prev, loading: false }));
    }
  }, [applyWhatsAppConnection, form.whatsapp_instance_name, showAlert]);

  const handleRestartWhatsApp = useCallback(async () => {
    try {
      setWhatsAppState((prev) => ({ ...prev, loading: true }));

      await restartWhatsAppInstance({
        instance_name: form.whatsapp_instance_name,
      });

      await fetchWhatsAppStatus({ silent: true });

      showAlert({
        title: "Instância reiniciada",
        text: "A conexão do WhatsApp foi reiniciada com sucesso.",
        icon: "success",
      });
    } catch (error) {
      showAlert({
        title: "Falha no WhatsApp",
        text:
          error?.response?.data?.message ||
          "Não foi possível reiniciar a instância do WhatsApp.",
        icon: "error",
      });
    } finally {
      setWhatsAppState((prev) => ({ ...prev, loading: false }));
    }
  }, [fetchWhatsAppStatus, form.whatsapp_instance_name, showAlert]);

  const handleDeleteWhatsApp = useCallback(async () => {
    const confirmed = await askYesNoQuestion(
      "Excluir instância",
      "Deseja realmente excluir a instância do WhatsApp desta filial?"
    );

    if (!confirmed) return;

    try {
      setWhatsAppState((prev) => ({ ...prev, loading: true }));

      await deleteWhatsAppInstance(form.whatsapp_instance_name);
      applyWhatsAppConnection({
        state: "not_found",
        image: "",
        pairingCode: "",
      });

      showAlert({
        title: "Instância excluída",
        text: "A instância do WhatsApp foi removida com sucesso.",
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (error) {
      showAlert({
        title: "Falha no WhatsApp",
        text:
          error?.response?.data?.message ||
          "Não foi possível excluir a instância do WhatsApp.",
        icon: "error",
      });
    } finally {
      setWhatsAppState((prev) => ({ ...prev, loading: false }));
    }
  }, [
    applyWhatsAppConnection,
    askYesNoQuestion,
    form.whatsapp_instance_name,
    showAlert,
  ]);

  useEffect(() => {
    if (!String(form.whatsapp_instance_name || "").trim()) return;
    fetchWhatsAppStatus({ silent: true });
  }, [fetchWhatsAppStatus, form.whatsapp_instance_name]);

  useEffect(() => {
    if (whatsappResumo.status !== "connecting") return undefined;
    if (!String(form.whatsapp_instance_name || "").trim()) return undefined;

    const timer = setInterval(async () => {
      const data = await fetchWhatsAppStatus({ silent: true });
      if (normalizeWhatsAppStatus(data?.state) === "open") {
        showAlert({
          title: "WhatsApp conectado",
          text: "A conexão foi concluída com sucesso.",
          icon: "success",
        });
      }
    }, 8000);

    return () => clearInterval(timer);
  }, [fetchWhatsAppStatus, form.whatsapp_instance_name, showAlert, whatsappResumo.status]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (saving) return;

      if (certificadoFile && !String(form.certificado_senha || "").trim()) {
        showAlert({
          title: "Senha obrigatoria",
          text: "Informe a senha do certificado A1 para concluir a importacao.",
          icon: "warning",
        });
        return;
      }

      try {
        setSaving(true);

        const payload = {
          emitente_pessoa_id: form.emitente_pessoa_id,
          ambiente_nfe: form.ambiente_nfe,
          serie_nfe_padrao: form.serie_nfe_padrao,
          proximo_numero_nfe: form.proximo_numero_nfe,
          crt: form.crt,
          cnae: form.cnae,
          natureza_operacao_padrao: form.natureza_operacao_padrao,
          nfe_habilitada: form.nfe_habilitada,
          observacao: form.observacao,
          contas: {
            provider: form.gateway_provider,
            ambiente: form.gateway_ambiente,
            wallet_id: form.gateway_wallet_id,
            gateway_ativo: form.gateway_ativo,
            auto_criar_cliente: form.gateway_auto_criar_cliente,
            baixa_automatica_pix: form.gateway_baixa_automatica_pix,
            baixa_automatica_boleto: form.gateway_baixa_automatica_boleto,
            observacao: form.gateway_observacao,
            api_key: form.gateway_api_key,
            webhook_auth_token: form.gateway_webhook_auth_token,
          },
          mensagens: {
            whatsapp: {
              provider: form.whatsapp_provider,
              whatsapp_ativo: form.whatsapp_ativo,
              instance_name: form.whatsapp_instance_name,
              remetente_numero: form.whatsapp_remetente_numero,
              auto_enviar_boleto_venda: form.whatsapp_auto_enviar_boleto_venda,
              auto_enviar_pix_venda: form.whatsapp_auto_enviar_pix_venda,
              mensagem_boleto_padrao: form.whatsapp_mensagem_boleto_padrao,
              mensagem_pix_padrao: form.whatsapp_mensagem_pix_padrao,
            },
          },
        };

        if (certificadoFile) {
          payload.certificado = {
            nome_arquivo: certificadoFile.name,
            senha: form.certificado_senha,
            conteudo_base64: await readFileAsBase64(certificadoFile),
          };
        }

        const response = await updateConfiguracaoFiscal(payload);
        applyData(response.data || null);

        showAlert({
          title: "Configuração salva",
          text: response.message || "Configurações da filial salvas com sucesso.",
          icon: "success",
        });
      } catch (error) {
        showAlert({
          title: "Falha ao salvar",
          text:
            error?.response?.data?.message ||
            "Não foi possível salvar as configurações da filial.",
          icon: "error",
        });
      } finally {
        setSaving(false);
      }
    },
    [applyData, certificadoFile, form, saving, showAlert]
  );

  return {
    loading,
    saving,
    tenant,
    form,
    selectedEmitente,
    pendenciasEmitente,
    emitenteEndereco,
    certificadoResumo,
    contasResumo,
    whatsappResumo,
    whatsAppState,
    isWhatsAppConnected,
    canRestartWhatsApp,
    canDeleteWhatsApp,
    updateField,
    loadEmitenteOptions,
    handleSelectEmitente,
    handleSelectCertificado,
    handleConnectWhatsApp,
    handleDisconnectWhatsApp,
    handleRestartWhatsApp,
    handleDeleteWhatsApp,
    handleSubmit,
  };
};
