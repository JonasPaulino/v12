import React, { useContext, useMemo, useState } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import AsyncSearchSelect from "components/asyncSearchSelect";
import DropdownMenu from "components/dropDownMenu";
import Paginacao from "components/paginacao";
import { AppContext } from "context";
import { useConfiguracaoFiscalPage } from "./use";
import * as C from "./style";

const requiredTitle = "Este campo é obrigatório.";
const FISCAL_PAGE_SIZE = 8;

const tipoOperacaoLabels = {
  venda: "Venda",
  compra: "Compra",
  devolucao_venda: "Devolução de venda",
  devolucao_compra: "Devolução de compra",
  bonificacao_entrada: "Bonificação recebida",
  bonificacao_saida: "Bonificação enviada",
  remessa: "Remessa",
  retorno: "Retorno",
  ajuste: "Ajuste",
};

const tipoMovimentoLabels = {
  entrada: "Entrada",
  saida: "Saída",
  nenhum: "Não movimenta",
};

const tipoFinanceiroLabels = {
  receber: "Receber",
  pagar: "Pagar",
  nenhum: "Não gera",
};

export const ConfiguracaoFiscal = () => {
  const { mOpen, abreFechaMenu, user } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState("fiscal");
  const [activeMensagemTab, setActiveMensagemTab] = useState("conectar");
  const [fiscalSearch, setFiscalSearch] = useState("");
  const [fiscalPage, setFiscalPage] = useState(1);
  const [fiscalModalOpen, setFiscalModalOpen] = useState(false);
  const [fiscalMenuOpenId, setFiscalMenuOpenId] = useState(null);
  const [fiscalAnchorEl, setFiscalAnchorEl] = useState(null);
  const [operacaoSearch, setOperacaoSearch] = useState("");
  const [operacaoPage, setOperacaoPage] = useState(1);
  const [operacaoModalOpen, setOperacaoModalOpen] = useState(false);
  const [operacaoMenuOpenId, setOperacaoMenuOpenId] = useState(null);
  const [operacaoAnchorEl, setOperacaoAnchorEl] = useState(null);
  const isUsuarioMaster = !!user?.usuario_master;
  const canManageInternalConfig = isUsuarioMaster;
  const {
    loading,
    saving,
    tenant,
    form,
    selectedEmitente,
    emitenteEndereco,
    certificadoResumo,
    contasResumo,
    whatsappResumo,
    whatsAppState,
    operacoesFiscais,
    operacaoFiscalForm,
    editingOperacaoFiscalId,
    operacaoFiscalSaving,
    regrasFiscais,
    regraFiscalForm,
    editingRegraFiscalId,
    regraFiscalSaving,
    isWhatsAppConnected,
    canRestartWhatsApp,
    canDeleteWhatsApp,
    updateField,
    updateOperacaoFiscalField,
    updateRegraFiscalField,
    resetOperacaoFiscalForm,
    resetRegraFiscalForm,
    handleEditOperacaoFiscal,
    handleEditRegraFiscal,
    handleSaveOperacaoFiscal,
    handleSaveRegraFiscal,
    handleToggleOperacaoFiscal,
    handleToggleRegraFiscal,
    loadEmitenteOptions,
    handleSelectEmitente,
    handleSelectCertificado,
    handleConnectWhatsApp,
    handleDisconnectWhatsApp,
    handleRestartWhatsApp,
    handleDeleteWhatsApp,
    handleSubmit,
  } = useConfiguracaoFiscalPage();

  const filteredOperacoesFiscais = useMemo(() => {
    const search = operacaoSearch.trim().toLowerCase();
    if (!search) return operacoesFiscais;

    return operacoesFiscais.filter((operacao) =>
      [
        operacao.codigo,
        operacao.descricao,
        operacao.natureza_operacao,
        operacao.regra_fiscal_descricao,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [operacaoSearch, operacoesFiscais]);

  const operacaoTotalPages = Math.max(
    1,
    Math.ceil(filteredOperacoesFiscais.length / FISCAL_PAGE_SIZE)
  );
  const safeOperacaoPage = Math.min(operacaoPage, operacaoTotalPages);
  const paginatedOperacoesFiscais = filteredOperacoesFiscais.slice(
    (safeOperacaoPage - 1) * FISCAL_PAGE_SIZE,
    safeOperacaoPage * FISCAL_PAGE_SIZE
  );

  const filteredRegrasFiscais = useMemo(() => {
    const search = fiscalSearch.trim().toLowerCase();
    if (!search) return regrasFiscais;

    return regrasFiscais.filter((regra) =>
      [
        regra.descricao,
        regra.cfop_venda_interna,
        regra.cfop_venda_interestadual,
        regra.icms_csosn,
        regra.icms_cst,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [fiscalSearch, regrasFiscais]);

  const fiscalTotalPages = Math.max(
    1,
    Math.ceil(filteredRegrasFiscais.length / FISCAL_PAGE_SIZE)
  );
  const safeFiscalPage = Math.min(fiscalPage, fiscalTotalPages);
  const paginatedRegrasFiscais = filteredRegrasFiscais.slice(
    (safeFiscalPage - 1) * FISCAL_PAGE_SIZE,
    safeFiscalPage * FISCAL_PAGE_SIZE
  );

  const openOperacaoMenu = (operacaoId, element) => {
    setOperacaoMenuOpenId(operacaoId);
    setOperacaoAnchorEl(element);
  };

  const closeOperacaoMenu = () => {
    setOperacaoMenuOpenId(null);
    setOperacaoAnchorEl(null);
  };

  const openNewOperacaoFiscal = () => {
    resetOperacaoFiscalForm();
    setOperacaoModalOpen(true);
  };

  const openEditOperacaoFiscal = (operacao) => {
    handleEditOperacaoFiscal(operacao);
    setOperacaoModalOpen(true);
  };

  const closeOperacaoModal = () => {
    setOperacaoModalOpen(false);
    resetOperacaoFiscalForm();
  };

  const saveOperacaoFiscal = async () => {
    const saved = await handleSaveOperacaoFiscal();
    if (saved) {
      setOperacaoModalOpen(false);
      setOperacaoPage(1);
    }
  };

  const openFiscalMenu = (regraId, element) => {
    setFiscalMenuOpenId(regraId);
    setFiscalAnchorEl(element);
  };

  const closeFiscalMenu = () => {
    setFiscalMenuOpenId(null);
    setFiscalAnchorEl(null);
  };

  const openNewFiscalRule = () => {
    resetRegraFiscalForm();
    setFiscalModalOpen(true);
  };

  const openEditFiscalRule = (regra) => {
    handleEditRegraFiscal(regra);
    setFiscalModalOpen(true);
  };

  const closeFiscalModal = () => {
    setFiscalModalOpen(false);
    resetRegraFiscalForm();
  };

  const saveFiscalRule = async () => {
    const saved = await handleSaveRegraFiscal();
    if (saved) {
      setFiscalModalOpen(false);
      setFiscalPage(1);
    }
  };

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
                      {canManageInternalConfig ? (
                        <>
                          A filial <strong>{tenant?.tenant_nome || "--"}</strong> reúne
                          parâmetros operacionais, fiscais e internos de suporte.
                        </>
                      ) : (
                        <>
                          A filial <strong>{tenant?.tenant_nome || "--"}</strong> mantém aqui
                          apenas as configurações operacionais usadas no dia a dia.
                        </>
                      )}
                    </C.CardText>
                  </C.CardHeader>

                  <C.Tabs>
                    {canManageInternalConfig ? (
                      <C.TabButton
                        type="button"
                        $active={activeTab === "emitente"}
                        onClick={() => setActiveTab("emitente")}
                      >
                        Emitente
                      </C.TabButton>
                    ) : null}
                    {canManageInternalConfig ? (
                      <C.TabButton
                        type="button"
                        $active={activeTab === "parametros"}
                        onClick={() => setActiveTab("parametros")}
                      >
                        Parâmetros
                      </C.TabButton>
                    ) : null}
                    <C.TabButton
                      type="button"
                      $active={activeTab === "fiscal"}
                      onClick={() => setActiveTab("fiscal")}
                    >
                      Fiscal
                    </C.TabButton>
                    {canManageInternalConfig ? (
                      <C.TabButton
                        type="button"
                        $active={activeTab === "responsavel"}
                        onClick={() => setActiveTab("responsavel")}
                      >
                        Responsável técnico
                      </C.TabButton>
                    ) : null}
                    {canManageInternalConfig ? (
                      <C.TabButton
                        type="button"
                        $active={activeTab === "certificado"}
                        onClick={() => setActiveTab("certificado")}
                      >
                        Certificado
                      </C.TabButton>
                    ) : null}
                    <C.TabButton
                      type="button"
                      $active={activeTab === "contas"}
                      onClick={() => setActiveTab("contas")}
                    >
                      Contas
                    </C.TabButton>
                    <C.TabButton
                      type="button"
                      $active={activeTab === "mensagens"}
                      onClick={() => setActiveTab("mensagens")}
                    >
                      Mensagens
                    </C.TabButton>
                  </C.Tabs>

                  {canManageInternalConfig && activeTab === "emitente" ? (
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

                  {canManageInternalConfig && activeTab === "parametros" ? (
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
                            min="0"
                            max="999"
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
                            min="1"
                            max="999999999"
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

                      <C.CardHeader>
                        <C.CardTitle>Parâmetros do MDF-e</C.CardTitle>
                        <C.CardText>
                          Estes dados definem o ambiente, série e numeração padrão dos
                          manifestos eletrônicos emitidos pela filial.
                        </C.CardText>
                      </C.CardHeader>

                      <C.FieldsGrid>
                        <C.Field>
                          <C.FieldSpan>
                            Ambiente MDF-e
                            <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                          </C.FieldSpan>
                          <C.Select
                            value={form.ambiente_mdfe}
                            onChange={(event) => updateField("ambiente_mdfe", event.target.value)}
                          >
                            <option value="1">1 - Produção</option>
                            <option value="2">2 - Homologação</option>
                          </C.Select>
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>
                            Série padrão MDF-e
                            <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                          </C.FieldSpan>
                          <C.Input
                            value={form.serie_mdfe_padrao}
                            onChange={(event) =>
                              updateField("serie_mdfe_padrao", event.target.value)
                            }
                            inputMode="numeric"
                            min="0"
                            max="999"
                            placeholder="1"
                          />
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>
                            Próximo número MDF-e
                            <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                          </C.FieldSpan>
                          <C.Input
                            value={form.proximo_numero_mdfe}
                            onChange={(event) =>
                              updateField("proximo_numero_mdfe", event.target.value)
                            }
                            inputMode="numeric"
                            min="1"
                            max="999999999"
                            placeholder="1"
                          />
                        </C.Field>
                      </C.FieldsGrid>

                      <C.ToggleRow>
                        <C.Checkbox
                          type="checkbox"
                          checked={form.mdfe_habilitado}
                          onChange={(event) =>
                            updateField("mdfe_habilitado", event.target.checked)
                          }
                        />
                        <span>Habilitar emissão de MDF-e nesta filial</span>
                      </C.ToggleRow>
                    </C.SectionBody>
                  ) : null}

                  {activeTab === "fiscal" ? (
                    <C.SectionBody>
                      <C.CardHeader>
                        <C.CardTitle>Operações fiscais</C.CardTitle>
                        <C.CardText>
                          Defina o comportamento de cada operação: se movimenta estoque,
                          gera financeiro, emite NF-e e qual regra fiscal será usada por
                          padrão. Este cadastro será usado nos fluxos de venda, compra,
                          devolução e bonificação.
                        </C.CardText>
                      </C.CardHeader>

                      <C.FiscalToolbar>
                        <C.SearchInput
                          value={operacaoSearch}
                          onChange={(event) => {
                            setOperacaoSearch(event.target.value);
                            setOperacaoPage(1);
                          }}
                          placeholder="Pesquisar por código, descrição ou natureza"
                        />
                        <C.PrimaryInlineButton type="button" onClick={openNewOperacaoFiscal}>
                          Nova operação fiscal
                        </C.PrimaryInlineButton>
                      </C.FiscalToolbar>

                      <C.TableCard>
                        <C.TableScroll>
                          <C.FiscalTable>
                            <thead>
                              <tr>
                                <th>Operação</th>
                                <th>Comportamento</th>
                                <th>NF-e</th>
                                <th>Financeiro</th>
                                <th>Status</th>
                                <th>Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedOperacoesFiscais.length ? (
                                paginatedOperacoesFiscais.map((operacao) => (
                                  <tr key={operacao.operacao_fiscal_id}>
                                    <td>
                                      <strong>{operacao.descricao}</strong>
                                      <span>
                                        {operacao.codigo} •{" "}
                                        {tipoOperacaoLabels[operacao.tipo_operacao] ||
                                          operacao.tipo_operacao}
                                      </span>
                                    </td>
                                    <td>
                                      {operacao.movimenta_estoque
                                        ? tipoMovimentoLabels[
                                            operacao.tipo_movimento_estoque
                                          ] || operacao.tipo_movimento_estoque
                                        : "Não movimenta"}
                                      {operacao.atualiza_custo ? (
                                        <span>Atualiza custo do produto</span>
                                      ) : null}
                                    </td>
                                    <td>
                                      {operacao.emite_nfe
                                        ? `${operacao.tipo_nfe || "--"} • ${
                                            operacao.finalidade_nfe || "normal"
                                          }`
                                        : "Não emite"}
                                      <span>{operacao.natureza_operacao}</span>
                                    </td>
                                    <td>
                                      {operacao.gera_financeiro
                                        ? tipoFinanceiroLabels[operacao.tipo_financeiro] ||
                                          operacao.tipo_financeiro
                                        : "Não gera"}
                                      {operacao.regra_fiscal_descricao ? (
                                        <span>Regra: {operacao.regra_fiscal_descricao}</span>
                                      ) : null}
                                    </td>
                                    <td>
                                      <C.StatusBadge $ok={operacao.ativo}>
                                        {operacao.ativo ? "Ativa" : "Inativa"}
                                      </C.StatusBadge>
                                    </td>
                                    <td>
                                      <C.MenuButton
                                        type="button"
                                        title="Ações"
                                        aria-label="Ações"
                                        onClick={(event) =>
                                          openOperacaoMenu(
                                            operacao.operacao_fiscal_id,
                                            event.currentTarget
                                          )
                                        }
                                      >
                                        ⋮
                                      </C.MenuButton>

                                      {operacaoMenuOpenId ===
                                      operacao.operacao_fiscal_id ? (
                                        <DropdownMenu
                                          open={!!operacaoMenuOpenId}
                                          anchorEl={operacaoAnchorEl}
                                          onClose={closeOperacaoMenu}
                                          minWidth={210}
                                          items={[
                                            {
                                              label: "Editar cadastro",
                                              onClick: () => openEditOperacaoFiscal(operacao),
                                            },
                                            {
                                              label: operacao.ativo
                                                ? "Inativar operação"
                                                : "Reativar operação",
                                              danger: operacao.ativo,
                                              onClick: () =>
                                                handleToggleOperacaoFiscal(operacao),
                                            },
                                          ]}
                                        />
                                      ) : null}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={6}>
                                    <C.EmptyState>
                                      Nenhuma operação fiscal encontrada.
                                    </C.EmptyState>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </C.FiscalTable>
                        </C.TableScroll>

                        <C.PaginationBar>
                          <span>
                            {filteredOperacoesFiscais.length}{" "}
                            {filteredOperacoesFiscais.length === 1
                              ? "operação fiscal encontrada"
                              : "operações fiscais encontradas"}
                          </span>
                          <C.PaginationInfo>
                            Página {safeOperacaoPage} de {operacaoTotalPages}
                          </C.PaginationInfo>
                          <Paginacao
                            page={safeOperacaoPage}
                            totalPages={operacaoTotalPages}
                            onPageChange={setOperacaoPage}
                          />
                        </C.PaginationBar>
                      </C.TableCard>

                      {operacaoModalOpen ? (
                        <C.ModalOverlay onMouseDown={closeOperacaoModal}>
                          <C.FiscalModal
                            onMouseDown={(event) => event.stopPropagation()}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                              }
                            }}
                          >
                            <C.ModalHeader>
                              <div>
                                <C.CardTitle>
                                  {editingOperacaoFiscalId
                                    ? "Editar operação fiscal"
                                    : "Nova operação fiscal"}
                                </C.CardTitle>
                                <C.CardText>
                                  Configure como o sistema deve tratar esta operação nos
                                  módulos fiscal, financeiro e estoque.
                                </C.CardText>
                              </div>
                              <C.ModalCloseButton
                                type="button"
                                onClick={closeOperacaoModal}
                              >
                                ×
                              </C.ModalCloseButton>
                            </C.ModalHeader>

                            <C.ModalBody>
                              <C.FieldsGrid>
                                <C.Field>
                                  <C.FieldSpan>
                                    Código
                                    <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                                  </C.FieldSpan>
                                  <C.Input
                                    value={operacaoFiscalForm.codigo}
                                    onChange={(event) =>
                                      updateOperacaoFiscalField(
                                        "codigo",
                                        event.target.value
                                      )
                                    }
                                    placeholder="VENDA_MERCADORIA"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>
                                    Descrição
                                    <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                                  </C.FieldSpan>
                                  <C.Input
                                    value={operacaoFiscalForm.descricao}
                                    onChange={(event) =>
                                      updateOperacaoFiscalField(
                                        "descricao",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Venda de mercadoria"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Tipo de operação</C.FieldSpan>
                                  <C.Select
                                    value={operacaoFiscalForm.tipo_operacao}
                                    onChange={(event) =>
                                      updateOperacaoFiscalField(
                                        "tipo_operacao",
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option value="venda">Venda</option>
                                    <option value="compra">Compra</option>
                                    <option value="devolucao_venda">Devolução de venda</option>
                                    <option value="devolucao_compra">Devolução de compra</option>
                                    <option value="bonificacao_entrada">
                                      Bonificação recebida
                                    </option>
                                    <option value="bonificacao_saida">Bonificação enviada</option>
                                    <option value="remessa">Remessa</option>
                                    <option value="retorno">Retorno</option>
                                    <option value="ajuste">Ajuste</option>
                                  </C.Select>
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>
                                    Natureza da operação
                                    <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                                  </C.FieldSpan>
                                  <C.Input
                                    value={operacaoFiscalForm.natureza_operacao}
                                    onChange={(event) =>
                                      updateOperacaoFiscalField(
                                        "natureza_operacao",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Venda de mercadoria"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Finalidade NF-e</C.FieldSpan>
                                  <C.Select
                                    value={operacaoFiscalForm.finalidade_nfe}
                                    onChange={(event) =>
                                      updateOperacaoFiscalField(
                                        "finalidade_nfe",
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option value="normal">Normal</option>
                                    <option value="complementar">Complementar</option>
                                    <option value="ajuste">Ajuste</option>
                                    <option value="devolucao">Devolução</option>
                                  </C.Select>
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Tipo NF-e</C.FieldSpan>
                                  <C.Select
                                    value={operacaoFiscalForm.tipo_nfe}
                                    onChange={(event) =>
                                      updateOperacaoFiscalField(
                                        "tipo_nfe",
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option value="">Não se aplica</option>
                                    <option value="entrada">Entrada</option>
                                    <option value="saida">Saída</option>
                                  </C.Select>
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Movimento de estoque</C.FieldSpan>
                                  <C.Select
                                    value={operacaoFiscalForm.tipo_movimento_estoque}
                                    onChange={(event) =>
                                      updateOperacaoFiscalField(
                                        "tipo_movimento_estoque",
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option value="entrada">Entrada</option>
                                    <option value="saida">Saída</option>
                                    <option value="nenhum">Não movimenta</option>
                                  </C.Select>
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Financeiro</C.FieldSpan>
                                  <C.Select
                                    value={operacaoFiscalForm.tipo_financeiro}
                                    onChange={(event) =>
                                      updateOperacaoFiscalField(
                                        "tipo_financeiro",
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option value="receber">Contas a receber</option>
                                    <option value="pagar">Contas a pagar</option>
                                    <option value="nenhum">Não gera financeiro</option>
                                  </C.Select>
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Regra fiscal padrão</C.FieldSpan>
                                  <C.Select
                                    value={operacaoFiscalForm.regra_tributaria_id}
                                    onChange={(event) =>
                                      updateOperacaoFiscalField(
                                        "regra_tributaria_id",
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option value="">Sem regra vinculada</option>
                                    {regrasFiscais.map((regra) => (
                                      <option
                                        key={regra.regra_tributaria_id}
                                        value={regra.regra_tributaria_id}
                                      >
                                        {regra.descricao}
                                      </option>
                                    ))}
                                  </C.Select>
                                </C.Field>
                              </C.FieldsGrid>

                              <C.ToggleList>
                                <C.ToggleRow>
                                  <C.Checkbox
                                    type="checkbox"
                                    checked={operacaoFiscalForm.emite_nfe}
                                    onChange={(event) =>
                                      updateOperacaoFiscalField(
                                        "emite_nfe",
                                        event.target.checked
                                      )
                                    }
                                  />
                                  <span>Emite NF-e</span>
                                </C.ToggleRow>

                                <C.ToggleRow>
                                  <C.Checkbox
                                    type="checkbox"
                                    checked={operacaoFiscalForm.movimenta_estoque}
                                    onChange={(event) =>
                                      updateOperacaoFiscalField(
                                        "movimenta_estoque",
                                        event.target.checked
                                      )
                                    }
                                  />
                                  <span>Movimenta estoque</span>
                                </C.ToggleRow>

                                <C.ToggleRow>
                                  <C.Checkbox
                                    type="checkbox"
                                    checked={operacaoFiscalForm.gera_financeiro}
                                    onChange={(event) =>
                                      updateOperacaoFiscalField(
                                        "gera_financeiro",
                                        event.target.checked
                                      )
                                    }
                                  />
                                  <span>Gera financeiro</span>
                                </C.ToggleRow>

                                <C.ToggleRow>
                                  <C.Checkbox
                                    type="checkbox"
                                    checked={operacaoFiscalForm.atualiza_custo}
                                    onChange={(event) =>
                                      updateOperacaoFiscalField(
                                        "atualiza_custo",
                                        event.target.checked
                                      )
                                    }
                                  />
                                  <span>Atualiza custo do produto na entrada</span>
                                </C.ToggleRow>

                                <C.ToggleRow>
                                  <C.Checkbox
                                    type="checkbox"
                                    checked={operacaoFiscalForm.ativo}
                                    onChange={(event) =>
                                      updateOperacaoFiscalField("ativo", event.target.checked)
                                    }
                                  />
                                  <span>Operação ativa</span>
                                </C.ToggleRow>
                              </C.ToggleList>

                              <C.Field>
                                <C.FieldSpan>Observação interna</C.FieldSpan>
                                <C.Textarea
                                  value={operacaoFiscalForm.observacao}
                                  onChange={(event) =>
                                    updateOperacaoFiscalField("observacao", event.target.value)
                                  }
                                  placeholder="Use para orientar quando essa operação deve ser usada"
                                />
                              </C.Field>
                            </C.ModalBody>

                            <C.ModalFooter>
                              <C.SecondaryButton type="button" onClick={closeOperacaoModal}>
                                Cancelar
                              </C.SecondaryButton>
                              <C.PrimaryInlineButton
                                type="button"
                                onClick={saveOperacaoFiscal}
                                disabled={operacaoFiscalSaving}
                              >
                                {operacaoFiscalSaving
                                  ? "Salvando..."
                                  : "Salvar operação"}
                              </C.PrimaryInlineButton>
                            </C.ModalFooter>
                          </C.FiscalModal>
                        </C.ModalOverlay>
                      ) : null}

                      <C.CardHeader>
                        <C.CardTitle>Regras fiscais dos produtos</C.CardTitle>
                        <C.CardText>
                          Cadastre perfis tributários reutilizáveis. O produto guarda NCM/CEST
                          e aponta para uma regra fiscal; na emissão, os impostos são copiados
                          para o item da NF-e para preservar o histórico.
                        </C.CardText>
                      </C.CardHeader>

                      <C.FiscalToolbar>
                        <C.SearchInput
                          value={fiscalSearch}
                          onChange={(event) => {
                            setFiscalSearch(event.target.value);
                            setFiscalPage(1);
                          }}
                          placeholder="Pesquisar por nome, CFOP, CST ou CSOSN"
                        />
                        <C.PrimaryInlineButton type="button" onClick={openNewFiscalRule}>
                          Nova regra fiscal
                        </C.PrimaryInlineButton>
                      </C.FiscalToolbar>

                      <C.TableCard>
                        <C.TableScroll>
                          <C.FiscalTable>
                            <thead>
                              <tr>
                                <th>Regra</th>
                                <th>Regime</th>
                                <th>CFOP</th>
                                <th>ICMS</th>
                                <th>Status</th>
                                <th>Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedRegrasFiscais.length ? (
                                paginatedRegrasFiscais.map((regra) => (
                                  <tr key={regra.regra_tributaria_id}>
                                    <td>
                                      <strong>{regra.descricao}</strong>
                                      {regra.observacao ? (
                                        <span>{regra.observacao}</span>
                                      ) : null}
                                    </td>
                                    <td>
                                      CRT {regra.crt_emitente || "--"} •{" "}
                                      {regra.regime_tributario || "--"}
                                    </td>
                                    <td>
                                      {regra.cfop_venda_interna || "--"} /{" "}
                                      {regra.cfop_venda_interestadual || "--"}
                                    </td>
                                    <td>
                                      {regra.icms_csosn
                                        ? `CSOSN ${regra.icms_csosn}`
                                        : regra.icms_cst
                                        ? `CST ${regra.icms_cst}`
                                        : "--"}
                                    </td>
                                    <td>
                                      <C.StatusBadge $ok={regra.ativo}>
                                        {regra.ativo ? "Ativa" : "Inativa"}
                                      </C.StatusBadge>
                                    </td>
                                    <td>
                                      <C.MenuButton
                                        type="button"
                                        title="Ações"
                                        aria-label="Ações"
                                        onClick={(event) =>
                                          openFiscalMenu(
                                            regra.regra_tributaria_id,
                                            event.currentTarget
                                          )
                                        }
                                      >
                                        ⋮
                                      </C.MenuButton>

                                      {fiscalMenuOpenId === regra.regra_tributaria_id ? (
                                        <DropdownMenu
                                          open={!!fiscalMenuOpenId}
                                          anchorEl={fiscalAnchorEl}
                                          onClose={closeFiscalMenu}
                                          minWidth={190}
                                          items={[
                                            {
                                              label: "Editar cadastro",
                                              onClick: () => openEditFiscalRule(regra),
                                            },
                                            {
                                              label: regra.ativo
                                                ? "Inativar regra"
                                                : "Reativar regra",
                                              danger: regra.ativo,
                                              onClick: () => handleToggleRegraFiscal(regra),
                                            },
                                          ]}
                                        />
                                      ) : null}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={6}>
                                    <C.EmptyState>
                                      Nenhuma regra fiscal encontrada.
                                    </C.EmptyState>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </C.FiscalTable>
                        </C.TableScroll>

                        <C.PaginationBar>
                          <span>
                            {filteredRegrasFiscais.length} regra
                            {filteredRegrasFiscais.length === 1 ? "" : "s"} encontrada
                            {filteredRegrasFiscais.length === 1 ? "" : "s"}
                          </span>
                          <C.PaginationInfo>
                            Página {safeFiscalPage} de {fiscalTotalPages}
                          </C.PaginationInfo>
                          <Paginacao
                            page={safeFiscalPage}
                            totalPages={fiscalTotalPages}
                            onPageChange={setFiscalPage}
                          />
                        </C.PaginationBar>
                      </C.TableCard>

                      {fiscalModalOpen ? (
                        <C.ModalOverlay onMouseDown={closeFiscalModal}>
                          <C.FiscalModal
                            onMouseDown={(event) => event.stopPropagation()}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                              }
                            }}
                          >
                            <C.ModalHeader>
                              <div>
                                <C.CardTitle>
                                  {editingRegraFiscalId
                                    ? "Editar regra fiscal"
                                    : "Nova regra fiscal"}
                                </C.CardTitle>
                                <C.CardText>
                                  Informe os dados tributários definidos pelo contador.
                                </C.CardText>
                              </div>
                              <C.ModalCloseButton type="button" onClick={closeFiscalModal}>
                                ×
                              </C.ModalCloseButton>
                            </C.ModalHeader>

                            <C.ModalBody>
                              <C.FieldsGrid>
                                <C.Field>
                                  <C.FieldSpan>
                                    Nome da regra
                                    <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                                  </C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.descricao}
                                    onChange={(event) =>
                                      updateRegraFiscalField("descricao", event.target.value)
                                    }
                                    placeholder="Ex.: Venda Simples Nacional"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Regime</C.FieldSpan>
                                  <C.Select
                                    value={regraFiscalForm.regime_tributario}
                                    onChange={(event) =>
                                      updateRegraFiscalField(
                                        "regime_tributario",
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option value="simples_nacional">Simples nacional</option>
                                    <option value="regime_normal">Regime normal</option>
                                    <option value="mei">MEI</option>
                                  </C.Select>
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>CRT emitente</C.FieldSpan>
                                  <C.Select
                                    value={regraFiscalForm.crt_emitente}
                                    onChange={(event) =>
                                      updateRegraFiscalField("crt_emitente", event.target.value)
                                    }
                                  >
                                    <option value="1">1 - Simples nacional</option>
                                    <option value="2">2 - Simples excesso sublimite</option>
                                    <option value="3">3 - Regime normal</option>
                                  </C.Select>
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Origem da mercadoria</C.FieldSpan>
                                  <C.Select
                                    value={regraFiscalForm.origem_mercadoria}
                                    onChange={(event) =>
                                      updateRegraFiscalField(
                                        "origem_mercadoria",
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option value="0">0 - Nacional</option>
                                    <option value="1">1 - Estrangeira importação direta</option>
                                    <option value="2">2 - Estrangeira mercado interno</option>
                                    <option value="3">3 - Nacional importado &gt; 40%</option>
                                    <option value="4">4 - Nacional PPB</option>
                                    <option value="5">5 - Nacional importado &lt;= 40%</option>
                                    <option value="6">6 - Importação direta sem similar</option>
                                    <option value="7">7 - Mercado interno sem similar</option>
                                    <option value="8">8 - Nacional importado &gt; 70%</option>
                                  </C.Select>
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>
                                    CFOP venda dentro da UF
                                    <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                                  </C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.cfop_venda_interna}
                                    onChange={(event) =>
                                      updateRegraFiscalField(
                                        "cfop_venda_interna",
                                        event.target.value
                                      )
                                    }
                                    inputMode="numeric"
                                    placeholder="5101"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>
                                    CFOP venda fora da UF
                                    <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                                  </C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.cfop_venda_interestadual}
                                    onChange={(event) =>
                                      updateRegraFiscalField(
                                        "cfop_venda_interestadual",
                                        event.target.value
                                      )
                                    }
                                    inputMode="numeric"
                                    placeholder="6101"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>CSOSN ICMS</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.icms_csosn}
                                    onChange={(event) =>
                                      updateRegraFiscalField("icms_csosn", event.target.value)
                                    }
                                    placeholder="102"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>CST ICMS</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.icms_cst}
                                    onChange={(event) =>
                                      updateRegraFiscalField("icms_cst", event.target.value)
                                    }
                                    placeholder="Opcional"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Alíquota ICMS %</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.icms_aliquota}
                                    onChange={(event) =>
                                      updateRegraFiscalField("icms_aliquota", event.target.value)
                                    }
                                    inputMode="decimal"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Redução BC ICMS %</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.icms_reducao_base}
                                    onChange={(event) =>
                                      updateRegraFiscalField(
                                        "icms_reducao_base",
                                        event.target.value
                                      )
                                    }
                                    inputMode="decimal"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>CST PIS</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.pis_cst}
                                    onChange={(event) =>
                                      updateRegraFiscalField("pis_cst", event.target.value)
                                    }
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Alíquota PIS %</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.pis_aliquota}
                                    onChange={(event) =>
                                      updateRegraFiscalField("pis_aliquota", event.target.value)
                                    }
                                    inputMode="decimal"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>CST COFINS</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.cofins_cst}
                                    onChange={(event) =>
                                      updateRegraFiscalField("cofins_cst", event.target.value)
                                    }
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Alíquota COFINS %</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.cofins_aliquota}
                                    onChange={(event) =>
                                      updateRegraFiscalField(
                                        "cofins_aliquota",
                                        event.target.value
                                      )
                                    }
                                    inputMode="decimal"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>CST IPI</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.ipi_cst}
                                    onChange={(event) =>
                                      updateRegraFiscalField("ipi_cst", event.target.value)
                                    }
                                    placeholder="Opcional"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Enquadramento IPI</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.ipi_enquadramento}
                                    onChange={(event) =>
                                      updateRegraFiscalField(
                                        "ipi_enquadramento",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Ex.: 999"
                                  />
                                </C.Field>
                              </C.FieldsGrid>

                              <C.CardText>
                                Reforma tributária: preencha apenas quando o contador orientar.
                                Estes campos deixam a regra pronta para CBS, IBS e Imposto Seletivo.
                              </C.CardText>

                              <C.FieldsGrid>
                                <C.Field>
                                  <C.FieldSpan>CST CBS</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.cbs_cst}
                                    onChange={(event) =>
                                      updateRegraFiscalField("cbs_cst", event.target.value)
                                    }
                                    placeholder="Opcional"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>cClassTrib CBS</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.cbs_cclass_trib}
                                    onChange={(event) =>
                                      updateRegraFiscalField(
                                        "cbs_cclass_trib",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Opcional"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Alíquota CBS %</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.cbs_aliquota}
                                    onChange={(event) =>
                                      updateRegraFiscalField("cbs_aliquota", event.target.value)
                                    }
                                    inputMode="decimal"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>CST IBS UF</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.ibs_uf_cst}
                                    onChange={(event) =>
                                      updateRegraFiscalField("ibs_uf_cst", event.target.value)
                                    }
                                    placeholder="Opcional"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>cClassTrib IBS UF</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.ibs_uf_cclass_trib}
                                    onChange={(event) =>
                                      updateRegraFiscalField(
                                        "ibs_uf_cclass_trib",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Opcional"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Alíquota IBS UF %</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.ibs_uf_aliquota}
                                    onChange={(event) =>
                                      updateRegraFiscalField(
                                        "ibs_uf_aliquota",
                                        event.target.value
                                      )
                                    }
                                    inputMode="decimal"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>CST IBS município</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.ibs_mun_cst}
                                    onChange={(event) =>
                                      updateRegraFiscalField("ibs_mun_cst", event.target.value)
                                    }
                                    placeholder="Opcional"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>cClassTrib IBS município</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.ibs_mun_cclass_trib}
                                    onChange={(event) =>
                                      updateRegraFiscalField(
                                        "ibs_mun_cclass_trib",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Opcional"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Alíquota IBS município %</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.ibs_mun_aliquota}
                                    onChange={(event) =>
                                      updateRegraFiscalField(
                                        "ibs_mun_aliquota",
                                        event.target.value
                                      )
                                    }
                                    inputMode="decimal"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>CST IS</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.is_cst}
                                    onChange={(event) =>
                                      updateRegraFiscalField("is_cst", event.target.value)
                                    }
                                    placeholder="Opcional"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>cClassTrib IS</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.is_cclass_trib}
                                    onChange={(event) =>
                                      updateRegraFiscalField("is_cclass_trib", event.target.value)
                                    }
                                    placeholder="Opcional"
                                  />
                                </C.Field>

                                <C.Field>
                                  <C.FieldSpan>Alíquota IS %</C.FieldSpan>
                                  <C.Input
                                    value={regraFiscalForm.is_aliquota}
                                    onChange={(event) =>
                                      updateRegraFiscalField("is_aliquota", event.target.value)
                                    }
                                    inputMode="decimal"
                                  />
                                </C.Field>
                              </C.FieldsGrid>

                              <C.ToggleList>
                                <C.ToggleRow>
                                  <C.Checkbox
                                    type="checkbox"
                                    checked={regraFiscalForm.consumidor_final}
                                    onChange={(event) =>
                                      updateRegraFiscalField(
                                        "consumidor_final",
                                        event.target.checked
                                      )
                                    }
                                  />
                                  <span>Consumidor final por padrão</span>
                                </C.ToggleRow>

                                <C.ToggleRow>
                                  <C.Checkbox
                                    type="checkbox"
                                    checked={regraFiscalForm.contribuinte_icms}
                                    onChange={(event) =>
                                      updateRegraFiscalField(
                                        "contribuinte_icms",
                                        event.target.checked
                                      )
                                    }
                                  />
                                  <span>Destinatário contribuinte ICMS por padrão</span>
                                </C.ToggleRow>

                                <C.ToggleRow>
                                  <C.Checkbox
                                    type="checkbox"
                                    checked={regraFiscalForm.ativo}
                                    onChange={(event) =>
                                      updateRegraFiscalField("ativo", event.target.checked)
                                    }
                                  />
                                  <span>Regra ativa</span>
                                </C.ToggleRow>
                              </C.ToggleList>

                              <C.Field>
                                <C.FieldSpan>Observação interna</C.FieldSpan>
                                <C.Textarea
                                  value={regraFiscalForm.observacao}
                                  onChange={(event) =>
                                    updateRegraFiscalField("observacao", event.target.value)
                                  }
                                  placeholder="Anote a orientação do contador ou exceções desta regra"
                                />
                              </C.Field>
                            </C.ModalBody>

                            <C.ModalFooter>
                              <C.SecondaryButton type="button" onClick={closeFiscalModal}>
                                Cancelar
                              </C.SecondaryButton>
                              <C.PrimaryInlineButton
                                type="button"
                                onClick={saveFiscalRule}
                                disabled={regraFiscalSaving}
                              >
                                {regraFiscalSaving ? "Salvando..." : "Salvar regra"}
                              </C.PrimaryInlineButton>
                            </C.ModalFooter>
                          </C.FiscalModal>
                        </C.ModalOverlay>
                      ) : null}
                    </C.SectionBody>
                  ) : null}

                  {canManageInternalConfig && activeTab === "certificado" ? (
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

                  {canManageInternalConfig && activeTab === "responsavel" ? (
                    <C.SectionBody>
                      <C.CardHeader>
                        <C.CardTitle>Responsável técnico</C.CardTitle>
                        <C.CardText>
                          Dados do fornecedor do sistema enviados no grupo técnico da NF-e.
                          PE exige essas informações para autorizar a emissão.
                        </C.CardText>
                      </C.CardHeader>

                      <C.FieldsGrid>
                        <C.Field>
                          <C.FieldSpan>
                            CNPJ
                            <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                          </C.FieldSpan>
                          <C.Input
                            value={form.responsavel_tecnico_cnpj}
                            onChange={(event) =>
                              updateField("responsavel_tecnico_cnpj", event.target.value)
                            }
                            inputMode="numeric"
                            placeholder="66056990000198"
                          />
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>
                            Nome
                            <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                          </C.FieldSpan>
                          <C.Input
                            value={form.responsavel_tecnico_nome}
                            onChange={(event) =>
                              updateField("responsavel_tecnico_nome", event.target.value)
                            }
                            placeholder="jhes sistemas"
                          />
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>
                            Contato
                            <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                          </C.FieldSpan>
                          <C.Input
                            value={form.responsavel_tecnico_contato}
                            onChange={(event) =>
                              updateField("responsavel_tecnico_contato", event.target.value)
                            }
                            placeholder="Jonas Paulino"
                          />
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>
                            E-mail
                            <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                          </C.FieldSpan>
                          <C.Input
                            type="email"
                            value={form.responsavel_tecnico_email}
                            onChange={(event) =>
                              updateField("responsavel_tecnico_email", event.target.value)
                            }
                            placeholder="jonaspaulino@jhes.com.br"
                          />
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>
                            Telefone
                            <C.RequiredMark title={requiredTitle}>*</C.RequiredMark>
                          </C.FieldSpan>
                          <C.Input
                            value={form.responsavel_tecnico_telefone}
                            onChange={(event) =>
                              updateField("responsavel_tecnico_telefone", event.target.value)
                            }
                            inputMode="tel"
                            placeholder="819984163086"
                          />
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>UF</C.FieldSpan>
                          <C.Input
                            value={form.responsavel_tecnico_uf}
                            onChange={(event) =>
                              updateField(
                                "responsavel_tecnico_uf",
                                event.target.value.toUpperCase().slice(0, 2)
                              )
                            }
                            placeholder="PE"
                          />
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>Logradouro</C.FieldSpan>
                          <C.Input
                            value={form.responsavel_tecnico_logradouro}
                            onChange={(event) =>
                              updateField("responsavel_tecnico_logradouro", event.target.value)
                            }
                            placeholder="Rua nova Baraunas"
                          />
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>Número</C.FieldSpan>
                          <C.Input
                            value={form.responsavel_tecnico_numero}
                            onChange={(event) =>
                              updateField("responsavel_tecnico_numero", event.target.value)
                            }
                            placeholder="451"
                          />
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>Bairro</C.FieldSpan>
                          <C.Input
                            value={form.responsavel_tecnico_bairro}
                            onChange={(event) =>
                              updateField("responsavel_tecnico_bairro", event.target.value)
                            }
                            placeholder="nova caruaru"
                          />
                        </C.Field>

                        <C.Field>
                          <C.FieldSpan>Cidade</C.FieldSpan>
                          <C.Input
                            value={form.responsavel_tecnico_cidade}
                            onChange={(event) =>
                              updateField("responsavel_tecnico_cidade", event.target.value)
                            }
                            placeholder="Caruaru"
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

                  {activeTab === "mensagens" ? (
                    <C.SectionBody>
                      <C.CardHeader>
                        <C.CardTitle>Conexão do WhatsApp</C.CardTitle>
                      </C.CardHeader>

                      <C.SubTabs>
                        <C.SubTabButton
                          type="button"
                          $active={activeMensagemTab === "conectar"}
                          onClick={() => setActiveMensagemTab("conectar")}
                        >
                          Conexão
                        </C.SubTabButton>
                        <C.SubTabButton
                          type="button"
                          $active={activeMensagemTab === "mensagens"}
                          onClick={() => setActiveMensagemTab("mensagens")}
                        >
                          Mensagens padrão
                        </C.SubTabButton>
                      </C.SubTabs>

                      {activeMensagemTab === "conectar" ? (
                        <>
                          <C.ConnectionCard>
                            <C.FieldsGrid>
                              <C.Field>
                                <C.FieldSpan>Nome da instância do WhatsApp</C.FieldSpan>
                                <C.Input
                                  value={form.whatsapp_instance_name}
                                  onChange={(event) =>
                                    updateField("whatsapp_instance_name", event.target.value)
                                  }
                                  placeholder="Ex.: v12-filial-centro"
                                />
                              </C.Field>

                              <C.Field>
                                <C.FieldSpan>Status</C.FieldSpan>
                                <C.StatusPill $status={whatsappResumo.status}>
                                  <C.StatusDot $status={whatsappResumo.status} />
                                  <span>
                                    {whatsappResumo.status === "open"
                                      ? "Conectado"
                                      : whatsappResumo.status === "connecting"
                                      ? "Aguardando leitura"
                                      : whatsappResumo.status === "not_found"
                                      ? "Instância não encontrada"
                                      : whatsappResumo.status === "close"
                                      ? "Desconectado"
                                      : "Sem status"}
                                  </span>
                                </C.StatusPill>
                              </C.Field>
                            </C.FieldsGrid>

                            <C.FieldsGrid>
                              <C.Field>
                                <C.FieldSpan>Número do WhatsApp</C.FieldSpan>
                                <C.Input
                                  value={form.whatsapp_remetente_numero}
                                  onChange={(event) =>
                                    updateField("whatsapp_remetente_numero", event.target.value)
                                  }
                                  placeholder="5511999999999"
                                />
                              </C.Field>

                              <C.Field>
                                <C.FieldSpan>Ação</C.FieldSpan>
                                <C.ConnectionActions>
                                  <C.PrimaryInlineButton
                                    type="button"
                                    onClick={
                                      isWhatsAppConnected
                                        ? handleDisconnectWhatsApp
                                        : handleConnectWhatsApp
                                    }
                                    disabled={whatsAppState.loading}
                                  >
                                    {whatsAppState.loading
                                      ? "Processando..."
                                      : isWhatsAppConnected
                                      ? "Desconectar"
                                      : "Salvar e conectar"}
                                  </C.PrimaryInlineButton>

                                  {canRestartWhatsApp ? (
                                    <C.IconButton
                                      type="button"
                                      title="Reiniciar conexão"
                                      aria-label="Reiniciar conexão"
                                      onClick={handleRestartWhatsApp}
                                      disabled={whatsAppState.loading}
                                    >
                                      ↻
                                    </C.IconButton>
                                  ) : null}

                                  {canDeleteWhatsApp ? (
                                    <C.IconButton
                                      type="button"
                                      title="Excluir instância"
                                      aria-label="Excluir instância"
                                      onClick={handleDeleteWhatsApp}
                                      disabled={whatsAppState.loading}
                                    >
                                      🗑
                                    </C.IconButton>
                                  ) : null}
                                </C.ConnectionActions>
                              </C.Field>
                            </C.FieldsGrid>
                          </C.ConnectionCard>
                        </>
                      ) : null}

                      {activeMensagemTab === "mensagens" ? (
                        <>
                          <C.ToggleList>
                            <C.ToggleRow>
                              <C.Checkbox
                                type="checkbox"
                                checked={form.whatsapp_ativo}
                                onChange={(event) =>
                                  updateField("whatsapp_ativo", event.target.checked)
                                }
                              />
                              <span>Ativar envio de mensagens por WhatsApp nesta filial</span>
                            </C.ToggleRow>

                            <C.ToggleRow>
                              <C.Checkbox
                                type="checkbox"
                                checked={form.whatsapp_auto_enviar_boleto_venda}
                                onChange={(event) =>
                                  updateField(
                                    "whatsapp_auto_enviar_boleto_venda",
                                    event.target.checked
                                  )
                                }
                              />
                              <span>Sugerir envio de boletos ao concluir uma venda</span>
                            </C.ToggleRow>

                            <C.ToggleRow>
                              <C.Checkbox
                                type="checkbox"
                                checked={form.whatsapp_auto_enviar_pix_venda}
                                onChange={(event) =>
                                  updateField(
                                    "whatsapp_auto_enviar_pix_venda",
                                    event.target.checked
                                  )
                                }
                              />
                              <span>Sugerir envio de PIX ao concluir uma venda</span>
                            </C.ToggleRow>
                          </C.ToggleList>

                          <C.FieldsGrid>
                            <C.Field>
                              <C.FieldSpan>Mensagem padrão do boleto</C.FieldSpan>
                              <C.Textarea
                                value={form.whatsapp_mensagem_boleto_padrao}
                                onChange={(event) =>
                                  updateField("whatsapp_mensagem_boleto_padrao", event.target.value)
                                }
                                placeholder="Use {nome}, {titulo_id} e {boletos}"
                              />
                            </C.Field>

                            <C.Field>
                              <C.FieldSpan>Mensagem padrão do PIX</C.FieldSpan>
                              <C.Textarea
                                value={form.whatsapp_mensagem_pix_padrao}
                                onChange={(event) =>
                                  updateField("whatsapp_mensagem_pix_padrao", event.target.value)
                                }
                                placeholder="Use {nome}, {titulo_id}, {parcela}, {valor}, {vencimento} e {pix_copia_cola}"
                              />
                            </C.Field>
                          </C.FieldsGrid>
                        </>
                      ) : null}
                    </C.SectionBody>
                  ) : null}
                </C.Card>

                <C.ActionRow>
                  <C.PrimaryButton type="submit" disabled={saving}>
                    {saving ? "Salvando configuração..." : "Salvar configurações"}
                  </C.PrimaryButton>
                </C.ActionRow>
              </C.Form>
            </C.Layout>
          )}
        </C.Body>
      </C.Content>
    </C.Shell>
  );
};
