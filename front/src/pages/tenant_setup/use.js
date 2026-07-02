import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import {
  createTenantSetup,
  getTenantSetup,
  listTenants,
  previewTenantCertificate,
  toggleTenantSetupStatus,
  updateTenantSetup,
} from "./api";

const REQUIRED_TITLE = "Este campo é obrigatório.";
const PAGE_SIZE = 8;
const LOGO_TARGET_BYTES = 500 * 1024;
const LOGO_MAX_WIDTH = 900;
const LOGO_MAX_HEIGHT = 300;

const todayInputValue = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createInitialForm = () => ({
  certificado_senha: "",
  tenant_nome: "",
  nome_razao: "",
  nome_fantasia: "",
  cnpj: "",
  inscricao_estadual: "",
  inscricao_municipal: "",
  email: "",
  telefone: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  codigo_ibge: "",
  pais: "Brasil",
  usuario_nome: "",
  usuario_email: "",
  usuario_username: "",
  usuario_password: "",
  usuario_confirm_password: "",
  financeiro_plano_nome: "V12 ERP",
  financeiro_ciclo: "mensal",
  financeiro_forma_cobranca: "boleto",
  financeiro_valor_mensal: "",
  financeiro_quantidade_parcelas: "1",
  financeiro_dia_vencimento: "10",
  financeiro_primeiro_vencimento: todayInputValue(),
  financeiro_juros_mora_percentual: "0",
  financeiro_multa_atraso_percentual: "0",
  financeiro_bloquear_apos_dias: "0",
  financeiro_observacao: "",
});

const formatFileSize = (value) => {
  const size = Number(value || 0);
  if (!size) return "--";
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

const formatDate = (value) => {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("pt-BR");
};

const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo do certificado."));
    reader.readAsDataURL(file);
  });

const imageToCanvas = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);

      const scale = Math.min(
        1,
        LOGO_MAX_WIDTH / image.width,
        LOGO_MAX_HEIGHT / image.height
      );
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem da logo."));
    };

    image.src = url;
  });

const canvasToBlob = (canvas, quality) =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
  });

const compressLogoFile = async (file) => {
  if (!file || !String(file.type || "").startsWith("image/")) {
    throw new Error("Selecione uma imagem válida para a logo.");
  }

  const canvas = await imageToCanvas(file);
  let bestBlob = null;

  for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5]) {
    const blob = await canvasToBlob(canvas, quality);
    if (!blob) continue;

    bestBlob = blob;
    if (blob.size <= LOGO_TARGET_BYTES) break;
  }

  if (!bestBlob) {
    throw new Error("Não foi possível compactar a logo.");
  }

  const name = String(file.name || "logo")
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return new File([bestBlob], `${name || "logo"}.webp`, { type: "image/webp" });
};

const buildTenantRequestPayload = (payload, logoFile) => {
  if (!logoFile) return payload;

  const formData = new FormData();
  formData.append("payload", JSON.stringify(payload));
  formData.append("logo", logoFile);
  return formData;
};

const normalizeSearch = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const normalizeCnpj = (value) => String(value || "").replace(/\D/g, "");
const isTenantActive = (tenant) => tenant?.tenant_ativo !== false && tenant?.ativo !== false;

