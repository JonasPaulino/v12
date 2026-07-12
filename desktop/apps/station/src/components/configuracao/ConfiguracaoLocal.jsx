import { useContext, useEffect, useMemo, useState } from "react";
import { FiPrinter, FiRefreshCcw, FiSave } from "react-icons/fi";
import { api } from "../../api.js";
import { AppContext } from "../../context/AppContext.jsx";
import { useSweetAlert } from "../../context/SweetAlertContext.jsx";

const DEFAULT_PRINTER_CONFIG = {
  enabled: false,
  deviceName: "",
  layout: "thermal-80",
  paperWidth: 80,
  silent: false,
  copies: 1,
};

export function ConfiguracaoLocal() {
  const [form, setForm] = useState(DEFAULT_PRINTER_CONFIG);
  const [printers, setPrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [electronAvailable, setElectronAvailable] = useState(false);
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();

  const selectedPrinter = useMemo(
    () => printers.find((printer) => printer.name === form.deviceName) || null,
    [form.deviceName, printers],
  );
  const printerStatusMessage = useMemo(() => {
    if (!electronAvailable) {
      return "Lista de impressoras disponível somente no app Electron. Se o PDV já está no Electron, feche e abra novamente para recarregar o preload.";
    }

    if (loadingPrinters) {
      return "Atualizando lista de impressoras...";
    }

    if (!printers.length) {
      return "O Electron não retornou nenhuma impressora do Windows. Reinicie o app Electron por completo e tente atualizar a lista novamente.";
    }

    return `${printers.length} impressora(s) encontrada(s) no terminal.`;
  }, [electronAvailable, loadingPrinters, printers.length]);

  useEffect(() => {
    setElectronAvailable(Boolean(window.v12Desktop?.listPrinters));
    loadPrinterConfig();
    if (window.v12Desktop?.listPrinters) {
      loadPrinters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPrinterConfig() {
    try {
      const data = await api.obterConfiguracaoImpressora();
      setForm({
        ...DEFAULT_PRINTER_CONFIG,
        ...data,
      });
    } catch (error) {
      showAlert({
        title: "Falha ao carregar configuração",
        text: error.message,
        icon: "error",
      });
    }
  }

  async function loadPrinters() {
    try {
      setLoadingPrinters(true);
      const data = await window.v12Desktop.listPrinters();
      setPrinters(Array.isArray(data) ? data : []);
    } catch (error) {
      showAlert({
        title: "Falha ao listar impressoras",
        text: error.message,
        icon: "error",
      });
    } finally {
      setLoadingPrinters(false);
    }
  }

  async function saveConfig() {
    try {
      showLoading("Salvando impressora...");
      const data = await api.salvarConfiguracaoImpressora({
        ...form,
        paperWidth:
          form.layout === "thermal-58" ? 58 : form.layout === "thermal-80" ? 80 : 210,
      });
      setForm({
        ...DEFAULT_PRINTER_CONFIG,
        ...data,
      });
      showAlert({
        title: "Configuração salva",
        text: "A impressora local foi atualizada com sucesso.",
        icon: "success",
      });
    } catch (error) {
      showAlert({
        title: "Falha ao salvar",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  async function testPrint() {
    if (!window.v12Desktop?.printBudget) {
      showAlert({
        title: "Electron indisponível",
        text: "O teste de impressão funciona somente no app Electron.",
        icon: "info",
      });
      return;
    }

    try {
      showLoading("Enviando teste para impressora...");
      await window.v12Desktop.printBudget(
        {
          items: [
            {
              descricao: "ITEM TESTE IMPRESSAO",
              quantidade: 2,
              valor_unitario: 12.5,
            },
          ],
          subtotal: 25,
          desconto: 0,
          total: 25,
          cliente: "CLIENTE TESTE",
          operador: "OPERADOR TESTE",
          data: new Date().toLocaleString("pt-BR"),
        },
        form,
      );
      showAlert({
        title: "Teste enviado",
        text: "Verifique a impressora configurada.",
        icon: "success",
      });
    } catch (error) {
      showAlert({
        title: "Falha no teste",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  return (
    <div className="local-settings-module">
      <div className="local-settings-head">
        <div>
          <strong>Impressora local</strong>
          <span>Configure a impressora padrão do terminal para orçamento e futuras reimpressões.</span>
        </div>
      </div>

      {!electronAvailable ? (
        <div className="local-settings-warning">
          <strong>Modo navegador detectado</strong>
          <span>
            Este módulo foi aberto sem a API do Electron. A listagem de impressoras e o teste de
            impressão só funcionam quando o PDV é executado pelo app Electron, não pela aba do Vite no navegador.
          </span>
        </div>
      ) : null}

      <div className="local-settings-grid">
        <label className="local-toggle-card">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
          />
          <div>
            <strong>Usar impressora configurada</strong>
            <span>Quando ativo, o orçamento tentará sair direto na impressora definida abaixo.</span>
          </div>
        </label>

        <label>
          Formato
          <select
            value={form.layout}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                layout: event.target.value,
                paperWidth:
                  event.target.value === "thermal-58"
                    ? 58
                    : event.target.value === "thermal-80"
                      ? 80
                      : 210,
              }))
            }
          >
            <option value="thermal-80">Cupom térmico 80mm</option>
            <option value="thermal-58">Cupom térmico 58mm</option>
            <option value="a4">Folha A4</option>
          </select>
        </label>

        <label>
          Impressora
          <select
            value={form.deviceName}
            onChange={(event) => setForm((current) => ({ ...current, deviceName: event.target.value }))}
            disabled={!electronAvailable || loadingPrinters}
          >
            <option value="">Selecionar impressora</option>
            {printers.map((printer) => (
              <option key={printer.name} value={printer.name}>
                {printer.displayName || printer.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Cópias
          <input
            type="number"
            min="1"
            max="10"
            value={form.copies}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                copies: Math.max(1, Math.min(10, Number(event.target.value) || 1)),
              }))
            }
          />
        </label>

        <label className="local-toggle-card compact">
          <input
            type="checkbox"
            checked={form.silent}
            onChange={(event) => setForm((current) => ({ ...current, silent: event.target.checked }))}
          />
          <div>
            <strong>Impressão silenciosa</strong>
            <span>Pula o diálogo do sistema quando a impressora estiver configurada.</span>
          </div>
        </label>

        <div className="local-printer-status">
          <small>Impressora selecionada</small>
          <strong>{selectedPrinter?.displayName || form.deviceName || "Nenhuma impressora definida"}</strong>
          <span>{printerStatusMessage}</span>
        </div>
      </div>

      <div className="local-settings-actions">
        <button type="button" className="secondary-action" onClick={loadPrinters} disabled={!electronAvailable || loadingPrinters}>
          <FiRefreshCcw />
          Atualizar impressoras
        </button>
        <button type="button" className="secondary-action" onClick={testPrint}>
          <FiPrinter />
          Testar impressão
        </button>
        <button type="button" onClick={saveConfig}>
          <FiSave />
          Salvar configuração
        </button>
      </div>
    </div>
  );
}
