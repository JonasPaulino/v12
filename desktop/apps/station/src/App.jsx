import { useEffect, useMemo, useState } from "react";
import {
  FiChevronDown,
  FiFileText,
  FiMaximize2,
  FiMenu,
  FiPower,
  FiRefreshCcw,
  FiSettings,
  FiShoppingCart,
  FiWifi,
} from "react-icons/fi";
import { api } from "./api.js";
import { CaixaPanel } from "./components/CaixaPanel.jsx";
import { ProdutoSearch } from "./components/ProdutoSearch.jsx";
import { VendaResumo } from "./components/VendaResumo.jsx";
import logoWhite from "./assets/v12-erp-logo-white.png";

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

  function sairDoSistema() {
    if (window.v12Desktop?.quit) {
      window.v12Desktop.quit();
      return;
    }

    setMessage("Opcao de sair disponivel somente no app Electron.");
  }

  function alternarTelaCheia() {
    if (window.v12Desktop?.toggleFullscreen) {
      window.v12Desktop.toggleFullscreen();
      return;
    }

    setMessage("Tela cheia disponivel somente no app Electron.");
  }

  return (
    <div className="pdv-shell">
      <header className="pdv-topbar">
        <div className="menu-group">
          <button className="top-menu">
            <FiMenu />
            Menu <small>F2</small>
            <FiChevronDown className="chevron" />
          </button>
          <div className="top-dropdown">
            <button><FiShoppingCart /> Nova venda</button>
            <button><FiFileText /> Relatorio de caixa</button>
            <button><FiSettings /> Configuracoes locais</button>
            <button onClick={alternarTelaCheia}><FiMaximize2 /> Alternar tela cheia</button>
            <button className="danger-menu" onClick={sairDoSistema}><FiPower /> Sair do sistema</button>
          </div>
        </div>

        <div className="operator-info">
          <span>PDV: 01</span>
          <span>Operador: {caixa?.operador_nome || "Caixa fechado"}</span>
          <span>{health?.station || "Caixa 01"}</span>
        </div>

        <div className="menu-group align-right">
          <button className="top-menu fiscal">
            Menu fiscal <small>F12</small>
            <FiChevronDown className="chevron" />
          </button>
          <div className="top-dropdown">
            <button>Status SEFAZ</button>
            <button>Enviar contingencias</button>
            <button>Consultar NFC-e</button>
          </div>
        </div>
      </header>

      <main className="pdv-main">
        <section className="left-panel">
          <div className="logo-card">
            <img src={logoWhite} alt="V12 ERP" />
          </div>

          <div className="shortcut-grid">
            <button className="shortcut primary">Registro de item <small>F3</small></button>
            <button className="shortcut">Cliente / CPF <small>F4</small></button>
            <button className="shortcut">Cancelar item <small>F5</small></button>
            <button className="shortcut">Orcamento <small>F6</small></button>
            <button className="shortcut">Desconto <small>F7</small></button>
            <button className="shortcut">Consultar produto <small>F8</small></button>
          </div>

          <div className="entry-card">
            <div className="breadcrumb">Vendas &gt; Registro de item</div>
            <ProdutoSearch onSelect={addProduto} disabled={!caixa} />
          </div>

          <div className="caixa-card">
            <CaixaPanel caixa={caixa} onChange={setCaixa} />
          </div>
        </section>

        <section className="right-panel">
          <div className="receipt-header">
            <strong>V12 ERP</strong>
            <span>PDV Local - NFC-e modelo 65</span>
            <small>{new Date().toLocaleString("pt-BR")}</small>
          </div>

          <VendaResumo
            cart={cart}
            total={total}
            onChange={setCart}
            onFinish={finalizarVenda}
            disabled={!caixa || !cart.length}
          />
        </section>
      </main>

      <footer className="pdv-footer">
        <div className="footer-status">
          <span className={caixa ? "dot online" : "dot offline"} />
          {caixa ? "Caixa aberto" : "Caixa fechado"}
          <button onClick={() => loadInitialData()}><FiRefreshCcw /> Atualizar</button>
          <span><FiWifi /> Sync local</span>
        </div>
        {message ? <strong className="footer-message">{message}</strong> : null}
        <div className="footer-brand">
          <FiPower />
          V12 ERP
        </div>
      </footer>
    </div>
  );
}
