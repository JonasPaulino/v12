import React, { useContext } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import { useTenantSetupPage } from "./use";
import * as C from "./style";

const Wizard = ({
  REQUIRED_TITLE,
  step,
  saving,
  form,
  preview,
  certificateSummary,
  updateField,
  handleSelectCertificado,
  handleConfirmCertificate,
  goNextStep,
  goPreviousStep,
  handleSubmit,
}) => (
  <>
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
          Anexe o certificado A1 da empresa e informe a senha para consultar os
          dados do CNPJ e pré-preencher a nova filial.
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
        </C.FieldsGrid>

        <C.SummaryGrid $columns={2}>
          <C.SummaryCard>
            <C.SummaryLabel>Arquivo</C.SummaryLabel>
            <C.SummaryValue>{certificateSummary.nome_arquivo}</C.SummaryValue>
          </C.SummaryCard>
          <C.SummaryCard>
            <C.SummaryLabel>Tamanho</C.SummaryLabel>
            <C.SummaryValue>{certificateSummary.tamanho}</C.SummaryValue>
          </C.SummaryCard>
        </C.SummaryGrid>

        {preview ? (
          <C.SummaryGrid $columns={3}>
            <C.SummaryCard>
              <C.SummaryLabel>CNPJ do certificado</C.SummaryLabel>
              <C.SummaryValue>{preview.certificado?.cnpj || "--"}</C.SummaryValue>
            </C.SummaryCard>
            <C.SummaryCard>
              <C.SummaryLabel>Nome no certificado</C.SummaryLabel>
              <C.SummaryValue>{preview.certificado?.common_name || "--"}</C.SummaryValue>
            </C.SummaryCard>
            <C.SummaryCard>
              <C.SummaryLabel>Subject</C.SummaryLabel>
              <C.SummaryValue>{preview.certificado?.subject || "--"}</C.SummaryValue>
            </C.SummaryCard>
          </C.SummaryGrid>
        ) : null}

        {preview?.empresa ? (
          <C.SummaryGrid $columns={3}>
            <C.SummaryCard>
              <C.SummaryLabel>Razão social</C.SummaryLabel>
              <C.SummaryValue>{preview.empresa.nome_razao || "--"}</C.SummaryValue>
            </C.SummaryCard>
            <C.SummaryCard>
              <C.SummaryLabel>Nome fantasia</C.SummaryLabel>
              <C.SummaryValue>{preview.empresa.nome_fantasia || "--"}</C.SummaryValue>
            </C.SummaryCard>
            <C.SummaryCard>
              <C.SummaryLabel>Situação</C.SummaryLabel>
              <C.SummaryValue>{preview.empresa.situacao_cadastro || "--"}</C.SummaryValue>
            </C.SummaryCard>
          </C.SummaryGrid>
        ) : null}

        {preview?.consulta_ie?.empresa ? (
          <C.SummaryGrid $columns={3}>
            <C.SummaryCard>
              <C.SummaryLabel>IE consultada</C.SummaryLabel>
              <C.SummaryValue>{preview.consulta_ie.empresa.inscricao_estadual || "--"}</C.SummaryValue>
            </C.SummaryCard>
            <C.SummaryCard>
              <C.SummaryLabel>UF da IE</C.SummaryLabel>
              <C.SummaryValue>{preview.consulta_ie.empresa.uf || "--"}</C.SummaryValue>
            </C.SummaryCard>
            <C.SummaryCard>
              <C.SummaryLabel>Status IE</C.SummaryLabel>
              <C.SummaryValue>{preview.consulta_ie.empresa.situacao_cadastro || "--"}</C.SummaryValue>
            </C.SummaryCard>
          </C.SummaryGrid>
        ) : null}

        <C.Actions>
          <C.PrimaryButton type="button" onClick={handleConfirmCertificate}>
            Confirmar certificado
          </C.PrimaryButton>
        </C.Actions>
      </C.Section>
    ) : null}

    {step === 2 ? (
      <C.Section>
        <C.Hint>
          Confira os dados preenchidos pela BrasilAPI e ajuste apenas o que for
          necessário antes do cadastro definitivo.
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
              onChange={(event) => updateField("inscricao_estadual", event.target.value)}
              placeholder="Número da IE ou ISENTO"
            />
          </C.Field>
          <C.Field>
            <C.FieldSpan>Inscrição municipal</C.FieldSpan>
            <C.Input
              value={form.inscricao_municipal}
              onChange={(event) => updateField("inscricao_municipal", event.target.value)}
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
            <C.Input
              value={form.uf}
              onChange={(event) => updateField("uf", event.target.value.toUpperCase())}
            />
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
              onChange={(event) => updateField("usuario_confirm_password", event.target.value)}
            />
          </C.Field>
        </C.FieldsGrid>
      </C.Section>
    ) : null}

    <C.Toolbar>
      <C.Hint>
        O certificado fica vinculado à filial e os dados principais são preenchidos
        automaticamente pela consulta do CNPJ.
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
  </>
);

