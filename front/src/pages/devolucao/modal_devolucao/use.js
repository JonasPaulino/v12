import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { criarDevolucao, getOrigemDevolucao, searchOrigensDevolucao } from "../api";

const initialForm = () => ({
  tipo: "venda",
  origem_id: "",
  data_devolucao: new Date().toISOString().slice(0, 10),
  motivo: "",
  observacao: "",
  items: [],
});

const parseDecimal = (value) => {
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

const formatQuantityInput = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "";
  return numeric.toFixed(4).replace(/\.?0+$/, "");
};

export const useModalDevolucao = ({ isOpen, onClose }) => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [form, setForm] = useState(initialForm);
  const [selectedOrigem, setSelectedOrigem] = useState(null);
  const [origemSelecionada, setOrigemSelecionada] = useState(null);
  const [loadingOrigem, setLoadingOrigem] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm());
      setSelectedOrigem(null);
      setOrigemSelecionada(null);
      setLoadingOrigem(false);
      setSubmitting(false);
    }
  }, [isOpen]);

  const updateField = useCallback((field, value) => {
    setForm((prev) => {
      if (field !== "tipo") return { ...prev, [field]: value };
      return {
        ...initialForm(),
        tipo: value,
        data_devolucao: prev.data_devolucao,
      };
    });

    if (field === "tipo") {
      setSelectedOrigem(null);
      setOrigemSelecionada(null);
    }
  }, []);

  const updateItemQuantidade = useCallback((index, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, quantidade: value } : item
      ),
    }));
  }, []);

  const loadOrigensOptions = useCallback(
    async (search = "") => {
      const response = await searchOrigensDevolucao(form.tipo, search, 20);
      return response?.data || [];
    },
    [form.tipo]
  );

  const handleSelectOrigem = useCallback(
    async (value, option) => {
      setSelectedOrigem(option || null);
      setOrigemSelecionada(null);
      setForm((prev) => ({
        ...prev,
        origem_id: value || "",
        items: [],
      }));

      if (!value) return;

      try {
        setLoadingOrigem(true);
        const response = await getOrigemDevolucao(form.tipo, value);
        const data = response?.data;
        setOrigemSelecionada(data || null);
        setForm((prev) => ({
          ...prev,
          origem_id: value,
          items: (data?.items || [])
            .filter((item) => Number(item.quantidade_disponivel || 0) > 0)
            .map((item) => ({
              ...item,
              quantidade: formatQuantityInput(item.quantidade_disponivel),
            })),
        }));
      } catch (error) {
        showAlert({
          title: "Falha ao carregar origem",
          text:
            error?.response?.data?.message ||
            "Não foi possível carregar os itens da origem selecionada.",
          icon: "error",
        });
      } finally {
        setLoadingOrigem(false);
      }
    },
    [form.tipo, showAlert]
  );

  const resumo = useMemo(() => {
    const totalItens = form.items.filter((item) => parseDecimal(item.quantidade) > 0).length;
    const total = form.items.reduce(
      (sum, item) => sum + parseDecimal(item.quantidade) * Number(item.valor_unitario || 0),
      0
    );

    return {
      totalItens,
      total,
    };
  }, [form.items]);

  const validate = () => {
    if (!form.origem_id) {
      throw new Error(
        form.tipo === "compra"
          ? "Selecione a entrada de mercadoria."
          : "Selecione o pedido de venda."
      );
    }

    if (!form.data_devolucao) {
      throw new Error("Informe a data da devolução.");
    }

    const selectedItems = form.items.filter((item) => parseDecimal(item.quantidade) > 0);
    if (!selectedItems.length) {
      throw new Error("Informe ao menos um item com quantidade devolvida.");
    }

    selectedItems.forEach((item) => {
      const quantidade = parseDecimal(item.quantidade);
      const disponivel = Number(item.quantidade_disponivel || 0);
      if (quantidade > disponivel) {
        throw new Error(`A quantidade do item "${item.descricao}" ultrapassa o disponível.`);
      }
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      validate();
      setSubmitting(true);
      showLoading("Registrando devolução...");

      await criarDevolucao({
        tipo: form.tipo,
        origem_id: form.origem_id,
        data_devolucao: form.data_devolucao,
        motivo: form.motivo,
        observacao: form.observacao,
        items: form.items
          .filter((item) => parseDecimal(item.quantidade) > 0)
          .map((item) => ({
            origem_item_id: item.origem_item_id,
            quantidade: item.quantidade,
          })),
      });

      showAlert({
        title: "Devolução registrada",
        text: "O estoque foi movimentado com histórico.",
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
          "Não foi possível registrar a devolução.",
        icon: "error",
      });
    } finally {
      setSubmitting(false);
      hideLoading();
    }
  };

  return {
    form,
    selectedOrigem,
    origemSelecionada,
    loadingOrigem,
    submitting,
    resumo,
    updateField,
    updateItemQuantidade,
    loadOrigensOptions,
    handleSelectOrigem,
    handleSubmit,
  };
};
