import { useCallback, useEffect, useMemo, useState } from "react";
import { useSweetAlert } from "context/sweet_alert";
import {
  getConfiguracaoFiscal,
  getPessoasEmitenteSelect,
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
  const { showAlert } = useSweetAlert();
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
  const [certificadoFile, setCertificadoFile] = useState(null);

  const applyData = useCallback((payload) => {
    const data = payload || {};
    const fiscal = data.fiscal || {};
    const emitente = data.emitente || null;
    const certificado = data.certificado || {};

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
    });
    setSelectedEmitente(buildEmitenteOption(emitente));
    setCertificadoAtual({
      configurado: !!certificado.configurado,
      nome_arquivo: certificado.nome_arquivo || "",
      tamanho_arquivo: Number(certificado.tamanho_arquivo || 0),
      importado_em: certificado.importado_em || null,
      atualizado_em: certificado.atualizado_em || null,
    });
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
            "Não foi possível carregar a configuração fiscal da filial.",
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
          text: response.message || "Configuração fiscal da filial salva com sucesso.",
          icon: "success",
        });
      } catch (error) {
        showAlert({
          title: "Falha ao salvar",
          text:
            error?.response?.data?.message ||
            "Não foi possível salvar a configuração fiscal da filial.",
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
    updateField,
    loadEmitenteOptions,
    handleSelectEmitente,
    handleSelectCertificado,
    handleSubmit,
  };
};
