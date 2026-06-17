import React from "react";
import { useModalBaixa } from "./use";
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

const formatStatus = (value) => {
  if (!value) return "--";
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
};

const formatTituloStatus = (value) => {
  if (!value) return "--";
  if (value === "quitado") return "Quitado";
  if (value === "cancelado") return "Cancelado";
  if (value === "parcial") return "Parcial";
  if (value === "vencido") return "Vencido";
  return "Aberto";
};

export const ModalBaixa = ({ isOpen, tituloId, onClose }) => {
  const {
    loadingForm,
    submitting,
    activeTab,
    setActiveTab,
    supportData,
    detail,
    form,
    saldoSelecionado,
    parcelaSelecionada,
    parcelasDisponiveis,
    updateField,
    handleChangeParcela,
    handleSubmit,
    handleEstornar,
    hasChanges,
  } = useModalBaixa({
    isOpen,
    tituloId,
    onClose,
  });

  const tituloStatus = String(detail?.titulo?.status || "").toLowerCase();
  const saldoTitulo = Number(detail?.titulo?.saldo || 0);
  const tituloEncerrado = tituloStatus === "quitado" || tituloStatus === "cancelado";
  const possuiSaldoDisponivel = saldoTitulo > 0;
  const canRegister =
    !loadingForm &&
    !submitting &&
    !tituloEncerrado &&
    possuiSaldoDisponivel;

  const handlePrimaryAction = () => {
    if (activeTab === "dados") {
      setActiveTab("recebimentos");
      return;
    }

    handleSubmit();
  };

  if (!isOpen) return null;

  return (
    <C.Overlay>
      <C.Modal>
        <C.Header>
          <C.TitleBlock>
            <C.Title>
              {detail?.titulo?.tipo === "pagar" ? "Baixa de pagamento" : "Baixa de recebimento"}
            </C.Title>
            <C.Subtitle>
              Registre recebimentos ou pagamentos por parcela e mantenha o histórico de baixas
              do título.
            </C.Subtitle>
          </C.TitleBlock>

          <C.CloseButton type="button" onClick={() => onClose(hasChanges)} disabled={submitting}>
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
            $active={activeTab === "recebimentos"}
            onClick={() => setActiveTab("recebimentos")}
          >
            Recebimentos
          </C.TabButton>
        </C.Tabs>

        <C.Body>
          {loadingForm ? (
            <C.Hint>Carregando dados financeiros...</C.Hint>
          ) : (
            <>
              <C.SummaryGrid>
                <C.SummaryCard>
                  <C.SummaryLabel>Pessoa</C.SummaryLabel>
                  <C.SummaryValue>{detail?.titulo?.pessoa_nome_razao || "--"}</C.SummaryValue>
                </C.SummaryCard>
                <C.SummaryCard>
                  <C.SummaryLabel>Valor final</C.SummaryLabel>
                  <C.SummaryValue>
                    {currencyFormatter.format(Number(detail?.titulo?.valor_final || 0))}
                  </C.SummaryValue>
                </C.SummaryCard>
                <C.SummaryCard>
                  <C.SummaryLabel>Baixado</C.SummaryLabel>
                  <C.SummaryValue>
                    {currencyFormatter.format(Number(detail?.titulo?.valor_baixado || 0))}
                  </C.SummaryValue>
                </C.SummaryCard>
                <C.SummaryCard>
                  <C.SummaryLabel>Saldo</C.SummaryLabel>
                  <C.SummaryValue>
                    {currencyFormatter.format(Number(detail?.titulo?.saldo || 0))}
                  </C.SummaryValue>
                </C.SummaryCard>
              </C.SummaryGrid>

              <C.Form onSubmit={handleSubmit} noValidate>
                {activeTab === "dados" ? (
                  <>
                    <C.HighlightGrid>
                      <C.SummaryCard>
                        <C.SummaryLabel>Número do título</C.SummaryLabel>
                        <C.SummaryValue>
                          #{detail?.titulo?.financeiro_titulo_id || "--"}
                        </C.SummaryValue>
                      </C.SummaryCard>
                      <C.SummaryCard>
                        <C.SummaryLabel>Documento</C.SummaryLabel>
                        <C.SummaryValue>
                          {detail?.titulo?.numero_documento || "--"}
                        </C.SummaryValue>
                      </C.SummaryCard>
                      <C.SummaryCard>
                        <C.SummaryLabel>Status do título</C.SummaryLabel>
                        <C.StatusChip
                          $status={tituloStatus === "aberto" ? "aberta" : tituloStatus}
                        >
                          {formatTituloStatus(tituloStatus)}
                        </C.StatusChip>
                      </C.SummaryCard>
                      <C.SummaryCard>
                        <C.SummaryLabel>Vencimento</C.SummaryLabel>
                        <C.SummaryValue>
                          {formatDate(detail?.titulo?.data_vencimento)}
                        </C.SummaryValue>
                      </C.SummaryCard>
                    </C.HighlightGrid>

                    <C.SummaryCard>
                      <C.SummaryLabel>Condição de pagamento</C.SummaryLabel>
                      <C.SummaryValue>
                        {detail?.titulo?.condicao_pagamento_descricao || "--"}
                      </C.SummaryValue>
                    </C.SummaryCard>

                    <C.SummaryCard>
                      <C.SummaryLabel>Observação</C.SummaryLabel>
                      <C.SummaryText>
                        {form.observacao ||
                          detail?.titulo?.observacao ||
                          "Sem observações para este título."}
                      </C.SummaryText>
                    </C.SummaryCard>
                  </>
                ) : (
                  <>
                    <C.GridFour>
                      <C.Field>
                        <C.FieldSpan>Parcela</C.FieldSpan>
                        {parcelasDisponiveis.length <= 1 ? (
                          <C.Input
                            value={
                              parcelaSelecionada
                                ? `Parcela ${parcelaSelecionada.numero_parcela} - saldo ${currencyFormatter.format(
                                    Number(parcelaSelecionada.saldo || 0)
                                  )}`
                                : "Parcela única automática"
                            }
                            readOnly
                            disabled={tituloEncerrado}
                          />
                        ) : (
                          <C.Select
                            value={form.financeiro_titulo_parcela_id}
                            onChange={(event) => handleChangeParcela(event.target.value)}
                            disabled={tituloEncerrado}
                          >
                            <C.ParcelSelectOption value="">Selecione</C.ParcelSelectOption>
                            {(detail.parcelas || []).map((parcela) => (
                              <C.ParcelSelectOption
                                key={parcela.financeiro_titulo_parcela_id}
                                value={parcela.financeiro_titulo_parcela_id}
                                disabled={
                                  Number(parcela.saldo || 0) <= 0 || parcela.status === "cancelada"
                                }
                              >
                                {`Parcela ${parcela.numero_parcela} - saldo ${currencyFormatter.format(
                                  Number(parcela.saldo || 0)
                                )}`}
                              </C.ParcelSelectOption>
                            ))}
                          </C.Select>
                        )}
                      </C.Field>

                      <C.Field>
                        <C.FieldSpan>Forma de pagamento</C.FieldSpan>
                        <C.Select
                          value={form.financeiro_forma_pagamento_id}
                          onChange={(event) =>
                            updateField("financeiro_forma_pagamento_id", event.target.value)
                          }
                          disabled={tituloEncerrado}
                        >
                          <option value="">Selecione</option>
                          {(supportData.formasPagamento || []).map((forma) => (
                            <option
                              key={forma.financeiro_forma_pagamento_id}
                              value={forma.financeiro_forma_pagamento_id}
                            >
                              {forma.descricao}
                            </option>
                          ))}
                        </C.Select>
                      </C.Field>

                      <C.Field>
                        <C.FieldSpan>Data da baixa</C.FieldSpan>
                        <C.Input
                          type="date"
                          value={form.data_baixa}
                          onChange={(event) => updateField("data_baixa", event.target.value)}
                          disabled={tituloEncerrado}
                        />
                      </C.Field>

                      <C.Field>
                        <C.FieldSpan>Valor da baixa</C.FieldSpan>
                        <C.Input
                          value={form.valor_baixa}
                          onChange={(event) => updateField("valor_baixa", event.target.value)}
                          disabled={tituloEncerrado}
                        />
                      </C.Field>
                    </C.GridFour>

                    <C.HighlightGrid>
                      <C.SummaryCard>
                        <C.SummaryLabel>Parcela selecionada</C.SummaryLabel>
                        <C.SummaryValue>
                          {parcelaSelecionada?.numero_parcela ||
                            (possuiSaldoDisponivel ? "Única" : "--")}
                        </C.SummaryValue>
                      </C.SummaryCard>
                      <C.SummaryCard>
                        <C.SummaryLabel>Vencimento da parcela</C.SummaryLabel>
                        <C.SummaryValue>
                          {formatDate(
                            parcelaSelecionada?.data_vencimento || detail?.titulo?.data_vencimento
                          )}
                        </C.SummaryValue>
                      </C.SummaryCard>
                      <C.SummaryCard>
                        <C.SummaryLabel>Status da parcela</C.SummaryLabel>
                        <C.StatusChip
                          $status={
                            parcelaSelecionada?.status ||
                            (tituloStatus === "quitado"
                              ? "quitada"
                              : possuiSaldoDisponivel
                              ? "aberta"
                              : "cancelada")
                          }
                        >
                          {formatStatus(
                            parcelaSelecionada?.status ||
                              (tituloStatus === "quitado"
                                ? "quitada"
                                : possuiSaldoDisponivel
                                ? "aberta"
                                : "cancelada")
                          )}
                        </C.StatusChip>
                      </C.SummaryCard>
                      <C.SummaryCard>
                        <C.SummaryLabel>Saldo da parcela</C.SummaryLabel>
                        <C.EmphasisValue>
                          {currencyFormatter.format(
                            saldoSelecionado || (possuiSaldoDisponivel ? saldoTitulo : 0)
                          )}
                        </C.EmphasisValue>
                      </C.SummaryCard>
                    </C.HighlightGrid>

                    <C.SectionCard>
                      <C.SectionHeader>
                        <div>Movimento</div>
                        <div>Histórico</div>
                        <div>Valor</div>
                        <div>Ação</div>
                      </C.SectionHeader>

                      {(detail.baixas || []).length ? (
                        detail.baixas.map((baixa) => (
                          <C.SectionRow key={baixa.financeiro_titulo_baixa_id} $dimmed={!!baixa.excluido}>
                            <C.MovementBlock>
                              <C.MovementTitle>
                                {baixa.excluido ? "Baixa estornada" : "Baixa registrada"}
                              </C.MovementTitle>
                              <C.MovementMeta>
                                {baixa.numero_parcela
                                  ? `Parcela ${baixa.numero_parcela}`
                                  : "Parcela única"}
                              </C.MovementMeta>
                              <C.MovementMeta>
                                {formatDate(baixa.data_baixa || baixa.criado_em)}
                              </C.MovementMeta>
                            </C.MovementBlock>
                            <C.MovementBlock>
                              <C.MovementMeta>
                                {`Baixa feita por ${baixa.usuario_baixa_nome || "Usuário não identificado"} na forma ${baixa.forma_pagamento_descricao || "--"}.`}
                              </C.MovementMeta>
                              {baixa.observacao ? (
                                <C.MovementMeta>{baixa.observacao}</C.MovementMeta>
                              ) : null}
                              {baixa.excluido ? (
                                <C.MovementMeta>
                                  {`Estorno realizado por ${baixa.usuario_estorno_nome || "Usuário não identificado"} em ${formatDate(
                                    baixa.estornado_em
                                  )}.`}
                                </C.MovementMeta>
                              ) : null}
                            </C.MovementBlock>
                            <div>
                              <C.MovementAmount $dimmed={!!baixa.excluido}>
                                {currencyFormatter.format(Number(baixa.valor_baixa || 0))}
                              </C.MovementAmount>
                            </div>
                            <div>
                              {baixa.excluido ? (
                                <C.StatusChip $status="cancelada">Estornada</C.StatusChip>
                              ) : (
                                <C.ActionButton
                                  type="button"
                                  $danger
                                  disabled={submitting}
                                  onClick={() => handleEstornar(baixa.financeiro_titulo_baixa_id)}
                                >
                                  Estornar
                                </C.ActionButton>
                              )}
                            </div>
                          </C.SectionRow>
                        ))
                      ) : (
                        <C.Empty>Nenhuma baixa registrada para este título.</C.Empty>
                      )}
                    </C.SectionCard>
                  </>
                )}
              </C.Form>
            </>
          )}
        </C.Body>

        <C.Footer>
          <C.SecondaryButton
            type="button"
            onClick={() => onClose(hasChanges)}
            disabled={submitting}
          >
            Fechar
          </C.SecondaryButton>
          <C.PrimaryButton
            type="button"
            onClick={handlePrimaryAction}
            disabled={activeTab === "recebimentos" ? !canRegister : false}
            title={tituloStatus === "quitado" ? "Título quitado." : tituloStatus === "cancelado" ? "Título cancelado." : ""}
          >
            {activeTab === "dados"
              ? "Ir para recebimentos"
              : submitting
              ? "Salvando..."
              : detail?.titulo?.tipo === "pagar"
              ? "Registrar pagamento"
              : "Registrar recebimento"}
          </C.PrimaryButton>
        </C.Footer>
      </C.Modal>
    </C.Overlay>
  );
};
