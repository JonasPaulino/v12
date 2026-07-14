import { FiMinus, FiPlus } from "react-icons/fi";
import { useSweetAlert } from "../context/SweetAlertContext.jsx";

export function VendaResumo({
  cart,
  total,
  subtotal,
  descontoTipo,
  descontoEntrada,
  descontoCalculado,
  onDescontoTipoChange,
  onDescontoEntradaChange,
  onChange,
  onFinish,
  onPrintBudget,
  onIssueCupom,
  onCancelPayment,
  paymentReady = false,
  disabled,
}) {
  const { askYesNoQuestion } = useSweetAlert();

  function removeItem(produtoId) {
    if (paymentReady) return;
    onChange(cart.filter((item) => item.produto_id !== produtoId));
  }

  async function updateQuantity(produtoId, quantidade) {
    if (paymentReady) return;
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
            <strong className="item-description">{item.descricao}</strong>
            <span>{Number(item.valor_unitario).toFixed(2)}</span>
            <div className="quantity-control">
              <button
                type="button"
                className="quantity-step"
                disabled={disabled || paymentReady}
                onClick={() => updateQuantity(item.produto_id, Number(item.quantidade) - 1)}
                aria-label={`Diminuir quantidade de ${item.descricao}`}
              >
                <FiMinus />
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="quantity-value-input"
                value={String(Number(item.quantidade))}
                disabled={disabled || paymentReady}
                onChange={(event) => {
                  const nextValue = event.target.value.replace(/\D/g, "");
                  updateQuantity(item.produto_id, nextValue);
                }}
                aria-label={`Quantidade de ${item.descricao}`}
              />
              <button
                type="button"
                className="quantity-step"
                disabled={disabled || paymentReady}
                onClick={() => updateQuantity(item.produto_id, Number(item.quantidade) + 1)}
                aria-label={`Aumentar quantidade de ${item.descricao}`}
              >
                <FiPlus />
              </button>
            </div>
            <button
              className="remove-line"
              onClick={() => removeItem(item.produto_id)}
              disabled={disabled || paymentReady}
            >
              {(Number(item.quantidade) * Number(item.valor_unitario)).toFixed(2)}
            </button>
          </div>
        ))}
      </div>

      <div className="discount-panel">
        <div className="discount-panel-header">
          <strong>Desconto da venda</strong>
          <span>Aplique o desconto antes de ir para o pagamento.</span>
        </div>
        <div className="discount-panel-grid">
          <label>
            Tipo
            <select
              value={descontoTipo}
              disabled={disabled || paymentReady}
              onChange={(event) => onDescontoTipoChange(event.target.value)}
            >
              <option value="valor">Valor (R$)</option>
              <option value="percentual">Percentual (%)</option>
            </select>
          </label>
          <label>
            Desconto
            <input
              type="text"
              inputMode="decimal"
              placeholder={descontoTipo === "percentual" ? "0" : "0,00"}
              value={descontoEntrada}
              disabled={disabled || paymentReady}
              onChange={(event) =>
                onDescontoEntradaChange(event.target.value.replace(/[^\d,.-]/g, ""))
              }
            />
          </label>
          <div className="discount-panel-total-field">
            <span>Aplicado</span>
            <div className="discount-panel-total">
              <strong>R$ {Number(descontoCalculado || 0).toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>

      <footer className="receipt-footer">
        <div>
          <span>Quantidade: {cart.reduce((acc, item) => acc + Number(item.quantidade || 0), 0)} itens</span>
          <span>Subtotal: R$ {Number(subtotal || 0).toFixed(2)}</span>
          <span>Desconto: R$ {Number(descontoCalculado || 0).toFixed(2)}</span>
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
              Finalizar orçamento
            </button>
            <button className="finish secondary" disabled={disabled} onClick={onIssueCupom}>
              Finalizar cupom fiscal
            </button>
          </div>
          <button className="finish-link" type="button" disabled={disabled} onClick={onCancelPayment}>
            Cancelar pagamentos
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
