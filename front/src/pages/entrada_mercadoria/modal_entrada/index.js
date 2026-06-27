import React from "react";
import Documento from "components/documento";
import AsyncSearchSelect from "components/asyncSearchSelect";
import { useModalEntradaMercadoria } from "./use";
import * as C from "./style";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

const parseDecimal = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  let normalized = String(value).trim();
  const hasDot = normalized.includes(".");
  const hasComma = normalized.includes(",");
  if (hasDot && hasComma) {
    normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
  } else {
    normalized = normalized.replace(/,/g, ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const ModalEntradaMercadoria = ({ isOpen, onClose }) => {
  const {
    form,
    updateField,
    updateItemQuantidade,
    submitting,
    loadingPedido,
    selectedPedido,
    pedidoSelecionado,
    resumo,
    loadPedidosOptions,
    handleSelectPedido,
    handleSubmit,
  } = useModalEntradaMercadoria({
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
            <C.Title>Nova entrada de mercadoria</C.Title>
            <C.Subtitle>
              Confirme os itens recebidos para subir o estoque a partir do pedido de compra.
            </C.Subtitle>
          </C.TitleBlock>

          <C.CloseButton type="button" onClick={() => onClose(false)} disabled={submitting}>
            ×
          </C.CloseButton>
        </C.Header>

        <C.Form onSubmit={handleSubmit} noValidate>
          <C.Body>
            <C.Grid>
              <C.Field>
                {renderRequiredLabel("Pedido de compra")}
                <AsyncSearchSelect
                  value={form.pedido_compra_id}
                  selectedOption={selectedPedido}
                  onSelect={handleSelectPedido}
                  loadOptions={loadPedidosOptions}
                  placeholder="Selecione um pedido em aberto"
                  searchPlaceholder="Digite número, fornecedor ou documento"
                  emptyMessage="Nenhum pedido de compra em aberto encontrado."
                  minChars={0}
                  getOptionValue={(option) => option.pedido_compra_id}
                  getOptionLabel={(option) =>
                    `#${option.pedido_compra_id} - ${option.pessoa_nome_razao}`
                  }
                  getOptionMeta={(option) =>
                    `${option.pessoa_cpf_cnpj || "Sem documento"} · ${currencyFormatter.format(
                      Number(option.total || 0)
                    )}`
                  }
                />
              </C.Field>

              <C.Field>
                {renderRequiredLabel("Data de entrada")}
                <C.Input
                  type="date"
                  value={form.data_entrada}
                  onChange={(event) => updateField("data_entrada", event.target.value)}
                />
              </C.Field>
            </C.Grid>

            {pedidoSelecionado?.pedido && (
              <C.Hint>
                Fornecedor: {pedidoSelecionado.pedido.pessoa_nome_razao} ·{" "}
                <Documento value={pedidoSelecionado.pedido.pessoa_cpf_cnpj} />
              </C.Hint>
            )}

            <C.Field>
              <C.FieldSpan>Observação</C.FieldSpan>
              <C.Textarea
                value={form.observacao}
                onChange={(event) => updateField("observacao", event.target.value)}
              />
            </C.Field>

            <C.ItemsToolbar>
              <C.Hint>
                {loadingPedido
                  ? "Carregando itens do pedido..."
                  : "Revise as quantidades recebidas antes de registrar a entrada."}
              </C.Hint>
            </C.ItemsToolbar>

            <C.ItemsTable>
              <C.ItemsScroll>
                <C.ItemsGrid>
                  <C.ItemsHeader>
                    <div>Produto</div>
                    <div>Comprado</div>
                    <C.ItemsHeaderCell>
                      Recebido
                      <C.RequiredMark title="Este campo é obrigatório." aria-label="Campo obrigatório">
                        *
                      </C.RequiredMark>
                    </C.ItemsHeaderCell>
                    <div>Valor unit.</div>
                    <div>Total</div>
                  </C.ItemsHeader>

                  {form.items.length ? (
                    form.items.map((item, index) => {
                      const totalItem =
                        parseDecimal(item.quantidade) * Number(item.valor_unitario || 0);

                      return (
                        <C.ItemsRow key={item.pedido_compra_item_id}>
                          <C.InlineField>
                            <C.InlineLabel>Produto</C.InlineLabel>
                            <C.Input
                              value={`${item.codigo_interno} - ${item.descricao}`}
                              readOnly
                            />
                          </C.InlineField>

                          <C.InlineField>
                            <C.InlineLabel>Comprado</C.InlineLabel>
                            <C.Input
                              value={`${decimalFormatter.format(
                                Number(item.quantidade_comprada || 0)
                              )} ${item.unidade_sigla || ""}`}
                              readOnly
                            />
                          </C.InlineField>

                          <C.InlineField>
                            <C.InlineLabel>Recebido</C.InlineLabel>
                            <C.Input
                              value={item.quantidade}
                              onChange={(event) =>
                                updateItemQuantidade(index, event.target.value)
                              }
                            />
                          </C.InlineField>

                          <C.InlineField>
                            <C.InlineLabel>Valor unit.</C.InlineLabel>
                            <C.Input
                              value={currencyFormatter.format(Number(item.valor_unitario || 0))}
                              readOnly
                            />
                          </C.InlineField>

                          <C.InlineField>
                            <C.InlineLabel>Total</C.InlineLabel>
                            <C.Input value={currencyFormatter.format(totalItem)} readOnly />
                          </C.InlineField>
                        </C.ItemsRow>
                      );
                    })
                  ) : (
                    <C.ParcelaRow>
                      <div>--</div>
                      <div>Selecione um pedido para carregar os itens</div>
                      <div>--</div>
                      <div>--</div>
                    </C.ParcelaRow>
                  )}
                </C.ItemsGrid>
              </C.ItemsScroll>
            </C.ItemsTable>

            <C.SummaryGrid>
              <C.SummaryCard>
                <C.SummaryLabel>Itens</C.SummaryLabel>
                <C.SummaryValue>{resumo.totalItens}</C.SummaryValue>
              </C.SummaryCard>
              <C.SummaryCard>
                <C.SummaryLabel>Total da entrada</C.SummaryLabel>
                <C.SummaryValue>{currencyFormatter.format(resumo.total)}</C.SummaryValue>
              </C.SummaryCard>
            </C.SummaryGrid>
          </C.Body>

          <C.Footer>
            <C.SecondaryButton type="button" onClick={() => onClose(false)} disabled={submitting}>
              Cancelar
            </C.SecondaryButton>
            <C.PrimaryButton type="submit" disabled={submitting || loadingPedido}>
              {submitting ? "Registrando..." : "Registrar entrada"}
            </C.PrimaryButton>
          </C.Footer>
        </C.Form>
      </C.Modal>
    </C.Overlay>
  );
};
