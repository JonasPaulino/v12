import React from "react";
import AsyncSearchSelect from "components/asyncSearchSelect";
import { useModalTitulo } from "./use";
import * as C from "./style";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
};

const mapStatusParcelaTone = (status) => {
  if (status === "vencida") return "danger";
  return "warning";
};

export const ModalTitulo = ({ isOpen, tituloId, initialTipo, onClose }) => {
  const {
    loadingForm,
    submitting,
    supportData,
    form,
    resumo,
    parcelasPreview,
    updateField,
    registerFieldRef,
    handleSelectPessoa,
    loadPessoasOptions,
    handleSubmit,
    tituloId: currentTituloId,
    selectedPessoa,
  } = useModalTitulo({
    isOpen,
    tituloId,
    initialTipo,
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
            <C.Title>{currentTituloId ? "Editar título manual" : "Novo título manual"}</C.Title>
            <C.Subtitle>
              Lance contas a pagar ou a receber sem pedido de venda, mantendo parcelas e
              vencimentos no financeiro.
            </C.Subtitle>
          </C.TitleBlock>

          <C.CloseButton type="button" onClick={() => onClose(false)} disabled={submitting}>
            ×
          </C.CloseButton>
        </C.Header>

        <C.Form onSubmit={handleSubmit} noValidate>
          <C.Body>
            {loadingForm ? (
              <C.Hint>Carregando dados do título...</C.Hint>
            ) : (
              <>
                <C.GridThree>
                  <C.Field>
                    {renderRequiredLabel("Tipo")}
                    <C.Select
                      value={form.tipo}
                      onChange={(event) => updateField("tipo", event.target.value)}
                    >
                      <option value="receber">Conta a receber</option>
                      <option value="pagar">Conta a pagar</option>
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
                    <C.FieldSpan>Número do documento</C.FieldSpan>
                    <C.Input
                      value={form.numero_documento}
                      onChange={(event) => updateField("numero_documento", event.target.value)}
                    />
                  </C.Field>
                </C.GridThree>

                <C.Grid>
                  <C.Field>
                    {renderRequiredLabel("Pessoa")}
                    <AsyncSearchSelect
                      inputRef={registerFieldRef("pessoa_id")}
                      value={form.pessoa_id}
                      selectedOption={selectedPessoa}
                      onSelect={handleSelectPessoa}
                      loadOptions={loadPessoasOptions}
                      placeholder="Selecione uma pessoa"
                      searchPlaceholder="Digite nome ou documento"
                      emptyMessage="Nenhuma pessoa encontrada."
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
                      onChange={(event) =>
                        updateField("financeiro_condicao_pagamento_id", event.target.value)
                      }
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

                <C.Field>
                  {renderRequiredLabel("Descrição")}
                  <C.Input
                    ref={registerFieldRef("descricao")}
                    value={form.descricao}
                    onChange={(event) => updateField("descricao", event.target.value)}
                  />
                </C.Field>

                <C.GridThree>
                  <C.Field>
                    {renderRequiredLabel("Valor original")}
                    <C.Input
                      ref={registerFieldRef("valor_original")}
                      value={form.valor_original}
                      onChange={(event) => updateField("valor_original", event.target.value)}
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Desconto</C.FieldSpan>
                    <C.Input
                      value={form.desconto}
                      onChange={(event) => updateField("desconto", event.target.value)}
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Acréscimo</C.FieldSpan>
                    <C.Input
                      value={form.acrescimo}
                      onChange={(event) => updateField("acrescimo", event.target.value)}
                    />
                  </C.Field>
                </C.GridThree>

                <C.Field>
                  <C.FieldSpan>Observação</C.FieldSpan>
                  <C.Textarea
                    value={form.observacao}
                    onChange={(event) => updateField("observacao", event.target.value)}
                  />
                </C.Field>

                <C.SummaryGrid>
                  <C.SummaryCard>
                    <C.SummaryLabel>Valor original</C.SummaryLabel>
                    <C.SummaryValue>
                      {currencyFormatter.format(resumo.valorOriginal || 0)}
                    </C.SummaryValue>
                  </C.SummaryCard>
                  <C.SummaryCard>
                    <C.SummaryLabel>Desconto</C.SummaryLabel>
                    <C.SummaryValue>{currencyFormatter.format(resumo.desconto || 0)}</C.SummaryValue>
                  </C.SummaryCard>
                  <C.SummaryCard>
                    <C.SummaryLabel>Acréscimo</C.SummaryLabel>
                    <C.SummaryValue>{currencyFormatter.format(resumo.acrescimo || 0)}</C.SummaryValue>
                  </C.SummaryCard>
                  <C.SummaryCard>
                    <C.SummaryLabel>Valor final</C.SummaryLabel>
                    <C.SummaryValue>{currencyFormatter.format(resumo.total || 0)}</C.SummaryValue>
                  </C.SummaryCard>
                </C.SummaryGrid>

                <C.Hint>
                  As parcelas abaixo são geradas automaticamente conforme a condição de
                  pagamento selecionada.
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
                        <div>{formatDate(parcela.data_vencimento)}</div>
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
                : currentTituloId
                ? "Salvar alterações"
                : "Cadastrar título"}
            </C.PrimaryButton>
          </C.Footer>
        </C.Form>
      </C.Modal>
    </C.Overlay>
  );
};
