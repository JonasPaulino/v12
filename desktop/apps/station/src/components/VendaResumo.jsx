export function VendaResumo({ cart, total, onChange, onFinish, disabled }) {
  function removeItem(produtoId) {
    onChange(cart.filter((item) => item.produto_id !== produtoId));
  }

  function updateQuantity(produtoId, quantidade) {
    onChange(
      cart.map((item) =>
        item.produto_id === produtoId ? { ...item, quantidade: Number(quantidade || 0) } : item,
      ),
    );
  }

  return (
    <div>
      <h2>Carrinho</h2>
      <div className="cart-list">
        {cart.map((item) => (
          <div className="cart-row" key={item.produto_id}>
            <div>
              <strong>{item.descricao}</strong>
              <span>R$ {Number(item.valor_unitario).toFixed(2)}</span>
            </div>
            <input
              type="number"
              min="1"
              value={item.quantidade}
              onChange={(event) => updateQuantity(item.produto_id, event.target.value)}
            />
            <button className="ghost" onClick={() => removeItem(item.produto_id)}>Remover</button>
          </div>
        ))}
      </div>

      <footer className="sale-footer">
        <span>Total</span>
        <strong>R$ {Number(total).toFixed(2)}</strong>
      </footer>
      <button className="finish" disabled={disabled} onClick={onFinish}>Finalizar venda local</button>
    </div>
  );
}
