import React, { useContext } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import Paginacao from "components/paginacao";
import { AppContext } from "context";
import { useTenantSetupPage } from "./use";
import * as C from "./style";

const Wizard = ({
  REQUIRED_TITLE,
  editingTenantId,
  step,
  saving,
  form,
  preview,
  certificateSummary,
  logoSummary,
  updateField,
  handleSelectCertificado,
  handleSelectLogo,
  handleConfirmCertificate,
  goNextStep,
  goPreviousStep,
  handleSubmit,
}) => (
  <>
    {editingTenantId ? (
      <C.ListKicker>Editar filial</C.ListKicker>
    ) : null}
    <C.Steps>
      <C.StepButton type="button" $active={step === 1}>
        <C.StepNumber>1</C.StepNumber>
        Certificado
      </C.StepButton>
      <C.StepButton type="button" $active={step === 2}>
        <C.StepNumber>2</C.StepNumber>
        Dados da filial
      </C.StepButton>
      {editingTenantId ? null : (
        <C.StepButton type="button" $active={step === 3}>
          <C.StepNumber>3</C.StepNumber>
          Usuário admin
        </C.StepButton>
      )}
      {editingTenantId ? null : (
        <C.StepButton type="button" $active={step === 4}>
          <C.StepNumber>4</C.StepNumber>
          Financeiro V12
        </C.StepButton>
      )}
    </C.Steps>

    {step === 1 ? (
      <C.Section>
        <C.Hint>
          {editingTenantId
            ? "O certificado atual fica salvo para emissão de NF-e. Se precisar trocar, selecione um novo arquivo e informe a senha."
            : "Anexe o certificado A1 da empresa e informe a senha para consultar os dados do CNPJ e pré-preencher a nova filial."}
        </C.Hint>

        <C.FieldsGrid>
          <C.FieldFull>
            <C.FieldSpan>
              Certificado A1
              <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
            </C.FieldSpan>
            <C.UploadControl htmlFor="tenant-certificate-file">
              <C.UploadText>
                {certificateSummary.persisted
                  ? `Certificado salvo: ${certificateSummary.nome_arquivo}`
                  : certificateSummary.nome_arquivo || "Selecionar certificado .pfx ou .p12"}
              </C.UploadText>
              <C.UploadAction>
                {certificateSummary.persisted ? "Substituir arquivo" : "Procurar arquivo"}
              </C.UploadAction>
            </C.UploadControl>
            <C.FileInput
              id="tenant-certificate-file"
              type="file"
              accept=".pfx,.p12"
              onChange={handleSelectCertificado}
            />
          </C.FieldFull>

          <C.PasswordActionRow>
            <C.Field>
              <C.FieldSpan>
                Senha do certificado
                <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
              </C.FieldSpan>
              <C.Input
                type="password"
                value={form.certificado_senha}
                onChange={(event) => updateField("certificado_senha", event.target.value)}
                placeholder={
                  certificateSummary.persisted
                    ? "Informe somente se for substituir o certificado"
                    : "Informe a senha do .pfx"
                }
              />
            </C.Field>

            <C.PrimaryButton type="button" onClick={handleConfirmCertificate}>
              {certificateSummary.persisted ? "Validar novo certificado" : "Confirmar certificado"}
            </C.PrimaryButton>
          </C.PasswordActionRow>
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
          {certificateSummary.persisted ? (
            <C.SummaryCard>
              <C.SummaryLabel>Validade salva</C.SummaryLabel>
              <C.SummaryValue>{certificateSummary.validade}</C.SummaryValue>
            </C.SummaryCard>
          ) : null}
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
          <C.FieldFull>
            <C.FieldSpan>Logo da filial para DANFE e relatórios</C.FieldSpan>
            <C.UploadControl htmlFor="tenant-logo-file">
              <C.UploadText>
                {logoSummary.persisted
                  ? `Logo salva: ${logoSummary.nome_arquivo}`
                  : logoSummary.nome_arquivo}
              </C.UploadText>
              <C.UploadAction>
                {logoSummary.persisted ? "Substituir logo" : "Procurar logo"}
              </C.UploadAction>
            </C.UploadControl>
            <C.FileInput
              id="tenant-logo-file"
              type="file"
              accept="image/*"
              onChange={handleSelectLogo}
            />
            <C.Hint>
              Use PNG, JPG ou WEBP. Recomendado: logo horizontal, fundo transparente
              ou branco, proporção aproximada 3:1 e mínimo de 600x200 px. O sistema
              compacta a imagem antes de salvar.
            </C.Hint>
          </C.FieldFull>
        </C.FieldsGrid>
        <C.SummaryGrid $columns={2}>
          <C.SummaryCard>
            <C.SummaryLabel>Logo</C.SummaryLabel>
            <C.SummaryValue>{logoSummary.nome_arquivo}</C.SummaryValue>
          </C.SummaryCard>
          <C.SummaryCard>
            <C.SummaryLabel>Tamanho salvo/envio</C.SummaryLabel>
            <C.SummaryValue>{logoSummary.tamanho}</C.SummaryValue>
          </C.SummaryCard>
        </C.SummaryGrid>
      </C.Section>
    ) : null}

    {!editingTenantId && step === 3 ? (
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

    {!editingTenantId && step === 4 ? (
      <C.Section>
        <C.Hint>
          Configure o contrato de uso do V12 para esta empresa. Estas parcelas
          pertencem à gestão interna do V12 e não entram no financeiro operacional
          da filial.
        </C.Hint>

        <C.FieldsGrid>
          <C.Field>
            <C.FieldSpan>Plano</C.FieldSpan>
            <C.Input
              value={form.financeiro_plano_nome}
              onChange={(event) => updateField("financeiro_plano_nome", event.target.value)}
              placeholder="V12 ERP"
            />
          </C.Field>
          <C.Field>
            <C.FieldSpan>
              Valor mensal
              <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
            </C.FieldSpan>
            <C.Input
              type="number"
              min="0"
              step="0.01"
              value={form.financeiro_valor_mensal}
              onChange={(event) => updateField("financeiro_valor_mensal", event.target.value)}
              placeholder="0,00"
            />
          </C.Field>
          <C.Field>
            <C.FieldSpan>Tipo de contrato</C.FieldSpan>
            <C.Select
              value={form.financeiro_ciclo}
              onChange={(event) => updateField("financeiro_ciclo", event.target.value)}
            >
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </C.Select>
          </C.Field>
          <C.Field>
            <C.FieldSpan>Forma de cobrança</C.FieldSpan>
            <C.Select
              value={form.financeiro_forma_cobranca}
              onChange={(event) => updateField("financeiro_forma_cobranca", event.target.value)}
            >
              <option value="boleto">Boleto</option>
              <option value="pix">Pix</option>
            </C.Select>
          </C.Field>
          <C.Field>
            <C.FieldSpan>
              Primeiro vencimento
              <C.RequiredMark title={REQUIRED_TITLE}>*</C.RequiredMark>
            </C.FieldSpan>
            <C.Input
              type="date"
              value={form.financeiro_primeiro_vencimento}
              onChange={(event) => updateField("financeiro_primeiro_vencimento", event.target.value)}
            />
          </C.Field>
          <C.Field>
            <C.FieldSpan>Quantidade de parcelas</C.FieldSpan>
            <C.Input
              type="number"
              min="1"
              max="120"
              value={form.financeiro_quantidade_parcelas}
              onChange={(event) => updateField("financeiro_quantidade_parcelas", event.target.value)}
            />
          </C.Field>
          <C.Field>
            <C.FieldSpan>Dia preferencial de vencimento</C.FieldSpan>
            <C.Input
              type="number"
              min="1"
              max="31"
              value={form.financeiro_dia_vencimento}
              onChange={(event) => updateField("financeiro_dia_vencimento", event.target.value)}
            />
          </C.Field>
          <C.Field>
            <C.FieldSpan>Bloquear após atraso de dias</C.FieldSpan>
            <C.Input
              type="number"
              min="0"
              max="365"
              value={form.financeiro_bloquear_apos_dias}
              onChange={(event) => updateField("financeiro_bloquear_apos_dias", event.target.value)}
            />
          </C.Field>
          <C.Field>
            <C.FieldSpan>Juros por atraso (%)</C.FieldSpan>
            <C.Input
              type="number"
              min="0"
              step="0.01"
              value={form.financeiro_juros_mora_percentual}
              onChange={(event) => updateField("financeiro_juros_mora_percentual", event.target.value)}
            />
          </C.Field>
          <C.Field>
            <C.FieldSpan>Multa por atraso (%)</C.FieldSpan>
            <C.Input
              type="number"
              min="0"
              step="0.01"
              value={form.financeiro_multa_atraso_percentual}
              onChange={(event) => updateField("financeiro_multa_atraso_percentual", event.target.value)}
            />
          </C.Field>
          <C.FieldFull>
            <C.FieldSpan>Observação do contrato</C.FieldSpan>
            <C.TextArea
              value={form.financeiro_observacao}
              onChange={(event) => updateField("financeiro_observacao", event.target.value)}
              placeholder="Condições comerciais, desconto negociado ou observações internas."
            />
          </C.FieldFull>
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
        {step < (editingTenantId ? 2 : 4) ? (
          <C.PrimaryButton type="button" onClick={goNextStep}>
            Próxima etapa
          </C.PrimaryButton>
        ) : (
          <C.PrimaryButton type="button" onClick={handleSubmit} disabled={saving}>
            {saving
              ? editingTenantId
                ? "Salvando..."
                : "Cadastrando..."
              : editingTenantId
                ? "Salvar alterações"
                : "Cadastrar cliente"}
          </C.PrimaryButton>
        )}
      </C.Actions>
    </C.Toolbar>
  </>
);

export const TenantSetup = ({ embedded = false }) => {
  const { mOpen, abreFechaMenu, business } = useContext(AppContext);
  const {
    REQUIRED_TITLE,
    loadingTenants,
    isModalOpen,
    step,
    editingTenantId,
    saving,
    form,
    preview,
    certificateSummary,
    logoSummary,
    tenants,
    totalTenants,
    page,
    totalPages,
    search,
    actionMenuTenantId,
    setSearch,
    setPage,
    setActionMenuTenantId,
    openModal,
    openEditModal,
    closeModal,
    updateField,
    handleSelectCertificado,
    handleSelectLogo,
    handleConfirmCertificate,
    goNextStep,
    goPreviousStep,
    handleSubmit,
    handleToggleTenantStatus,
  } = useTenantSetupPage({ gestaoContext: embedded });

  const pageContent = (
    <>
      <C.PageGrid>
        <C.ListCard>
          <C.ListHeader>
            <C.ListHeaderText>
              {embedded ? null : <C.ListKicker>Gestão V12</C.ListKicker>}
              <C.CardTitle>{embedded ? "Clientes" : "Clientes e filiais cadastradas"}</C.CardTitle>
              {embedded ? null : (
                <C.CardText>
                  Consulte clientes do V12, cadastre novas filiais, vincule
                  certificado A1 e defina o contrato financeiro inicial.
                </C.CardText>
              )}
            </C.ListHeaderText>

            <C.PrimaryButton type="button" onClick={openModal}>
              Cadastrar novo cliente
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
                ? "Carregando clientes..."
                : `${totalTenants} cliente(s) encontrado(s)`}
            </C.CountText>
          </C.SearchRow>

          <C.TableCard>
            <C.TableScroll>
              <C.Table>
                <C.TableHead>
                  <C.TableRow>
                    <C.TableHeaderCell>Código</C.TableHeaderCell>
                    <C.TableHeaderCell>Cliente / filial</C.TableHeaderCell>
                    <C.TableHeaderCell>Documento</C.TableHeaderCell>
                    <C.TableHeaderCell>Slug</C.TableHeaderCell>
                    <C.TableHeaderCell>Perfil</C.TableHeaderCell>
                    <C.TableHeaderCell>Status</C.TableHeaderCell>
                    <C.TableHeaderCell>Ações</C.TableHeaderCell>
                  </C.TableRow>
                </C.TableHead>
                <tbody>
                  {loadingTenants ? (
                    <C.TableRow>
                      <C.TableCell colSpan={7}>
                        <C.EmptyState>Carregando clientes cadastrados...</C.EmptyState>
                      </C.TableCell>
                    </C.TableRow>
                  ) : tenants.length ? (
                    tenants.map((tenant) => (
                      <C.TableRow key={tenant.tenant_id}>
                        <C.TableCell>#{tenant.tenant_id}</C.TableCell>
                        <C.TableCell $wrap>
                          <C.TenantItemTitle>{tenant.tenant_nome}</C.TenantItemTitle>
                          <C.TenantMeta>{tenant.tenant_documento || "--"}</C.TenantMeta>
                        </C.TableCell>
                        <C.TableCell>{tenant.tenant_documento || "--"}</C.TableCell>
                        <C.TableCell>{tenant.tenant_slug || "--"}</C.TableCell>
                        <C.TableCell>{tenant.perfil || "--"}</C.TableCell>
                        <C.TableCell>
                          <C.TenantStatusBadge $active={!!tenant.tenant_ativo}>
                            {tenant.tenant_ativo ? "Ativa" : "Inativa"}
                          </C.TenantStatusBadge>
                        </C.TableCell>
                        <C.TableCell>
                          <C.TenantMenuWrap>
                            <C.TenantMenuToggle
                              type="button"
                              onClick={() =>
                                setActionMenuTenantId((current) =>
                                  current === tenant.tenant_id ? null : tenant.tenant_id
                                )
                              }
                              title="Ações"
                            >
                              ⋮
                            </C.TenantMenuToggle>
                            {actionMenuTenantId === tenant.tenant_id ? (
                              <C.TenantMenu>
                                <C.TenantMenuButton
                                  type="button"
                                  onClick={() => openEditModal(tenant.tenant_id)}
                                >
                                  Editar cadastro
                                </C.TenantMenuButton>
                                <C.TenantMenuButton
                                  type="button"
                                  onClick={() =>
                                    handleToggleTenantStatus(tenant, business?.tenant_id)
                                  }
                                  $danger={tenant.tenant_ativo}
                                  $success={!tenant.tenant_ativo}
                                >
                                  {tenant.tenant_ativo ? "Inativar empresa" : "Reativar empresa"}
                                </C.TenantMenuButton>
                              </C.TenantMenu>
                            ) : null}
                          </C.TenantMenuWrap>
                        </C.TableCell>
                      </C.TableRow>
                    ))
                  ) : (
                    <C.TableRow>
                      <C.TableCell colSpan={7}>
                        <C.EmptyState>
                          <C.EmptyTitle>Nenhum cliente encontrado</C.EmptyTitle>
                          <C.EmptyText>
                            Use o botão de cadastro para criar o primeiro cliente do V12.
                          </C.EmptyText>
                        </C.EmptyState>
                      </C.TableCell>
                    </C.TableRow>
                  )}
                </tbody>
              </C.Table>
            </C.TableScroll>
          </C.TableCard>

          <C.Footer>
            <C.CountText>
              Página {page} de {totalPages}
            </C.CountText>
            <Paginacao page={page} totalPages={totalPages} onPageChange={setPage} />
          </C.Footer>
        </C.ListCard>
      </C.PageGrid>

      {isModalOpen ? (
        <C.ModalOverlay role="dialog" aria-modal="true" aria-label="Cadastro de empresa">
          <C.ModalPanel>
            <C.ModalHeader>
              <C.ModalTitle>
                <C.ListKicker>{editingTenantId ? "Edição" : "Cadastro"}</C.ListKicker>
                <C.ModalTitleText>
                  {editingTenantId ? "Editar filial" : "Cadastrar cliente V12"}
                </C.ModalTitleText>
                <C.CardText>
                  {editingTenantId
                    ? "Atualize os dados da filial e, se necessário, substitua o certificado."
                    : "Este fluxo cria a filial, vincula certificado A1, cria o usuário admin e registra o contrato financeiro do cliente."}
                </C.CardText>
              </C.ModalTitle>

              <C.ModalCloseButton type="button" onClick={closeModal} title="Fechar modal">
                ×
              </C.ModalCloseButton>
            </C.ModalHeader>

            <Wizard
              REQUIRED_TITLE={REQUIRED_TITLE}
              editingTenantId={editingTenantId}
              step={step}
              saving={saving}
              form={form}
              preview={preview}
              certificateSummary={certificateSummary}
              logoSummary={logoSummary}
              updateField={updateField}
              handleSelectCertificado={handleSelectCertificado}
              handleSelectLogo={handleSelectLogo}
              handleConfirmCertificate={handleConfirmCertificate}
              goNextStep={goNextStep}
              goPreviousStep={goPreviousStep}
              handleSubmit={handleSubmit}
            />
          </C.ModalPanel>
        </C.ModalOverlay>
      ) : null}
    </>
  );

  if (embedded) return pageContent;

  return (
    <C.Shell>
      <Sidebar />
      {mOpen && <C.Overlay onClick={abreFechaMenu} />}

      <C.Content>
        <Header />
        <C.Body>{pageContent}</C.Body>
      </C.Content>
    </C.Shell>
  );
};
