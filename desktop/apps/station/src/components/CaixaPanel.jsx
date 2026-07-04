import { useState } from "react";
import { api } from "../api.js";

export function CaixaPanel({ caixa, onChange }) {
  const [operador, setOperador] = useState("Operador");
  const [valor, setValor] = useState("0.00");

  async function abrir() {
    const data = await api.abrirCaixa({ operador_nome: operador, valor_abertura: valor });
    onChange(data);
  }

  async function fechar() {
    const data = await api.fecharCaixa({ valor_fechamento: valor });
    onChange(data);
  }

  return (
    <div className="cash-module">
      {caixa ? (
        <>
          <div className="cash-summary">
            <strong>Caixa aberto</strong>
            <span>{caixa.operador_nome}</span>
            <small>Abertura: R$ {Number(caixa.valor_abertura || 0).toFixed(2)}</small>
          </div>
          <label>
            Valor fechamento
            <input value={valor} onChange={(event) => setValor(event.target.value)} />
          </label>
          <button className="danger" onClick={fechar}>Fechar caixa</button>
        </>
      ) : (
        <>
          <div className="cash-summary closed-summary">
            <strong>Caixa fechado</strong>
            <span>Abra o caixa para iniciar vendas.</span>
          </div>
          <label>
            Operador
            <input value={operador} onChange={(event) => setOperador(event.target.value)} />
          </label>
          <label>
            Valor abertura
            <input value={valor} onChange={(event) => setValor(event.target.value)} />
          </label>
          <button onClick={abrir}>Abrir caixa</button>
        </>
      )}
    </div>
  );
}
