import { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { buscarCepViaCep, createPessoa, getPessoaById, updatePessoa } from "./api";

const buildInitialForm = () => ({
  pessoa_tipo: "F",
  pessoa_nome_razao: "",
  pessoa_nome_fantasia: "",
  pessoa_cpf_cnpj: "",
  pessoa_inscricao_estadual: "",
  pessoa_inscricao_municipal: "",
  pessoa_rg: "",
  pessoa_email: "",
  pessoa_telefone: "",
  pessoa_whatsapp: "",
  pessoa_data_nascimento: "",
  pessoa_observacao: "",
  pessoa_ativo: true,
  endereco: {
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    codigo_ibge: "",
    pais: "Brasil",
  },
});

const normalizeDigits = (value) => String(value || "").replace(/\D/g, "");

const hasRepeatedDigits = (digits) => /^(\d)\1+$/.test(digits);

const isValidCpf = (digits) => {
  if (!/^\d{11}$/.test(digits) || hasRepeatedDigits(digits)) return false;

  const nums = digits.split("").map(Number);
  const sum1 = nums.slice(0, 9).reduce((acc, num, index) => acc + num * (10 - index), 0);
  let check1 = (sum1 * 10) % 11;
  if (check1 === 10) check1 = 0;
  if (check1 !== nums[9]) return false;

  const sum2 = nums.slice(0, 10).reduce((acc, num, index) => acc + num * (11 - index), 0);
  let check2 = (sum2 * 10) % 11;
  if (check2 === 10) check2 = 0;
  return check2 === nums[10];
};

const isValidCnpj = (digits) => {
  if (!/^\d{14}$/.test(digits) || hasRepeatedDigits(digits)) return false;

  const nums = digits.split("").map(Number);
  const calcDigit = (base, weights) => {
    const sum = base.reduce((acc, num, index) => acc + num * weights[index], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const digit1 = calcDigit(nums.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (digit1 !== nums[12]) return false;

  const digit2 = calcDigit(nums.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digit2 === nums[13];
};

const validateCpfCnpj = (tipoPessoa, documento) => {
  const digits = normalizeDigits(documento);

  if (tipoPessoa === "J") {
    if (!isValidCnpj(digits)) return "Informe um CNPJ válido.";
    return "";
  }

  if (tipoPessoa === "F") {
    if (!isValidCpf(digits)) return "Informe um CPF válido.";
    return "";
  }

  if (digits.length === 14 && isValidCnpj(digits)) return "";
  if (digits.length === 11 && isValidCpf(digits)) return "";

  return "Informe um CPF ou CNPJ válido.";
};

export const useModalPessoa = ({ isOpen, pessoaId, onClose }) => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [activeTab, setActiveTab] = useState("dados");
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(buildInitialForm());
  const [cepLookup, setCepLookup] = useState({
    loading: false,
    message: "",
    tone: "neutral",
  });
  const lastCepLookupRef = useRef("");

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("dados");
      setLoadingForm(false);
      setForm(buildInitialForm());
      setCepLookup({ loading: false, message: "", tone: "neutral" });
      lastCepLookupRef.current = "";
      return;
    }

    let mounted = true;

    const load = async () => {
      if (!pessoaId) {
        setForm(buildInitialForm());
        return;
      }

      try {
        setLoadingForm(true);
        const response = await getPessoaById(pessoaId);
        if (!mounted) return;

        const data = response?.data || {};
        setForm({
          pessoa_tipo: data.pessoa_tipo || "F",
          pessoa_nome_razao: data.pessoa_nome_razao || "",
          pessoa_nome_fantasia: data.pessoa_nome_fantasia || "",
          pessoa_cpf_cnpj: data.pessoa_cpf_cnpj || "",
          pessoa_inscricao_estadual: data.pessoa_inscricao_estadual || "",
          pessoa_inscricao_municipal: data.pessoa_inscricao_municipal || "",
          pessoa_rg: data.pessoa_rg || "",
          pessoa_email: data.pessoa_email || "",
          pessoa_telefone: data.pessoa_telefone || "",
          pessoa_whatsapp: data.pessoa_whatsapp || "",
          pessoa_data_nascimento: data.pessoa_data_nascimento || "",
          pessoa_observacao: data.pessoa_observacao || "",
          pessoa_ativo: data.pessoa_ativo ?? true,
          endereco: {
            cep: data?.endereco?.cep || "",
            logradouro: data?.endereco?.logradouro || "",
            numero: data?.endereco?.numero || "",
            complemento: data?.endereco?.complemento || "",
            bairro: data?.endereco?.bairro || "",
            cidade: data?.endereco?.cidade || "",
            uf: data?.endereco?.uf || "",
            codigo_ibge: data?.endereco?.codigo_ibge || "",
            pais: data?.endereco?.pais || "Brasil",
          },
        });
      } catch (error) {
        showAlert({
          title: "Falha ao abrir formulário",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar os dados da pessoa.",
          icon: "error",
        });
        onClose(false);
      } finally {
        setLoadingForm(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [isOpen, onClose, pessoaId, showAlert]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateEnderecoField = (field, value) => {
    if (field === "cep") {
      setCepLookup((prev) =>
        prev.message ? { loading: false, message: "", tone: "neutral" } : prev
      );
    }

    setForm((prev) => ({
      ...prev,
      endereco: {
        ...prev.endereco,
        [field]: value,
      },
    }));
  };

  const applyEnderecoFields = (payload) => {
    setForm((prev) => ({
      ...prev,
      endereco: {
        ...prev.endereco,
        ...payload,
      },
    }));
  };

  const handleCepBlur = async () => {
    const cepDigits = String(form.endereco.cep || "").replace(/\D/g, "");

    if (!cepDigits) {
      setCepLookup({ loading: false, message: "", tone: "neutral" });
      lastCepLookupRef.current = "";
      return;
    }

    if (cepDigits.length !== 8) {
      setCepLookup({
        loading: false,
        message: "Informe um CEP com 8 dígitos para buscar o endereço.",
        tone: "warning",
      });
      return;
    }

    if (lastCepLookupRef.current === cepDigits) {
      return;
    }

    try {
      setCepLookup({
        loading: true,
        message: "Buscando endereço pelo CEP...",
        tone: "neutral",
      });

      const data = await buscarCepViaCep(cepDigits);

      applyEnderecoFields({
        cep: data.cep || form.endereco.cep,
        logradouro: data.logradouro || "",
        bairro: data.bairro || "",
        cidade: data.localidade || "",
        uf: data.uf || "",
        codigo_ibge: data.ibge || "",
      });

      lastCepLookupRef.current = cepDigits;
      setCepLookup({
        loading: false,
        message: "Endereço preenchido.",
        tone: "success",
      });
    } catch (error) {
      setCepLookup({
        loading: false,
        message: error.message || "Não foi possível consultar o CEP.",
        tone: "warning",
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const documentoError = validateCpfCnpj(form.pessoa_tipo, form.pessoa_cpf_cnpj);
    if (documentoError) {
      await showAlert({
        title: "Documento inválido",
        text: documentoError,
        icon: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      showLoading(pessoaId ? "Atualizando pessoa..." : "Cadastrando pessoa...");

      const response = pessoaId
        ? await updatePessoa(pessoaId, form)
        : await createPessoa(form);

      showAlert({
        title: "Sucesso",
        text:
          response?.message ||
          (pessoaId ? "Pessoa atualizada com sucesso." : "Pessoa cadastrada com sucesso."),
        icon: "success",
        timer: 1800,
      });

      onClose(true, response?.data || null);
    } catch (error) {
      showAlert({
        title: "Falha ao salvar",
        text:
          error?.response?.data?.message ||
          "Não foi possível salvar os dados da pessoa.",
        icon: "error",
      });
    } finally {
      hideLoading();
      setSubmitting(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    loadingForm,
    submitting,
    form,
    updateField,
    updateEnderecoField,
    handleCepBlur,
    cepLookup,
    handleSubmit,
  };
};
