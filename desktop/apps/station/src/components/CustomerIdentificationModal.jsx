import { FiX } from "react-icons/fi";

export function CustomerIdentificationModal({
  open,
  clienteForm,
  onChange,
  onClose,
  onSave,
}) {
  if (!open) return null;

  return (
    <div className="customer-modal-backdrop" onClick={onClose}>
      <div className="customer-modal" onClick={(event) => event.stopPropagation()}>
        <div className="customer-modal-header">
          <div>
            <strong>Identificar cliente</strong>
            <p>Use CPF, CNPJ ou documento estrangeiro. O dado fica salvo na venda e ja prepara orcamento e NFC-e futura.</p>
          </div>
          <button type="button" className="customer-modal-close" onClick={onClose} aria-label="Fechar">
            <FiX />
          </button>
        </div>

        <div className="customer-modal-grid">
          <label>
            Tipo de documento
            <select
              value={clienteForm.tipoDocumento}
              onChange={(event) => onChange({ tipoDocumento: event.target.value })}
            >
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="ESTRANGEIRO">Estrangeiro</option>
            </select>
          </label>

          <label>
            Documento
            <input
              value={clienteForm.documento}
              onChange={(event) => onChange({ documento: event.target.value })}
              placeholder={
                clienteForm.tipoDocumento === "CPF"
                  ? "000.000.000-00"
                  : clienteForm.tipoDocumento === "CNPJ"
                    ? "00.000.000/0000-00"
                    : "Documento estrangeiro"
              }
            />
          </label>

          <label className="customer-modal-full">
            Nome
            <input
              value={clienteForm.nome}
              onChange={(event) => onChange({ nome: event.target.value })}
              placeholder="Nome do cliente ou razao social"
            />
          </label>

          <label className="customer-modal-full">
            Email
            <input
              value={clienteForm.email}
              onChange={(event) => onChange({ email: event.target.value })}
              placeholder="opcional"
            />
          </label>
        </div>

        <div className="customer-modal-actions">
          <button type="button" className="secondary-action" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" onClick={onSave}>
            Salvar identificacao
          </button>
        </div>
      </div>
    </div>
  );
}