export const useTenantSetupPage = () => {
  const { business, setBusiness, setBusinesses, showLoading, hideLoading } =
    useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [saving, setSaving] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [certificadoFile, setCertificadoFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [form, setForm] = useState(() => createInitialForm());
  const [preview, setPreview] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingTenantId, setEditingTenantId] = useState(null);
  const [actionMenuTenantId, setActionMenuTenantId] = useState(null);

  const resetForm = useCallback(() => {
    setStep(1);
    setCertificadoFile(null);
    setLogoFile(null);
    setForm(createInitialForm());
    setPreview(null);
    setEditingTenantId(null);
    setActionMenuTenantId(null);
  }, []);

  const syncBusinessContext = useCallback(
    (nextTenants = []) => {
      const activeTenants = nextTenants.filter(isTenantActive);
      setBusinesses(activeTenants);

      const currentBusiness = activeTenants.find(
        (tenant) => Number(tenant.tenant_id) === Number(business?.tenant_id)
      );
      if (currentBusiness) {
        setBusiness(currentBusiness);
      }
    },
    [business?.tenant_id, setBusiness, setBusinesses]
  );

  const loadTenants = useCallback(async () => {
    setLoadingTenants(true);
    showLoading("Carregando clientes...");

    try {
      const result = await listTenants();
      const nextTenants = Array.isArray(result?.data) ? result.data : [];
      setTenants(nextTenants);
      syncBusinessContext(nextTenants);
      return nextTenants;
    } catch (error) {
      await showAlert({
        title: "Falha ao carregar empresas",
        text: error?.response?.data?.error || error?.message || "Não foi possível listar as filiais.",
        icon: "error",
      });
      return [];
    } finally {
      setLoadingTenants(false);
      hideLoading();
    }
  }, [hideLoading, showAlert, showLoading, syncBusinessContext]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const openModal = useCallback(() => {
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback(
    async (tenantId) => {
      setActionMenuTenantId(null);
      setLoadingTenants(true);
      showLoading("Carregando cadastro...");

      try {
        const result = await getTenantSetup(tenantId);
        const data = result?.data || {};
        const empresa = data.empresa || {};
        const certificado = data.certificado || {};
        const logo = data.logo || {};

        setEditingTenantId(tenantId);
        setForm({
          ...createInitialForm(),
          tenant_nome: empresa.tenant_nome || "",
          nome_razao: empresa.nome_razao || "",
          nome_fantasia: empresa.nome_fantasia || "",
          cnpj: empresa.cnpj || "",
          inscricao_estadual: empresa.inscricao_estadual || "",
          inscricao_municipal: empresa.inscricao_municipal || "",
          email: empresa.email || "",
          telefone: empresa.telefone || "",
          cep: empresa.cep || "",
          logradouro: empresa.logradouro || "",
          numero: empresa.numero || "",
          complemento: empresa.complemento || "",
          bairro: empresa.bairro || "",
          cidade: empresa.cidade || "",
          uf: empresa.uf || "",
          codigo_ibge: empresa.codigo_ibge || "",
          pais: empresa.pais || "Brasil",
        });
        setPreview({
          certificado: {
            nome_arquivo: certificado.nome_arquivo || "",
            validade_em: certificado.validade_em || null,
          },
          logo,
          empresa,
        });
        setStep(2);
        setIsModalOpen(true);
      } catch (error) {
        await showAlert({
          title: "Falha ao carregar filial",
          text: error?.response?.data?.message || error?.message || "Não foi possível carregar a filial.",
          icon: "error",
        });
      } finally {
        setLoadingTenants(false);
        hideLoading();
      }
    },
    [hideLoading, showAlert, showLoading]
  );

  const findTenantByCnpj = useCallback(
    (cnpj) => {
      const normalized = normalizeCnpj(cnpj);
      if (!normalized) return null;

      return tenants.find((tenant) => normalizeCnpj(tenant.tenant_documento) === normalized) || null;
    },
    [tenants]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSelectCertificado = useCallback((event) => {
    const file = event.target.files?.[0] || null;
    setCertificadoFile(file);
  }, []);

  const handleSelectLogo = useCallback(
    async (event) => {
      const file = event.target.files?.[0] || null;
      event.target.value = "";

      if (!file) {
        setLogoFile(null);
        return;
      }

      try {
        const compressed = await compressLogoFile(file);
        setLogoFile(compressed);
      } catch (error) {
        setLogoFile(null);
        await showAlert({
          title: "Logo inválida",
          text: error.message || "Não foi possível processar a logo da filial.",
          icon: "warning",
        });
      }
    },
    [showAlert]
  );

  const handleConfirmCertificate = useCallback(async () => {
    if (!certificadoFile) {
      await showAlert({
        title: "Certificado obrigatório",
        text: "Selecione o arquivo .pfx da empresa para continuar.",
        icon: "warning",
      });
      return;
    }

    if (!String(form.certificado_senha || "").trim()) {
      await showAlert({
        title: "Senha obrigatória",
        text: "Informe a senha do certificado A1.",
        icon: "warning",
      });
      return;
    }

    try {
      showLoading("Lendo certificado...");
      const conteudoBase64 = await readFileAsBase64(certificadoFile);
      const result = await previewTenantCertificate({
        certificadoBase64: conteudoBase64,
        certificadoSenha: form.certificado_senha,
      });

      const previewData = result?.data || null;
      const empresa = previewData?.empresa || {};

      if (!editingTenantId) {
        const tenantExistente = findTenantByCnpj(empresa.cnpj);
        if (tenantExistente) {
          await showAlert({
            title: "Empresa já cadastrada",
            text: `Já existe uma filial cadastrada com este CNPJ (${tenantExistente.tenant_nome}).`,
            icon: "warning",
          });
          return;
        }
      }

      setPreview(previewData);
      setForm((prev) => ({
        ...prev,
        tenant_nome:
          prev.tenant_nome || empresa.tenant_nome || empresa.nome_fantasia || empresa.nome_razao || "",
        nome_razao: empresa.nome_razao || prev.nome_razao,
        nome_fantasia: empresa.nome_fantasia || prev.nome_fantasia,
        cnpj: empresa.cnpj || prev.cnpj,
        inscricao_estadual: empresa.inscricao_estadual || prev.inscricao_estadual,
        email: empresa.email || prev.email,
        telefone: empresa.telefone || prev.telefone,
        cep: empresa.cep || prev.cep,
        logradouro: empresa.logradouro || prev.logradouro,
        numero: empresa.numero || prev.numero,
        complemento: empresa.complemento || prev.complemento,
        bairro: empresa.bairro || prev.bairro,
        cidade: empresa.cidade || prev.cidade,
        uf: empresa.uf || prev.uf,
        codigo_ibge: empresa.codigo_ibge || prev.codigo_ibge,
        pais: empresa.pais || prev.pais,
      }));
      setStep(2);
    } catch (error) {
      await showAlert({
        title: "Falha ao ler certificado",
        text: error?.response?.data?.message || error?.message || "Não foi possível ler o certificado.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }, [
    certificadoFile,
    editingTenantId,
    findTenantByCnpj,
    form.certificado_senha,
    hideLoading,
    showAlert,
    showLoading,
  ]);

  const goNextStep = useCallback(async () => {
    if (step === 1) {
      if (!editingTenantId && (!certificadoFile || !String(form.certificado_senha || "").trim())) {
        await showAlert({
          title: "Certificado incompleto",
          text: "Selecione o certificado A1 e informe a senha antes de avançar.",
          icon: "warning",
        });
        return;
      }
    }

    if (step === 2) {
      const requiredFields = [
        ["tenant_nome", "Nome da filial"],
        ["nome_razao", "Razão social"],
        ["cnpj", "CNPJ"],
        ["cep", "CEP"],
        ["logradouro", "Logradouro"],
        ["numero", "Número"],
        ["bairro", "Bairro"],
        ["cidade", "Cidade"],
        ["uf", "UF"],
      ];

      const missing = requiredFields.find(([field]) => !String(form[field] || "").trim());
      if (missing) {
        await showAlert({
          title: "Dados incompletos",
          text: `${missing[1]} é obrigatório.`,
          icon: "warning",
        });
        return;
      }
    }

    if (!editingTenantId && step === 3) {
      const requiredUserFields = [
        ["usuario_nome", "Nome do usuário admin"],
        ["usuario_email", "E-mail do usuário admin"],
        ["usuario_username", "Login do usuário admin"],
        ["usuario_password", "Senha do usuário admin"],
      ];

      const missing = requiredUserFields.find(([field]) => !String(form[field] || "").trim());
      if (missing) {
        await showAlert({
          title: "Usuário incompleto",
          text: `${missing[1]} é obrigatório.`,
          icon: "warning",
        });
        return;
      }

      if (String(form.usuario_password || "").length < 6) {
        await showAlert({
          title: "Senha inválida",
          text: "A senha do usuário admin precisa ter pelo menos 6 caracteres.",
          icon: "warning",
        });
        return;
      }

      if (form.usuario_password !== form.usuario_confirm_password) {
        await showAlert({
          title: "Senha não confere",
          text: "A confirmação da senha do usuário admin não confere.",
          icon: "warning",
        });
        return;
      }
    }

    setStep((prev) => Math.min(prev + 1, editingTenantId ? 2 : 4));
  }, [certificadoFile, editingTenantId, form, showAlert, step]);

  const goPreviousStep = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!certificadoFile && !editingTenantId) {
      await showAlert({
        title: "Certificado obrigatório",
        text: "Selecione o certificado da empresa antes de concluir o cadastro.",
        icon: "warning",
      });
      return;
    }

    setSaving(true);
    showLoading(editingTenantId ? "Atualizando cliente..." : "Cadastrando cliente...");

    try {
      const payload = {
        empresa: {
          tenant_nome: form.tenant_nome,
          nome_razao: form.nome_razao,
          nome_fantasia: form.nome_fantasia,
          cnpj: form.cnpj,
          inscricao_estadual: form.inscricao_estadual,
          inscricao_municipal: form.inscricao_municipal,
          email: form.email,
          telefone: form.telefone,
          cep: form.cep,
          logradouro: form.logradouro,
          numero: form.numero,
          complemento: form.complemento,
          bairro: form.bairro,
          cidade: form.cidade,
          uf: form.uf,
          codigo_ibge: form.codigo_ibge,
          pais: form.pais,
        },
      };

      if (editingTenantId) {
        if (certificadoFile) {
          if (!String(form.certificado_senha || "").trim()) {
            await showAlert({
              title: "Senha obrigatória",
              text: "Informe a senha do novo certificado para substituir o certificado atual.",
              icon: "warning",
            });
            return;
          }

          const conteudoBase64 = await readFileAsBase64(certificadoFile);
          payload.certificado = {
            nome_arquivo: certificadoFile.name,
            senha: form.certificado_senha,
            conteudo_base64: conteudoBase64,
          };
        }

        await updateTenantSetup(
          editingTenantId,
          buildTenantRequestPayload(payload, logoFile)
        );
      } else {
        const tenantExistente = findTenantByCnpj(form.cnpj);
        if (tenantExistente) {
          await showAlert({
            title: "Empresa já cadastrada",
            text: `Já existe uma filial cadastrada com este CNPJ (${tenantExistente.tenant_nome}).`,
            icon: "warning",
          });
          return;
        }

        const conteudoBase64 = await readFileAsBase64(certificadoFile);
        const requiredUserFields = [
          ["usuario_nome", "Nome do usuário admin"],
          ["usuario_email", "E-mail do usuário admin"],
          ["usuario_username", "Login do usuário admin"],
          ["usuario_password", "Senha do usuário admin"],
        ];

        const missing = requiredUserFields.find(([field]) => !String(form[field] || "").trim());
        if (missing) {
          await showAlert({
            title: "Usuário incompleto",
            text: `${missing[1]} é obrigatório.`,
            icon: "warning",
          });
          return;
        }

        if (String(form.usuario_password || "").length < 6) {
          await showAlert({
            title: "Senha inválida",
            text: "A senha do usuário admin precisa ter pelo menos 6 caracteres.",
            icon: "warning",
          });
          return;
        }

        if (form.usuario_password !== form.usuario_confirm_password) {
          await showAlert({
            title: "Senha não confere",
            text: "A confirmação da senha do usuário admin não confere.",
            icon: "warning",
          });
          return;
        }

        if (!Number(form.financeiro_valor_mensal || 0)) {
          await showAlert({
            title: "Financeiro incompleto",
            text: "Informe o valor mensal do contrato V12.",
            icon: "warning",
          });
          return;
        }

        if (!String(form.financeiro_primeiro_vencimento || "").trim()) {
          await showAlert({
            title: "Financeiro incompleto",
            text: "Informe o primeiro vencimento do contrato V12.",
            icon: "warning",
          });
          return;
        }

        payload.usuario = {
          nome: form.usuario_nome,
          email: form.usuario_email,
          username: form.usuario_username,
          password: form.usuario_password,
        };
        payload.certificado = {
          nome_arquivo: certificadoFile.name,
          senha: form.certificado_senha,
          conteudo_base64: conteudoBase64,
        };
        payload.financeiro = {
          criar_contrato: true,
          plano_nome: form.financeiro_plano_nome,
          ciclo: form.financeiro_ciclo,
          forma_cobranca: form.financeiro_forma_cobranca,
          valor_mensal: form.financeiro_valor_mensal,
          quantidade_parcelas: form.financeiro_quantidade_parcelas,
          dia_vencimento: form.financeiro_dia_vencimento,
          primeiro_vencimento: form.financeiro_primeiro_vencimento,
          juros_mora_percentual: form.financeiro_juros_mora_percentual,
          multa_atraso_percentual: form.financeiro_multa_atraso_percentual,
          bloquear_apos_dias: form.financeiro_bloquear_apos_dias,
          observacao: form.financeiro_observacao,
        };

        await createTenantSetup(buildTenantRequestPayload(payload, logoFile));
      }

      await loadTenants();
      await showAlert({
        title: editingTenantId ? "Filial atualizada" : "Filial cadastrada",
        text: editingTenantId
          ? "Os dados da empresa foram atualizados com sucesso."
          : "A nova empresa foi cadastrada com sucesso e já possui usuário admin.",
        icon: "success",
      });

      closeModal();
    } catch (error) {
      await showAlert({
        title: editingTenantId ? "Falha ao atualizar filial" : "Falha ao cadastrar filial",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Não foi possível concluir o cadastro da filial.",
        icon: "error",
      });
    } finally {
      setSaving(false);
      hideLoading();
    }
  }, [
    certificadoFile,
    closeModal,
    editingTenantId,
    findTenantByCnpj,
    form,
    hideLoading,
    loadTenants,
    logoFile,
    showAlert,
    showLoading,
  ]);

  const certificateSummary = useMemo(() => {
    if (!certificadoFile) {
      const persisted = preview?.certificado || null;
      if (persisted?.configurado || persisted?.nome_arquivo) {
        return {
          nome_arquivo: persisted.nome_arquivo || "Certificado A1 vinculado",
          tamanho: formatFileSize(persisted.tamanho_arquivo),
          validade: formatDate(persisted.validade_em),
          persisted: true,
        };
      }

      return {
        nome_arquivo: "Nenhum certificado selecionado",
        tamanho: "--",
        validade: "--",
        persisted: false,
      };
    }

    return {
      nome_arquivo: certificadoFile.name,
      tamanho: `${(certificadoFile.size / 1024).toFixed(1)} KB`,
      validade: "--",
      persisted: false,
    };
  }, [certificadoFile, preview]);

  const logoSummary = useMemo(() => {
    if (logoFile) {
      return {
        nome_arquivo: logoFile.name,
        tamanho: formatFileSize(logoFile.size),
        persisted: false,
      };
    }

    const persisted = preview?.logo || null;
    if (persisted?.configurado || persisted?.nome_arquivo) {
      return {
        nome_arquivo: persisted.nome_arquivo || "Logo vinculada",
        tamanho: formatFileSize(persisted.tamanho_arquivo),
        persisted: true,
      };
    }

    return {
      nome_arquivo: "Nenhuma logo selecionada",
      tamanho: "--",
      persisted: false,
    };
  }, [logoFile, preview]);

  const filteredTenants = useMemo(() => {
    const query = normalizeSearch(search);

    if (!query) return tenants;

    return tenants.filter((tenant) => {
      const searchable = [
        tenant.tenant_nome,
        tenant.tenant_slug,
        tenant.tenant_documento,
        tenant.perfil,
      ]
        .map(normalizeSearch)
        .join(" ");

      return searchable.includes(query);
    });
  }, [search, tenants]);

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / PAGE_SIZE));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const paginatedTenants = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTenants.slice(start, start + PAGE_SIZE);
  }, [filteredTenants, page]);

  const handleToggleTenantStatus = useCallback(
    async (tenant, currentTenantId = null) => {
      setActionMenuTenantId(null);

      if (
        tenant.tenant_ativo &&
        currentTenantId &&
        Number(currentTenantId) === Number(tenant.tenant_id)
      ) {
        await showAlert({
          title: "Ação indisponível",
          text: "Você não pode inativar a filial em que está logado.",
          icon: "warning",
        });
        return;
      }

      const confirmed = await askYesNoQuestion(
        tenant.tenant_ativo ? "Inativar empresa?" : "Reativar empresa?",
        tenant.tenant_ativo
          ? `Tem certeza que deseja inativar ${tenant.tenant_nome}?`
          : `Tem certeza que deseja reativar ${tenant.tenant_nome}?`
      );

      if (!confirmed) return;

      try {
        showLoading(tenant.tenant_ativo ? "Inativando cliente..." : "Reativando cliente...");
        await toggleTenantSetupStatus(tenant.tenant_id, !tenant.tenant_ativo);
        await loadTenants();
      } finally {
        hideLoading();
      }
    },
    [askYesNoQuestion, hideLoading, loadTenants, showAlert, showLoading]
  );

  return {
    REQUIRED_TITLE,
    saving,
    loadingTenants,
    isModalOpen,
    step,
    form,
    preview,
    certificateSummary,
    logoSummary,
    tenants: paginatedTenants,
    totalTenants: filteredTenants.length,
    page,
    totalPages,
    search,
    editingTenantId,
    actionMenuTenantId,
    updateField,
    setSearch,
    setPage,
    setActionMenuTenantId,
    openModal,
    openEditModal,
    closeModal,
    handleToggleTenantStatus,
    handleSelectCertificado,
    handleSelectLogo,
    handleConfirmCertificate,
    goNextStep,
    goPreviousStep,
    handleSubmit,
    loadTenants,
  };
};
