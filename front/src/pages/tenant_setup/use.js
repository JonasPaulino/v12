import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSweetAlert } from "context/sweet_alert";
import { createTenantSetup, previewTenantCertificate } from "./api";

const REQUIRED_TITLE = "Este campo é obrigatório.";

const initialForm = {
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

export const useTenantSetupPage = () => {
  const navigate = useNavigate();
  const { showAlert } = useSweetAlert();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [certificadoFile, setCertificadoFile] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [preview, setPreview] = useState(null);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSelectCertificado = useCallback(
    (event) => {
      const file = event.target.files?.[0] || null;
      setCertificadoFile(file);
    },
    []
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
      const conteudoBase64 = await readFileAsBase64(certificadoFile);
      const result = await previewTenantCertificate({
        certificadoBase64: conteudoBase64,
        certificadoSenha: form.certificado_senha,
      });

      setPreview(result?.data || null);
      setForm((prev) => ({
        ...prev,
        cnpj: result?.data?.cnpj || prev.cnpj,
        nome_razao: result?.data?.common_name || prev.nome_razao,
        tenant_nome: prev.tenant_nome || result?.data?.common_name || prev.nome_razao || "",
      }));
      setStep(2);
    } catch (error) {
      await showAlert({
        title: "Falha ao ler certificado",
        text: error?.response?.data?.message || error?.message || "Não foi possível ler o certificado.",
        icon: "error",
      });
    }
  }, [certificadoFile, form.certificado_senha, showAlert]);

  const goNextStep = useCallback(async () => {
    if (step === 1) {
      if (!certificadoFile || !String(form.certificado_senha || "").trim()) {
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

    setStep((prev) => Math.min(prev + 1, 3));
  }, [certificadoFile, form, showAlert, step]);

  const goPreviousStep = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!certificadoFile) {
      await showAlert({
        title: "Certificado obrigatório",
        text: "Selecione o certificado da empresa antes de concluir o cadastro.",
        icon: "warning",
      });
      return;
    }

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

    setSaving(true);

    try {
      const conteudoBase64 = await readFileAsBase64(certificadoFile);
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
        usuario: {
          nome: form.usuario_nome,
          email: form.usuario_email,
          username: form.usuario_username,
          password: form.usuario_password,
        },
        certificado: {
          nome_arquivo: certificadoFile.name,
          senha: form.certificado_senha,
          conteudo_base64: conteudoBase64,
        },
      };

      await createTenantSetup(payload);

      await showAlert({
        title: "Filial cadastrada",
        text: "A nova empresa foi cadastrada com sucesso e já possui usuário admin.",
        icon: "success",
      });

      navigate("/dashboard", { replace: true });
    } catch (error) {
      await showAlert({
        title: "Falha ao cadastrar filial",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Não foi possível concluir o cadastro da filial.",
        icon: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [certificadoFile, form, navigate, showAlert]);

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

  return {
    REQUIRED_TITLE,
    step,
    saving,
    form,
    preview,
    certificateSummary,
    updateField,
    handleSelectCertificado,
    handleConfirmCertificate,
    goNextStep,
    goPreviousStep,
    handleSubmit,
  };
};
