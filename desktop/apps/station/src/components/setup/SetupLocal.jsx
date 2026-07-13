import { useContext, useMemo, useState } from "react";
import { api } from "../../api.js";
import { AppContext } from "../../context/AppContext.jsx";
import { useSweetAlert } from "../../context/SweetAlertContext.jsx";
import logoPdvColor from "../../assets/logo_pdv_cor.png";

export function SetupLocal({ onConfigured }) {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [login, setLogin] = useState({
    email: "",
    senha: "",
  });
  const [webUser, setWebUser] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [terminal, setTerminal] = useState({
    terminal_codigo: "PDV-01",
    terminal_nome: "Caixa 01",
  });

  const selectedTenant = useMemo(() => {
    return tenants.find((tenant) => String(tenant.tenant_id) === String(selectedTenantId)) || null;
  }, [selectedTenantId, tenants]);

  const updateLogin = (field, value) => {
    setLogin((current) => ({ ...current, [field]: value }));
  };

  const updateTerminal = (field, value) => {
    setTerminal((current) => ({ ...current, [field]: value }));
  };

  async function autenticarNoWeb(event) {
    event.preventDefault();
    showLoading("Validando acesso no ERP web...");
    try {
      const result = await api.loginWeb(login);
      const availableTenants = Array.isArray(result.tenants) ? result.tenants : [];
      setWebUser(result.user || null);
      setTenants(availableTenants);
      setSelectedTenantId(
        availableTenants.find((tenant) => tenant.tenant_usa_pdv === true)?.tenant_id ||
          availableTenants[0]?.tenant_id ||
          "",
      );

      if (!availableTenants.length) {
        showAlert({
          title: "Nenhuma filial disponível",
          text: "Este usuário não possui filiais ativas disponíveis no ERP web.",
          icon: "warning",
        });
      }
    } catch (error) {
      showAlert({
        title: "Falha no login web",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  async function configurarTerminal(event) {
    event.preventDefault();
    if (!selectedTenant) {
      showAlert({
        title: "Selecione uma filial",
        text: "Escolha a filial do ERP web que ficará vinculada a este terminal.",
        icon: "warning",
      });
      return;
    }

    if (selectedTenant.tenant_usa_pdv !== true) {
      showAlert({
        title: "Filial sem integração PDV",
        text: "Esta filial não está habilitada para uso do PDV no ERP web.",
        icon: "warning",
      });
      return;
    }

    showLoading("Pareando filial e sincronizando dados...");
    try {
      const result = await api.setupWeb({
        tenant: selectedTenant,
        terminal_codigo: terminal.terminal_codigo,
        terminal_nome: terminal.terminal_nome,
      });

      showAlert({
        title: "PDV configurado",
        text: `Filial pareada. ${result.usuarios?.imported || 0} operador(es) e ${
          result.produtos?.imported || 0
        } produto(s) sincronizados.`,
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
      <div className={`setup-card ${!webUser ? "setup-card-login" : ""}`}>
        <div className="setup-brand-row">
          <img src={logoPdvColor} alt="V12 PDV" />
          <span className="setup-badge">Setup inicial</span>
        </div>
        <h1>Conectar ao ERP web</h1>
        <p>
          Use seu acesso do ERP apenas para configurar este caixa. Depois da filial
          ser selecionada, o login será feito somente com os operadores sincronizados.
        </p>

        {!webUser ? (
          <form className="setup-form setup-login-form" onSubmit={autenticarNoWeb}>
            <div className="setup-grid">
              <label>
                E-mail do ERP
                <input
                  type="email"
                  value={login.email}
                  onChange={(event) => updateLogin("email", event.target.value)}
                  autoComplete="username"
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={login.senha}
                  onChange={(event) => updateLogin("senha", event.target.value)}
                  autoComplete="current-password"
                />
              </label>
            </div>

            <button type="submit">Entrar no ERP web</button>
          </form>
        ) : (
          <form className="setup-form" onSubmit={configurarTerminal}>
            <h2>Filial do terminal</h2>
            <p className="setup-note">Usuário validado: {webUser.usuario_nome}</p>

            <div className="setup-grid">
              <label>
                Filial
                <select
                  value={selectedTenantId}
                  onChange={(event) => setSelectedTenantId(event.target.value)}
                >
                  {tenants.map((tenant) => (
                    <option
                      key={tenant.tenant_id}
                      value={tenant.tenant_id}
                      disabled={tenant.tenant_usa_pdv !== true}
                    >
                      {tenant.tenant_nome} - {tenant.tenant_documento || "sem documento"}{tenant.tenant_usa_pdv ? "" : " (PDV inativo)"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Código do terminal
                <input
                  value={terminal.terminal_codigo}
                  onChange={(event) => updateTerminal("terminal_codigo", event.target.value)}
                />
              </label>
              <label>
                Nome do terminal
                <input
                  value={terminal.terminal_nome}
                  onChange={(event) => updateTerminal("terminal_nome", event.target.value)}
                />
              </label>
            </div>

            <div className="setup-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setWebUser(null);
                  setTenants([]);
                  setSelectedTenantId("");
                }}
              >
                Trocar login
              </button>
              <button type="submit">Parear e sincronizar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
