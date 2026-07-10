import { useEffect, useRef, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { api } from "../api.js";
import { useSweetAlert } from "../context/SweetAlertContext.jsx";

export function ProdutoSearch({ onSelect, disabled }) {
  const [search, setSearch] = useState("");
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

  async function carregarProdutos(query) {
    const data = await api.produtos(query);
    setProdutos(data);
    setSelectedProduto(data[0] || null);
    setIsOpen(data.length > 1);
    return data;
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

      onSelect(produto);
      setSearch("");
      setProdutos([]);
      setSelectedProduto(null);
      setIsOpen(false);
    } catch (error) {
      showAlert({ title: "Falha na consulta", text: error.message, icon: "error" });
    }
  }

  return (
    <div className="entry-module">
      <label className="product-code-label">
        Codigo do produto
        <div className="product-input-row" ref={containerRef}>
          <div className="product-combobox">
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
          <button onClick={adicionarProduto} disabled={disabled} title="Adicionar produto">
            <FiPlus />
            <span>Adicionar</span>
          </button>
        </div>
      </label>

      <div className="selected-product-preview">
        <span>Nome do produto</span>
        <strong>{selectedProduto?.descricao || "Aguardando leitura"}</strong>
        <small>Valor</small>
        <b>
          {selectedProduto ? `R$ ${Number(selectedProduto.preco_venda || 0).toFixed(2)}` : "R$ 0,00"}
        </b>
      </div>
    </div>
  );
}
