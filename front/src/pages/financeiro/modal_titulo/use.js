import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSweetAlert } from "context/sweet_alert";
import {
  createTituloManual,
  getSupportData,
  getTituloById,
  searchPessoasSelect,
  updateTituloManual,
} from "./api";

const buildInitialForm = (initialTipo = "receber") => ({
  tipo: initialTipo,
  pessoa_id: "",
  financeiro_condicao_pagamento_id: "",
  descricao: "",
  numero_documento: "",
  data_emissao: new Date().toISOString().slice(0, 10),
  valor_original: "0",
  desconto: "0",
  acrescimo: "0",
  observacao: "",
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
const TODAY = new Date().toISOString().slice(0, 10);

const normalizeDateOnly = (value) => {
  if (!value) return "";

  const normalized = String(value).trim();
  if (!normalized) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match?.[1]) {
    return match[1];
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
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
  const safeBaseDate = normalizeDateOnly(baseDate) || TODAY;
  const date = new Date(`${safeBaseDate}T12:00:00`);
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

const buildStatusParcela = (dataVencimento) => {
  const safeDate = normalizeDateOnly(dataVencimento) || TODAY;
  return safeDate < TODAY ? "vencida" : "aberta";
};

const buildParcelasPreview = ({ total, dataEmissao, condicao }) => {
  if (!condicao) return [];

  const totalTitulo = currency(total);
  const percentualEntrada = Number(condicao.percentual_entrada || 0);
  const quantidadeParcelas = Number(condicao.quantidade_parcelas || 1);
  const diasPrimeiroVencimento = Number(condicao.dias_primeiro_vencimento || 0);
  const intervaloDias = Number(condicao.intervalo_dias || 30);
  const parcelas = [];

  let restante = totalTitulo;
  let numeroParcela = 1;

  if (percentualEntrada > 0) {
    const valorEntrada = currency((totalTitulo * percentualEntrada) / 100);
    restante = currency(restante - valorEntrada);
    parcelas.push({
      numero_parcela: numeroParcela,
      valor_parcela: valorEntrada,
      data_vencimento: normalizeDateOnly(dataEmissao) || TODAY,
      status: buildStatusParcela(dataEmissao),
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

    const dataVencimento = addDays(
      dataEmissao,
      diasPrimeiroVencimento + intervaloDias * index
    );

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

export const useModalTitulo = ({ isOpen, tituloId, initialTipo, onClose }) => {
  const { showAlert } = useSweetAlert();
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supportData, setSupportData] = useState({
    condicoesPagamento: [],
    condicaoPagamentoPadrao: null,
  });
  const [form, setForm] = useState(buildInitialForm(initialTipo));
  const [pessoasCache, setPessoasCache] = useState([]);
  const fieldRefs = useRef({});

  useEffect(() => {
    if (!isOpen) {
      setLoadingForm(false);
      setSubmitting(false);
      setSupportData({
        condicoesPagamento: [],
        condicaoPagamentoPadrao: null,
      });
      setPessoasCache([]);
      setForm(buildInitialForm(initialTipo));
      fieldRefs.current = {};
      return undefined;
    }

    let mounted = true;

    const load = async () => {
      try {
        setLoadingForm(true);

        if (tituloId) {
          const tituloResponse = await getTituloById(tituloId);
          if (!mounted) return;

          const titulo = tituloResponse?.data?.titulo || {};

          setPessoasCache((prev) =>
            mergeUniqueOptions(
              prev,
              titulo?.pessoa_id
                ? [
                    {
                      pessoa_id: titulo.pessoa_id,
                      pessoa_nome_razao: titulo.pessoa_nome_razao,
                      pessoa_cpf_cnpj: titulo.pessoa_cpf_cnpj,
                    },
                  ]
                : [],
              "pessoa_id"
            )
          );

          const tipoAtual = titulo?.tipo || initialTipo;
          const supportResponse = await getSupportData(tipoAtual);
          if (!mounted) return;

          const support = supportResponse?.data || {
            condicoesPagamento: [],
            condicaoPagamentoPadrao: null,
          };

          setSupportData(support);
          setForm({
            tipo: tipoAtual,
            pessoa_id: titulo.pessoa_id || "",
            financeiro_condicao_pagamento_id:
              titulo.financeiro_condicao_pagamento_id || "",
            descricao: titulo.descricao || "",
            numero_documento: titulo.numero_documento || "",
            data_emissao: normalizeDateOnly(titulo.data_emissao) || TODAY,
            valor_original: String(titulo.valor_original ?? 0),
            desconto: String(titulo.desconto ?? 0),
            acrescimo: String(titulo.acrescimo ?? 0),
            observacao: titulo.observacao || "",
          });
          return;
        }

        setForm(buildInitialForm(initialTipo));
        const response = await getSupportData(initialTipo);
        if (!mounted) return;

        const data = response?.data || {
          condicoesPagamento: [],
          condicaoPagamentoPadrao: null,
        };

        setSupportData(data);
        setForm((prev) => ({
          ...prev,
          tipo: initialTipo,
          financeiro_condicao_pagamento_id:
            data.condicaoPagamentoPadrao?.financeiro_condicao_pagamento_id || "",
        }));
      } catch (error) {
        showAlert({
          title: "Falha ao abrir formulario",
          text:
            error?.response?.data?.message ||
            "Nao foi possivel carregar os dados auxiliares do titulo.",
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
  }, [initialTipo, isOpen, onClose, showAlert, tituloId]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let mounted = true;

    const loadSupport = async () => {
      try {
        const response = await getSupportData(form.tipo);
        if (!mounted) return;

        const data = response?.data || {
          condicoesPagamento: [],
          condicaoPagamentoPadrao: null,
        };

        setSupportData(data);
        setForm((prev) => {
          const currentExists = (data.condicoesPagamento || []).some(
            (item) =>
              Number(item.financeiro_condicao_pagamento_id) ===
              Number(prev.financeiro_condicao_pagamento_id)
          );

          return currentExists
            ? prev
            : {
                ...prev,
                financeiro_condicao_pagamento_id:
                  data.condicaoPagamentoPadrao?.financeiro_condicao_pagamento_id || "",
              };
        });
      } catch {
        // evita alertas duplicados quando o usuário apenas troca o tipo
      }
    };

    loadSupport();

    return () => {
      mounted = false;
    };
  }, [form.tipo, isOpen, tituloId]);

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

  const resumo = useMemo(() => {
    const valorOriginal = parseNumeric(form.valor_original);
    const desconto = parseNumeric(form.desconto);
    const acrescimo = parseNumeric(form.acrescimo);
    const total = currency(valorOriginal - desconto + acrescimo);

    return {
      valorOriginal,
      desconto,
      acrescimo,
      total,
    };
  }, [form.acrescimo, form.desconto, form.valor_original]);

  const parcelasPreview = useMemo(
    () =>
      buildParcelasPreview({
        total: resumo.total,
        dataEmissao: form.data_emissao,
        condicao: condicaoAtual,
      }),
    [condicaoAtual, form.data_emissao, resumo.total]
  );

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

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

  const payload = useMemo(
    () => ({
      tipo: form.tipo,
      pessoa_id: Number(form.pessoa_id) || "",
      financeiro_condicao_pagamento_id:
        Number(form.financeiro_condicao_pagamento_id) || "",
      descricao: form.descricao,
      numero_documento: form.numero_documento,
      data_emissao: form.data_emissao,
      valor_original: resumo.valorOriginal,
      desconto: resumo.desconto,
      acrescimo: resumo.acrescimo,
      observacao: form.observacao,
    }),
    [form, resumo]
  );

  const validateBeforeSubmit = () => {
    if (!String(form.pessoa_id || "").trim()) {
      return { field: "pessoa_id", label: "Pessoa" };
    }

    if (!String(form.descricao || "").trim()) {
      return { field: "descricao", label: "Descricao" };
    }

    if (!String(form.financeiro_condicao_pagamento_id || "").trim()) {
      return {
        field: "financeiro_condicao_pagamento_id",
        label: "Condicao de pagamento",
      };
    }

    if (!String(form.data_emissao || "").trim()) {
      return { field: "data_emissao", label: "Data de emissao" };
    }

    if (parseNumeric(form.valor_original) <= 0) {
      return {
        field: "valor_original",
        label: "Valor original",
        customMessage: "Informe um valor original maior que zero.",
      };
    }

    if (resumo.total <= 0) {
      return {
        field: "valor_original",
        label: "Valor final",
        customMessage: "O valor final do titulo precisa ser maior que zero.",
      };
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const missingField = validateBeforeSubmit();
    if (missingField) {
      await showAlert({
        title: `Campo obrigatorio: ${missingField.label}`,
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
      const response = tituloId
        ? await updateTituloManual(tituloId, payload)
        : await createTituloManual(payload);

      showAlert({
        title: "Sucesso",
        text:
          response?.message ||
          (tituloId
            ? "Titulo financeiro atualizado com sucesso."
            : "Titulo financeiro cadastrado com sucesso."),
        icon: "success",
        timer: 1800,
      });

      onClose(true);
    } catch (error) {
      showAlert({
        title: "Falha ao salvar",
        text:
          error?.response?.data?.message ||
          "Nao foi possivel salvar o titulo financeiro.",
        icon: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    loadingForm,
    submitting,
    supportData,
    form,
    resumo,
    parcelasPreview,
    updateField,
    registerFieldRef,
    handleSelectPessoa,
    loadPessoasOptions,
    handleSubmit,
    tituloId,
    selectedPessoa: pessoasMap.get(Number(form.pessoa_id)) || null,
  };
};
