import { useEffect, useMemo, useState } from "react";
import { useSweetAlert } from "context/sweet_alert";
import {
  createProduto,
  getProdutoById,
  getSupportData,
  updateProduto,
} from "./api";

const buildInitialForm = () => ({
  codigo_interno: "",
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
  casas_decimais_comercial: "4",
  casas_decimais_tributavel: "4",
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

const ORIGEM_OPTIONS = [
  { value: "0", label: "0 - Nacional" },
  { value: "1", label: "1 - Estrangeira importação direta" },
  { value: "2", label: "2 - Estrangeira adquirida no mercado interno" },
  { value: "3", label: "3 - Nacional com conteúdo de importação > 40%" },
  { value: "4", label: "4 - Nacional produção PPB" },
  { value: "5", label: "5 - Nacional com conteúdo <= 40%" },
  { value: "6", label: "6 - Estrangeira importação direta sem similar" },
  { value: "7", label: "7 - Estrangeira mercado interno sem similar" },
  { value: "8", label: "8 - Nacional com conteúdo > 70%" },
];

export const useModalProduto = ({ isOpen, produtoId, onClose }) => {
  const { showAlert } = useSweetAlert();
  const [activeTab, setActiveTab] = useState("dados");
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supportData, setSupportData] = useState({
    unidades: [],
    tabelaPrecoPadrao: null,
    depositoPadrao: null,
  });
  const [form, setForm] = useState(buildInitialForm());

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("dados");
      setLoadingForm(false);
      setSupportData({
        unidades: [],
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
          tabelaPrecoPadrao: null,
          depositoPadrao: null,
        };

        setSupportData(support);

        if (produtoId) {
          const response = await getProdutoById(produtoId);
          if (!mounted) return;
          const data = response?.data || {};

          setForm({
            codigo_interno: data.codigo_interno || "",
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
            unidade_tributavel_id: data.unidade_tributavel_id || "",
            fator_conversao: formatDecimal(data.fator_conversao ?? 1),
            casas_decimais_comercial: String(data.casas_decimais_comercial ?? 4),
            casas_decimais_tributavel: String(data.casas_decimais_tributavel ?? 4),
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
          }));
        }
      } catch (error) {
        showAlert({
          title: "Falha ao abrir formulario",
          text:
            error?.response?.data?.message ||
            "Nao foi possivel carregar os dados do produto.",
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
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const payload = useMemo(
    () => ({
      ...form,
      unidade_comercial_id: Number(form.unidade_comercial_id) || "",
      unidade_tributavel_id: Number(form.unidade_tributavel_id) || "",
    }),
    [form]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

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
          "Nao foi possivel salvar os dados do produto.",
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
    handleSubmit,
    tipoProdutoOptions: TIPO_PRODUTO_OPTIONS,
    origemOptions: ORIGEM_OPTIONS,
  };
};
