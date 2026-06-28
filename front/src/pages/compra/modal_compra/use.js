import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSweetAlert } from "context/sweet_alert";
import {
  createCompra,
  getCompraById,
  getSupportData,
  searchFornecedoresSelect,
  searchProdutosSelect,
  updateCompra,
} from "./api";

const todayDate = () => new Date().toISOString().slice(0, 10);

const buildInitialItem = () => ({
  produto_id: "",
  quantidade: "1",
  valor_unitario: "0",
  desconto: "0",
  acrescimo: "0",
});

const buildInitialForm = () => ({
  pessoa_id: "",
  financeiro_condicao_pagamento_id: "",
  status: "aberto",
  data_emissao: todayDate(),
  data_primeiro_vencimento: "",
  data_previsao: "",
  desconto: "0",
  acrescimo: "0",
  observacao: "",
  items: [buildInitialItem()],
});

const mergeUniqueOptions = (current = [], incoming = [], idKey) => {
  const map = new Map();

  [...current, ...incoming].forEach((item) => {
    if (!item || item[idKey] === undefined || item[idKey] === null) return;
    map.set(Number(item[idKey]), item);
  });

  return [...map.values()];
};

const currency = (value) => Number(Number(value || 0).toFixed(2));

const normalizeDateInput = (value, fallback = "") => {
  if (!value) return fallback;

  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toISOString().slice(0, 10);
};

