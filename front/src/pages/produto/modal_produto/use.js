import { useEffect, useMemo, useRef, useState } from "react";
import { useSweetAlert } from "context/sweet_alert";
import {
  createProduto,
  getProdutoById,
  getSupportData,
  updateProduto,
} from "./api";

const buildInitialForm = () => ({
  descricao: "",
  descricao_fiscal: "",
  gtin: "",
  marca: "",
  tipo_produto: "mercadoria",
  controla_estoque: true,
  permite_fracionar: false,
  ativo: true,
  ncm: "",
  cest: "",
  extipi: "",
  regra_tributaria_id: "",
  origem_mercadoria: "0",
  cbenef: "",
  fci: "",
  cfop_venda_interna: "",
  cfop_venda_interestadual: "",
  cfop_compra: "",
  ind_escala: "",
  cnpj_fabricante: "",
  exige_lote: false,
  exige_validade: false,
  unidade_comercial_id: "",
  unidade_tributavel_id: "",
  fator_conversao: "1",
  casas_decimais_comercial: "2",
  casas_decimais_tributavel: "2",
  preco_venda: "0",
  preco_custo: "0",
  margem: "0",
  estoque_atual: "0",
  estoque_minimo: "0",
  estoque_reservado: "0",
});

const formatDecimal = (value) => {
  if (value === null || value === undefined || value === "") return "0";
  return String(value);
};

const TIPO_PRODUTO_OPTIONS = [
  { value: "mercadoria", label: "Mercadoria" },
  { value: "materia_prima", label: "Matéria-prima" },
  { value: "uso_consumo", label: "Uso e consumo" },
  { value: "servico", label: "Serviço" },
];

const REQUIRED_FIELDS = [
  { field: "tipo_produto", label: "Tipo de produto", tab: "dados" },
  { field: "descricao", label: "Descrição interna", tab: "dados" },
  { field: "descricao_fiscal", label: "Descrição fiscal / NF-e", tab: "dados" },
  { field: "ncm", label: "NCM", tab: "fiscal" },
  { field: "regra_tributaria_id", label: "Regra fiscal", tab: "fiscal" },
  { field: "unidade_comercial_id", label: "Unidade de medida", tab: "comercial" },
];

const isMissingRequiredValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return !value.trim();
  return false;
};

