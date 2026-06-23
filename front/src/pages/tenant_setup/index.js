import React, { useContext } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import { useTenantSetupPage } from "./use";
import * as C from "./style";

export const TenantSetup = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const {
    REQUIRED_TITLE,
    step,
    loadingPreview,
    saving,
    form,
    preview,
    certificateSummary,
    updateField,
    handleSelectCertificado,
    handlePreviewCompany,
    goNextStep,
    goPreviousStep,
    handleSubmit,
  } = useTenantSetupPage();

  return (
    <C.Shell>
      <Sidebar />
      {mOpen && <C.Overlay onClick={abreFechaMenu} />}

      <C.Content>
        <Header />

        <C.Body>
          <C.Card>
            <C.CardHeader>
              <C.CardTitle>Cadastrar empresa</C.CardTitle>
              <C.CardText>
                Este fluxo cria uma nova filial do sistema, importa o certificado A1,
                reaproveita os dados do contribuinte e já entrega um usuário admin para
                a empresa começar a usar o ERP.
              </C.CardText>
            </C.CardHeader>

            <C.Steps>
              <C.StepButton type="button" $active={step === 1}>
                <C.StepNumber>1</C.StepNumber>
                Certificado
              </C.StepButton>
              <C.StepButton type="button" $active={step === 2}>
                <C.StepNumber>2</C.StepNumber>
                Dados da filial
              </C.StepButton>
              <C.StepButton type="button" $active={step === 3}>
                <C.StepNumber>3</C.StepNumber>
                Usuário admin
              </C.StepButton>
            </C.Steps>

            {step === 1 ? (
              <C.Section>
                <C.Hint>
                  A primeira etapa lê o certificado A1, extrai o CNPJ e consulta o
                  cadastro do contribuinte para pré-preencher a nova filial.
                </C.Hint>

                <C.FieldsGrid>
                  <C.FieldFull>
                    <C.FieldSpan>
                      Certificado A1
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input type="file" accept=".pfx,.p12" onChange={handleSelectCertificado} />
                  </C.FieldFull>

                  <C.Field>
                    <C.FieldSpan>
                      Senha do certificado
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input
                      type="password"
                      value={form.certificado_senha}
                      onChange={(event) => updateField("certificado_senha", event.target.value)}
                      placeholder="Informe a senha do .pfx"
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>
                      UF da consulta
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input
                      value={form.uf_consulta}
                      onChange={(event) => updateField("uf_consulta", event.target.value.toUpperCase())}
                      placeholder="Ex.: SP"
                      maxLength={2}
                    />
                  </C.Field>
                </C.FieldsGrid>

                <C.SummaryGrid>
                  <C.SummaryCard>
                    <C.SummaryLabel>Arquivo</C.SummaryLabel>
                    <C.SummaryValue>{certificateSummary.nome_arquivo}</C.SummaryValue>
                  </C.SummaryCard>
                  <C.SummaryCard>
                    <C.SummaryLabel>Tamanho</C.SummaryLabel>
                    <C.SummaryValue>{certificateSummary.tamanho}</C.SummaryValue>
                  </C.SummaryCard>
                  <C.SummaryCard>
                    <C.SummaryLabel>CNPJ encontrado</C.SummaryLabel>
                    <C.SummaryValue>{preview?.certificado?.cnpj || "--"}</C.SummaryValue>
                  </C.SummaryCard>
                </C.SummaryGrid>

                <C.Actions>
                  <C.PrimaryButton
                    type="button"
                    onClick={handlePreviewCompany}
                    disabled={loadingPreview}
                  >
                    {loadingPreview ? "Consultando..." : "Ler certificado e consultar"}
                  </C.PrimaryButton>
                </C.Actions>
              </C.Section>
            ) : null}

            {step === 2 ? (
              <C.Section>
                <C.Hint>
                  Revise os dados da nova filial. O que vier da consulta pode ser ajustado
                  antes do cadastro definitivo.
                </C.Hint>

                <C.FieldsGrid>
                  <C.Field>
                    <C.FieldSpan>
                      Nome da filial no sistema
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input
                      value={form.tenant_nome}
                      onChange={(event) => updateField("tenant_nome", event.target.value)}
                      placeholder="Ex.: Matriz ACME"
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>
                      CNPJ
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input value={form.cnpj} onChange={(event) => updateField("cnpj", event.target.value)} />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>
                      Razão social
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input
                      value={form.nome_razao}
                      onChange={(event) => updateField("nome_razao", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Nome fantasia</C.FieldSpan>
                    <C.Input
                      value={form.nome_fantasia}
                      onChange={(event) => updateField("nome_fantasia", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Inscrição estadual</C.FieldSpan>
                    <C.Input
                      value={form.inscricao_estadual}
                      onChange={(event) =>
                        updateField("inscricao_estadual", event.target.value)
                      }
                      placeholder="Número da IE ou ISENTO"
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Inscrição municipal</C.FieldSpan>
                    <C.Input
                      value={form.inscricao_municipal}
                      onChange={(event) =>
                        updateField("inscricao_municipal", event.target.value)
                      }
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>E-mail</C.FieldSpan>
                    <C.Input value={form.email} onChange={(event) => updateField("email", event.target.value)} />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Telefone</C.FieldSpan>
                    <C.Input
                      value={form.telefone}
                      onChange={(event) => updateField("telefone", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>
                      CEP
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input value={form.cep} onChange={(event) => updateField("cep", event.target.value)} />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>
                      Logradouro
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input
                      value={form.logradouro}
                      onChange={(event) => updateField("logradouro", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>
                      Número
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input value={form.numero} onChange={(event) => updateField("numero", event.target.value)} />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Complemento</C.FieldSpan>
                    <C.Input
                      value={form.complemento}
                      onChange={(event) => updateField("complemento", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>
                      Bairro
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input value={form.bairro} onChange={(event) => updateField("bairro", event.target.value)} />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>
                      Cidade
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input value={form.cidade} onChange={(event) => updateField("cidade", event.target.value)} />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>
                      UF
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input value={form.uf} onChange={(event) => updateField("uf", event.target.value.toUpperCase())} />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Código IBGE</C.FieldSpan>
                    <C.Input
                      value={form.codigo_ibge}
                      onChange={(event) => updateField("codigo_ibge", event.target.value)}
                    />
                  </C.Field>
                </C.FieldsGrid>
              </C.Section>
            ) : null}

            {step === 3 ? (
              <C.Section>
                <C.Hint>
                  Este usuário será o admin da nova empresa. O usuário master continua sendo
                  o único com acesso global ao cadastro de novas filiais.
                </C.Hint>

                <C.FieldsGrid>
                  <C.Field>
                    <C.FieldSpan>
                      Nome do usuário admin
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input
                      value={form.usuario_nome}
                      onChange={(event) => updateField("usuario_nome", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>
                      E-mail do usuário admin
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input
                      value={form.usuario_email}
                      onChange={(event) => updateField("usuario_email", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>
                      Login do usuário admin
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input
                      value={form.usuario_username}
                      onChange={(event) => updateField("usuario_username", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>
                      Senha
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input
                      type="password"
                      value={form.usuario_password}
                      onChange={(event) => updateField("usuario_password", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>
                      Confirmar senha
                      <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
                    </C.FieldSpan>
                    <C.Input
                      type="password"
                      value={form.usuario_confirm_password}
                      onChange={(event) =>
                        updateField("usuario_confirm_password", event.target.value)
                      }
                    />
                  </C.Field>
                </C.FieldsGrid>
              </C.Section>
            ) : null}

            <C.Toolbar>
              <C.Hint>
                {preview?.consulta_erro
                  ? `Consulta parcial: ${preview.consulta_erro}`
                  : preview?.empresa?.situacao_cadastro
                  ? `Situação do cadastro consultado: ${preview.empresa.situacao_cadastro}`
                  : "Use o certificado da empresa e a UF correta para pré-preencher os dados."}
              </C.Hint>

              <C.Actions>
                {step > 1 ? (
                  <C.GhostButton type="button" onClick={goPreviousStep}>
                    Voltar
                  </C.GhostButton>
                ) : null}
                {step < 3 ? (
                  <C.PrimaryButton type="button" onClick={goNextStep}>
                    Próxima etapa
                  </C.PrimaryButton>
                ) : (
                  <C.PrimaryButton type="button" onClick={handleSubmit} disabled={saving}>
                    {saving ? "Cadastrando..." : "Cadastrar empresa"}
                  </C.PrimaryButton>
                )}
              </C.Actions>
            </C.Toolbar>
          </C.Card>
        </C.Body>
      </C.Content>
    </C.Shell>
  );
};