const parseNumeric = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  let normalized = String(value).trim();
  const hasDot = normalized.includes(".");
  const hasComma = normalized.includes(",");
  if (hasDot && hasComma) {
    normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
  } else {
    normalized = normalized.replace(/,/g, ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const addDays = (baseDate, days) => {
  const normalizedBaseDate = normalizeDateInput(baseDate, todayDate());
  const date = new Date(`${normalizedBaseDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return normalizedBaseDate;

  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

const buildStatusParcela = (dataVencimento) => {
  const normalizedDataVencimento = normalizeDateInput(dataVencimento, todayDate());
  return normalizedDataVencimento < todayDate() ? "vencida" : "aberta";
};

const buildFirstDueDate = ({ dataEmissao, condicao }) => {
  if (!condicao) return normalizeDateInput(dataEmissao, todayDate());

  return addDays(
    normalizeDateInput(dataEmissao, todayDate()),
    Number(condicao.dias_primeiro_vencimento || 0)
  );
};

const buildParcelasPreview = ({ total, dataEmissao, primeiroVencimento, condicao }) => {
  if (!condicao) return [];

  const totalPedido = currency(total);
  const dataEmissaoBase = normalizeDateInput(dataEmissao, todayDate());
  const dataPrimeiroVencimento = normalizeDateInput(
    primeiroVencimento,
    buildFirstDueDate({ dataEmissao: dataEmissaoBase, condicao })
  );
  const percentualEntrada = Number(condicao.percentual_entrada || 0);
  const quantidadeParcelas = Number(condicao.quantidade_parcelas || 1);
  const intervaloDias = Number(condicao.intervalo_dias || 30);
  const parcelas = [];

  let restante = totalPedido;
  let numeroParcela = 1;

  if (percentualEntrada > 0) {
    const valorEntrada = currency((totalPedido * percentualEntrada) / 100);
    restante = currency(restante - valorEntrada);
    parcelas.push({
      numero_parcela: numeroParcela,
      valor_parcela: valorEntrada,
      data_vencimento: dataEmissaoBase,
      status: buildStatusParcela(dataEmissaoBase),
    });
    numeroParcela += 1;
  }

  const qtdRestante = Math.max(quantidadeParcelas, 1);
  let acumulado = 0;

  for (let index = 0; index < qtdRestante; index += 1) {
    const isLast = index === qtdRestante - 1;
    const valorBase = currency(restante / qtdRestante);
    const valorParcela = isLast ? currency(restante - acumulado) : valorBase;
    const dataVencimento = addDays(dataPrimeiroVencimento, intervaloDias * index);

    acumulado = currency(acumulado + valorParcela);

    parcelas.push({
      numero_parcela: numeroParcela,
      valor_parcela: valorParcela,
      data_vencimento: dataVencimento,
      status: buildStatusParcela(dataVencimento),
    });

    numeroParcela += 1;
  }

  return parcelas;
};

export const useModalCompra = ({ isOpen, compraId, onClose }) => {
  const { showAlert } = useSweetAlert();
  const [activeTab, setActiveTab] = useState("dados");
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supportData, setSupportData] = useState({
    condicoesPagamento: [],
    condicaoPagamentoPadrao: null,
  });
  const [form, setForm] = useState(buildInitialForm());
  const [fornecedoresCache, setFornecedoresCache] = useState([]);
  const [produtosCache, setProdutosCache] = useState([]);
  const fieldRefs = useRef({});
  const pendingFocusField = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("dados");
      setLoadingForm(false);
      setSupportData({
        condicoesPagamento: [],
        condicaoPagamentoPadrao: null,
      });
      setFornecedoresCache([]);
      setProdutosCache([]);
      setForm(buildInitialForm());
      pendingFocusField.current = null;
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        setLoadingForm(true);
        const supportResponse = await getSupportData();
        if (!mounted) return;

        const support = supportResponse?.data || {
          condicoesPagamento: [],
          condicaoPagamentoPadrao: null,
        };

        setSupportData(support);

        if (compraId) {
          const response = await getCompraById(compraId);
          if (!mounted) return;
          const data = response?.data || {};

          setFornecedoresCache((prev) =>
            mergeUniqueOptions(
              prev,
              data?.pedido?.pessoa_id
                ? [
                    {
                      pessoa_id: data.pedido.pessoa_id,
                      pessoa_nome_razao: data.pedido.pessoa_nome_razao,
                      pessoa_cpf_cnpj: data.pedido.pessoa_cpf_cnpj,
                    },
                  ]
                : [],
              "pessoa_id"
            )
          );

          setProdutosCache((prev) =>
            mergeUniqueOptions(
              prev,
              (data?.items || []).map((item) => ({
                produto_id: item.produto_id,
                codigo_interno: item.codigo_interno,
                descricao: item.descricao,
                unidade_sigla: item.unidade_sigla,
                preco_compra: Number(item.valor_unitario ?? 0),
              })),
              "produto_id"
            )
          );

          const dataEmissao = normalizeDateInput(data?.pedido?.data_emissao, todayDate());
          const primeiraParcelaSemEntrada =
            (data?.parcelas || []).find(
              (parcela) => normalizeDateInput(parcela?.data_vencimento, "") !== dataEmissao
            ) || data?.parcelas?.[0];

          setForm({
            pessoa_id: data?.pedido?.pessoa_id || "",
            financeiro_condicao_pagamento_id:
              data?.pedido?.financeiro_condicao_pagamento_id || "",
            status: data?.pedido?.status || "aberto",
            data_emissao: dataEmissao,
            data_primeiro_vencimento: normalizeDateInput(
              primeiraParcelaSemEntrada?.data_vencimento || data?.titulo?.data_vencimento,
              todayDate()
            ),
            data_previsao: normalizeDateInput(data?.pedido?.data_previsao, ""),
            desconto: String(data?.pedido?.desconto ?? 0),
            acrescimo: String(data?.pedido?.acrescimo ?? 0),
            observacao: data?.pedido?.observacao || "",
            items:
              data?.items?.map((item) => ({
                produto_id: item.produto_id,
                quantidade: String(item.quantidade ?? 0),
                valor_unitario: String(item.valor_unitario ?? 0),
                desconto: String(item.desconto ?? 0),
                acrescimo: String(item.acrescimo ?? 0),
              })) || [buildInitialItem()],
          });
        } else {
          const defaultCondicao = support.condicaoPagamentoPadrao || null;
          setForm((prev) => ({
            ...prev,
            financeiro_condicao_pagamento_id:
              defaultCondicao?.financeiro_condicao_pagamento_id || "",
            data_primeiro_vencimento: buildFirstDueDate({
              dataEmissao: prev.data_emissao,
              condicao: defaultCondicao,
            }),
          }));
        }
      } catch (error) {
        showAlert({
          title: "Falha ao abrir formulário",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar os dados da compra.",
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
  }, [compraId, isOpen, onClose, showAlert]);

  const produtosMap = useMemo(
    () => new Map((produtosCache || []).map((produto) => [Number(produto.produto_id), produto])),
    [produtosCache]
  );

  const fornecedoresMap = useMemo(
    () =>
      new Map(
        (fornecedoresCache || []).map((fornecedor) => [Number(fornecedor.pessoa_id), fornecedor])
      ),
    [fornecedoresCache]
  );

  const condicaoAtual = useMemo(
    () =>
      (supportData.condicoesPagamento || []).find(
        (item) =>
          Number(item.financeiro_condicao_pagamento_id) ===
          Number(form.financeiro_condicao_pagamento_id)
      ) || null,
    [form.financeiro_condicao_pagamento_id, supportData.condicoesPagamento]
  );

  const itemsCalculated = useMemo(
    () =>
      (form.items || []).map((item) => {
        const quantidade = parseNumeric(item.quantidade);
        const valorUnitario = parseNumeric(item.valor_unitario);
        const desconto = parseNumeric(item.desconto);
        const acrescimo = parseNumeric(item.acrescimo);
        const total = currency(quantidade * valorUnitario - desconto + acrescimo);
        const produto = produtosMap.get(Number(item.produto_id));

        return {
          ...item,
          quantidade,
          valor_unitario: valorUnitario,
          desconto,
          acrescimo,
          total,
          produto,
        };
      }),
    [form.items, produtosMap]
  );

  const resumo = useMemo(() => {
    const subtotal = currency(itemsCalculated.reduce((sum, item) => sum + item.total, 0));
    const descontoPedido = parseNumeric(form.desconto);
    const acrescimoPedido = parseNumeric(form.acrescimo);
    const total = currency(subtotal - descontoPedido + acrescimoPedido);

    return {
      subtotal,
      desconto: descontoPedido,
      acrescimo: acrescimoPedido,
      total,
    };
  }, [form.acrescimo, form.desconto, itemsCalculated]);

  const parcelasPreview = useMemo(
    () =>
      buildParcelasPreview({
        total: resumo.total,
        dataEmissao: form.data_emissao,
        primeiroVencimento: form.data_primeiro_vencimento,
        condicao: condicaoAtual,
      }),
    [condicaoAtual, form.data_emissao, form.data_primeiro_vencimento, resumo.total]
  );

  const selectedFornecedor = fornecedoresMap.get(Number(form.pessoa_id)) || null;

  const getProdutoSelecionado = useCallback(
    (produtoId) => produtosMap.get(Number(produtoId)) || null,
    [produtosMap]
  );

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleChangeCondicaoPagamento = useCallback(
    (value) => {
      const condicao =
        (supportData.condicoesPagamento || []).find(
          (item) => Number(item.financeiro_condicao_pagamento_id) === Number(value)
        ) || null;

      setForm((prev) => ({
        ...prev,
        financeiro_condicao_pagamento_id: value,
        data_primeiro_vencimento: buildFirstDueDate({
          dataEmissao: prev.data_emissao,
          condicao,
        }),
      }));
    },
    [supportData.condicoesPagamento]
  );

  const updateItemField = useCallback((index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items || []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  }, []);

  const handleSelectFornecedor = useCallback((value, option) => {
    if (option) {
      setFornecedoresCache((prev) => mergeUniqueOptions(prev, [option], "pessoa_id"));
    }
    updateField("pessoa_id", value || option?.pessoa_id || "");
  }, [updateField]);

  const handleSelectProduto = useCallback((index, value, option) => {
    if (option) {
      setProdutosCache((prev) => mergeUniqueOptions(prev, [option], "produto_id"));
    }

    setForm((prev) => ({
      ...prev,
      items: (prev.items || []).map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              produto_id: value || option?.produto_id || "",
              valor_unitario:
                option?.preco_compra !== undefined
                  ? String(option.preco_compra || 0)
                  : item.valor_unitario,
            }
          : item
      ),
    }));
  }, []);

  const loadFornecedoresOptions = useCallback(async (search) => {
    const response = await searchFornecedoresSelect(search, 20);
    const data = response?.data || [];
    setFornecedoresCache((prev) => mergeUniqueOptions(prev, data, "pessoa_id"));
    return data;
  }, []);

  const loadProdutosOptions = useCallback(async (search) => {
    const response = await searchProdutosSelect(search, 20);
    const data = response?.data || [];
    setProdutosCache((prev) => mergeUniqueOptions(prev, data, "produto_id"));
    return data;
  }, []);

  const addItem = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      items: [...(prev.items || []), buildInitialItem()],
    }));
  }, []);

  const removeItem = useCallback((index) => {
    setForm((prev) => ({
      ...prev,
      items:
        (prev.items || []).length > 1
          ? prev.items.filter((_, itemIndex) => itemIndex !== index)
          : prev.items,
    }));
  }, []);

  const registerFieldRef = useCallback(
    (field) => (element) => {
      if (element) fieldRefs.current[field] = element;
    },
    []
  );

  const focusField = useCallback((field) => {
    pendingFocusField.current = field;
    const element = fieldRefs.current[field];
    if (element?.focus) element.focus();
  }, []);

  const validateForm = useCallback(() => {
    if (!form.pessoa_id) {
      setActiveTab("dados");
      focusField("pessoa_id");
      throw new Error("Selecione o fornecedor.");
    }

    if (!form.financeiro_condicao_pagamento_id) {
      setActiveTab("dados");
      focusField("financeiro_condicao_pagamento_id");
      throw new Error("Selecione a condição de pagamento.");
    }

    if (!form.data_emissao) {
      setActiveTab("dados");
      focusField("data_emissao");
      throw new Error("Informe a data de emissão.");
    }

    if (!form.data_primeiro_vencimento) {
      setActiveTab("dados");
      focusField("data_primeiro_vencimento");
      throw new Error("Informe o primeiro vencimento.");
    }

    if (!form.items?.length) {
      setActiveTab("itens");
      throw new Error("Adicione ao menos um item.");
    }

    const invalidItemIndex = itemsCalculated.findIndex(
      (item) => !item.produto_id || item.quantidade <= 0 || item.valor_unitario < 0
    );

    if (invalidItemIndex >= 0) {
      setActiveTab("itens");
      throw new Error(`Revise produto, quantidade e valor do item ${invalidItemIndex + 1}.`);
    }

    if (resumo.total <= 0) {
      setActiveTab("itens");
      throw new Error("O total do pedido precisa ser maior que zero.");
    }
  }, [focusField, form, itemsCalculated, resumo.total]);

  const buildPayload = useCallback(
    () => ({
      pessoa_id: form.pessoa_id,
      financeiro_condicao_pagamento_id: form.financeiro_condicao_pagamento_id,
      status: form.status,
      data_emissao: form.data_emissao,
      data_primeiro_vencimento: form.data_primeiro_vencimento,
      data_previsao: form.data_previsao || null,
      desconto: form.desconto,
      acrescimo: form.acrescimo,
      observacao: form.observacao,
      items: (form.items || []).map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        desconto: item.desconto,
        acrescimo: item.acrescimo,
      })),
    }),
    [form]
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      try {
        validateForm();
        setSubmitting(true);
        const payload = buildPayload();
        const response = compraId
          ? await updateCompra(compraId, payload)
          : await createCompra(payload);

        showAlert({
          title: compraId ? "Compra atualizada" : "Compra cadastrada",
          text: response?.message || "Pedido de compra salvo com sucesso.",
          icon: "success",
          timer: 1800,
        });
        onClose(true);
      } catch (error) {
        showAlert({
          title: "Falha ao salvar",
          text:
            error?.response?.data?.message ||
            error?.message ||
            "Não foi possível salvar o pedido de compra.",
          icon: "error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [buildPayload, compraId, onClose, showAlert, validateForm]
  );

  return {
    activeTab,
    setActiveTab,
    loadingForm,
    submitting,
    supportData,
    form,
    updateField,
    handleChangeCondicaoPagamento,
    registerFieldRef,
    handleSelectFornecedor,
    updateItemField,
    handleSelectProduto,
    loadFornecedoresOptions,
    loadProdutosOptions,
    addItem,
    removeItem,
    itemsCalculated,
    resumo,
    parcelasPreview,
    handleSubmit,
    selectedFornecedor,
    getProdutoSelecionado,
  };
};
