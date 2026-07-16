import { useContext, useEffect, useState } from "react";
import { api } from "../../api.js";
import { AppContext } from "../../context/AppContext.jsx";
import { useSweetAlert } from "../../context/SweetAlertContext.jsx";

export function AberturaCaixa({ operador, onOpened }) {
  const [valor, setValor] = useState("0.00");
  const [observacao, setObservacao] = useState("");
  const [contextoAbertura, setContextoAbertura] = useState(null);
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();

  useEffect(() => {
    let active = true;

    async function carregarContexto() {
      if (!operador?.operador_id) {
        setContextoAbertura(null);
        return;
      }

      try {
        const data = await api.contextoAberturaCaixa(operador.operador_id);
        if (!active) return;
        setContextoAbertura(data);
      } catch {
        if (!active) return;
        setContextoAbertura(null);
      }
    }

    void carregarContexto();
    return () => {
      active = false;
    };
  }, [operador?.operador_id]);

  async function abrir(event) {
    event.preventDefault();
    try {
      showLoading("Abrindo caixa...");
      const caixa = await api.abrirCaixa({
        operador_id: operador?.operador_id,
        valor_abertura: valor,
        observacao,
      });
      showAlert({
        title: caixa?.reaberto ? "Caixa reaberto" : "Caixa aberto",
        text: caixa?.reaberto
          ? "O caixa do dia foi reaberto para ajustes e novas operações."
          : "Fundo de troco registrado.",
        icon: "success",
      });
      onOpened(caixa);
    } catch (error) {
      showAlert({ title: "Falha ao abrir caixa", text: error.message, icon: "error" });
    } finally {
      hideLoading();
    }
  }

  const reabertura = contextoAbertura?.modo === "reabertura";
  const dataOperacional = contextoAbertura?.caixa_do_dia_fechado?.data_operacional;
  const dataFormatada = dataOperacional
    ? new Date(`${dataOperacional}T00:00:00`).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");

  return (
    <form className="cash-flow-module" onSubmit={abrir}>
      <div className="cash-flow-head">
        <strong>{reabertura ? "Reabertura do caixa" : "Abertura do caixa"}</strong>
        <span>
          {reabertura
            ? `O caixa de ${dataFormatada} já foi fechado para este operador. Reabra o caixa para lançar ajustes, vendas ou movimentos pendentes.`
            : "Informe o fundo de troco existente na gaveta antes de iniciar vendas."}
        </span>
      </div>

      <div className="cash-flow-grid">
        <div className="cash-flow-info">
          <small>Operador</small>
          <strong>{operador?.nome || "Operador"}</strong>
        </div>
        <div className="cash-flow-info">
          <small>Data</small>
          <strong>{dataFormatada}</strong>
        </div>
      </div>

      <label>
        Saldo inicial / fundo de troco
        <input value={valor} onChange={(event) => setValor(event.target.value)} autoFocus />
      </label>

      <label>
        Observação
        <input value={observacao} onChange={(event) => setObservacao(event.target.value)} />
      </label>

      <button type="submit">{reabertura ? "Reabrir caixa" : "Abrir caixa"}</button>
    </form>
  );
}
