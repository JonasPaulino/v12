import React from "react";
import AsyncSearchSelect from "components/asyncSearchSelect";
import { useModalCompra } from "./use";
import * as C from "./style";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const mapStatusParcelaTone = (status) => {
  if (status === "quitada") return "success";
  if (status === "vencida") return "danger";
  return "warning";
};

export const ModalCompra = ({ isOpen, compraId, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    loadingForm,
    submitting,
    supportData,
    form,
    updateField,
    handleChangeCondicaoPagamento,
    registerFieldRef,
    handleSelectFornecedor,
    updateItemField,
    handleSelectProduto,
    loadFornecedoresOptions,
    loadProdutosOptions,
    addItem,
    removeItem,
    itemsCalculated,
    resumo,
    parcelasPreview,
    handleSubmit,
    selectedFornecedor,
    getProdutoSelecionado,
  } = useModalCompra({
    isOpen,
    compraId,
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
            <C.Title>{compraId ? "Editar compra" : "Nova compra"}</C.Title>
            <C.Subtitle>
              O pedido de compra organiza fornecedor, itens e contas a pagar sem movimentar
              estoque antes da entrada.
            </C.Subtitle>
          </C.TitleBlock>

          <C.CloseButton type="button" onClick={() => onClose(false)} disabled={submitting}>
            ×
          </C.CloseButton>
        </C.Header>

        <C.Tabs>
          <C.TabButton
            type="button"
            $active={activeTab === "dados"}
            onClick={() => setActiveTab("dados")}
          >
            Dados
          </C.TabButton>
          <C.TabButton
            type="button"
            $active={activeTab === "itens"}
            onClick={() => setActiveTab("itens")}
          >
            Itens
          </C.TabButton>
          <C.TabButton
            type="button"
            $active={activeTab === "financeiro"}
            onClick={() => setActiveTab("financeiro")}
          >
            Financeiro
          </C.TabButton>
        </C.Tabs>

        <C.Form onSubmit={handleSubmit} noValidate>
          <C.Body>
            {loadingForm ? (
              <C.Hint>Carregando dados da compra...</C.Hint>
            ) : activeTab === "dados" ? (
              <>
                <C.Grid>
                  <C.Field>
                    {renderRequiredLabel("Fornecedor")}
                    <AsyncSearchSelect
                      inputRef={registerFieldRef("pessoa_id")}
                      value={form.pessoa_id}
                      selectedOption={selectedFornecedor}
                      onSelect={handleSelectFornecedor}
                      loadOptions={loadFornecedoresOptions}
                      placeholder="Selecione um fornecedor"
                      searchPlaceholder="Digite nome ou documento"
                      emptyMessage="Nenhum fornecedor encontrado."
                      minChars={0}
                      getOptionValue={(option) => option.pessoa_id}
                      getOptionLabel={(option) => option.pessoa_nome_razao}
                      getOptionMeta={(option) => option.pessoa_cpf_cnpj || "Sem documento"}
                    />
                  </C.Field>

                  <C.Field>
                    {renderRequiredLabel("Condição de pagamento")}
                    <C.Select
                      ref={registerFieldRef("financeiro_condicao_pagamento_id")}
                      value={form.financeiro_condicao_pagamento_id}
                      onChange={(event) => handleChangeCondicaoPagamento(event.target.value)}
                    >
                      <option value="">Selecione</option>
                      {supportData.condicoesPagamento.map((condicao) => (
                        <option
                          key={condicao.financeiro_condicao_pagamento_id}
                          value={condicao.financeiro_condicao_pagamento_id}
                        >
                          {condicao.descricao}
                        </option>
                      ))}
                    </C.Select>
                  </C.Field>
                </C.Grid>

                <C.GridThree>
                  <C.Field>
                    <C.FieldSpan>Status do pedido</C.FieldSpan>
                    <C.Select
                      value={form.status}
                      onChange={(event) => updateField("status", event.target.value)}
                    >
                      <option value="aberto">Aberto</option>
                      <option value="recebido">Recebido</option>
                    </C.Select>
                  </C.Field>

                  <C.Field>
                    {renderRequiredLabel("Data de emissão")}
                    <C.Input
                      ref={registerFieldRef("data_emissao")}
                      type="date"
                      value={form.data_emissao}
                      onChange={(event) => updateField("data_emissao", event.target.value)}
                    />
                  </C.Field>

                  <C.Field>
                    {renderRequiredLabel("Primeiro vencimento")}
                    <C.Input
                      ref={registerFieldRef("data_primeiro_vencimento")}
                      type="date"
                      value={form.data_primeiro_vencimento}
                      onChange={(event) =>
                        updateField("data_primeiro_vencimento", event.target.value)
                      }
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Previsão de entrega</C.FieldSpan>
                    <C.Input
                      type="date"
                      value={form.data_previsao}
                      onChange={(event) => updateField("data_previsao", event.target.value)}
                    />
                  </C.Field>
                </C.GridThree>

                <C.Grid>
                  <C.Field>
                    <C.FieldSpan>Desconto do pedido</C.FieldSpan>
                    <C.Input
                      value={form.desconto}
                      onChange={(event) => updateField("desconto", event.target.value)}
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Acréscimo do pedido</C.FieldSpan>
                    <C.Input
                      value={form.acrescimo}
                      onChange={(event) => updateField("acrescimo", event.target.value)}
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
              </>
            ) : activeTab === "itens" ? (
              <>
                <C.ItemsToolbar>
                  <C.Hint>
                    Os itens representam o que foi comprado. O estoque só será movimentado
                    na futura etapa de entrada/conferência.
                  </C.Hint>

                  <C.AddItemButton type="button" onClick={addItem}>
                    Adicionar item
                  </C.AddItemButton>
                </C.ItemsToolbar>

                <C.ItemsTable>
                  <C.ItemsScroll>
                    <C.ItemsGrid>
                      <C.ItemsHeader>
                        <C.ItemsHeaderCell>
                          Produto
                          <C.RequiredMark
                            title="Este campo é obrigatório."
                            aria-label="Campo obrigatório"
                          >
                            *
                          </C.RequiredMark>
                        </C.ItemsHeaderCell>
                        <C.ItemsHeaderCell>
                          Qtde
                          <C.RequiredMark
                            title="Este campo é obrigatório."
                            aria-label="Campo obrigatório"
                          >
                            *
                          </C.RequiredMark>
                        </C.ItemsHeaderCell>
                        <div>Valor unit.</div>
                        <div>Desconto</div>
                        <div>Acréscimo</div>
                        <div>Total</div>
                        <div>Ações</div>
                      </C.ItemsHeader>

                      {itemsCalculated.map((item, index) => (
                        <C.ItemsRow key={`item-${index}`}>
                          <C.InlineField>
                            <C.InlineLabel>
                              Produto
                              <C.RequiredMark
                                title="Este campo é obrigatório."
                                aria-label="Campo obrigatório"
                              >
                                *
                              </C.RequiredMark>
                            </C.InlineLabel>
                            <AsyncSearchSelect
                              inputRef={registerFieldRef(`item_produto_${index}`)}
                              value={item.produto_id}
                              selectedOption={getProdutoSelecionado(item.produto_id)}
                              onSelect={(value, produto) =>
                                handleSelectProduto(index, value, produto)
                              }
                              loadOptions={loadProdutosOptions}
                              placeholder="Selecione um produto"
                              searchPlaceholder="Digite código ou descrição"
                              emptyMessage="Nenhum produto encontrado."
                              minChars={0}
                              getOptionValue={(option) => option.produto_id}
                              getOptionLabel={(option) =>
                                `${option.codigo_interno} - ${option.descricao}`
                              }
                              getOptionMeta={(option) =>
                                `${option.unidade_sigla || "--"} · ${currencyFormatter.format(
                                  Number(option.preco_compra || 0)
                                )}`
                              }
                            />
                          </C.InlineField>

                          <C.InlineField>
                            <C.InlineLabel>
                              Qtde
                              <C.RequiredMark
                                title="Este campo é obrigatório."
                                aria-label="Campo obrigatório"
                              >
                                *
                              </C.RequiredMark>
                            </C.InlineLabel>
                            <C.Input
                              ref={registerFieldRef(`item_quantidade_${index}`)}
                              value={item.quantidade}
                              onChange={(event) =>
                                updateItemField(index, "quantidade", event.target.value)
                              }
                            />
                          </C.InlineField>

                          <C.InlineField>
                            <C.InlineLabel>Valor unit.</C.InlineLabel>
                            <C.Input
                              ref={registerFieldRef(`item_valor_unitario_${index}`)}
                              value={item.valor_unitario}
                              onChange={(event) =>
                                updateItemField(index, "valor_unitario", event.target.value)
                              }
                            />
                          </C.InlineField>

                          <C.InlineField>
                            <C.InlineLabel>Desconto</C.InlineLabel>
                            <C.Input
                              value={item.desconto}
                              onChange={(event) =>
                                updateItemField(index, "desconto", event.target.value)
                              }
                            />
                          </C.InlineField>

                          <C.InlineField>
                            <C.InlineLabel>Acréscimo</C.InlineLabel>
                            <C.Input
                              value={item.acrescimo}
                              onChange={(event) =>
                                updateItemField(index, "acrescimo", event.target.value)
                              }
                            />
                          </C.InlineField>

                          <C.InlineField>
                            <C.InlineLabel>Total</C.InlineLabel>
                            <C.Input value={currencyFormatter.format(item.total)} readOnly />
                          </C.InlineField>

                          <C.RemoveItemButton type="button" onClick={() => removeItem(index)}>
                            Remover
                          </C.RemoveItemButton>
                        </C.ItemsRow>
                      ))}
                    </C.ItemsGrid>
                  </C.ItemsScroll>
                </C.ItemsTable>
              </>
            ) : (
              <>
                <C.SummaryGrid>
                  <C.SummaryCard>
                    <C.SummaryLabel>Subtotal</C.SummaryLabel>
                    <C.SummaryValue>{currencyFormatter.format(resumo.subtotal)}</C.SummaryValue>
                  </C.SummaryCard>
                  <C.SummaryCard>
                    <C.SummaryLabel>Desconto</C.SummaryLabel>
                    <C.SummaryValue>{currencyFormatter.format(resumo.desconto)}</C.SummaryValue>
                  </C.SummaryCard>
                  <C.SummaryCard>
                    <C.SummaryLabel>Acréscimo</C.SummaryLabel>
                    <C.SummaryValue>{currencyFormatter.format(resumo.acrescimo)}</C.SummaryValue>
                  </C.SummaryCard>
                  <C.SummaryCard>
                    <C.SummaryLabel>Total a pagar</C.SummaryLabel>
                    <C.SummaryValue>{currencyFormatter.format(resumo.total)}</C.SummaryValue>
                  </C.SummaryCard>
                </C.SummaryGrid>

                <C.Hint>
                  O pedido de compra gera contas a pagar. A entrada da mercadoria e o estoque
                  serão tratados no módulo de entrada/conferência.
                </C.Hint>

                <C.ParcelasCard>
                  <C.ParcelasHeader>
                    <div>Parcela</div>
                    <div>Vencimento</div>
                    <div>Valor</div>
                    <div>Status</div>
                  </C.ParcelasHeader>

                  {parcelasPreview.length ? (
                    parcelasPreview.map((parcela) => (
                      <C.ParcelaRow key={parcela.numero_parcela}>
                        <div>{parcela.numero_parcela}</div>
                        <div>
                          {new Date(`${parcela.data_vencimento}T12:00:00`).toLocaleDateString(
                            "pt-BR"
                          )}
                        </div>
                        <div>{currencyFormatter.format(parcela.valor_parcela)}</div>
                        <div>
                          <C.StatusChip $tone={mapStatusParcelaTone(parcela.status)}>
                            {parcela.status}
                          </C.StatusChip>
                        </div>
                      </C.ParcelaRow>
                    ))
                  ) : (
                    <C.ParcelaRow>
                      <div>--</div>
                      <div>Selecione uma condição de pagamento</div>
                      <div>--</div>
                      <div>--</div>
                    </C.ParcelaRow>
                  )}
                </C.ParcelasCard>
              </>
            )}
          </C.Body>

          <C.Footer>
            <C.SecondaryButton type="button" onClick={() => onClose(false)} disabled={submitting}>
              Cancelar
            </C.SecondaryButton>
            <C.PrimaryButton type="submit" disabled={submitting}>
              {submitting
                ? "Salvando..."
                : compraId
                ? "Salvar alterações"
                : "Cadastrar compra"}
            </C.PrimaryButton>
          </C.Footer>
        </C.Form>
      </C.Modal>
    </C.Overlay>
  );
};
