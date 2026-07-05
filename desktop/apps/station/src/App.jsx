import { useContext, useEffect, useMemo, useState } from "react";
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
import { LoginOperador } from "./components/setup/LoginOperador.jsx";
import { SetupLocal } from "./components/setup/SetupLocal.jsx";
import { VendaResumo } from "./components/VendaResumo.jsx";
import { AppContext } from "./context/AppContext.jsx";
import { useSweetAlert } from "./context/SweetAlertContext.jsx";
import logoPdvWhite from "./assets/logo_pdv_branca.png";

export default function App() {
  const [health, setHealth] = useState(null);
  const [configStatus, setConfigStatus] = useState(null);
  const [operador, setOperador] = useState(null);
  const [caixa, setCaixa] = useState(null);
  const [cart, setCart] = useState([]);
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();

  async function loadInitialData({ silent = false } = {}) {
    try {
      if (!silent) showLoading("Atualizando PDV...");
      const [healthData, statusData, caixaData] = await Promise.all([
        api.health(),
        api.configuracaoStatus(),
        api.caixaAtual(),
      ]);
      setHealth(healthData);
      setConfigStatus(statusData);
      setCaixa(caixaData);
      if (!silent) {
        showAlert({
          title: "PDV atualizado",
          text: "Dados locais atualizados com sucesso.",
          icon: "success",
        });
      }
    } catch (error) {
      showAlert({
        title: "Falha ao atualizar",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  useEffect(() => {
    loadInitialData({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    try {
      showLoading("Finalizando venda...");
      const result = await api.criarVenda({
        items: cart,
        pagamentos: [{ forma: "dinheiro", valor: total }],
      });
      setCart([]);
      showAlert({
        title: "Venda registrada",
        text: result.fiscal?.message || "Venda registrada localmente.",
        icon: result.fiscal?.success ? "success" : "info",
      });
    } catch (error) {
      showAlert({
        title: "Falha na venda",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  async function sincronizarProdutos(full = false) {
    try {
      showLoading("Sincronizando produtos...");
      const result = await api.sincronizarProdutos({ full });
      showAlert({
        title: "Produtos sincronizados",
        text: `${result.imported || 0} produto(s) importado(s) ou atualizado(s).`,
        icon: "success",
      });
    } catch (error) {
      showAlert({
        title: "Falha na sincronização",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  async function sairDoSistema() {
    const confirmed = await askYesNoQuestion(
      "Sair do sistema",
      "Deseja realmente fechar o V12 PDV?",
    );

    if (!confirmed) return;

    if (window.v12Desktop?.quit) {
      window.v12Desktop.quit();
      return;
    }

    showAlert({
      title: "Opcao indisponivel",
      text: "Sair do sistema esta disponivel somente no app Electron.",
      icon: "info",
    });
  }

  function alternarTelaCheia() {
    if (window.v12Desktop?.toggleFullscreen) {
      window.v12Desktop.toggleFullscreen();
      return;
    }

    showAlert({
      title: "Opcao indisponivel",
      text: "Tela cheia esta disponivel somente no app Electron.",
      icon: "info",
    });
  }

  if (!configStatus) {
    return (
      <div className="setup-shell">
        <div className="login-card">
          <img src={logoPdvWhite} alt="V12 PDV" />
          <h1>Carregando PDV</h1>
          <p>Verificando configuração local do terminal.</p>
        </div>
      </div>
    );
  }

  if (configStatus && !configStatus.configurado) {
    return (
      <SetupLocal
        onConfigured={() => {
          loadInitialData({ silent: true });
        }}
      />
    );
  }

  if (configStatus?.configurado && !operador) {
    return <LoginOperador config={configStatus.config} onLogin={setOperador} />;
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
            <button onClick={() => sincronizarProdutos(true)}><FiRefreshCcw /> Sincronizar produtos</button>
            <button onClick={alternarTelaCheia}><FiMaximize2 /> Alternar tela cheia</button>
            <button className="danger-menu" onClick={sairDoSistema}><FiPower /> Sair do sistema</button>
          </div>
        </div>

        <div className="operator-info">
          <span>{configStatus?.config?.terminal_codigo || "PDV: 01"}</span>
          <span>Operador: {operador?.nome || caixa?.operador_nome || "Caixa fechado"}</span>
          <span>{configStatus?.config?.tenant_nome || health?.station || "Caixa 01"}</span>
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
            <img src={logoPdvWhite} alt="V12 PDV" />
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
            <CaixaPanel caixa={caixa} operador={operador} onChange={setCaixa} />
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
          <button onClick={() => sincronizarProdutos(false)}><FiWifi /> Sync produtos</button>
        </div>
        <span />
        <button className="footer-brand" onClick={sairDoSistema} title="Sair do sistema">
          <FiPower />
          V12 ERP
        </button>
      </footer>
    </div>
  );
}
