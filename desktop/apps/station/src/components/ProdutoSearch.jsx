import { useState } from "react";
import { api } from "../api.js";

export function ProdutoSearch({ onSelect, disabled }) {
  const [search, setSearch] = useState("");
  const [produtos, setProdutos] = useState([]);

  async function pesquisar() {
    const data = await api.produtos(search);
    setProdutos(data);
  }

  return (
    <div>
      <div className="inline-form">
        <input
          placeholder="Buscar produto por codigo ou descricao"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={disabled}
        />
        <button onClick={pesquisar} disabled={disabled}>Buscar</button>
      </div>

      <div className="product-list">
        {produtos.map((produto) => (
          <button key={produto.produto_id} className="product-row" onClick={() => onSelect(produto)}>
            <span>
              <strong>{produto.descricao}</strong>
              <small>{produto.codigo || "Sem codigo"} | Estoque {produto.estoque_atual}</small>
            </span>
            <b>R$ {Number(produto.preco_venda || 0).toFixed(2)}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
