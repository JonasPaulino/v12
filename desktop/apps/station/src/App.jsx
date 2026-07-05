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
import { AberturaCaixa } from "./components/caixa/AberturaCaixa.jsx";
import { FechamentoCaixa } from "./components/caixa/FechamentoCaixa.jsx";
import { MovimentoCaixa } from "./components/caixa/MovimentoCaixa.jsx";
import { ProdutoSearch } from "./components/ProdutoSearch.jsx";
import { LoginOperador } from "./components/setup/LoginOperador.jsx";
import { SetupLocal } from "./components/setup/SetupLocal.jsx";
import { VendaResumo } from "./components/VendaResumo.jsx";
import { AppContext } from "./context/AppContext.jsx";
import { useSweetAlert } from "./context/SweetAlertContext.jsx";
import logoPdvWhite from "./assets/logo_pdv_branca.png";

function getModuleForCaixa(caixaData) {
  if (caixaData?.caixa_pendente_dia_anterior) return "fechamento";
  return caixaData ? "venda" : "abertura";
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [configStatus, setConfigStatus] = useState(null);
  const [operador, setOperador] = useState(null);
  const [caixa, setCaixa] = useState(null);
  const [activeModule, setActiveModule] = useState("abertura");
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
      setActiveModule(getModuleForCaixa(caixaData));
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

  useEffect(() => {
    if (!operador) return;
    setActiveModule(getModuleForCaixa(caixa));
  }, [caixa, operador]);

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
      "Deseja encerrar a sessão do operador atual?",
    );

    if (!confirmed) return;

    setCart([]);
    setOperador(null);
    setActiveModule(getModuleForCaixa(caixa));
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
    return <LoginOperador config={configStatus.config} onLogin={handleOperadorLogin} />;
  }

  async function handleOperadorLogin(operadorData) {
    try {
      showLoading("Verificando caixa...");
      const caixaData = await api.caixaAtual();
      setCaixa(caixaData);
      setActiveModule(getModuleForCaixa(caixaData));
      setOperador(operadorData);
    } catch (error) {
      showAlert({
        title: "Falha ao carregar caixa",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  function openModule(module) {
    if (caixa?.caixa_pendente_dia_anterior && module !== "fechamento") {
      showAlert({
        title: "Fechamento pendente",
        text: `Existe um caixa aberto do dia ${caixa.data_operacional}. Feche esse caixa antes de continuar.`,
        icon: "warning",
      });
      setActiveModule("fechamento");
      return;
    }

    if (!caixa && module !== "abertura") {
      showAlert({
        title: "Caixa fechado",
        text: "Abra o caixa antes de acessar esta operação.",
        icon: "info",
      });
      setActiveModule("abertura");
      return;
    }

    setActiveModule(module);
  }

  function handleCaixaAberto(data) {
    setCaixa(data);
    setActiveModule(data?.caixa_pendente_dia_anterior ? "fechamento" : "venda");
  }

  function handleCaixaFechado() {
    setCart([]);
    setCaixa(null);
    setActiveModule("abertura");
  }

  const breadcrumbByModule = {
    abertura: "Caixa > Abertura",
    venda: "Vendas > Registro de item",
    sangria: "Caixa > Sangria",
    suprimento: "Caixa > Suprimento",
    fechamento: "Caixa > Fechamento",
  };
  const caixaPendenteDiaAnterior = !!caixa?.caixa_pendente_dia_anterior;
  const showSaleShortcuts = !caixaPendenteDiaAnterior && !["abertura", "fechamento"].includes(activeModule);

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
            <button onClick={() => openModule("venda")}><FiShoppingCart /> Nova venda</button>
            <button onClick={() => openModule("sangria")}><FiFileText /> Sangria</button>
            <button onClick={() => openModule("suprimento")}><FiFileText /> Suprimento</button>
            <button onClick={() => openModule("fechamento")}><FiFileText /> Fechamento de caixa</button>
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
        <section className={`left-panel ${showSaleShortcuts ? "" : "without-shortcuts"}`}>
          <div className="logo-card">
            <img src={logoPdvWhite} alt="V12 PDV" />
          </div>

          {showSaleShortcuts ? (
            <div className="shortcut-grid">
              <button className="shortcut primary" onClick={() => openModule("venda")}>Registro de item <small>F3</small></button>
              <button className="shortcut">Cliente / CPF <small>F4</small></button>
              <button className="shortcut" onClick={() => openModule("fechamento")}>Fechamento <small>F5</small></button>
              <button className="shortcut" onClick={() => openModule("sangria")}>Sangria <small>F6</small></button>
              <button className="shortcut" onClick={() => openModule("suprimento")}>Suprimento <small>F7</small></button>
              <button className="shortcut">Consultar produto <small>F8</small></button>
            </div>
          ) : null}

          <div className="entry-card">
            <div className="entry-card-top">
              <div className="breadcrumb">{breadcrumbByModule[activeModule]}</div>
              {activeModule === "fechamento" && caixa ? (
                <button
                  className="back-to-sale"
                  type="button"
                  disabled={caixaPendenteDiaAnterior}
                  onClick={() => openModule("venda")}
                >
                  Voltar para venda
                </button>
              ) : null}
            </div>
            {activeModule === "abertura" ? (
              <AberturaCaixa operador={operador} onOpened={handleCaixaAberto} />
            ) : null}
            {activeModule === "venda" ? (
              <ProdutoSearch onSelect={addProduto} disabled={!caixa} />
            ) : null}
            {activeModule === "sangria" ? (
              <MovimentoCaixa tipo="sangria" operador={operador} onDone={() => openModule("venda")} />
            ) : null}
            {activeModule === "suprimento" ? (
              <MovimentoCaixa tipo="suprimento" operador={operador} onDone={() => openModule("venda")} />
            ) : null}
            {activeModule === "fechamento" ? (
              <FechamentoCaixa onClosed={handleCaixaFechado} />
            ) : null}
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
            disabled={!caixa || caixaPendenteDiaAnterior || !cart.length}
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
