import { useContext, useState } from "react";
import { api } from "../../api.js";
import { AppContext } from "../../context/AppContext.jsx";
import { useSweetAlert } from "../../context/SweetAlertContext.jsx";
import logoPdvColor from "../../assets/logo_pdv_cor.png";

export function LoginOperador({ config, onLogin }) {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  async function submit(event) {
    event.preventDefault();
    showLoading("Validando operador...");
    try {
      const operador = await api.loginOperador({ email, senha });
      onLogin(operador);
    } catch (error) {
      showAlert({
        title: "Acesso negado",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  return (
    <div className="setup-shell">
      <form className="login-card" onSubmit={submit}>
        <img src={logoPdvColor} alt="V12 PDV" />
        <h1>Entrar no caixa</h1>
        <p>
          {config?.tenant_nome || "Filial configurada"} • {config?.terminal_nome || "Caixa 01"}
        </p>
        <label>
          E-mail do operador
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Senha local
          <input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} />
        </label>
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}
