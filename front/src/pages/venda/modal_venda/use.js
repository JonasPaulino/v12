import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSweetAlert } from "context/sweet_alert";
import {
  createVenda,
  getSupportData,
  getVendaById,
  searchPessoasSelect,
  searchProdutosSelect,
  updateVenda,
} from "./api";

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
  data_entrega: "",
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
const todayDate = () => new Date().toISOString().slice(0, 10);

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
    acumulado = currency(acumulado + valorParcela);

    const dataVencimento = addDays(dataPrimeiroVencimento, intervaloDias * index);

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

export const useModalVenda = ({ isOpen, vendaId, onClose }) => {
  const { showAlert } = useSweetAlert();
  const [activeTab, setActiveTab] = useState("dados");
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supportData, setSupportData] = useState({
    condicoesPagamento: [],
    condicaoPagamentoPadrao: null,
  });
  const [form, setForm] = useState(buildInitialForm());
  const [pessoasCache, setPessoasCache] = useState([]);
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
      setPessoasCache([]);
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

        if (vendaId) {
          const response = await getVendaById(vendaId);
          if (!mounted) return;
          const data = response?.data || {};

          setPessoasCache((prev) =>
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
                preco_venda: Number(item.valor_unitario ?? 0),
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
            data_entrega: normalizeDateInput(data?.pedido?.data_entrega, ""),
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
            "Não foi possível carregar os dados da venda.",
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
  }, [isOpen, onClose, showAlert, vendaId]);

  const produtosMap = useMemo(
    () => new Map((produtosCache || []).map((produto) => [Number(produto.produto_id), produto])),
    [produtosCache]
  );

  const pessoasMap = useMemo(
    () => new Map((pessoasCache || []).map((pessoa) => [Number(pessoa.pessoa_id), pessoa])),
    [pessoasCache]
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

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangeCondicaoPagamento = useCallback(
    (value) => {
      const nextCondicao =
        (supportData.condicoesPagamento || []).find(
          (item) => Number(item.financeiro_condicao_pagamento_id) === Number(value)
        ) || null;

      setForm((prev) => ({
        ...prev,
        financeiro_condicao_pagamento_id: value,
        data_primeiro_vencimento: buildFirstDueDate({
          dataEmissao: prev.data_emissao,
          condicao: nextCondicao,
        }),
      }));
    },
    [supportData.condicoesPagamento]
  );

  const registerFieldRef = useCallback((field) => (element) => {
    if (element) {
      fieldRefs.current[field] = element;
      return;
    }

    delete fieldRefs.current[field];
  }, []);

  const focusField = useCallback((field) => {
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
  }, []);

  const updateItemField = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleSelectProduto = (index, produtoId) => {
    const produto = produtosMap.get(Number(produtoId));

    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              produto_id: produtoId,
              valor_unitario: produto ? String(produto.preco_venda ?? 0) : item.valor_unitario,
            }
          : item
      ),
    }));
  };

  const handleSelectPessoa = useCallback((pessoaId, pessoa) => {
    if (pessoa) {
      setPessoasCache((prev) => mergeUniqueOptions(prev, [pessoa], "pessoa_id"));
    }

    setForm((prev) => ({ ...prev, pessoa_id: pessoaId }));
  }, []);

  const loadPessoasOptions = useCallback(async (search) => {
    const response = await searchPessoasSelect(search, 20);
    const data = response?.data || [];
    setPessoasCache((prev) => mergeUniqueOptions(prev, data, "pessoa_id"));
    return data;
  }, []);

  const loadProdutosOptions = useCallback(async (search) => {
    const response = await searchProdutosSelect(search, 20);
    const data = response?.data || [];
    setProdutosCache((prev) => mergeUniqueOptions(prev, data, "produto_id"));
    return data;
  }, []);

  useEffect(() => {
    if (!isOpen || !pendingFocusField.current) return undefined;

    const timeout = window.setTimeout(() => {
      focusField(pendingFocusField.current);
      pendingFocusField.current = null;
    }, 60);

    return () => window.clearTimeout(timeout);
  }, [activeTab, focusField, isOpen]);

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, buildInitialItem()],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1
        ? prev.items.filter((_, currentIndex) => currentIndex !== index)
        : [buildInitialItem()],
    }));
  };

  const payload = useMemo(
    () => ({
      ...form,
      pessoa_id: Number(form.pessoa_id) || "",
      financeiro_condicao_pagamento_id: Number(form.financeiro_condicao_pagamento_id) || "",
      subtotal: resumo.subtotal,
      total: resumo.total,
      items: itemsCalculated.map((item) => ({
        produto_id: Number(item.produto_id) || "",
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        desconto: item.desconto,
        acrescimo: item.acrescimo,
      })),
    }),
    [form, itemsCalculated, resumo.subtotal, resumo.total]
  );

  const validateBeforeSubmit = () => {
    if (!String(form.pessoa_id || "").trim()) {
      return { field: "pessoa_id", label: "Cliente", tab: "dados" };
    }

    if (!String(form.financeiro_condicao_pagamento_id || "").trim()) {
      return {
        field: "financeiro_condicao_pagamento_id",
        label: "Condição de pagamento",
        tab: "dados",
      };
    }

    if (!String(form.data_emissao || "").trim()) {
      return { field: "data_emissao", label: "Data de emissão", tab: "dados" };
    }

    if (!String(form.data_primeiro_vencimento || "").trim()) {
      return {
        field: "data_primeiro_vencimento",
        label: "Primeiro vencimento",
        tab: "dados",
      };
    }

    if (!form.items.length) {
      return { field: "item_produto_0", label: "Produto do item 1", tab: "itens" };
    }

    for (let index = 0; index < form.items.length; index += 1) {
      const item = form.items[index];

      if (!String(item.produto_id || "").trim()) {
        return {
          field: `item_produto_${index}`,
          label: `Produto do item ${index + 1}`,
          tab: "itens",
        };
      }

      if (parseNumeric(item.quantidade) <= 0) {
        return {
          field: `item_quantidade_${index}`,
          label: `Quantidade do item ${index + 1}`,
          tab: "itens",
        };
      }
    }

    if (resumo.total <= 0) {
      return {
        field: "item_valor_unitario_0",
        label: "Valor total do pedido maior que zero",
        tab: "itens",
        customMessage: "O total do pedido precisa ser maior que zero.",
      };
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const missingField = validateBeforeSubmit();
    if (missingField) {
      if (activeTab !== missingField.tab) {
        pendingFocusField.current = missingField.field;
        setActiveTab(missingField.tab);
      }

      await showAlert({
        title: `Campo obrigatório: ${missingField.label}`,
        text: missingField.customMessage || `Preencha o campo ${missingField.label}.`,
        icon: "warning",
      });

      window.setTimeout(() => {
        focusField(missingField.field);
      }, 60);
      return;
    }

    try {
      setSubmitting(true);
      const response = vendaId
        ? await updateVenda(vendaId, payload)
        : await createVenda(payload);

      showAlert({
        title: "Sucesso",
        text:
          response?.message ||
          (vendaId
            ? "Pedido de venda atualizado com sucesso."
            : "Pedido de venda cadastrado com sucesso."),
        icon: "success",
        timer: 1800,
      });

      onClose(true);
    } catch (error) {
      showAlert({
        title: "Falha ao salvar",
        text:
          error?.response?.data?.message ||
          "Não foi possível salvar os dados da venda.",
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
    handleChangeCondicaoPagamento,
    registerFieldRef,
    handleSelectPessoa,
    updateItemField,
    handleSelectProduto,
    loadPessoasOptions,
    loadProdutosOptions,
    addItem,
    removeItem,
    itemsCalculated,
    resumo,
    parcelasPreview,
    handleSubmit,
    selectedPessoa:
      pessoasMap.get(Number(form.pessoa_id)) || null,
    getProdutoSelecionado: (produtoId) => produtosMap.get(Number(produtoId)) || null,
  };
};
