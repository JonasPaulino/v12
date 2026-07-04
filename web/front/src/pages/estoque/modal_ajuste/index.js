import React from "react";
import AsyncSearchSelect from "components/asyncSearchSelect";
import { useModalAjusteEstoque } from "./use";
import * as C from "./style";

export const ModalAjusteEstoque = ({ isOpen, produtoInicial, onClose }) => {
  const {
    form,
    updateField,
    submitting,
    produtoRef,
    selectedProduto,
    handleSelectProduto,
    loadProdutosOptions,
    handleSubmit,
  } = useModalAjusteEstoque({
    isOpen,
    produtoInicial,
    onClose,
  });

  const renderRequiredLabel = (label) => (
    <C.FieldSpan>
      {label}
      <C.RequiredMark title="Este campo é obrigatório." aria-label="Campo obrigatório">
        *
      </C.RequiredMark>
    </C.FieldSpan>
  );

  if (!isOpen) return null;

  return (
    <C.Overlay>
      <C.Modal>
        <C.Header>
          <div>
            <C.Title>Ajuste manual de estoque</C.Title>
            <C.Subtitle>Registre correções com histórico para auditoria do saldo.</C.Subtitle>
          </div>
          <C.CloseButton type="button" onClick={() => onClose(false)} disabled={submitting}>
            ×
          </C.CloseButton>
        </C.Header>

        <C.Form onSubmit={handleSubmit} noValidate>
          <C.Body>
            <C.Grid>
              <C.FieldFull>
                {renderRequiredLabel("Produto")}
                <AsyncSearchSelect
                  inputRef={produtoRef}
                  value={form.produto_id}
                  selectedOption={selectedProduto}
                  onSelect={handleSelectProduto}
                  loadOptions={loadProdutosOptions}
                  placeholder="Selecione um produto"
                  searchPlaceholder="Digite código ou descrição"
                  emptyMessage="Nenhum produto com controle de estoque encontrado."
                  minChars={0}
                  getOptionValue={(option) => option.produto_id}
                  getOptionLabel={(option) => `${option.codigo_interno} - ${option.descricao}`}
                  getOptionMeta={(option) => option.unidade_sigla || "Sem unidade"}
                />
              </C.FieldFull>

              <C.Field>
                {renderRequiredLabel("Tipo de ajuste")}
                <C.Select
                  value={form.tipo_ajuste}
                  onChange={(event) => updateField("tipo_ajuste", event.target.value)}
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                  <option value="saldo">Definir saldo atual</option>
                </C.Select>
              </C.Field>

              <C.Field>
                {renderRequiredLabel(
                  form.tipo_ajuste === "saldo" ? "Novo saldo" : "Quantidade"
                )}
                <C.Input
                  value={form.quantidade}
                  onChange={(event) => updateField("quantidade", event.target.value)}
                  placeholder="0,0000"
                />
              </C.Field>

              <C.FieldFull>
                <C.FieldSpan>Observação</C.FieldSpan>
                <C.Textarea
                  value={form.observacao}
                  onChange={(event) => updateField("observacao", event.target.value)}
                  placeholder="Explique o motivo do ajuste"
                />
              </C.FieldFull>
            </C.Grid>

            <C.Hint>
              Entrada soma ao saldo, saída reduz o saldo e definir saldo atual corrige o saldo
              final do produto. Toda ação gera movimentação no histórico.
            </C.Hint>
          </C.Body>

          <C.Footer>
            <C.SecondaryButton type="button" onClick={() => onClose(false)} disabled={submitting}>
              Cancelar
            </C.SecondaryButton>
            <C.PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Registrando..." : "Registrar ajuste"}
            </C.PrimaryButton>
          </C.Footer>
        </C.Form>
      </C.Modal>
    </C.Overlay>
  );
};
