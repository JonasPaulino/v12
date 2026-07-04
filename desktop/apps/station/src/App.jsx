import { useEffect, useMemo, useState } from "react";
import { FiBox, FiRefreshCcw, FiShoppingCart, FiWifi } from "react-icons/fi";
import { api } from "./api.js";
import { CaixaPanel } from "./components/CaixaPanel.jsx";
import { ProdutoSearch } from "./components/ProdutoSearch.jsx";
import { VendaResumo } from "./components/VendaResumo.jsx";

export default function App() {
  const [health, setHealth] = useState(null);
  const [caixa, setCaixa] = useState(null);
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState("");

  async function loadInitialData() {
    const [healthData, caixaData] = await Promise.all([api.health(), api.caixaAtual()]);
    setHealth(healthData);
    setCaixa(caixaData);
  }

  useEffect(() => {
    loadInitialData().catch((error) => setMessage(error.message));
  }, []);

  const total = useMemo(() => {
    return cart.reduce((acc, item) => acc + Number(item.quantidade) * Number(item.valor_unitario), 0);
  }, [cart]);

  function addProduto(produto) {
    setCart((current) => {
      const existing = current.find((item) => item.produto_id === produto.produto_id);
      if (existing) {
        return current.map((item) =>
          item.produto_id === produto.produto_id
            ? { ...item, quantidade: Number(item.quantidade) + 1 }
            : item,
        );
      }

      return [
        ...current,
        {
          produto_id: produto.produto_id,
          codigo_produto: produto.codigo,
          descricao: produto.descricao,
          quantidade: 1,
          valor_unitario: Number(produto.preco_venda || 0),
        },
      ];
    });
  }

  async function finalizarVenda() {
    setMessage("");
    const result = await api.criarVenda({
      items: cart,
      pagamentos: [{ forma: "dinheiro", valor: total }],
    });
    setCart([]);
    setMessage(result.fiscal?.message || "Venda registrada localmente.");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">V12 PDV</div>
        <nav>
          <button className="nav-active"><FiShoppingCart /> Venda</button>
          <button><FiBox /> Produtos</button>
          <button><FiWifi /> Sync</button>
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <strong>{health?.station || "Caixa local"}</strong>
            <span>{health?.service || "Servidor local aguardando"}</span>
          </div>
          <button onClick={() => loadInitialData()}><FiRefreshCcw /> Atualizar</button>
        </header>

        {message ? <div className="notice">{message}</div> : null}

        <section className="grid">
          <div className="card products-card">
            <h2>Venda balcão</h2>
            <ProdutoSearch onSelect={addProduto} disabled={!caixa} />
          </div>

          <div className="card">
            <CaixaPanel caixa={caixa} onChange={setCaixa} />
          </div>

          <div className="card sale-card">
            <VendaResumo cart={cart} total={total} onChange={setCart} onFinish={finalizarVenda} disabled={!caixa || !cart.length} />
          </div>
        </section>
      </main>
    </div>
  );
}
