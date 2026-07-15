import { useEffect, useMemo, useState } from "react";
import { FiLogOut, FiMinus, FiPlus, FiSearch, FiSend, FiTrash2 } from "react-icons/fi";
import { api } from "../../api.js";
import logoPdvWhite from "../../assets/logo_pdv_branca.png";
import { useSweetAlert } from "../../context/SweetAlertContext.jsx";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const REFERENCIA_TIPOS = [
  { value: "pedido", label: "Pedido" },
  { value: "mesa", label: "Mesa" },
  { value: "comanda", label: "Comanda" },
  { value: "balcao", label: "Balcão" },
  { value: "retirada", label: "Retirada" },
];

export function MobilePedidosApp() {
  const [operador, setOperador] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem("v12_pedido_operador") || "null");
    } catch {
      return null;
    }
  });
  const [loginForm, setLoginForm] = useState({ email: "", senha: "" });
  const [referenciaForm, setReferenciaForm] = useState({
    tipo_referencia: "pedido",
    referencia: "",
    cliente_nome: "",
    observacao: "",
  });
  const [search, setSearch] = useState("");
  const [produtos, setProdutos] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showAlert, showToast, askYesNoQuestion } = useSweetAlert();

  const total = useMemo(() => {
    return cart.reduce((acc, item) => acc + Number(item.quantidade || 0) * Number(item.preco_venda || 0), 0);
  }, [cart]);

  const totalItens = useMemo(() => {
    return cart.reduce((acc, item) => acc + Number(item.quantidade || 0), 0);
  }, [cart]);

  async function login(event) {
    event.preventDefault();
    try {
      setLoading(true);
      const data = await api.loginOperador(loginForm);
      if (data?.primeiro_acesso_pendente) {
        showAlert({
          title: "Primeiro acesso pendente",
          text: "Altere a senha no PDV principal antes de usar o lançamento móvel.",
          icon: "warning",
        });
        return;
      }

      setOperador(data);
      window.localStorage.setItem("v12_pedido_operador", JSON.stringify(data));
    } catch (error) {
      showAlert({
        title: "Falha no login",
        text: error.message,
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setOperador(null);
    setCart([]);
    window.localStorage.removeItem("v12_pedido_operador");
  }

  async function carregarProdutos() {
    try {
      const data = await api.produtos(search);
      setProdutos(data.slice(0, 40));
    } catch (error) {
      showAlert({
        title: "Falha ao buscar produtos",
        text: error.message,
        icon: "error",
      });
    }
  }

  useEffect(() => {
    if (!operador) return undefined;

    const timer = window.setTimeout(() => {
      void carregarProdutos();
    }, 250);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, operador]);

  function addProduto(produto) {
    setCart((current) => {
      const existing = current.find((item) => Number(item.produto_id) === Number(produto.produto_id));
      if (existing) {
        return current.map((item) =>
          Number(item.produto_id) === Number(produto.produto_id)
            ? { ...item, quantidade: Number(item.quantidade || 0) + 1 }
            : item,
        );
      }

      return [
        ...current,
        {
          produto_id: produto.produto_id,
          codigo: produto.codigo,
          descricao: produto.descricao,
          unidade: produto.unidade || "UN",
          preco_venda: Number(produto.preco_venda || 0),
          quantidade: 1,
          observacao: "",
        },
      ];
    });
  }

  function updateQuantidade(produtoId, delta) {
    setCart((current) =>
      current
        .map((item) =>
          Number(item.produto_id) === Number(produtoId)
            ? { ...item, quantidade: Math.max(0, Number(item.quantidade || 0) + delta) }
            : item,
        )
        .filter((item) => Number(item.quantidade || 0) > 0),
    );
  }

  function updateItemObservacao(produtoId, observacao) {
    setCart((current) =>
      current.map((item) =>
        Number(item.produto_id) === Number(produtoId)
          ? { ...item, observacao }
          : item,
      ),
    );
  }

  async function enviarPedido() {
    const referencia = String(referenciaForm.referencia || "").trim();
    if (!referencia) {
      showAlert({
        title: "Referência obrigatória",
        text: "Informe a referência do pedido antes de enviar.",
        icon: "warning",
      });
      return;
    }

    if (!cart.length) {
      showAlert({
        title: "Pedido vazio",
        text: "Adicione ao menos um item antes de enviar.",
        icon: "warning",
      });
      return;
    }

    const confirmed = await askYesNoQuestion(
      "Enviar pedido",
      `Enviar ${totalItens} item(ns) para o caixa?`,
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      await api.criarPedido({
        operador_id: operador.operador_id,
        operador_nome: operador.nome,
        tipo_referencia: referenciaForm.tipo_referencia,
        referencia,
        cliente_nome: referenciaForm.cliente_nome,
        observacao: referenciaForm.observacao,
        itens: cart.map((item) => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          observacao: item.observacao,
        })),
      });

      setCart([]);
      setReferenciaForm((current) => ({
        ...current,
        referencia: "",
        cliente_nome: "",
        observacao: "",
      }));
      showToast({
        title: "Pedido enviado",
        text: "O pedido já está disponível no caixa.",
        icon: "success",
        position: "top",
      });
    } catch (error) {
      showAlert({
        title: "Falha ao enviar pedido",
        text: error.message,
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!operador) {
    return (
      <div className="mobile-order-shell">
        <form className="mobile-login-card" onSubmit={login}>
          <img src={logoPdvWhite} alt="V12 PDV" />
          <span className="mobile-kicker">Pedidos locais</span>
          <h1>Entrar para lançar pedidos</h1>
          <p>Use o usuário sincronizado do PDV para enviar pedidos ao caixa pela rede local.</p>
          <label>
            E-mail do operador
            <input
              value={loginForm.email}
              onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="operador@empresa.com.br"
              autoComplete="username"
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={loginForm.senha}
              onChange={(event) => setLoginForm((current) => ({ ...current, senha: event.target.value }))}
              placeholder="Senha"
              autoComplete="current-password"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mobile-order-app">
      <header className="mobile-order-header">
        <img src={logoPdvWhite} alt="V12 PDV" />
        <div>
          <strong>Pedidos</strong>
          <span>{operador.nome}</span>
        </div>
        <button type="button" onClick={logout} aria-label="Sair">
          <FiLogOut />
        </button>
      </header>

      <main className="mobile-order-main">
        <section className="mobile-order-reference">
          <div className="reference-grid">
            <label>
              Tipo
              <select
                value={referenciaForm.tipo_referencia}
                onChange={(event) =>
                  setReferenciaForm((current) => ({ ...current, tipo_referencia: event.target.value }))
                }
              >
                {REFERENCIA_TIPOS.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
            </label>
            <label>
              Referência
              <input
                value={referenciaForm.referencia}
                onChange={(event) =>
                  setReferenciaForm((current) => ({ ...current, referencia: event.target.value }))
                }
                placeholder="Mesa 01, Pedido João..."
              />
            </label>
          </div>
          <label>
            Cliente ou observação rápida
            <input
              value={referenciaForm.cliente_nome}
              onChange={(event) =>
                setReferenciaForm((current) => ({ ...current, cliente_nome: event.target.value }))
              }
              placeholder="Opcional"
            />
          </label>
        </section>

        <section className="mobile-product-search">
          <label>
            Buscar item
            <div className="mobile-search-box">
              <FiSearch />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Código ou descrição"
              />
            </div>
          </label>
          <div className="mobile-product-list">
            {produtos.map((produto) => (
              <button type="button" key={produto.produto_id} onClick={() => addProduto(produto)}>
                <span>
                  <strong>{produto.descricao}</strong>
                  <small>{produto.codigo || "Sem código"} · {produto.unidade || "UN"}</small>
                </span>
                <strong>{formatCurrency(produto.preco_venda)}</strong>
                <FiPlus />
              </button>
            ))}
          </div>
        </section>

        <section className="mobile-cart">
          <div className="mobile-cart-title">
            <strong>Itens do pedido</strong>
            <span>{totalItens} item(ns)</span>
          </div>

          {cart.length ? (
            cart.map((item) => (
              <div className="mobile-cart-item" key={item.produto_id}>
                <div className="mobile-cart-item-top">
                  <span>
                    <strong>{item.descricao}</strong>
                    <small>{formatCurrency(item.preco_venda)} · {item.unidade}</small>
                  </span>
                  <strong>{formatCurrency(Number(item.quantidade) * Number(item.preco_venda))}</strong>
                </div>
                <div className="mobile-cart-item-actions">
                  <button type="button" onClick={() => updateQuantidade(item.produto_id, -1)}>
                    <FiMinus />
                  </button>
                  <strong>{item.quantidade}</strong>
                  <button type="button" onClick={() => updateQuantidade(item.produto_id, 1)}>
                    <FiPlus />
                  </button>
                  <button type="button" className="remove" onClick={() => updateQuantidade(item.produto_id, -9999)}>
                    <FiTrash2 />
                  </button>
                </div>
                <input
                  value={item.observacao}
                  onChange={(event) => updateItemObservacao(item.produto_id, event.target.value)}
                  placeholder="Observação do item"
                />
              </div>
            ))
          ) : (
            <div className="mobile-cart-empty">Nenhum item lançado.</div>
          )}

          <label>
            Observação geral
            <textarea
              value={referenciaForm.observacao}
              onChange={(event) =>
                setReferenciaForm((current) => ({ ...current, observacao: event.target.value }))
              }
              placeholder="Ex.: sem cebola, entregar no balcão..."
            />
          </label>
        </section>
      </main>

      <footer className="mobile-order-footer">
        <div>
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
        <button type="button" disabled={!cart.length || loading} onClick={enviarPedido}>
          <FiSend />
          {loading ? "Enviando..." : "Enviar pedido"}
        </button>
      </footer>
    </div>
  );
}
