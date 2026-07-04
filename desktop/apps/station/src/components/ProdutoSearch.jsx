import { useContext, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { api } from "../api.js";
import { AppContext } from "../context/AppContext.jsx";
import { useSweetAlert } from "../context/SweetAlertContext.jsx";

export function ProdutoSearch({ onSelect, disabled }) {
  const [search, setSearch] = useState("");
  const [produtos, setProdutos] = useState([]);
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();

  async function pesquisar() {
    try {
      showLoading("Consultando produto...");
      const data = await api.produtos(search);
      setProdutos(data);
      if (!data.length) {
        showAlert({
          title: "Produto nao encontrado",
          text: "Nenhum produto local encontrado para a busca informada.",
          icon: "info",
        });
      }
    } catch (error) {
      showAlert({ title: "Falha na consulta", text: error.message, icon: "error" });
    } finally {
      hideLoading();
    }
  }

  return (
    <div className="entry-module">
      <label className="product-code-label">
        Codigo do produto
        <div className="product-input-row">
          <input
            placeholder="Quantidade / codigo do produto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") pesquisar();
            }}
            disabled={disabled}
            autoFocus
          />
          <button onClick={pesquisar} disabled={disabled} title="Consultar produto">
            <FiSearch />
          </button>
        </div>
      </label>

      <div className="selected-product-preview">
        <span>Nome do produto</span>
        <strong>{produtos[0]?.descricao || "Aguardando leitura"}</strong>
        <small>Valor</small>
        <b>{produtos[0] ? `R$ ${Number(produtos[0].preco_venda || 0).toFixed(2)}` : "R$ 0,00"}</b>
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
