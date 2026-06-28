import { useCallback, useEffect, useMemo, useState } from "react";
import { useSweetAlert } from "context/sweet_alert";
import {
  criarEntradaMercadoria,
  getPedidoCompraEntrada,
  searchPedidosCompraSelect,
} from "../api";

const todayDate = () => new Date().toISOString().slice(0, 10);

const mergeUniqueOptions = (current = [], incoming = [], idKey) => {
  const map = new Map();

  [...current, ...incoming].forEach((item) => {
    if (!item || item[idKey] === undefined || item[idKey] === null) return;
    map.set(Number(item[idKey]), item);
  });

  return [...map.values()];
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

const currency = (value) => Number(Number(value || 0).toFixed(2));

export const useModalEntradaMercadoria = ({ isOpen, onClose }) => {
  const { showAlert } = useSweetAlert();
  const [submitting, setSubmitting] = useState(false);
  const [loadingPedido, setLoadingPedido] = useState(false);
  const [pedidosCache, setPedidosCache] = useState([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [form, setForm] = useState({
    pedido_compra_id: "",
    data_entrada: todayDate(),
    observacao: "",
    items: [],
  });

  useEffect(() => {
    if (!isOpen) {
      setSubmitting(false);
      setLoadingPedido(false);
      setPedidosCache([]);
      setPedidoSelecionado(null);
      setForm({
        pedido_compra_id: "",
        data_entrada: todayDate(),
        observacao: "",
        items: [],
      });
    }
  }, [isOpen]);

  const selectedPedido = useMemo(
    () =>
      pedidosCache.find(
        (pedido) => Number(pedido.pedido_compra_id) === Number(form.pedido_compra_id)
      ) || null,
    [form.pedido_compra_id, pedidosCache]
  );

  const resumo = useMemo(() => {
    const total = (form.items || []).reduce((sum, item) => {
      return sum + currency(parseNumeric(item.quantidade) * Number(item.valor_unitario || 0));
    }, 0);

    return {
      total: currency(total),
      totalItens: (form.items || []).length,
    };
  }, [form.items]);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const updateItemQuantidade = useCallback((index, value) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items || []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, quantidade: value } : item
      ),
    }));
  }, []);

  const loadPedidosOptions = useCallback(async (search) => {
    const response = await searchPedidosCompraSelect(search, 20);
    const data = response?.data || [];
    setPedidosCache((prev) => mergeUniqueOptions(prev, data, "pedido_compra_id"));
    return data;
  }, []);

  const handleSelectPedido = useCallback(
    async (value, option) => {
      if (option) {
        setPedidosCache((prev) => mergeUniqueOptions(prev, [option], "pedido_compra_id"));
      }

      const pedidoCompraId = value || option?.pedido_compra_id || "";
      setPedidoSelecionado(null);
      setForm((prev) => ({
        ...prev,
        pedido_compra_id: pedidoCompraId,
        items: [],
      }));

      if (!pedidoCompraId) return;

      try {
        setLoadingPedido(true);
        const response = await getPedidoCompraEntrada(pedidoCompraId);
        const data = response?.data || {};
        setPedidoSelecionado(data);
        setForm((prev) => ({
          ...prev,
          pedido_compra_id: pedidoCompraId,
          items: (data.items || []).map((item) => ({
            pedido_compra_item_id: item.pedido_compra_item_id,
            produto_id: item.produto_id,
            codigo_interno: item.codigo_interno,
            descricao: item.descricao,
            unidade_sigla: item.unidade_sigla,
            quantidade_comprada: item.quantidade,
            quantidade: String(item.quantidade || 0),
            valor_unitario: Number(item.valor_unitario || 0),
          })),
        }));
      } catch (error) {
        showAlert({
          title: "Falha ao carregar pedido",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar os itens do pedido de compra.",
          icon: "error",
        });
      } finally {
        setLoadingPedido(false);
      }
    },
    [showAlert]
  );

  const validateForm = useCallback(() => {
    if (!form.pedido_compra_id) {
      throw new Error("Selecione o pedido de compra.");
    }

    if (!form.data_entrada) {
      throw new Error("Informe a data de entrada.");
    }

    if (!form.items.length) {
      throw new Error("O pedido selecionado não possui itens.");
    }

    const invalidIndex = form.items.findIndex((item) => {
      const quantidade = parseNumeric(item.quantidade);
      return quantidade <= 0 || quantidade > Number(item.quantidade_comprada || 0);
    });

    if (invalidIndex >= 0) {
      throw new Error(`Revise a quantidade recebida no item ${invalidIndex + 1}.`);
    }
  }, [form]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      try {
        validateForm();
        setSubmitting(true);
        const response = await criarEntradaMercadoria({
          pedido_compra_id: form.pedido_compra_id,
          data_entrada: form.data_entrada,
          observacao: form.observacao,
          items: form.items.map((item) => ({
            pedido_compra_item_id: item.pedido_compra_item_id,
            quantidade: item.quantidade,
          })),
        });

        showAlert({
          title: "Entrada registrada",
          text: response?.message || "Entrada de mercadoria registrada com sucesso.",
          icon: "success",
          timer: 1800,
        });
        onClose(true);
      } catch (error) {
        showAlert({
          title: "Falha ao registrar",
          text:
            error?.response?.data?.message ||
            error?.message ||
            "Não foi possível registrar a entrada de mercadoria.",
          icon: "error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [form, onClose, showAlert, validateForm]
  );

  return {
    form,
    updateField,
    updateItemQuantidade,
    submitting,
    loadingPedido,
    selectedPedido,
    pedidoSelecionado,
    resumo,
    loadPedidosOptions,
    handleSelectPedido,
    handleSubmit,
  };
};
