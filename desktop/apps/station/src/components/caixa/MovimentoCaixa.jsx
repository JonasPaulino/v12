import { useContext, useState } from "react";
import { api } from "../../api.js";
import { AppContext } from "../../context/AppContext.jsx";
import { useSweetAlert } from "../../context/SweetAlertContext.jsx";

const textByType = {
  sangria: {
    title: "Sangria de caixa",
    description: "Registre uma retirada de dinheiro da gaveta para cofre ou conferência.",
    button: "Registrar sangria",
  },
  suprimento: {
    title: "Suprimento de caixa",
    description: "Registre uma entrada de dinheiro usada para reforço de troco.",
    button: "Registrar suprimento",
  },
};

export function MovimentoCaixa({ tipo, operador, onDone }) {
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const content = textByType[tipo] || textByType.sangria;

  async function submit(event) {
    event.preventDefault();
    try {
      showLoading("Registrando movimento...");
      await api.movimentoCaixa({
        operador_id: operador?.operador_id,
        tipo,
        valor,
        motivo,
      });
      showAlert({ title: "Movimento registrado", text: content.title, icon: "success" });
      setValor("");
      setMotivo("");
      onDone?.();
    } catch (error) {
      showAlert({ title: "Falha no movimento", text: error.message, icon: "error" });
    } finally {
      hideLoading();
    }
  }

  return (
    <form className="cash-flow-module" onSubmit={submit}>
      <div className="cash-flow-head">
        <strong>{content.title}</strong>
        <span>{content.description}</span>
      </div>

      <label>
        Valor
        <input value={valor} onChange={(event) => setValor(event.target.value)} autoFocus />
      </label>

      <label>
        Motivo
        <input value={motivo} onChange={(event) => setMotivo(event.target.value)} />
      </label>

      <button type="submit">{content.button}</button>
    </form>
  );
}
