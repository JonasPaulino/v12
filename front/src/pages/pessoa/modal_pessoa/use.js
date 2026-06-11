import { useContext, useEffect, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { createPessoa, getPessoaById, updatePessoa } from "./api";

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
  pessoa_cliente: false,
  pessoa_fornecedor: false,
  pessoa_funcionario: false,
  pessoa_transportadora: false,
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

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("dados");
      setLoadingForm(false);
      setForm(buildInitialForm());
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
          pessoa_cliente: data.pessoa_cliente ?? false,
          pessoa_fornecedor: data.pessoa_fornecedor ?? false,
          pessoa_funcionario: data.pessoa_funcionario ?? false,
          pessoa_transportadora: data.pessoa_transportadora ?? false,
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
          title: "Falha ao abrir formulario",
          text:
            error?.response?.data?.message ||
            "Nao foi possivel carregar os dados da pessoa.",
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
    setForm((prev) => ({
      ...prev,
      endereco: {
        ...prev.endereco,
        [field]: value,
      },
    }));
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
          "Nao foi possivel salvar os dados da pessoa.",
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
    handleSubmit,
  };
};
