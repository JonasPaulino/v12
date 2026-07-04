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
    isBoletoSelected,
    isPixSelected,
    cobrancaVencida,
    boletoCharge,
    pixCharge,
    updateField,
    handleChangeParcela,
    handleSubmit,
    handleGenerateBoleto,
    handleGeneratePix,
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

    if (isPixSelected) {
      handleGeneratePix();
      return;
    }

    if (isBoletoSelected) {
      handleGenerateBoleto();
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

                    {detail?.titulo?.observacao ? (
                      <C.SummaryCard>
                        <C.SummaryLabel>Observação do título</C.SummaryLabel>
                        <C.SummaryText>{detail.titulo.observacao}</C.SummaryText>
                      </C.SummaryCard>
                    ) : null}

                    <C.Field>
                      <C.FieldSpan>Observação da movimentação</C.FieldSpan>
                      <C.Textarea
                        value={form.observacao}
                        onChange={(event) => updateField("observacao", event.target.value)}
                        placeholder="Opcional: detalhe desta baixa ou cobrança gerada."
                        disabled={tituloEncerrado}
                      />
                    </C.Field>
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

                    {isPixSelected ? (
                      <C.PixCard>
                        <C.PixHeader>
                          <div>
                            <C.SummaryLabel>QR Code PIX</C.SummaryLabel>
                            <C.SummaryText>
                              Gere a cobrança, apresente o QR Code ao cliente e aguarde o
                              webhook do Asaas para a baixa automática.
                            </C.SummaryText>
                          </div>
                          {pixCharge?.status ? (
                            <C.StatusChip $status="aberta">{pixCharge.status}</C.StatusChip>
                          ) : null}
                        </C.PixHeader>

                        {pixCharge?.pix?.encodedImage ? (
                          <C.PixGrid>
                            <C.QrPreview>
                              <C.QrImage
                                src={`data:image/png;base64,${pixCharge.pix.encodedImage}`}
                                alt="QR Code PIX"
                              />
                            </C.QrPreview>

                            <C.PixInfo>
                              <C.SummaryCard>
                                <C.SummaryLabel>Copia e cola</C.SummaryLabel>
                                <C.CodeBox readOnly value={pixCharge.pix.payload || "--"} />
                              </C.SummaryCard>
                              <C.SummaryGrid>
                                <C.SummaryCard>
                                  <C.SummaryLabel>Expiração</C.SummaryLabel>
                                  <C.SummaryValue>
                                    {formatDate(pixCharge.pix.expirationDate)}
                                  </C.SummaryValue>
                                </C.SummaryCard>
                                <C.SummaryCard>
                                  <C.SummaryLabel>Cobrança</C.SummaryLabel>
                                  <C.SummaryValue>
                                    #{pixCharge.externalChargeId || "--"}
                                  </C.SummaryValue>
                                </C.SummaryCard>
                              </C.SummaryGrid>
                            </C.PixInfo>
                          </C.PixGrid>
                        ) : (
                          <C.Hint>
                            Selecione a forma PIX e clique em gerar QR Code para iniciar a
                            cobrança no Asaas.
                          </C.Hint>
                        )}
                      </C.PixCard>
                    ) : null}

                    {isBoletoSelected ? (
                      <C.PixCard>
                        <C.PixHeader>
                          <div>
                            <C.SummaryLabel>Boleto Asaas</C.SummaryLabel>
                            <C.SummaryText>
                              Gere o boleto, entregue o PDF ao cliente e aguarde o webhook do
                              Asaas para a baixa automática após o pagamento.
                            </C.SummaryText>
                          </div>
                          {boletoCharge?.status ? (
                            <C.StatusChip $status="aberta">{boletoCharge.status}</C.StatusChip>
                          ) : null}
                        </C.PixHeader>

                        {boletoCharge?.boleto?.bankSlipUrl ? (
                          <C.PixInfo>
                            <C.SummaryGrid>
                              <C.SummaryCard>
                                <C.SummaryLabel>Boleto</C.SummaryLabel>
                                <C.SummaryValue>
                                  #{boletoCharge.externalChargeId || "--"}
                                </C.SummaryValue>
                              </C.SummaryCard>
                              <C.SummaryCard>
                                <C.SummaryLabel>Vencimento</C.SummaryLabel>
                                <C.SummaryValue>
                                  {formatDate(
                                    parcelaSelecionada?.data_vencimento ||
                                      detail?.titulo?.data_vencimento
                                  )}
                                </C.SummaryValue>
                              </C.SummaryCard>
                            </C.SummaryGrid>

                            {boletoCharge?.boleto?.identificationField ? (
                              <C.SummaryCard>
                                <C.SummaryLabel>Linha digitável</C.SummaryLabel>
                                <C.CodeBox
                                  readOnly
                                  value={boletoCharge.boleto.identificationField}
                                />
                              </C.SummaryCard>
                            ) : null}

                            <div>
                              <C.ActionLink
                                href={boletoCharge.boleto.bankSlipUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Baixar boleto
                              </C.ActionLink>
                            </div>
                          </C.PixInfo>
                        ) : (
                          <C.Hint>
                            Selecione a forma boleto e clique em gerar boleto para criar a
                            cobrança no Asaas.
                          </C.Hint>
                        )}
                      </C.PixCard>
                    ) : null}

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
              ? isPixSelected
                ? cobrancaVencida
                  ? "Atualizando PIX..."
                  : "Gerando PIX..."
                : isBoletoSelected
                ? cobrancaVencida
                  ? "Atualizando boleto..."
                  : "Gerando boleto..."
                : "Salvando..."
              : isPixSelected
              ? cobrancaVencida
                ? "Atualizar PIX"
                : "Gerar QR Code PIX"
              : isBoletoSelected
              ? cobrancaVencida
                ? "Atualizar boleto"
                : "Gerar boleto"
              : detail?.titulo?.tipo === "pagar"
              ? "Registrar pagamento"
              : "Registrar recebimento"}
          </C.PrimaryButton>
        </C.Footer>
      </C.Modal>
    </C.Overlay>
  );
};
