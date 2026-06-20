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

      onClose(true);
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
