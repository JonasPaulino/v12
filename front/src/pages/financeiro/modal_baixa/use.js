import { useCallback, useEffect, useMemo, useState } from "react";
import { useSweetAlert } from "context/sweet_alert";
import {
  createBaixa,
  createBoletoCharge,
  createPixCharge,
  estornarBaixa,
  getSupportData,
  getTituloById,
} from "./api";

const TODAY = new Date().toISOString().slice(0, 10);

const currency = (value) => Number(Number(value || 0).toFixed(2));

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

const buildInitialForm = () => ({
  financeiro_titulo_parcela_id: "",
  financeiro_forma_pagamento_id: "",
  data_baixa: TODAY,
  valor_baixa: "0",
  observacao: "",
});

export const useModalBaixa = ({ isOpen, tituloId, onClose }) => {
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [activeTab, setActiveTab] = useState("dados");
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [supportData, setSupportData] = useState({
    formasPagamento: [],
    formaPagamentoPadrao: null,
  });
  const [detail, setDetail] = useState({
    titulo: null,
    parcelas: [],
    baixas: [],
  });
  const [form, setForm] = useState(buildInitialForm());
  const [pixCharge, setPixCharge] = useState(null);
  const [boletoCharge, setBoletoCharge] = useState(null);

  const loadData = useCallback(async () => {
    if (!tituloId) return;

    const tituloResponse = await getTituloById(tituloId);
    const nextDetail = tituloResponse?.data || { titulo: null, parcelas: [], baixas: [] };
    const tipo = nextDetail?.titulo?.tipo || "receber";
    const supportResponse = await getSupportData(tipo);
    const nextSupport = supportResponse?.data || {
      formasPagamento: [],
      formaPagamentoPadrao: null,
    };

    const primeiraParcelaComSaldo =
      (nextDetail.parcelas || []).find((item) => Number(item.saldo || 0) > 0 && item.status !== "cancelada") ||
      null;

    setDetail(nextDetail);
    setSupportData(nextSupport);
    setForm({
      financeiro_titulo_parcela_id:
        primeiraParcelaComSaldo?.financeiro_titulo_parcela_id || "",
      financeiro_forma_pagamento_id:
        nextSupport.formaPagamentoPadrao?.financeiro_forma_pagamento_id || "",
      data_baixa: TODAY,
      valor_baixa: primeiraParcelaComSaldo ? String(primeiraParcelaComSaldo.saldo || 0) : "0",
      observacao: "",
    });
  }, [tituloId]);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("dados");
      setLoadingForm(false);
      setSubmitting(false);
      setHasChanges(false);
      setSupportData({
        formasPagamento: [],
        formaPagamentoPadrao: null,
      });
      setDetail({
        titulo: null,
        parcelas: [],
        baixas: [],
      });
      setForm(buildInitialForm());
      setPixCharge(null);
      setBoletoCharge(null);
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        setLoadingForm(true);
        await loadData();
      } catch (error) {
        if (!mounted) return;
        showAlert({
          title: "Falha ao carregar",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar os dados da baixa financeira.",
          icon: "error",
        });
        onClose(false);
      } finally {
        if (mounted) {
          setLoadingForm(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [isOpen, loadData, onClose, showAlert]);

  const parcelaSelecionada = useMemo(
    () =>
      (detail.parcelas || []).find(
        (item) =>
          Number(item.financeiro_titulo_parcela_id) === Number(form.financeiro_titulo_parcela_id)
      ) || null,
    [detail.parcelas, form.financeiro_titulo_parcela_id]
  );

  const saldoSelecionado = useMemo(
    () => currency(parcelaSelecionada?.saldo || 0),
    [parcelaSelecionada]
  );

  const parcelasDisponiveis = useMemo(
    () =>
      (detail.parcelas || []).filter(
        (item) => item.status !== "cancelada" && Number(item.saldo || 0) > 0
      ),
    [detail.parcelas]
  );

  const selectedFormaPagamento = useMemo(
    () =>
      (supportData.formasPagamento || []).find(
        (item) =>
          Number(item.financeiro_forma_pagamento_id) ===
          Number(form.financeiro_forma_pagamento_id)
      ) || null,
    [form.financeiro_forma_pagamento_id, supportData.formasPagamento]
  );

  const isPixSelected = useMemo(() => {
    const descricao = String(selectedFormaPagamento?.descricao || "");
    return detail?.titulo?.tipo === "receber" && /pix/i.test(descricao);
  }, [detail?.titulo?.tipo, selectedFormaPagamento]);

  const isBoletoSelected = useMemo(() => {
    const descricao = String(selectedFormaPagamento?.descricao || "");
    return detail?.titulo?.tipo === "receber" && /boleto/i.test(descricao);
  }, [detail?.titulo?.tipo, selectedFormaPagamento]);

  const updateField = useCallback((field, value) => {
    if (
      [
        "financeiro_forma_pagamento_id",
        "valor_baixa",
        "observacao",
        "data_baixa",
      ].includes(field)
    ) {
      setPixCharge(null);
      setBoletoCharge(null);
    }

    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleChangeParcela = useCallback((value) => {
    const parcela =
      (detail.parcelas || []).find(
        (item) => Number(item.financeiro_titulo_parcela_id) === Number(value)
      ) || null;

    setForm((prev) => ({
      ...prev,
      financeiro_titulo_parcela_id: value,
      valor_baixa: parcela ? String(parcela.saldo || 0) : prev.valor_baixa,
    }));
    setPixCharge(null);
    setBoletoCharge(null);
  }, [detail.parcelas]);

  const handleGeneratePix = useCallback(async () => {
    if (submitting || !tituloId) return;

    if (!String(form.financeiro_forma_pagamento_id || "").trim()) {
      showAlert({
        title: "Campo obrigatório",
        text: "Selecione a forma de pagamento PIX.",
        icon: "warning",
      });
      return;
    }

    if (!isPixSelected) {
      showAlert({
        title: "Forma inválida",
        text: "Selecione uma forma de pagamento PIX para gerar o QR Code.",
        icon: "warning",
      });
      return;
    }

    if (parcelasDisponiveis.length > 1 && !String(form.financeiro_titulo_parcela_id || "").trim()) {
      showAlert({
        title: "Campo obrigatório",
        text: "Selecione a parcela que receberá a cobrança PIX.",
        icon: "warning",
      });
      return;
    }

    const valorBaixa = parseNumeric(form.valor_baixa);
    if (valorBaixa <= 0) {
      showAlert({
        title: "Valor inválido",
        text: "Informe um valor válido para a cobrança PIX.",
        icon: "warning",
      });
      return;
    }

    if (saldoSelecionado > 0 && valorBaixa > saldoSelecionado) {
      showAlert({
        title: "Valor acima do saldo",
        text: "O valor informado é maior que o saldo selecionado.",
        icon: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await createPixCharge(tituloId, {
        financeiro_titulo_parcela_id: form.financeiro_titulo_parcela_id
          ? Number(form.financeiro_titulo_parcela_id)
          : null,
        financeiro_forma_pagamento_id: Number(form.financeiro_forma_pagamento_id),
        valor_cobranca: valorBaixa,
        observacao: form.observacao,
      });

      setPixCharge(response?.data || null);
      showAlert({
        title: "Cobrança PIX gerada",
        text: response?.message || "QR Code PIX gerado com sucesso.",
        icon: "success",
        timer: 1800,
      });
    } catch (error) {
      showAlert({
        title: "Falha ao gerar PIX",
        text:
          error?.response?.data?.message ||
          "Não foi possível gerar a cobrança PIX.",
        icon: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    form,
    isPixSelected,
    parcelasDisponiveis.length,
    saldoSelecionado,
    showAlert,
    submitting,
    tituloId,
  ]);

  const handleGenerateBoleto = useCallback(async () => {
    if (submitting || !tituloId) return;

    if (!String(form.financeiro_forma_pagamento_id || "").trim()) {
      showAlert({
        title: "Campo obrigatório",
        text: "Selecione a forma de pagamento boleto.",
        icon: "warning",
      });
      return;
    }

    if (!isBoletoSelected) {
      showAlert({
        title: "Forma inválida",
        text: "Selecione uma forma de pagamento boleto para gerar a cobrança.",
        icon: "warning",
      });
      return;
    }

    if (parcelasDisponiveis.length > 1 && !String(form.financeiro_titulo_parcela_id || "").trim()) {
      showAlert({
        title: "Campo obrigatório",
        text: "Selecione a parcela que receberá o boleto.",
        icon: "warning",
      });
      return;
    }

    const valorBaixa = parseNumeric(form.valor_baixa);
    if (valorBaixa <= 0) {
      showAlert({
        title: "Valor inválido",
        text: "Informe um valor válido para o boleto.",
        icon: "warning",
      });
      return;
    }

    if (saldoSelecionado > 0 && valorBaixa > saldoSelecionado) {
      showAlert({
        title: "Valor acima do saldo",
        text: "O valor informado é maior que o saldo selecionado.",
        icon: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await createBoletoCharge(tituloId, {
        financeiro_titulo_parcela_id: form.financeiro_titulo_parcela_id
          ? Number(form.financeiro_titulo_parcela_id)
          : null,
        financeiro_forma_pagamento_id: Number(form.financeiro_forma_pagamento_id),
        valor_cobranca: valorBaixa,
        observacao: form.observacao,
      });

      setBoletoCharge(response?.data || null);
      showAlert({
        title: "Boleto gerado",
        text: response?.message || "Boleto gerado com sucesso.",
        icon: "success",
        timer: 1800,
      });
    } catch (error) {
      showAlert({
        title: "Falha ao gerar boleto",
        text:
          error?.response?.data?.message ||
          "Não foi possível gerar o boleto.",
        icon: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    form,
    isBoletoSelected,
    parcelasDisponiveis.length,
    saldoSelecionado,
    showAlert,
    submitting,
    tituloId,
  ]);

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (submitting || !tituloId) return;

    if (parcelasDisponiveis.length > 1 && !String(form.financeiro_titulo_parcela_id || "").trim()) {
      showAlert({
        title: "Campo obrigatório",
        text: "Selecione a parcela que será recebida ou paga.",
        icon: "warning",
      });
      return;
    }

    if (!String(form.financeiro_forma_pagamento_id || "").trim()) {
      showAlert({
        title: "Campo obrigatório",
        text: "Selecione a forma de pagamento da baixa.",
        icon: "warning",
      });
      return;
    }

    const valorBaixa = parseNumeric(form.valor_baixa);
    if (valorBaixa <= 0) {
      showAlert({
        title: "Valor inválido",
        text: "Informe um valor de baixa maior que zero.",
        icon: "warning",
      });
      return;
    }

    if (saldoSelecionado > 0 && valorBaixa > saldoSelecionado) {
      showAlert({
        title: "Valor acima do saldo",
        text: "O valor informado é maior que o saldo da parcela selecionada.",
        icon: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await createBaixa(tituloId, {
        financeiro_titulo_parcela_id: form.financeiro_titulo_parcela_id
          ? Number(form.financeiro_titulo_parcela_id)
          : null,
        financeiro_forma_pagamento_id: Number(form.financeiro_forma_pagamento_id),
        data_baixa: form.data_baixa,
        valor_baixa: valorBaixa,
        observacao: form.observacao,
      });

      setHasChanges(true);
      setDetail(response?.data || detail);
      await loadData();

      showAlert({
        title: "Sucesso",
        text: response?.message || "Baixa financeira registrada com sucesso.",
        icon: "success",
        timer: 1800,
      });
    } catch (error) {
      showAlert({
        title: "Falha ao registrar baixa",
        text:
          error?.response?.data?.message ||
          "Não foi possível registrar a baixa financeira.",
        icon: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEstornar = useCallback(
    async (financeiroTituloBaixaId) => {
      const confirmed = await askYesNoQuestion(
        "Estornar baixa",
        "Deseja realmente estornar esta baixa financeira?"
      );

      if (!confirmed) return;

      try {
        setSubmitting(true);
        const response = await estornarBaixa(financeiroTituloBaixaId);
        setHasChanges(true);
        setDetail(response?.data || detail);
        await loadData();

        showAlert({
          title: "Sucesso",
          text: response?.message || "Baixa financeira estornada com sucesso.",
          icon: "success",
          timer: 1800,
        });
      } catch (error) {
        showAlert({
          title: "Falha ao estornar",
          text:
            error?.response?.data?.message ||
            "Não foi possível estornar a baixa financeira.",
          icon: "error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [askYesNoQuestion, detail, loadData, showAlert]
  );

  return {
    loadingForm,
    submitting,
    activeTab,
    setActiveTab,
    supportData,
    detail,
    form,
    saldoSelecionado,
    parcelaSelecionada,
    parcelasDisponiveis,
    selectedFormaPagamento,
    isPixSelected,
    isBoletoSelected,
    pixCharge,
    boletoCharge,
    updateField,
    handleChangeParcela,
    handleSubmit,
    handleGeneratePix,
    handleGenerateBoleto,
    handleEstornar,
    hasChanges,
  };
};
