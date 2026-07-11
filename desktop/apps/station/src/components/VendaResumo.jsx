import { useSweetAlert } from "../context/SweetAlertContext.jsx";

export function VendaResumo({
  cart,
  total,
  onChange,
  onFinish,
  onPrintBudget,
  onIssueCupom,
  onFinalizeSale,
  onEditPayment,
  paymentReady = false,
  disabled,
}) {
  const { askYesNoQuestion } = useSweetAlert();

  function removeItem(produtoId) {
    onChange(cart.filter((item) => item.produto_id !== produtoId));
  }

  async function updateQuantity(produtoId, quantidade) {
    const nextQuantity = Number(quantidade || 0);
    const currentItem = cart.find((item) => item.produto_id === produtoId);

    if (!currentItem) return;

    if (nextQuantity <= 0) {
      const confirmed = await askYesNoQuestion(
        "Remover item",
        `Deseja remover ${currentItem.descricao} do cupom?`,
      );

      if (!confirmed) {
        return;
      }

      removeItem(produtoId);
      return;
    }

    onChange(
      cart.map((item) =>
        item.produto_id === produtoId ? { ...item, quantidade: nextQuantity } : item,
      ),
    );
  }

  return (
    <div className="receipt">
      <div className="receipt-table">
        <div className="receipt-row receipt-head">
          <span>Item</span>
          <span>Cod.</span>
          <span>Descricao</span>
          <span>Preco Un.</span>
          <span>Qtd</span>
          <span>Valor</span>
        </div>
        {cart.map((item) => (
          <div className="receipt-row" key={item.produto_id}>
            <span>{String(cart.indexOf(item) + 1).padStart(3, "0")}</span>
            <span>{item.codigo_produto || item.produto_id}</span>
            <strong>{item.descricao}</strong>
            <span>{Number(item.valor_unitario).toFixed(2)}</span>
            <input
              type="number"
              min="0"
              step="1"
              value={item.quantidade}
              onChange={(event) => updateQuantity(item.produto_id, event.target.value)}
            />
            <button className="remove-line" onClick={() => removeItem(item.produto_id)}>
              {(Number(item.quantidade) * Number(item.valor_unitario)).toFixed(2)}
            </button>
          </div>
        ))}
      </div>

      <footer className="receipt-footer">
        <div>
          <span>Quantidade: {cart.reduce((acc, item) => acc + Number(item.quantidade || 0), 0)} itens</span>
          <span>Subtotal: R$ {Number(total).toFixed(2)}</span>
          <span>Desconto: R$ 0,00</span>
        </div>
        <div className="grand-total">
          <small>Total</small>
          <strong>{Number(total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
        </div>
      </footer>
      {paymentReady ? (
        <div className="finish-actions">
          <div className="finish-actions-grid">
            <button className="finish secondary" disabled={disabled} onClick={onPrintBudget}>
              Imprimir orçamento
            </button>
            <button className="finish secondary" disabled={disabled} onClick={onIssueCupom}>
              Emitir cupom fiscal
            </button>
            <button className="finish" disabled={disabled} onClick={onFinalizeSale}>
              Finalizar venda
            </button>
          </div>
          <button className="finish-link" type="button" disabled={disabled} onClick={onEditPayment}>
            Alterar pagamento
          </button>
        </div>
      ) : (
        <button className="finish" disabled={disabled} onClick={onFinish}>
          Ir para pagamento (Ctrl + F)
        </button>
      )}
    </div>
  );
}
