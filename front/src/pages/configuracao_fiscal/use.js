import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import {
  createOperacaoFiscal,
  createRegraFiscal,
  createWhatsAppInstance,
  deleteWhatsAppInstance,
  getConfiguracaoFiscal,
  getPessoasEmitenteSelect,
  getWhatsAppQrCode,
  getWhatsAppStatus,
  listOperacoesFiscais,
  listRegrasFiscais,
  logoutWhatsAppInstance,
  restartWhatsAppInstance,
  updateOperacaoFiscal,
  updateRegraFiscal,
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
  responsavel_tecnico_cnpj: "66056990000198",
  responsavel_tecnico_nome: "jhes sistemas",
  responsavel_tecnico_contato: "Jonas Paulino",
  responsavel_tecnico_email: "jonaspaulino@jhes.com.br",
  responsavel_tecnico_telefone: "819984163086",
  responsavel_tecnico_logradouro: "Rua nova Baraunas",
  responsavel_tecnico_numero: "451",
  responsavel_tecnico_bairro: "nova caruaru",
  responsavel_tecnico_cidade: "Caruaru",
  responsavel_tecnico_uf: "PE",
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

const buildRegraFiscalForm = () => ({
  descricao: "",
  regime_tributario: "simples_nacional",
  crt_emitente: "1",
  tipo_operacao: "saida",
  finalidade_nfe: "normal",
  consumidor_final: true,
  contribuinte_icms: false,
  origem_mercadoria: "0",
  cfop_venda_interna: "5101",
  cfop_venda_interestadual: "6101",
  cfop_compra: "",
  cbenef: "",
  observacao: "",
  prioridade: "0",
  ativo: true,
  icms_cst: "",
  icms_csosn: "102",
  icms_aliquota: "0",
  icms_reducao_base: "0",
  icms_aliquota_fcp: "0",
  icms_modalidade_bc: "3",
  pis_cst: "99",
  pis_aliquota: "0",
  cofins_cst: "99",
  cofins_aliquota: "0",
  ipi_cst: "",
  ipi_enquadramento: "",
  ipi_aliquota: "0",
  cbs_cst: "",
  cbs_cclass_trib: "",
  cbs_aliquota: "0",
  ibs_uf_cst: "",
  ibs_uf_cclass_trib: "",
  ibs_uf_aliquota: "0",
  ibs_mun_cst: "",
  ibs_mun_cclass_trib: "",
  ibs_mun_aliquota: "0",
  is_cst: "",
  is_cclass_trib: "",
  is_aliquota: "0",
});

const buildOperacaoFiscalForm = () => ({
  codigo: "",
  descricao: "",
  tipo_operacao: "venda",
  natureza_operacao: "Venda de mercadoria",
  finalidade_nfe: "normal",
  tipo_nfe: "saida",
  emite_nfe: true,
  movimenta_estoque: true,
  tipo_movimento_estoque: "saida",
  gera_financeiro: true,
  tipo_financeiro: "receber",
  atualiza_custo: false,
  regra_tributaria_id: "",
  observacao: "",
  ativo: true,
});

const mapRegraFiscalToForm = (regra = {}) => ({
  ...buildRegraFiscalForm(),
  descricao: regra.descricao || "",
  regime_tributario: regra.regime_tributario || "simples_nacional",
  crt_emitente: regra.crt_emitente || "1",
  tipo_operacao: regra.tipo_operacao || "saida",
  finalidade_nfe: regra.finalidade_nfe || "normal",
  consumidor_final: regra.consumidor_final !== false,
  contribuinte_icms: !!regra.contribuinte_icms,
  origem_mercadoria: regra.origem_mercadoria || "0",
  cfop_venda_interna: regra.cfop_venda_interna || "",
  cfop_venda_interestadual: regra.cfop_venda_interestadual || "",
  cfop_compra: regra.cfop_compra || "",
  cbenef: regra.cbenef || "",
  observacao: regra.observacao || "",
  prioridade: String(regra.prioridade ?? 0),
  ativo: regra.ativo !== false,
  icms_cst: regra.icms_cst || "",
  icms_csosn: regra.icms_csosn || "",
  icms_aliquota: String(regra.icms_aliquota ?? 0),
  icms_reducao_base: String(regra.icms_reducao_base ?? 0),
  icms_aliquota_fcp: String(regra.icms_aliquota_fcp ?? 0),
  icms_modalidade_bc: regra.icms_modalidade_bc || "3",
  pis_cst: regra.pis_cst || "99",
  pis_aliquota: String(regra.pis_aliquota ?? 0),
  cofins_cst: regra.cofins_cst || "99",
  cofins_aliquota: String(regra.cofins_aliquota ?? 0),
  ipi_cst: regra.ipi_cst || "",
  ipi_enquadramento: regra.ipi_enquadramento || "",
  ipi_aliquota: String(regra.ipi_aliquota ?? 0),
  cbs_cst: regra.cbs_cst || "",
  cbs_cclass_trib: regra.cbs_cclass_trib || "",
  cbs_aliquota: String(regra.cbs_aliquota ?? 0),
  ibs_uf_cst: regra.ibs_uf_cst || "",
  ibs_uf_cclass_trib: regra.ibs_uf_cclass_trib || "",
  ibs_uf_aliquota: String(regra.ibs_uf_aliquota ?? 0),
  ibs_mun_cst: regra.ibs_mun_cst || "",
  ibs_mun_cclass_trib: regra.ibs_mun_cclass_trib || "",
  ibs_mun_aliquota: String(regra.ibs_mun_aliquota ?? 0),
  is_cst: regra.is_cst || "",
  is_cclass_trib: regra.is_cclass_trib || "",
  is_aliquota: String(regra.is_aliquota ?? 0),
});

const mapOperacaoFiscalToForm = (operacao = {}) => ({
  ...buildOperacaoFiscalForm(),
  codigo: operacao.codigo || "",
  descricao: operacao.descricao || "",
  tipo_operacao: operacao.tipo_operacao || "venda",
  natureza_operacao: operacao.natureza_operacao || "",
  finalidade_nfe: operacao.finalidade_nfe || "normal",
  tipo_nfe: operacao.tipo_nfe || "saida",
  emite_nfe: !!operacao.emite_nfe,
  movimenta_estoque: operacao.movimenta_estoque !== false,
  tipo_movimento_estoque: operacao.tipo_movimento_estoque || "saida",
  gera_financeiro: operacao.gera_financeiro !== false,
  tipo_financeiro: operacao.tipo_financeiro || "receber",
  atualiza_custo: !!operacao.atualiza_custo,
  regra_tributaria_id: operacao.regra_tributaria_id
    ? String(operacao.regra_tributaria_id)
    : "",
  observacao: operacao.observacao || "",
  ativo: operacao.ativo !== false,
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
  const { user } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const isUsuarioMaster = !!user?.usuario_master;
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
  const [regrasFiscais, setRegrasFiscais] = useState([]);
  const [regraFiscalForm, setRegraFiscalForm] = useState(buildRegraFiscalForm());
  const [editingRegraFiscalId, setEditingRegraFiscalId] = useState(null);
  const [regraFiscalSaving, setRegraFiscalSaving] = useState(false);
  const [operacoesFiscais, setOperacoesFiscais] = useState([]);
  const [operacaoFiscalForm, setOperacaoFiscalForm] = useState(buildOperacaoFiscalForm());
  const [editingOperacaoFiscalId, setEditingOperacaoFiscalId] = useState(null);
  const [operacaoFiscalSaving, setOperacaoFiscalSaving] = useState(false);

  const applyData = useCallback((payload) => {
    const data = payload || {};
    const fiscal = data.fiscal || {};
    const emitente = data.emitente || null;
    const certificado = data.certificado || {};
    const contas = data.contas || {};
    const whatsapp = data.mensagens?.whatsapp || {};
    const responsavelTecnico = data.responsavel_tecnico || {};

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
      responsavel_tecnico_cnpj: responsavelTecnico.cnpj || "66056990000198",
      responsavel_tecnico_nome: responsavelTecnico.nome || "jhes sistemas",
      responsavel_tecnico_contato: responsavelTecnico.contato || "Jonas Paulino",
      responsavel_tecnico_email:
        responsavelTecnico.email || "jonaspaulino@jhes.com.br",
      responsavel_tecnico_telefone: responsavelTecnico.telefone || "819984163086",
      responsavel_tecnico_logradouro:
        responsavelTecnico.logradouro || "Rua nova Baraunas",
      responsavel_tecnico_numero: responsavelTecnico.numero || "451",
      responsavel_tecnico_bairro: responsavelTecnico.bairro || "nova caruaru",
      responsavel_tecnico_cidade: responsavelTecnico.cidade || "Caruaru",
      responsavel_tecnico_uf: responsavelTecnico.uf || "PE",
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
        const [response, regrasResponse, operacoesResponse] = await Promise.all([
          getConfiguracaoFiscal(),
          listRegrasFiscais(),
          listOperacoesFiscais(),
        ]);

        if (!mounted) return;
        applyData(response.data || null);
        setRegrasFiscais(regrasResponse.data || []);
        setOperacoesFiscais(operacoesResponse.data || []);
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

  const updateRegraFiscalField = useCallback((field, value) => {
    setRegraFiscalForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateOperacaoFiscalField = useCallback((field, value) => {
    setOperacaoFiscalForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "emite_nfe" && !value) {
        next.tipo_nfe = "";
      }

      if (field === "movimenta_estoque" && !value) {
        next.tipo_movimento_estoque = "nenhum";
      }

      if (field === "gera_financeiro" && !value) {
        next.tipo_financeiro = "nenhum";
      }

      if (field === "tipo_operacao") {
        if (value === "compra" || value === "bonificacao_entrada" || value === "devolucao_venda") {
          next.tipo_nfe = "entrada";
          next.tipo_movimento_estoque = "entrada";
          next.tipo_financeiro = value === "compra" ? "pagar" : "nenhum";
          next.gera_financeiro = value === "compra";
          next.atualiza_custo = value === "compra";
          next.emite_nfe = value === "devolucao_venda";
        } else if (value === "devolucao_compra" || value === "bonificacao_saida" || value === "venda") {
          next.tipo_nfe = "saida";
          next.tipo_movimento_estoque = "saida";
          next.tipo_financeiro = value === "venda" ? "receber" : "nenhum";
          next.gera_financeiro = value === "venda";
          next.atualiza_custo = false;
          next.emite_nfe = value !== "compra";
        }
      }

      return next;
    });
  }, []);

  const reloadRegrasFiscais = useCallback(async () => {
    const response = await listRegrasFiscais();
    setRegrasFiscais(response.data || []);
  }, []);

  const reloadOperacoesFiscais = useCallback(async () => {
    const response = await listOperacoesFiscais();
    setOperacoesFiscais(response.data || []);
  }, []);

  const resetRegraFiscalForm = useCallback(() => {
    setEditingRegraFiscalId(null);
    setRegraFiscalForm(buildRegraFiscalForm());
  }, []);

  const resetOperacaoFiscalForm = useCallback(() => {
    setEditingOperacaoFiscalId(null);
    setOperacaoFiscalForm(buildOperacaoFiscalForm());
  }, []);

  const handleEditRegraFiscal = useCallback((regra) => {
    setEditingRegraFiscalId(regra?.regra_tributaria_id || null);
    setRegraFiscalForm(mapRegraFiscalToForm(regra));
  }, []);

  const handleEditOperacaoFiscal = useCallback((operacao) => {
    setEditingOperacaoFiscalId(operacao?.operacao_fiscal_id || null);
    setOperacaoFiscalForm(mapOperacaoFiscalToForm(operacao));
  }, []);

  const handleSaveRegraFiscal = useCallback(async () => {
    if (regraFiscalSaving) return false;

    if (!String(regraFiscalForm.descricao || "").trim()) {
      showAlert({
        title: "Nome obrigatório",
        text: "Informe um nome para a regra fiscal.",
        icon: "warning",
      });
      return false;
    }

    try {
      setRegraFiscalSaving(true);

      const response = editingRegraFiscalId
        ? await updateRegraFiscal(editingRegraFiscalId, regraFiscalForm)
        : await createRegraFiscal(regraFiscalForm);

      await reloadRegrasFiscais();
      resetRegraFiscalForm();

      showAlert({
        title: "Regra fiscal salva",
        text: response.message || "Regra fiscal salva com sucesso.",
        icon: "success",
      });

      return true;
    } catch (error) {
      showAlert({
        title: "Falha ao salvar regra",
        text:
          error?.response?.data?.message ||
          "Não foi possível salvar a regra fiscal.",
        icon: "error",
      });
      return false;
    } finally {
      setRegraFiscalSaving(false);
    }
  }, [
    editingRegraFiscalId,
    regraFiscalForm,
    regraFiscalSaving,
    reloadRegrasFiscais,
    resetRegraFiscalForm,
    showAlert,
  ]);

  const handleToggleRegraFiscal = useCallback(
    async (regra) => {
      const nextAtivo = !regra?.ativo;
      const confirmed = await askYesNoQuestion(
        nextAtivo ? "Reativar regra fiscal" : "Inativar regra fiscal",
        `Deseja realmente ${nextAtivo ? "reativar" : "inativar"} a regra "${
          regra?.descricao || ""
        }"?`
      );

      if (!confirmed) return;

      try {
        await updateRegraFiscal(regra.regra_tributaria_id, {
          ...mapRegraFiscalToForm(regra),
          ativo: nextAtivo,
        });
        await reloadRegrasFiscais();

        if (editingRegraFiscalId === regra.regra_tributaria_id) {
          resetRegraFiscalForm();
        }

        showAlert({
          title: nextAtivo ? "Regra fiscal reativada" : "Regra fiscal inativada",
          text: "A regra fiscal foi atualizada com sucesso.",
          icon: "success",
          confirmButtonText: "OK",
        });
      } catch (error) {
        showAlert({
          title: "Falha ao atualizar regra",
          text:
            error?.response?.data?.message ||
            "Não foi possível atualizar a regra fiscal.",
          icon: "error",
        });
      }
    },
    [
      askYesNoQuestion,
      editingRegraFiscalId,
      reloadRegrasFiscais,
      resetRegraFiscalForm,
      showAlert,
    ]
  );

  const handleSaveOperacaoFiscal = useCallback(async () => {
    if (operacaoFiscalSaving) return false;

    if (!String(operacaoFiscalForm.codigo || "").trim()) {
      showAlert({
        title: "Código obrigatório",
        text: "Informe um código para a operação fiscal.",
        icon: "warning",
      });
      return false;
    }

    if (!String(operacaoFiscalForm.descricao || "").trim()) {
      showAlert({
        title: "Descrição obrigatória",
        text: "Informe uma descrição para a operação fiscal.",
        icon: "warning",
      });
      return false;
    }

    try {
      setOperacaoFiscalSaving(true);

      const response = editingOperacaoFiscalId
        ? await updateOperacaoFiscal(editingOperacaoFiscalId, operacaoFiscalForm)
        : await createOperacaoFiscal(operacaoFiscalForm);

      await reloadOperacoesFiscais();
      resetOperacaoFiscalForm();

      showAlert({
        title: "Operação fiscal salva",
        text: response.message || "Operação fiscal salva com sucesso.",
        icon: "success",
      });

      return true;
    } catch (error) {
      showAlert({
        title: "Falha ao salvar operação",
        text:
          error?.response?.data?.message ||
          "Não foi possível salvar a operação fiscal.",
        icon: "error",
      });
      return false;
    } finally {
      setOperacaoFiscalSaving(false);
    }
  }, [
    editingOperacaoFiscalId,
    operacaoFiscalForm,
    operacaoFiscalSaving,
    reloadOperacoesFiscais,
    resetOperacaoFiscalForm,
    showAlert,
  ]);

  const handleToggleOperacaoFiscal = useCallback(
    async (operacao) => {
      const nextAtivo = !operacao?.ativo;
      const confirmed = await askYesNoQuestion(
        nextAtivo ? "Reativar operação fiscal" : "Inativar operação fiscal",
        `Deseja realmente ${nextAtivo ? "reativar" : "inativar"} a operação "${
          operacao?.descricao || ""
        }"?`
      );

      if (!confirmed) return;

      try {
        await updateOperacaoFiscal(operacao.operacao_fiscal_id, {
          ...mapOperacaoFiscalToForm(operacao),
          ativo: nextAtivo,
        });
        await reloadOperacoesFiscais();

        if (editingOperacaoFiscalId === operacao.operacao_fiscal_id) {
          resetOperacaoFiscalForm();
        }

        showAlert({
          title: nextAtivo
            ? "Operação fiscal reativada"
            : "Operação fiscal inativada",
          text: "A operação fiscal foi atualizada com sucesso.",
          icon: "success",
          confirmButtonText: "OK",
        });
      } catch (error) {
        showAlert({
          title: "Falha ao atualizar operação",
          text:
            error?.response?.data?.message ||
            "Não foi possível atualizar a operação fiscal.",
          icon: "error",
        });
      }
    },
    [
      askYesNoQuestion,
      editingOperacaoFiscalId,
      reloadOperacoesFiscais,
      resetOperacaoFiscalForm,
      showAlert,
    ]
  );

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

  const applyWhatsAppConfig = useCallback((config = {}) => {
    if (!config || typeof config !== "object") return;

    setForm((prev) => ({
      ...prev,
      whatsapp_provider: config.provider || prev.whatsapp_provider,
      whatsapp_ativo: !!config.whatsapp_ativo,
      whatsapp_instance_name: config.instance_name || "",
      whatsapp_remetente_numero: config.remetente_numero || "",
      whatsapp_auto_enviar_boleto_venda:
        config.auto_enviar_boleto_venda === undefined
          ? prev.whatsapp_auto_enviar_boleto_venda
          : !!config.auto_enviar_boleto_venda,
      whatsapp_auto_enviar_pix_venda:
        config.auto_enviar_pix_venda === undefined
          ? prev.whatsapp_auto_enviar_pix_venda
          : !!config.auto_enviar_pix_venda,
      whatsapp_mensagem_boleto_padrao:
        config.mensagem_boleto_padrao || prev.whatsapp_mensagem_boleto_padrao,
      whatsapp_mensagem_pix_padrao:
        config.mensagem_pix_padrao || prev.whatsapp_mensagem_pix_padrao,
    }));
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
        const response = await createWhatsAppInstance({
          instance_name: instanceName,
          remetente_numero: form.whatsapp_remetente_numero,
          whatsapp_ativo: true,
        });
        applyWhatsAppConfig(response?.config);

        showAlert({
          title: "WhatsApp conectado",
          text: "A instância já está conectada e pronta para uso.",
          icon: "success",
        });
        return;
      }

      const response = await createWhatsAppInstance({
        instance_name: instanceName,
        remetente_numero: form.whatsapp_remetente_numero,
        whatsapp_ativo: false,
      });
      applyWhatsAppConfig(response?.config);

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
                const response = await createWhatsAppInstance({
                  instance_name: instanceName,
                  remetente_numero: form.whatsapp_remetente_numero,
                  whatsapp_ativo: true,
                });
                applyWhatsAppConfig(response?.config);

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
    applyWhatsAppConfig,
    form.whatsapp_instance_name,
    form.whatsapp_remetente_numero,
    showAlert,
  ]);

  const handleDisconnectWhatsApp = useCallback(async () => {
    try {
      setWhatsAppState((prev) => ({ ...prev, loading: true }));

      const response = await logoutWhatsAppInstance(form.whatsapp_instance_name);
      applyWhatsAppConfig(response?.config);
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
  }, [
    applyWhatsAppConfig,
    applyWhatsAppConnection,
    form.whatsapp_instance_name,
    showAlert,
  ]);

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

      const response = await deleteWhatsAppInstance(form.whatsapp_instance_name);
      applyWhatsAppConfig(response?.config);
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
    applyWhatsAppConfig,
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

        if (isUsuarioMaster) {
          payload.responsavel_tecnico = {
            cnpj: form.responsavel_tecnico_cnpj,
            nome: form.responsavel_tecnico_nome,
            contato: form.responsavel_tecnico_contato,
            email: form.responsavel_tecnico_email,
            telefone: form.responsavel_tecnico_telefone,
            logradouro: form.responsavel_tecnico_logradouro,
            numero: form.responsavel_tecnico_numero,
            bairro: form.responsavel_tecnico_bairro,
            cidade: form.responsavel_tecnico_cidade,
            uf: form.responsavel_tecnico_uf,
          };
        }

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
    [applyData, certificadoFile, form, isUsuarioMaster, saving, showAlert]
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
    operacoesFiscais,
    operacaoFiscalForm,
    editingOperacaoFiscalId,
    operacaoFiscalSaving,
    regrasFiscais,
    regraFiscalForm,
    editingRegraFiscalId,
    regraFiscalSaving,
    isWhatsAppConnected,
    canRestartWhatsApp,
    canDeleteWhatsApp,
    updateField,
    updateOperacaoFiscalField,
    updateRegraFiscalField,
    resetOperacaoFiscalForm,
    resetRegraFiscalForm,
    handleEditOperacaoFiscal,
    handleEditRegraFiscal,
    handleSaveOperacaoFiscal,
    handleSaveRegraFiscal,
    handleToggleOperacaoFiscal,
    handleToggleRegraFiscal,
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
