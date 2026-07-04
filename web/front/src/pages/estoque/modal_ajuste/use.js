import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSweetAlert } from "context/sweet_alert";
import { criarAjusteEstoque, searchProdutosEstoque } from "../api";

const buildInitialForm = () => ({
  produto_id: "",
  tipo_ajuste: "entrada",
  quantidade: "",
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

export const useModalAjusteEstoque = ({ isOpen, produtoInicial, onClose }) => {
  const { showAlert } = useSweetAlert();
  const [form, setForm] = useState(buildInitialForm());
  const [produtosCache, setProdutosCache] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const produtoRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setForm(buildInitialForm());
      setProdutosCache([]);
      setSubmitting(false);
      return;
    }

    if (produtoInicial?.produto_id) {
      setProdutosCache((prev) =>
        mergeUniqueOptions(
          prev,
          [
            {
              produto_id: produtoInicial.produto_id,
              codigo_interno: produtoInicial.codigo_interno,
              descricao: produtoInicial.descricao,
              unidade_sigla: produtoInicial.unidade_sigla,
            },
          ],
          "produto_id"
        )
      );

      setForm((prev) => ({
        ...prev,
        produto_id: produtoInicial.produto_id,
      }));
    }
  }, [isOpen, produtoInicial]);

  const produtosMap = useMemo(
    () => new Map((produtosCache || []).map((produto) => [Number(produto.produto_id), produto])),
    [produtosCache]
  );

  const selectedProduto = produtosMap.get(Number(form.produto_id)) || null;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectProduto = useCallback((produtoId, produto) => {
    if (produto) {
      setProdutosCache((prev) => mergeUniqueOptions(prev, [produto], "produto_id"));
    }

    setForm((prev) => ({ ...prev, produto_id: produtoId }));
  }, []);

  const loadProdutosOptions = useCallback(async (search) => {
    const response = await searchProdutosEstoque(search, 20);
    const data = response?.data || [];
    setProdutosCache((prev) => mergeUniqueOptions(prev, data, "produto_id"));
    return data;
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!String(form.produto_id || "").trim()) {
      await showAlert({
        title: "Produto obrigatório",
        text: "Selecione o produto que receberá o ajuste.",
        icon: "warning",
      });
      produtoRef.current?.focus?.();
      return;
    }

    if (!String(form.quantidade || "").trim()) {
      await showAlert({
        title: "Quantidade obrigatória",
        text: "Informe a quantidade do ajuste.",
        icon: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await criarAjusteEstoque({
        produto_id: Number(form.produto_id),
        tipo_ajuste: form.tipo_ajuste,
        quantidade: form.quantidade,
        observacao: form.observacao,
      });

      showAlert({
        title: "Ajuste registrado",
        text: response?.message || "Ajuste de estoque registrado com sucesso.",
        icon: "success",
        timer: 1800,
      });

      onClose(true);
    } catch (error) {
      showAlert({
        title: "Falha ao registrar ajuste",
        text:
          error?.response?.data?.message ||
          "Não foi possível registrar o ajuste de estoque.",
        icon: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    updateField,
    submitting,
    produtoRef,
    selectedProduto,
    handleSelectProduto,
    loadProdutosOptions,
    handleSubmit,
  };
};
