import React from "react";
import Documento from "components/documento";
import AsyncSearchSelect from "components/asyncSearchSelect";
import { useModalDevolucao } from "./use";
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

export const ModalDevolucao = ({ isOpen, onClose }) => {
  const {
    form,
    selectedOrigem,
    origemSelecionada,
    loadingOrigem,
    submitting,
    resumo,
    updateField,
    updateItemQuantidade,
    loadOrigensOptions,
    handleSelectOrigem,
    handleSubmit,
  } = useModalDevolucao({
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

  const origemLabel = form.tipo === "compra" ? "Entrada de mercadoria" : "Pedido de venda";
  const origemHint =
    form.tipo === "compra"
      ? "A devolução de compra baixa o estoque e referencia uma entrada conferida."
      : "A devolução de venda sobe o estoque e referencia uma venda não cancelada.";

  return (
    <C.Overlay>
      <C.Modal>
        <C.Header>
          <C.TitleBlock>
            <C.Title>Nova devolução</C.Title>
            <C.Subtitle>
              Registre devoluções de venda ou compra com movimentação automática de estoque.
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
                {renderRequiredLabel("Tipo")}
                <C.Select
                  value={form.tipo}
                  onChange={(event) => updateField("tipo", event.target.value)}
                >
                  <option value="venda">Devolução de venda</option>
                  <option value="compra">Devolução de compra</option>
                </C.Select>
              </C.Field>

              <C.Field>
                {renderRequiredLabel("Data")}
                <C.Input
                  type="date"
                  value={form.data_devolucao}
                  onChange={(event) => updateField("data_devolucao", event.target.value)}
                />
              </C.Field>
            </C.Grid>

            <C.Field>
              {renderRequiredLabel(origemLabel)}
              <AsyncSearchSelect
                value={form.origem_id}
                selectedOption={selectedOrigem}
                onSelect={handleSelectOrigem}
                loadOptions={loadOrigensOptions}
                placeholder={`Selecione ${origemLabel.toLowerCase()}`}
                searchPlaceholder="Digite número, pessoa ou documento"
                emptyMessage="Nenhum documento disponível para devolução."
                minChars={0}
                getOptionValue={(option) => option.origem_id}
                getOptionLabel={(option) =>
                  form.tipo === "compra"
                    ? `Entrada #${option.entrada_mercadoria_id} - ${option.pessoa_nome_razao}`
                    : `Venda #${option.pedido_venda_id} - ${option.pessoa_nome_razao}`
                }
                getOptionMeta={(option) =>
                  `${option.pessoa_cpf_cnpj || "Sem documento"} · ${currencyFormatter.format(
                    Number(option.total || 0)
                  )}`
                }
              />
            </C.Field>

            <C.Hint>{origemHint}</C.Hint>

            {origemSelecionada?.origem && (
              <C.Hint>
                Pessoa: {origemSelecionada.origem.pessoa_nome_razao} ·{" "}
                <Documento value={origemSelecionada.origem.pessoa_cpf_cnpj} />
              </C.Hint>
            )}

            <C.Grid>
              <C.Field>
                <C.FieldSpan>Motivo</C.FieldSpan>
                <C.Input
                  value={form.motivo}
                  onChange={(event) => updateField("motivo", event.target.value)}
                  placeholder="Ex.: produto avariado, troca, cancelamento parcial"
                />
              </C.Field>
            </C.Grid>

            <C.Field>
              <C.FieldSpan>Observação</C.FieldSpan>
              <C.Textarea
                value={form.observacao}
                onChange={(event) => updateField("observacao", event.target.value)}
              />
            </C.Field>

            <C.ItemsToolbar>
              <C.Hint>
                {loadingOrigem
                  ? "Carregando itens..."
                  : "Informe a quantidade devolvida de cada item."}
              </C.Hint>
            </C.ItemsToolbar>

            <C.ItemsTable>
              <C.ItemsScroll>
                <C.ItemsGrid>
                  <C.ItemsHeader>
                    <div>Produto</div>
                    <div>Original</div>
                    <div>Já devolvido</div>
                    <div>Disponível</div>
                    <C.ItemsHeaderCell>
                      Devolver
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
                        <C.ItemsRow key={item.origem_item_id}>
                          <C.InlineField>
                            <C.InlineLabel>Produto</C.InlineLabel>
                            <C.Input
                              value={`${item.codigo_interno} - ${item.descricao}`}
                              readOnly
                            />
                          </C.InlineField>

                          <C.InlineField>
                            <C.InlineLabel>Original</C.InlineLabel>
                            <C.Input
                              value={`${decimalFormatter.format(Number(item.quantidade || 0))} ${
                                item.unidade_sigla || ""
                              }`}
                              readOnly
                            />
                          </C.InlineField>

                          <C.InlineField>
                            <C.InlineLabel>Já devolvido</C.InlineLabel>
                            <C.Input
                              value={`${decimalFormatter.format(
                                Number(item.quantidade_devolvida || 0)
                              )} ${item.unidade_sigla || ""}`}
                              readOnly
                            />
                          </C.InlineField>

                          <C.InlineField>
                            <C.InlineLabel>Disponível</C.InlineLabel>
                            <C.Input
                              value={`${decimalFormatter.format(
                                Number(item.quantidade_disponivel || 0)
                              )} ${item.unidade_sigla || ""}`}
                              readOnly
                            />
                          </C.InlineField>

                          <C.InlineField>
                            <C.InlineLabel>Devolver</C.InlineLabel>
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
                      <div>Selecione uma origem para carregar os itens disponíveis</div>
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
                <C.SummaryLabel>Total devolvido</C.SummaryLabel>
                <C.SummaryValue>{currencyFormatter.format(resumo.total)}</C.SummaryValue>
              </C.SummaryCard>
            </C.SummaryGrid>
          </C.Body>

          <C.Footer>
            <C.SecondaryButton type="button" onClick={() => onClose(false)} disabled={submitting}>
              Cancelar
            </C.SecondaryButton>
            <C.PrimaryButton type="submit" disabled={submitting || loadingOrigem}>
              {submitting ? "Registrando..." : "Registrar devolução"}
            </C.PrimaryButton>
          </C.Footer>
        </C.Form>
      </C.Modal>
    </C.Overlay>
  );
};