export const TenantSetup = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const {
    REQUIRED_TITLE,
    loadingTenants,
    isModalOpen,
    step,
    saving,
    form,
    preview,
    certificateSummary,
    tenants,
    totalTenants,
    page,
    totalPages,
    search,
    setSearch,
    setPage,
    openModal,
    closeModal,
    updateField,
    handleSelectCertificado,
    handleConfirmCertificate,
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
          <C.PageGrid>
            <C.ListCard>
              <C.ListHeader>
                <C.ListHeaderText>
                  <C.ListKicker>Empresas</C.ListKicker>
                  <C.CardTitle>Filiais cadastradas</C.CardTitle>
                  <C.CardText>
                    Consulte as empresas já cadastradas e abra o modal para registrar uma
                    nova filial com os dados do certificado.
                  </C.CardText>
                </C.ListHeaderText>

                <C.PrimaryButton type="button" onClick={openModal}>
                  Cadastrar nova empresa
                </C.PrimaryButton>
              </C.ListHeader>

              <C.SearchRow>
                <C.SearchInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar por nome, CNPJ, slug ou perfil"
                />
                <C.CountText>
                  {loadingTenants
                    ? "Carregando empresas..."
                    : `${totalTenants} empresa(s) encontrada(s)`}
                </C.CountText>
              </C.SearchRow>

              {loadingTenants ? (
                <C.LoadingCard>Carregando empresas cadastradas...</C.LoadingCard>
              ) : tenants.length ? (
                <C.TenantGrid>
                  {tenants.map((tenant) => (
                    <C.TenantItem key={tenant.tenant_id}>
                      <div>
                        <C.TenantItemTitle>{tenant.tenant_nome}</C.TenantItemTitle>
                        <C.TenantMeta>
                          <span>CNPJ: {tenant.tenant_documento || "--"}</span>
                          <span>Slug: {tenant.tenant_slug || "--"}</span>
                        </C.TenantMeta>
                      </div>
                      <C.TenantMeta>
                        <span>Perfil: {tenant.perfil || "--"}</span>
                        <span>Status: {tenant.ativo ? "Ativa" : "Inativa"}</span>
                      </C.TenantMeta>
                    </C.TenantItem>
                  ))}
                </C.TenantGrid>
              ) : (
                <C.EmptyState>
                  <C.EmptyTitle>Nenhuma empresa encontrada</C.EmptyTitle>
                  <C.EmptyText>
                    Use o botão de cadastro para criar a primeira filial do sistema.
                  </C.EmptyText>
                </C.EmptyState>
              )}

              <C.Pagination>
                <C.CountText>
                  Página {page} de {totalPages}
                </C.CountText>
                <C.PaginationActions>
                  <C.PageButton type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}>
                    Anterior
                  </C.PageButton>
                  <C.PageButton
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    Próxima
                  </C.PageButton>
                </C.PaginationActions>
              </C.Pagination>
            </C.ListCard>
          </C.PageGrid>
        </C.Body>
      </C.Content>

      {isModalOpen ? (
        <C.ModalOverlay role="dialog" aria-modal="true" aria-label="Cadastro de empresa">
          <C.ModalPanel>
            <C.ModalHeader>
              <C.ModalTitle>
                <C.ListKicker>Cadastro</C.ListKicker>
                <C.ModalTitleText>Cadastrar empresa</C.ModalTitleText>
                <C.CardText>
                  Este fluxo cria uma nova filial do sistema, lê o certificado A1,
                  consulta os dados do CNPJ pela BrasilAPI e tenta buscar a IE na SEFAZ.
                </C.CardText>
              </C.ModalTitle>

              <C.ModalCloseButton type="button" onClick={closeModal} title="Fechar modal">
                ×
              </C.ModalCloseButton>
            </C.ModalHeader>

            <Wizard
              REQUIRED_TITLE={REQUIRED_TITLE}
              step={step}
              saving={saving}
              form={form}
              preview={preview}
              certificateSummary={certificateSummary}
              updateField={updateField}
              handleSelectCertificado={handleSelectCertificado}
              handleConfirmCertificate={handleConfirmCertificate}
              goNextStep={goNextStep}
              goPreviousStep={goPreviousStep}
              handleSubmit={handleSubmit}
            />
          </C.ModalPanel>
        </C.ModalOverlay>
      ) : null}
    </C.Shell>
  );
};
