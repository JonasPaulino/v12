import { useEffect, useRef, useState } from "react";
import { FiMinus, FiPackage, FiPlus, FiSearch } from "react-icons/fi";
import { api } from "../api.js";
import { useSweetAlert } from "../context/SweetAlertContext.jsx";

export function ProdutoSearch({ onSelect, disabled }) {
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedProduto, setSelectedProduto] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const { showAlert } = useSweetAlert();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (disabled) return undefined;

    const query = search.trim();
    if (!query) {
      setProdutos([]);
      setSelectedProduto(null);
      setQuantity(1);
      setIsOpen(false);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const data = await api.produtos(query);
        setProdutos(data);
        setIsOpen(data.length > 0);
        setSelectedProduto((current) =>
          current && data.some((produto) => produto.produto_id === current.produto_id)
            ? current
            : data[0] || null,
        );
      } catch {
        setProdutos([]);
        setSelectedProduto(null);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [disabled, search]);

  useEffect(() => {
    if (!disabled) return;
    setIsOpen(false);
  }, [disabled]);

  useEffect(() => {
    setQuantity(1);
  }, [selectedProduto?.produto_id]);

  async function carregarProdutos(query) {
    const data = await api.produtos(query);
    setProdutos(data);
    setSelectedProduto(data[0] || null);
    setIsOpen(data.length > 1);
    return data;
  }

  function limparBusca() {
    setSearch("");
    setProdutos([]);
    setSelectedProduto(null);
    setQuantity(1);
    setIsOpen(false);
  }

  async function adicionarProduto() {
    try {
      const query = search.trim();
      if (!query && !selectedProduto) {
        showAlert({
          title: "Informe o produto",
          text: "Digite ou escaneie o codigo do produto.",
          icon: "info",
        });
        return;
      }

      const data = selectedProduto ? [selectedProduto] : await carregarProdutos(query);
      const produto = selectedProduto || data[0];

      if (!produto) {
        showAlert({
          title: "Produto nao encontrado",
          text: "Nenhum produto local encontrado para a busca informada.",
          icon: "info",
        });
        return;
      }

      if (Number(produto.preco_venda || 0) <= 0) {
        showAlert({
          title: "Produto sem valor",
          text: "Não é possível adicionar produto com valor zero.",
          icon: "warning",
        });
        return;
      }

      const quantidadeAdicionar = Math.max(1, Number(quantity) || 1);
      onSelect(produto, quantidadeAdicionar);
      limparBusca();
    } catch (error) {
      showAlert({ title: "Falha na consulta", text: error.message, icon: "error" });
    }
  }

  return (
    <div className="entry-module">
      <label className="product-code-label">
        Buscar produto
        <div className="product-search-shell" ref={containerRef}>
          <div className="product-input-row">
            <div className="product-combobox">
              <FiSearch className="product-search-icon" />
              <input
                placeholder="Escaneie ou digite codigo/descricao"
                value={search}
                onFocus={() => setIsOpen(produtos.length > 0)}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    adicionarProduto();
                  }
                  if (event.key === "Escape") {
                    setIsOpen(false);
                  }
                }}
                disabled={disabled}
                autoFocus
              />
              {isOpen ? (
                <div className="product-suggestions">
                  {loading ? (
                    <span className="product-suggestion-status">Pesquisando...</span>
                  ) : (
                    produtos.map((produto) => (
                      <button
                        key={produto.produto_id}
                        type="button"
                        className={`product-suggestion ${
                          selectedProduto?.produto_id === produto.produto_id ? "active" : ""
                        }`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setSelectedProduto(produto);
                          setSearch(produto.descricao || produto.codigo || "");
                          setIsOpen(false);
                        }}
                      >
                        <span>
                          <strong>{produto.descricao}</strong>
                          <small>{produto.codigo || "Sem codigo"} | Estoque {produto.estoque_atual}</small>
                        </span>
                        <b>R$ {Number(produto.preco_venda || 0).toFixed(2)}</b>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </label>

      <div className={`selected-product-card ${selectedProduto ? "is-ready" : ""}`}>
        <div className="selected-product-header">
          <span className="selected-product-title">
            <FiPackage />
            Produto selecionado
          </span>
          <button type="button" className="selected-product-clear" onClick={limparBusca} disabled={disabled}>
            Limpar
          </button>
        </div>

        <div className="selected-product-preview">
          <span>Descricao</span>
          <strong>{selectedProduto?.descricao || "Nenhum produto selecionado"}</strong>
          <small>Valor</small>
          <b>
            {selectedProduto ? `R$ ${Number(selectedProduto.preco_venda || 0).toFixed(2)}` : "R$ 0,00"}
          </b>
        </div>

        <div className="selected-product-meta">
          <div>
            <span>Codigo</span>
            <strong>{selectedProduto?.codigo || "Aguardando leitura"}</strong>
          </div>
          <div>
            <span>Estoque</span>
            <strong>{selectedProduto ? Number(selectedProduto.estoque_atual || 0) : "--"}</strong>
          </div>
        </div>

        <div className="selected-product-actions">
          <label className="selected-quantity-field">
            Quantidade
            <div className="selected-quantity-control">
              <button
                type="button"
                className="selected-quantity-step"
                disabled={disabled || quantity <= 1}
                onClick={() => setQuantity((current) => Math.max(1, Number(current || 1) - 1))}
                aria-label="Diminuir quantidade"
              >
                <FiMinus />
              </button>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                disabled={disabled}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
              />
              <button
                type="button"
                className="selected-quantity-step"
                disabled={disabled}
                onClick={() => setQuantity((current) => Math.max(1, Number(current || 1) + 1))}
                aria-label="Aumentar quantidade"
              >
                <FiPlus />
              </button>
            </div>
          </label>

          <button
            type="button"
            className="product-add-button"
            onClick={adicionarProduto}
            disabled={disabled || !selectedProduto}
            title="Adicionar produto"
          >
            <FiPlus />
            <span>Adicionar a venda</span>
          </button>
        </div>
      </div>
    </div>
  );
}
