import { useCallback, useEffect, useMemo, useState } from "react";
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
});

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

const normalizeSearch = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const normalizeCnpj = (value) => String(value || "").replace(/\D/g, "");

export const useTenantSetupPage = () => {
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [saving, setSaving] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [certificadoFile, setCertificadoFile] = useState(null);
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
    setForm(createInitialForm());
    setPreview(null);
    setEditingTenantId(null);
    setActionMenuTenantId(null);
  }, []);

  const loadTenants = useCallback(async () => {
    setLoadingTenants(true);

    try {
      const result = await listTenants();
      setTenants(Array.isArray(result?.data) ? result.data : []);
    } catch (error) {
      await showAlert({
        title: "Falha ao carregar empresas",
        text: error?.response?.data?.error || error?.message || "Não foi possível listar as filiais.",
        icon: "error",
      });
    } finally {
      setLoadingTenants(false);
    }
  }, [showAlert]);

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

      try {
        const result = await getTenantSetup(tenantId);
        const data = result?.data || {};
        const empresa = data.empresa || {};
        const certificado = data.certificado || {};

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
      }
    },
    [showAlert]
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
    }
  }, [certificadoFile, editingTenantId, findTenantByCnpj, form.certificado_senha, showAlert]);

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

    setStep((prev) => Math.min(prev + 1, editingTenantId ? 2 : 3));
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
          const conteudoBase64 = await readFileAsBase64(certificadoFile);
          payload.certificado = {
            nome_arquivo: certificadoFile.name,
            senha: form.certificado_senha,
            conteudo_base64: conteudoBase64,
          };
        }

        await updateTenantSetup(editingTenantId, payload);
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

        await createTenantSetup(payload);
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
    }
  }, [certificadoFile, closeModal, editingTenantId, findTenantByCnpj, form, loadTenants, showAlert]);

  const certificateSummary = useMemo(() => {
    if (!certificadoFile) {
      return {
        nome_arquivo: "Nenhum certificado selecionado",
        tamanho: "--",
      };
    }

    return {
      nome_arquivo: certificadoFile.name,
      tamanho: `${(certificadoFile.size / 1024).toFixed(1)} KB`,
    };
  }, [certificadoFile]);

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
    async (tenant) => {
      setActionMenuTenantId(null);
      const confirmed = await askYesNoQuestion(
        tenant.tenant_ativo ? "Inativar empresa?" : "Reativar empresa?",
        tenant.tenant_ativo
          ? `Tem certeza que deseja inativar ${tenant.tenant_nome}?`
          : `Tem certeza que deseja reativar ${tenant.tenant_nome}?`
      );

      if (!confirmed) return;

      await toggleTenantSetupStatus(tenant.tenant_id, !tenant.tenant_ativo);
      await loadTenants();
    },
    [askYesNoQuestion, loadTenants]
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
    handleConfirmCertificate,
    goNextStep,
    goPreviousStep,
    handleSubmit,
    loadTenants,
  };
};
