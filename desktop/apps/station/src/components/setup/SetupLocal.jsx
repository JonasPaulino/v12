import { useContext, useState } from "react";
import { api } from "../../api.js";
import { AppContext } from "../../context/AppContext.jsx";
import { useSweetAlert } from "../../context/SweetAlertContext.jsx";
import logoPdvColor from "../../assets/logo_pdv_cor.png";

export function SetupLocal({ onConfigured }) {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [form, setForm] = useState({
    tenant_erp_id: "1",
    tenant_nome: "",
    tenant_documento: "",
    terminal_codigo: "PDV-01",
    terminal_nome: "Caixa 01",
    operador_nome: "",
    operador_email: "",
    operador_senha: "",
  });

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  async function submit(event) {
    event.preventDefault();
    showLoading("Configurando PDV local...");
    try {
      const result = await api.setupLocal({
        filial: {
          tenant_erp_id: form.tenant_erp_id,
          tenant_nome: form.tenant_nome,
          tenant_documento: form.tenant_documento,
          terminal_codigo: form.terminal_codigo,
          terminal_nome: form.terminal_nome,
          tenant_ativo: true,
          tenant_acesso_bloqueado: false,
        },
        operador: {
          nome: form.operador_nome,
          email: form.operador_email,
          senha: form.operador_senha,
        },
      });

      showAlert({
        title: "PDV configurado",
        text: "Este terminal foi vinculado a uma filial local.",
        icon: "success",
      });
      onConfigured(result);
    } catch (error) {
      showAlert({
        title: "Falha no setup",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  return (
    <div className="setup-shell">
      <form className="setup-card" onSubmit={submit}>
        <img src={logoPdvColor} alt="V12 PDV" />
        <h1>Configurar terminal</h1>
        <p>
          Esta etapa simula o pareamento com o ERP web. Depois ela será substituída
          pelo login online e seleção da filial permitida.
        </p>

        <div className="setup-grid">
          <label>
            ID da filial no ERP
            <input value={form.tenant_erp_id} onChange={(event) => update("tenant_erp_id", event.target.value)} />
          </label>
          <label>
            Nome da filial
            <input value={form.tenant_nome} onChange={(event) => update("tenant_nome", event.target.value)} />
          </label>
          <label>
            Documento da filial
            <input value={form.tenant_documento} onChange={(event) => update("tenant_documento", event.target.value)} />
          </label>
          <label>
            Código do terminal
            <input value={form.terminal_codigo} onChange={(event) => update("terminal_codigo", event.target.value)} />
          </label>
          <label>
            Nome do terminal
            <input value={form.terminal_nome} onChange={(event) => update("terminal_nome", event.target.value)} />
          </label>
        </div>

        <h2>Primeiro operador local</h2>
        <div className="setup-grid">
          <label>
            Nome
            <input value={form.operador_nome} onChange={(event) => update("operador_nome", event.target.value)} />
          </label>
          <label>
            E-mail
            <input type="email" value={form.operador_email} onChange={(event) => update("operador_email", event.target.value)} />
          </label>
          <label>
            Senha local
            <input type="password" value={form.operador_senha} onChange={(event) => update("operador_senha", event.target.value)} />
          </label>
        </div>

        <button type="submit">Configurar PDV</button>
      </form>
    </div>
  );
}
