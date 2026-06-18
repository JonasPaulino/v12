import React, { useContext, useState } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import AsyncSearchSelect from "components/asyncSearchSelect";
import { AppContext } from "context";
import { useConfiguracaoFiscalPage } from "./use";
import * as C from "./style";

const requiredTitle = "Este campo é obrigatório.";

export const ConfiguracaoFiscal = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState("emitente");
  const {
    loading,
    saving,
    tenant,
    form,
    selectedEmitente,
    pendenciasEmitente,
    emitenteEndereco,
    certificadoResumo,
    contasResumo,
    updateField,
    loadEmitenteOptions,
    handleSelectEmitente,
    handleSelectCertificado,
    handleSubmit,
  } = useConfiguracaoFiscalPage();

  const emitenteOk = !!selectedEmitente && pendenciasEmitente.length === 0;

  return (
    <C.Shell>
      <Sidebar />
      {mOpen && <C.Overlay onClick={abreFechaMenu} />}

      <C.Content>
        <Header />

        <C.Body>
          {/* <C.Intro>
            <C.IntroTitle>Configuracao fiscal da filial</C.IntroTitle>
            <C.IntroText>
              A filial continua enxuta: o emitente principal vem de uma pessoa juridica e
              apenas os parametros fiscais e o certificado A1 ficam nesta configuracao.
              Isso prepara a base para NF-e modelo 55 sem inflar o cadastro do tenant.
            </C.IntroText>
          </C.Intro> */}

          {loading ? (
            <C.LoadingCard>Carregando configurações da filial...</C.LoadingCard>
          ) : (
            <C.Layout>
              <C.Form onSubmit={handleSubmit}>
                <C.Card>
                  <C.CardHeader>
                    <C.CardTitle>Configurações da filial</C.CardTitle>
                    <C.CardText>
                      A filial <strong>{tenant?.tenant_nome || "--"}</strong> usa uma pessoa
                      emitente, parâmetros fiscais e uma conta de cobrança própria para
                      emissão e recebimento.
                    </C.CardText>
                  </C.CardHeader>

                  <C.Tabs>
                    <C.TabButton
                      type="button"
                      $active={activeTab === "emitente"}
                      onClick={() => setActiveTab("emitente")}
                    >
                      Emitente
                    </C.TabButton>
                    <C.TabButton
                      type="button"
                      $active={activeTab === "parametros"}
                      onClick={() => setActiveTab("parametros")}
                    >
                      Parâmetros
                    </C.TabButton>
                    <C.TabButton
                      type="button"
                      $active={activeTab === "certificado"}
                      onClick={() => setActiveTab("certificado")}
                    >
                      Certificado
                    </C.TabButton>
                    <C.TabButton
                      type="button"
                      $active={activeTab === "contas"}
                      onClick={() => setActiveTab("contas")}
                    >
                      Contas
                    </C.TabButton>
                  </C.Tabs>

                  {activeTab === "emitente" ? (
                    <C.SectionBody>
                      <C.CardHeader>
                        <C.CardTitle>Emitente principal da filial</C.CardTitle>
                        <C.CardText>
                          A filial aponta para uma pessoa jurídica que concentra CNPJ, IE ou
                          ISENTO, e endereço fiscal.
                        </C.CardText>
                      </C.CardHeader>

                      <C.Field>
                        <C.FieldSpan>
                          Pessoa emitente
                          <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                        </C.FieldSpan>
                        <AsyncSearchSelect
                          value={form.emitente_pessoa_id}
                          selectedOption={selectedEmitente}
                          onSelect={handleSelectEmitente}
                          loadOptions={loadEmitenteOptions}
                          placeholder="Selecione a pessoa emitente"
                          searchPlaceholder="Pesquisar por razão social, fantasia ou CNPJ"
                          emptyMessage="Nenhuma pessoa jurídica encontrada."
                          minChars={0}
                          getOptionMeta={(option) => option?.meta || ""}
                        />
                      </C.Field>

                      <C.InfoGrid>
                        <C.InfoCard>
                          <C.InfoLabel>Razão social</C.InfoLabel>
                          <C.InfoValue>
                            {selectedEmitente?.raw?.pessoa_nome_razao || "--"}
                          </C.InfoValue>
                        </C.InfoCard>
                        <C.InfoCard>
                          <C.InfoLabel>Nome fantasia</C.InfoLabel>
                          <C.InfoValue>
                            {selectedEmitente?.raw?.pessoa_nome_fantasia || "--"}
                          </C.InfoValue>
                        </C.InfoCard>
                        <C.InfoCard>
                          <C.InfoLabel>CNPJ</C.InfoLabel>
                          <C.InfoValue>
                            {selectedEmitente?.raw?.pessoa_cpf_cnpj || "--"}
                          </C.InfoValue>
                        </C.InfoCard>
                        <C.InfoCard>
                          <C.InfoLabel>Inscrição estadual</C.InfoLabel>
                          <C.InfoValue>
                            {selectedEmitente?.raw?.pessoa_inscricao_estadual || "--"}
                          </C.InfoValue>
                        </C.InfoCard>
                        <C.InfoCard>
                          <C.InfoLabel>Email fiscal</C.InfoLabel>
                          <C.InfoValue>{selectedEmitente?.raw?.pessoa_email || "--"}</C.InfoValue>
                        </C.InfoCard>
                        <C.InfoCard>
                          <C.InfoLabel>Endereço principal</C.InfoLabel>
                          <C.InfoValue>{emitenteEndereco}</C.InfoValue>
                        </C.InfoCard>
                      </C.InfoGrid>
                    </C.SectionBody>
                  ) : null}

                  {activeTab === "parametros" ? (
                    <C.SectionBody>
                      <C.CardHeader>
                        <C.CardTitle>Parâmetros da NF-e</C.CardTitle>
                        <C.CardText>
                          Estes dados definem o ambiente, numeração e comportamento padrão da
                          emissão modelo 55 desta filial.
                        </C.CardText>
                      </C.CardHeader>

                      <C.FieldsGrid>
                        <C.Field>
                          <C.FieldSpan>
                            Ambiente
                            <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                          </C.FieldSpan>
                          <C.Select
                            value={form.ambiente_nfe}
                            onChange={(event) => updateField("ambiente_nfe", event.target.value)}
                          >
                            <option value="1">1 - Produção</option>
                            <option value="2">2 - Homologação</option>
                          </C.Select>
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>
                            CRT
                            <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                          </C.FieldSpan>
                          <C.Select
                            value={form.crt}
                            onChange={(event) => updateField("crt", event.target.value)}
                          >
                            <option value="1">1 - Simples nacional</option>
                            <option value="2">2 - Simples excesso sublimite</option>
                            <option value="3">3 - Regime normal</option>
                          </C.Select>
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>
                            Série padrão
                            <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                          </C.FieldSpan>
                          <C.Input
                            value={form.serie_nfe_padrao}
                            onChange={(event) => updateField("serie_nfe_padrao", event.target.value)}
                            inputMode="numeric"
                            placeholder="1"
                          />
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>
                            Próximo número NF-e
                            <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                          </C.FieldSpan>
                          <C.Input
                            value={form.proximo_numero_nfe}
                            onChange={(event) =>
                              updateField("proximo_numero_nfe", event.target.value)
                            }
                            inputMode="numeric"
                            placeholder="1"
                          />
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>CNAE</C.FieldSpan>
                          <C.Input
                            value={form.cnae}
                            onChange={(event) => updateField("cnae", event.target.value)}
                            placeholder="Apenas números"
                          />
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>
                            Natureza de operação padrão
                            <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                          </C.FieldSpan>
                          <C.Input
                            value={form.natureza_operacao_padrao}
                            onChange={(event) =>
                              updateField("natureza_operacao_padrao", event.target.value)
                            }
                            placeholder="Ex.: Venda de mercadoria"
                          />
                        </C.Field>
                      </C.FieldsGrid>

                      <C.Field>
                        <C.FieldSpan>Observação padrão</C.FieldSpan>
                        <C.Textarea
                          value={form.observacao}
                          onChange={(event) => updateField("observacao", event.target.value)}
                          placeholder="Observações operacionais para a emissão fiscal da filial"
                        />
                      </C.Field>

                      <C.ToggleRow>
                        <C.Checkbox
                          type="checkbox"
                          checked={form.nfe_habilitada}
                          onChange={(event) => updateField("nfe_habilitada", event.target.checked)}
                        />
                        <span>Habilitar emissão de NF-e nesta filial</span>
                      </C.ToggleRow>
                    </C.SectionBody>
                  ) : null}

                  {activeTab === "certificado" ? (
                    <C.SectionBody>
                      <C.CardHeader>
                        <C.CardTitle>Certificado A1</C.CardTitle>
                        <C.CardText>
                          O arquivo A1 fica associado a filial ativa. Quando precisar trocar o
                          certificado, basta importar um novo `.pfx` ou `.p12`.
                        </C.CardText>
                      </C.CardHeader>

                      <C.CertificateBox>
                        <C.InfoLabel>Status atual</C.InfoLabel>
                        <C.InfoValue>{certificadoResumo.nome_arquivo}</C.InfoValue>
                        <C.CardText>
                          Tamanho: {certificadoResumo.tamanho} • Importado em:{" "}
                          {certificadoResumo.importadoEm}
                        </C.CardText>
                      </C.CertificateBox>

                      <C.FieldsGrid>
                        <C.Field>
                          <C.FieldSpan>Arquivo do certificado</C.FieldSpan>
                          <C.FileInput
                            type="file"
                            accept=".pfx,.p12"
                            onChange={handleSelectCertificado}
                          />
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>Senha do certificado</C.FieldSpan>
                          <C.Input
                            type="password"
                            value={form.certificado_senha}
                            onChange={(event) =>
                              updateField("certificado_senha", event.target.value)
                            }
                            placeholder="Obrigatória ao importar um novo A1"
                          />
                        </C.Field>
                      </C.FieldsGrid>
                    </C.SectionBody>
                  ) : null}

                  {activeTab === "contas" ? (
                    <C.SectionBody>
                      <C.CardHeader>
                        <C.CardTitle>Gateway de cobrança</C.CardTitle>
                        <C.CardText>
                          Esta aba concentra as credenciais e o comportamento da integração
                          financeira da filial. As chaves já gravadas nunca voltam abertas para
                          o navegador.
                        </C.CardText>
                      </C.CardHeader>

                      <C.FieldsGrid>
                        <C.Field>
                          <C.FieldSpan>Provider</C.FieldSpan>
                          <C.Select
                            value={form.gateway_provider}
                            onChange={(event) =>
                              updateField("gateway_provider", event.target.value)
                            }
                          >
                            <option value="asaas">Asaas</option>
                          </C.Select>
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>Ambiente</C.FieldSpan>
                          <C.Select
                            value={form.gateway_ambiente}
                            onChange={(event) =>
                              updateField("gateway_ambiente", event.target.value)
                            }
                          >
                            <option value="sandbox">Sandbox</option>
                            <option value="production">Produção</option>
                          </C.Select>
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>Wallet ID / carteira</C.FieldSpan>
                          <C.Input
                            value={form.gateway_wallet_id}
                            onChange={(event) =>
                              updateField("gateway_wallet_id", event.target.value)
                            }
                            placeholder="Opcional para a integração"
                          />
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>API key</C.FieldSpan>
                          <C.Input
                            type="password"
                            value={form.gateway_api_key}
                            onChange={(event) =>
                              updateField("gateway_api_key", event.target.value)
                            }
                            placeholder={
                              contasResumo.apiKeyMasked
                                ? `Atual: ${contasResumo.apiKeyMasked}`
                                : "Cole uma nova API key"
                            }
                          />
                          <C.FieldHint>
                            Deixe em branco para manter a chave já cadastrada.
                          </C.FieldHint>
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>Token do webhook</C.FieldSpan>
                          <C.Input
                            type="password"
                            value={form.gateway_webhook_auth_token}
                            onChange={(event) =>
                              updateField("gateway_webhook_auth_token", event.target.value)
                            }
                            placeholder={
                              contasResumo.webhookMasked
                                ? `Atual: ${contasResumo.webhookMasked}`
                                : "Cole um novo token forte"
                            }
                          />
                          <C.FieldHint>
                            Use um token exclusivo do webhook. O valor salvo também fica
                            mascarado.
                          </C.FieldHint>
                        </C.Field>
                      </C.FieldsGrid>

                      <C.ToggleList>
                        <C.ToggleRow>
                          <C.Checkbox
                            type="checkbox"
                            checked={form.gateway_ativo}
                            onChange={(event) =>
                              updateField("gateway_ativo", event.target.checked)
                            }
                          />
                          <span>Ativar integração de contas nesta filial</span>
                        </C.ToggleRow>

                        <C.ToggleRow>
                          <C.Checkbox
                            type="checkbox"
                            checked={form.gateway_auto_criar_cliente}
                            onChange={(event) =>
                              updateField("gateway_auto_criar_cliente", event.target.checked)
                            }
                          />
                          <span>Criar ou sincronizar o cliente automaticamente no gateway</span>
                        </C.ToggleRow>

                        <C.ToggleRow>
                          <C.Checkbox
                            type="checkbox"
                            checked={form.gateway_baixa_automatica_pix}
                            onChange={(event) =>
                              updateField("gateway_baixa_automatica_pix", event.target.checked)
                            }
                          />
                          <span>Baixar títulos automaticamente quando o PIX for recebido</span>
                        </C.ToggleRow>

                        <C.ToggleRow>
                          <C.Checkbox
                            type="checkbox"
                            checked={form.gateway_baixa_automatica_boleto}
                            onChange={(event) =>
                              updateField(
                                "gateway_baixa_automatica_boleto",
                                event.target.checked
                              )
                            }
                          />
                          <span>
                            Baixar títulos automaticamente quando o boleto for liquidado
                          </span>
                        </C.ToggleRow>
                      </C.ToggleList>

                      <C.Field>
                        <C.FieldSpan>Observação da integração</C.FieldSpan>
                        <C.Textarea
                          value={form.gateway_observacao}
                          onChange={(event) =>
                            updateField("gateway_observacao", event.target.value)
                          }
                          placeholder="Observações internas sobre a conta, carteira ou uso da integração"
                        />
                      </C.Field>
                    </C.SectionBody>
                  ) : null}
                </C.Card>

                <C.ActionRow>
                  <C.PrimaryButton type="submit" disabled={saving}>
                    {saving ? "Salvando configuração..." : "Salvar configurações"}
                  </C.PrimaryButton>
                </C.ActionRow>
              </C.Form>

              <C.Aside>
                <C.StatusCard>
                  <C.CardHeader>
                    <C.CardTitle>Prontidão da emitente</C.CardTitle>
                    <C.CardText>
                      Antes de emitir NF-e, a pessoa vinculada a filial precisa atender os
                      dados mínimos fiscais e de endereço.
                    </C.CardText>
                  </C.CardHeader>

                  <C.StatusBadge $ok={emitenteOk}>
                    {emitenteOk ? "Emitente pronta para NF-e" : "Pendências para corrigir"}
                  </C.StatusBadge>

                  <C.Checklist>
                    {emitenteOk ? (
                      <li>CNPJ, IE ou ISENTO, e endereço principal estão preenchidos.</li>
                    ) : (
                      pendenciasEmitente.map((item) => <li key={item}>{item}</li>)
                    )}
                  </C.Checklist>
                </C.StatusCard>

                {/* <C.Card>
                  <C.CardHeader>
                    <C.CardTitle>Modelo adotado</C.CardTitle>
                    <C.CardText>
                      `tenant` fica leve. A pessoa concentra os dados cadastrais da filial
                      e esta pagina guarda apenas o que realmente e configuracao fiscal.
                    </C.CardText>
                  </C.CardHeader>
                </C.Card> */}

                <C.Card>
                  <C.CardHeader>
                    <C.CardTitle>Integração de contas</C.CardTitle>
                    <C.CardText>
                      O gateway fica separado da emissão fiscal, mas usa a mesma filial ativa
                      e o mesmo padrão de segurança.
                    </C.CardText>
                  </C.CardHeader>

                  <C.InfoGrid>
                    <C.InfoCard>
                      <C.InfoLabel>Status</C.InfoLabel>
                      <C.InfoValue>
                        {contasResumo.gateway_ativo ? "Integração ativa" : "Integração inativa"}
                      </C.InfoValue>
                    </C.InfoCard>
                    <C.InfoCard>
                      <C.InfoLabel>Provider</C.InfoLabel>
                      <C.InfoValue>{contasResumo.provider}</C.InfoValue>
                    </C.InfoCard>
                    <C.InfoCard>
                      <C.InfoLabel>Ambiente</C.InfoLabel>
                      <C.InfoValue>
                        {contasResumo.ambiente === "production" ? "Produção" : "Sandbox"}
                      </C.InfoValue>
                    </C.InfoCard>
                    <C.InfoCard>
                      <C.InfoLabel>API key</C.InfoLabel>
                      <C.InfoValue>
                        {contasResumo.apiKeyConfigurada
                          ? contasResumo.apiKeyMasked
                          : "Não configurada"}
                      </C.InfoValue>
                    </C.InfoCard>
                    <C.InfoCard>
                      <C.InfoLabel>Webhook</C.InfoLabel>
                      <C.InfoValue>
                        {contasResumo.webhookConfigurado
                          ? contasResumo.webhookMasked
                          : "Não configurado"}
                      </C.InfoValue>
                    </C.InfoCard>
                  </C.InfoGrid>
                </C.Card>
              </C.Aside>
            </C.Layout>
          )}
        </C.Body>
      </C.Content>
    </C.Shell>
  );
};
