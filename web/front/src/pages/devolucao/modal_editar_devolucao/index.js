import React from "react";
import Documento from "components/documento";
import { useModalEditarDevolucao } from "./use";
import * as C from "./style";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const mapTipoLabel = (tipo) =>
  tipo === "compra" ? "Devolução de compra" : "Devolução de venda";

export const ModalEditarDevolucao = ({ devolucaoId, isOpen, onClose }) => {
  const { form, devolucao, loading, submitting, updateField, handleSubmit } =
    useModalEditarDevolucao({
      devolucaoId,
      isOpen,
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
          <C.TitleBlock>
            <C.Title>Editar devolução</C.Title>
            <C.Subtitle>
              Ajuste apenas dados administrativos. Para alterar itens, cancele e registre outra
              devolução.
            </C.Subtitle>
          </C.TitleBlock>

          <C.CloseButton type="button" onClick={() => onClose(false)} disabled={submitting}>
            ×
          </C.CloseButton>
        </C.Header>

        <C.Form onSubmit={handleSubmit} noValidate>
          <C.Body>
            {devolucao && (
              <C.SummaryGrid>
                <C.SummaryCard>
                  <C.SummaryLabel>Tipo</C.SummaryLabel>
                  <C.SummaryValue>{mapTipoLabel(devolucao.tipo)}</C.SummaryValue>
                </C.SummaryCard>
                <C.SummaryCard>
                  <C.SummaryLabel>Total</C.SummaryLabel>
                  <C.SummaryValue>
                    {currencyFormatter.format(Number(devolucao.total || 0))}
                  </C.SummaryValue>
                </C.SummaryCard>
              </C.SummaryGrid>
            )}

            {devolucao && (
              <C.Hint>
                Pessoa: {devolucao.pessoa_nome_razao} ·{" "}
                <Documento value={devolucao.pessoa_cpf_cnpj} />
              </C.Hint>
            )}

            <C.Grid>
              <C.Field>
                {renderRequiredLabel("Data")}
                <C.Input
                  type="date"
                  value={form.data_devolucao}
                  onChange={(event) => updateField("data_devolucao", event.target.value)}
                  disabled={loading}
                />
              </C.Field>

              <C.Field>
                <C.FieldSpan>Motivo</C.FieldSpan>
                <C.Input
                  value={form.motivo}
                  onChange={(event) => updateField("motivo", event.target.value)}
                  disabled={loading}
                />
              </C.Field>
            </C.Grid>

            <C.Field>
              <C.FieldSpan>Observação</C.FieldSpan>
              <C.Textarea
                value={form.observacao}
                onChange={(event) => updateField("observacao", event.target.value)}
                disabled={loading}
              />
            </C.Field>
          </C.Body>

          <C.Footer>
            <C.SecondaryButton type="button" onClick={() => onClose(false)} disabled={submitting}>
              Cancelar
            </C.SecondaryButton>
            <C.PrimaryButton type="submit" disabled={submitting || loading}>
              {submitting ? "Salvando..." : "Salvar alterações"}
            </C.PrimaryButton>
          </C.Footer>
        </C.Form>
      </C.Modal>
    </C.Overlay>
  );
};
