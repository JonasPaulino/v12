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
    <div>
      <h2>Caixa</h2>
      {caixa ? (
        <>
          <p className="status open">Aberto por {caixa.operador_nome}</p>
          <p>Valor abertura: R$ {Number(caixa.valor_abertura || 0).toFixed(2)}</p>
          <label>
            Valor fechamento
            <input value={valor} onChange={(event) => setValor(event.target.value)} />
          </label>
          <button className="danger" onClick={fechar}>Fechar caixa</button>
        </>
      ) : (
        <>
          <p className="status closed">Caixa fechado</p>
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