export const useModalProduto = ({ isOpen, produtoId, onClose }) => {
  const { showAlert } = useSweetAlert();
  const [activeTab, setActiveTab] = useState("dados");
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supportData, setSupportData] = useState({
    unidades: [],
    regrasFiscais: [],
    tabelaPrecoPadrao: null,
    depositoPadrao: null,
  });
  const [form, setForm] = useState(buildInitialForm());
  const fieldRefs = useRef({});
  const pendingFocusField = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("dados");
      setLoadingForm(false);
      setSupportData({
        unidades: [],
        regrasFiscais: [],
        tabelaPrecoPadrao: null,
        depositoPadrao: null,
      });
      setForm(buildInitialForm());
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        setLoadingForm(true);
        const supportResponse = await getSupportData();
        if (!mounted) return;

        const support = supportResponse?.data || {
          unidades: [],
          regrasFiscais: [],
          tabelaPrecoPadrao: null,
          depositoPadrao: null,
        };

        setSupportData(support);

        if (produtoId) {
          const response = await getProdutoById(produtoId);
          if (!mounted) return;
          const data = response?.data || {};

          setForm({
            descricao: data.descricao || "",
            descricao_fiscal: data.descricao_fiscal || "",
            gtin: data.gtin || "",
            marca: data.marca || "",
            tipo_produto: data.tipo_produto || "mercadoria",
            controla_estoque: data.controla_estoque ?? true,
            permite_fracionar: data.permite_fracionar ?? false,
            ativo: data.ativo ?? true,
            ncm: data.ncm || "",
            cest: data.cest || "",
            extipi: data.extipi || "",
            regra_tributaria_id: data.regra_tributaria_id || "",
            origem_mercadoria: data.origem_mercadoria || "0",
            cbenef: data.cbenef || "",
            fci: data.fci || "",
            cfop_venda_interna: data.cfop_venda_interna || "",
            cfop_venda_interestadual: data.cfop_venda_interestadual || "",
            cfop_compra: data.cfop_compra || "",
            ind_escala: data.ind_escala || "",
            cnpj_fabricante: data.cnpj_fabricante || "",
            exige_lote: data.exige_lote ?? false,
            exige_validade: data.exige_validade ?? false,
            unidade_comercial_id: data.unidade_comercial_id || "",
            unidade_tributavel_id: data.unidade_comercial_id || data.unidade_tributavel_id || "",
            fator_conversao: "1",
            casas_decimais_comercial: "2",
            casas_decimais_tributavel: "2",
            preco_venda: formatDecimal(data.preco_venda ?? 0),
            preco_custo: formatDecimal(data.preco_custo ?? 0),
            margem: formatDecimal(data.margem ?? 0),
            estoque_atual: formatDecimal(data.estoque_atual ?? 0),
            estoque_minimo: formatDecimal(data.estoque_minimo ?? 0),
            estoque_reservado: formatDecimal(data.estoque_reservado ?? 0),
          });
        } else {
          setForm((prev) => ({
            ...buildInitialForm(),
            unidade_comercial_id: support.unidades?.[0]?.unidade_medida_id || "",
            unidade_tributavel_id: support.unidades?.[0]?.unidade_medida_id || "",
            regra_tributaria_id: support.regrasFiscais?.[0]?.regra_tributaria_id || "",
          }));
        }
      } catch (error) {
        showAlert({
          title: "Falha ao abrir formulário",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar os dados do produto.",
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
  }, [isOpen, onClose, produtoId, showAlert]);

  const updateField = (field, value) => {
    setForm((prev) => {
      if (field === "unidade_comercial_id") {
        return {
          ...prev,
          unidade_comercial_id: value,
          unidade_tributavel_id: value,
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const registerFieldRef = (field) => (element) => {
    if (element) {
      fieldRefs.current[field] = element;
      return;
    }

    delete fieldRefs.current[field];
  };

  const focusField = (field) => {
    const element = fieldRefs.current[field];
    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    if (typeof element.focus === "function") {
      element.focus();
    }

    if (
      (element.tagName === "INPUT" || element.tagName === "TEXTAREA") &&
      typeof element.select === "function"
    ) {
      element.select();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      pendingFocusField.current = null;
      return;
    }

    if (!pendingFocusField.current) return;

    const timeout = window.setTimeout(() => {
      focusField(pendingFocusField.current);
      pendingFocusField.current = null;
    }, 60);

    return () => window.clearTimeout(timeout);
  }, [activeTab, isOpen]);

  const validateRequiredFields = () =>
    REQUIRED_FIELDS.find(({ field }) => isMissingRequiredValue(form[field])) || null;

  const payload = useMemo(
    () => ({
      ...form,
      unidade_comercial_id: Number(form.unidade_comercial_id) || "",
      unidade_tributavel_id: Number(form.unidade_comercial_id) || "",
      regra_tributaria_id: Number(form.regra_tributaria_id) || "",
    }),
    [form]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const missingField = validateRequiredFields();
    if (missingField) {
      if (activeTab !== missingField.tab) {
        pendingFocusField.current = missingField.field;
        setActiveTab(missingField.tab);
      }

      await showAlert({
        title: `Campo obrigatório: ${missingField.label}`,
        text: `Preencha o campo ${missingField.label}.`,
        icon: "warning",
      });

      window.setTimeout(() => {
        focusField(missingField.field);
      }, 60);
      return;
    }

    try {
      setSubmitting(true);
      const response = produtoId
        ? await updateProduto(produtoId, payload)
        : await createProduto(payload);

      showAlert({
        title: "Sucesso",
        text:
          response?.message ||
          (produtoId ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso."),
        icon: "success",
        timer: 1800,
      });

      onClose(true);
    } catch (error) {
      showAlert({
        title: "Falha ao salvar",
        text:
          error?.response?.data?.message ||
          "Não foi possível salvar os dados do produto.",
        icon: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    loadingForm,
    submitting,
    supportData,
    form,
    updateField,
    registerFieldRef,
    handleSubmit,
    tipoProdutoOptions: TIPO_PRODUTO_OPTIONS,
  };
};
