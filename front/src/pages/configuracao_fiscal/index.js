import React, { useContext } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import AsyncSearchSelect from "components/asyncSearchSelect";
import { AppContext } from "context";
import { useConfiguracaoFiscalPage } from "./use";
import * as C from "./style";

const requiredTitle = "Este campo e obrigatorio.";

export const ConfiguracaoFiscal = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const {
    loading,
    saving,
    tenant,
    form,
    selectedEmitente,
    pendenciasEmitente,
    emitenteEndereco,
    certificadoResumo,
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
          <C.Intro>
            <C.IntroTitle>Configuracao fiscal da filial</C.IntroTitle>
            <C.IntroText>
              A filial continua enxuta: o emitente principal vem de uma pessoa juridica e
              apenas os parametros fiscais e o certificado A1 ficam nesta configuracao.
              Isso prepara a base para NF-e modelo 55 sem inflar o cadastro do tenant.
            </C.IntroText>
          </C.Intro>

          {loading ? (
            <C.LoadingCard>Carregando configuracao fiscal...</C.LoadingCard>
          ) : (
            <C.Layout>
              <C.Form onSubmit={handleSubmit}>
                <C.Card>
                  <C.CardHeader>
                    <C.CardTitle>Emitente principal da filial</C.CardTitle>
                    <C.CardText>
                      A filial <strong>{tenant?.tenant_nome || "--"}</strong> aponta para uma
                      pessoa juridica que concentra CNPJ, IE e endereco fiscal.
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
                      searchPlaceholder="Pesquisar por razao social, fantasia ou CNPJ"
                      emptyMessage="Nenhuma pessoa juridica encontrada."
                      minChars={0}
                      getOptionMeta={(option) => option?.meta || ""}
                    />
                  </C.Field>

                  <C.InfoGrid>
                    <C.InfoCard>
                      <C.InfoLabel>Razao social</C.InfoLabel>
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
                      <C.InfoLabel>Inscricao estadual</C.InfoLabel>
                      <C.InfoValue>
                        {selectedEmitente?.raw?.pessoa_inscricao_estadual || "--"}
                      </C.InfoValue>
                    </C.InfoCard>
                    <C.InfoCard>
                      <C.InfoLabel>Email fiscal</C.InfoLabel>
                      <C.InfoValue>{selectedEmitente?.raw?.pessoa_email || "--"}</C.InfoValue>
                    </C.InfoCard>
                    <C.InfoCard>
                      <C.InfoLabel>Endereco principal</C.InfoLabel>
                      <C.InfoValue>{emitenteEndereco}</C.InfoValue>
                    </C.InfoCard>
                  </C.InfoGrid>
                </C.Card>

                <C.Card>
                  <C.CardHeader>
                    <C.CardTitle>Parametros da NF-e</C.CardTitle>
                    <C.CardText>
                      Estes dados definem o ambiente, numeracao e comportamento padrao da
                      emissao modelo 55 desta filial.
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
                        <option value="1">1 - Producao</option>
                        <option value="2">2 - Homologacao</option>
                      </C.Select>
                    </C.Field>

                    <C.Field>
                      <C.FieldSpan>
                        CRT
                        <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                      </C.FieldSpan>
                      <C.Select value={form.crt} onChange={(event) => updateField("crt", event.target.value)}>
                        <option value="1">1 - Simples nacional</option>
                        <option value="2">2 - Simples excesso sublimite</option>
                        <option value="3">3 - Regime normal</option>
                      </C.Select>
                    </C.Field>

                    <C.Field>
                      <C.FieldSpan>
                        Serie padrao
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
                        Proximo numero NF-e
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
                        placeholder="Apenas numeros"
                      />
                    </C.Field>

                    <C.Field>
                      <C.FieldSpan>
                        Natureza de operacao padrao
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
                    <C.FieldSpan>Observacao padrao</C.FieldSpan>
                    <C.Textarea
                      value={form.observacao}
                      onChange={(event) => updateField("observacao", event.target.value)}
                      placeholder="Observacoes operacionais para a emissao fiscal da filial"
                    />
                  </C.Field>

                  <C.ToggleRow>
                    <C.Checkbox
                      type="checkbox"
                      checked={form.nfe_habilitada}
                      onChange={(event) => updateField("nfe_habilitada", event.target.checked)}
                    />
                    <span>Habilitar emissao de NF-e nesta filial</span>
                  </C.ToggleRow>
                </C.Card>

                <C.Card>
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
                        placeholder="Obrigatoria ao importar um novo A1"
                      />
                    </C.Field>
                  </C.FieldsGrid>
                </C.Card>

                <C.ActionRow>
                  <C.PrimaryButton type="submit" disabled={saving}>
                    {saving ? "Salvando configuracao..." : "Salvar configuracao fiscal"}
                  </C.PrimaryButton>
                </C.ActionRow>
              </C.Form>

              <C.Aside>
                <C.StatusCard>
                  <C.CardHeader>
                    <C.CardTitle>Prontidao da emitente</C.CardTitle>
                    <C.CardText>
                      Antes de emitir NF-e, a pessoa vinculada a filial precisa atender os
                      dados minimos fiscais e de endereco.
                    </C.CardText>
                  </C.CardHeader>

                  <C.StatusBadge $ok={emitenteOk}>
                    {emitenteOk ? "Emitente pronta para NF-e" : "Pendencias para corrigir"}
                  </C.StatusBadge>

                  <C.Checklist>
                    {emitenteOk ? (
                      <li>CNPJ, IE e endereco principal estao preenchidos.</li>
                    ) : (
                      pendenciasEmitente.map((item) => <li key={item}>{item}</li>)
                    )}
                  </C.Checklist>
                </C.StatusCard>

                <C.Card>
                  <C.CardHeader>
                    <C.CardTitle>Modelo adotado</C.CardTitle>
                    <C.CardText>
                      `tenant` fica leve. A pessoa concentra os dados cadastrais da filial
                      e esta pagina guarda apenas o que realmente e configuracao fiscal.
                    </C.CardText>
                  </C.CardHeader>
                </C.Card>
              </C.Aside>
            </C.Layout>
          )}
        </C.Body>
      </C.Content>
    </C.Shell>
  );
};
