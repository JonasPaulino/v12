import React, { useContext, useState } from "react";
import AsyncSearchSelect from "components/asyncSearchSelect";
import DropdownMenu from "components/dropDownMenu";
import Header from "components/header";
import Paginacao from "components/paginacao";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import { ModalPessoa } from "pages/pessoa/modal_pessoa";
import { useMdfePage } from "./use";
import * as C from "./style";

const tabLabels = {
  manifestos: "MDF-e",
  veiculos: "Veículos",
  motoristas: "Motoristas",
  seguradoras: "Seguradoras",
};

const statusLabels = {
  rascunho: "Rascunho",
  validado: "Validado",
  autorizado: "Autorizado",
  cancelado: "Cancelado",
  encerrado: "Encerrado",
  rejeitado: "Rejeitado",
};

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("pt-BR");
};

const formatDecimal = (value, digits = 2) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value || 0));

const shortKey = (value) => {
  const key = String(value || "");
  return key.length === 44 ? `${key.slice(0, 8)}...${key.slice(-6)}` : key || "--";
};

const getStatusTone = (status) => {
  if (["autorizado", "encerrado"].includes(status)) return "success";
  if (["cancelado", "rejeitado"].includes(status)) return "danger";
  return "info";
};

const canProcessMdfe = (item) => ["rascunho", "rejeitado", "validado"].includes(item.status);

const ActionCell = ({
  type,
  item,
  onEdit,
  onDelete,
  onProcess,
  onOpenDamdfe,
  onCloseMdfe,
  onCancelMdfe,
  processingId,
  closingId,
  cancelingId,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const processing = type === "manifestos" && processingId === item.mdfe_id;
  const closing = type === "manifestos" && closingId === item.mdfe_id;
  const canceling = type === "manifestos" && cancelingId === item.mdfe_id;
  const processable = type === "manifestos" && canProcessMdfe(item);
  const closable = type === "manifestos" && item.status === "autorizado";
  const hasDamdfe =
    type === "manifestos" && ["autorizado", "encerrado"].includes(item.status);

  return (
    <C.Cell>
      <C.MenuButton
        type="button"
        onClick={(event) => {
          setAnchorEl(event.currentTarget);
          setMenuOpen(true);
        }}
        title="Ações"
        aria-label="Ações"
      >
        <C.MenuIcon />
      </C.MenuButton>
      {menuOpen && (
        <DropdownMenu
          open={menuOpen}
          anchorEl={anchorEl}
          onClose={() => setMenuOpen(false)}
          minWidth={170}
          items={[
            ...(processable
              ? [
                  {
                    label: processing ? "Emitindo..." : "Emitir MDF-e",
                    onClick: () => !processing && onProcess(item),
                  },
                ]
              : []),
            ...(closable
              ? [
                  {
                    label: closing ? "Encerrando..." : "Encerrar MDF-e",
                    onClick: () => !closing && onCloseMdfe(item),
                  },
                  {
                    label: canceling ? "Cancelando..." : "Cancelar MDF-e",
                    danger: true,
                    onClick: () => !canceling && onCancelMdfe(item),
                  },
                ]
              : []),
            ...(hasDamdfe
              ? [
                  {
                    label: "Abrir DAMDFE",
                    onClick: () => onOpenDamdfe(item),
                  },
                ]
              : []),
            {
              label: "Editar",
              onClick: () => onEdit(type, item),
            },
            {
              label: type === "manifestos" ? "Excluir" : "Inativar",
              danger: true,
              onClick: () => onDelete(type, item),
            },
          ]}
        />
      )}
    </C.Cell>
  );
};

const TableContent = ({
  activeTab,
  rows,
  page,
  totalPages,
  setPage,
  onEdit,
  onDelete,
  onProcess,
  onOpenDamdfe,
  onCloseMdfe,
  onCancelMdfe,
  processingId,
  closingId,
  cancelingId,
}) => {
  if (activeTab === "manifestos") {
    return (
      <C.TableContainer>
        <C.Scroll>
          <C.Table>
            <C.Head>
              <C.Row>
                <C.HeaderCell>Número</C.HeaderCell>
                <C.HeaderCell>Status</C.HeaderCell>
                <C.HeaderCell>Emissão</C.HeaderCell>
                <C.HeaderCell>Rota</C.HeaderCell>
                <C.HeaderCell>Veículo</C.HeaderCell>
                <C.HeaderCell>Docs</C.HeaderCell>
                <C.HeaderCell>Carga</C.HeaderCell>
                <C.HeaderCell>Chave</C.HeaderCell>
                <C.HeaderCell>Ações</C.HeaderCell>
              </C.Row>
            </C.Head>
            <C.Tbody>
              {rows.length ? (
                rows.map((item) => (
                  <C.Row key={item.mdfe_id}>
                    <C.Cell>
                      <C.MainText>{item.numero || `#${item.mdfe_id}`}</C.MainText>
                      <C.MetaText>Série {item.serie || 1}</C.MetaText>
                    </C.Cell>
                    <C.Cell>
                      <C.Badge $tone={getStatusTone(item.status)}>
                        {statusLabels[item.status] || item.status}
                      </C.Badge>
                    </C.Cell>
                    <C.Cell>{formatDate(item.data_emissao)}</C.Cell>
                    <C.Cell>
                      <C.MainText>
                        {item.uf_inicio} → {item.uf_fim}
                      </C.MainText>
                      <C.MetaText>{item.municipio_carregamento_nome || "--"}</C.MetaText>
                    </C.Cell>
                    <C.Cell>{item.veiculo_placa || "--"}</C.Cell>
                    <C.Cell>{item.documentos_count || item.quantidade_documentos || 0}</C.Cell>
                    <C.Cell>
                      <C.MainText>R$ {formatDecimal(item.valor_total_carga)}</C.MainText>
                      <C.MetaText>{formatDecimal(item.peso_bruto_kg, 3)} kg</C.MetaText>
                    </C.Cell>
                    <C.Cell>{shortKey(item.chave_acesso)}</C.Cell>
                    <ActionCell
                      type="manifestos"
                      item={item}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onProcess={onProcess}
                      onOpenDamdfe={onOpenDamdfe}
                      onCloseMdfe={onCloseMdfe}
                      onCancelMdfe={onCancelMdfe}
                      processingId={processingId}
                      closingId={closingId}
                      cancelingId={cancelingId}
                    />
                  </C.Row>
                ))
              ) : (
                <C.Row>
                  <C.Cell colSpan={9}>
                    <C.Empty>Nenhum MDF-e encontrado.</C.Empty>
                  </C.Cell>
                </C.Row>
              )}
            </C.Tbody>
          </C.Table>
        </C.Scroll>
        <C.Footer>
          <C.FooterInfo>
            Página {page} de {totalPages}
          </C.FooterInfo>
          <Paginacao page={page} totalPages={totalPages} onPageChange={setPage} />
        </C.Footer>
      </C.TableContainer>
    );
  }

  const compact = activeTab !== "veiculos";

  return (
    <C.TableContainer>
      <C.Scroll>
        <C.Table $compact={compact}>
          <C.Head>
            <C.Row>
              {activeTab === "veiculos" && (
                <>
                  <C.HeaderCell>Placa</C.HeaderCell>
                  <C.HeaderCell>UF</C.HeaderCell>
                  <C.HeaderCell>RENAVAM</C.HeaderCell>
                  <C.HeaderCell>Rodado</C.HeaderCell>
                  <C.HeaderCell>Carroceria</C.HeaderCell>
                  <C.HeaderCell>Capacidade</C.HeaderCell>
                  <C.HeaderCell>Status</C.HeaderCell>
                </>
              )}
              {activeTab === "motoristas" && (
                <>
                  <C.HeaderCell>Nome</C.HeaderCell>
                  <C.HeaderCell>CPF</C.HeaderCell>
                  <C.HeaderCell>CNH</C.HeaderCell>
                  <C.HeaderCell>Telefone</C.HeaderCell>
                  <C.HeaderCell>Status</C.HeaderCell>
                </>
              )}
              {activeTab === "seguradoras" && (
                <>
                  <C.HeaderCell>Nome</C.HeaderCell>
                  <C.HeaderCell>CNPJ</C.HeaderCell>
                  <C.HeaderCell>Status</C.HeaderCell>
                </>
              )}
              <C.HeaderCell>Ações</C.HeaderCell>
            </C.Row>
          </C.Head>
          <C.Tbody>
            {rows.length ? (
              rows.map((item) => (
                <C.Row
                  key={
                    item.mdfe_veiculo_id || item.mdfe_motorista_id || item.mdfe_seguradora_id
                  }
                >
                  {activeTab === "veiculos" && (
                    <>
                      <C.Cell>
                        <C.MainText>{item.placa}</C.MainText>
                        <C.MetaText>RNTRC {item.rntrc || "--"}</C.MetaText>
                      </C.Cell>
                      <C.Cell>{item.uf}</C.Cell>
                      <C.Cell>{item.renavam || "--"}</C.Cell>
                      <C.Cell>{item.tipo_rodado}</C.Cell>
                      <C.Cell>{item.tipo_carroceria}</C.Cell>
                      <C.Cell>
                        <C.MainText>{formatDecimal(item.capacidade_kg, 3)} kg</C.MainText>
                        <C.MetaText>{formatDecimal(item.capacidade_m3, 3)} m3</C.MetaText>
                      </C.Cell>
                      <C.Cell>
                        <C.Badge $tone={item.ativo ? "success" : "danger"}>
                          {item.ativo ? "Ativo" : "Inativo"}
                        </C.Badge>
                      </C.Cell>
                    </>
                  )}
                  {activeTab === "motoristas" && (
                    <>
                      <C.Cell $wrap>
                        <C.MainText>{item.nome}</C.MainText>
                      </C.Cell>
                      <C.Cell>{item.cpf}</C.Cell>
                      <C.Cell>{item.cnh || "--"}</C.Cell>
                      <C.Cell>{item.telefone || "--"}</C.Cell>
                      <C.Cell>
                        <C.Badge $tone={item.ativo ? "success" : "danger"}>
                          {item.ativo ? "Ativo" : "Inativo"}
                        </C.Badge>
                      </C.Cell>
                    </>
                  )}
                  {activeTab === "seguradoras" && (
                    <>
                      <C.Cell $wrap>
                        <C.MainText>{item.nome}</C.MainText>
                      </C.Cell>
                      <C.Cell>{item.cnpj}</C.Cell>
                      <C.Cell>
                        <C.Badge $tone={item.ativo ? "success" : "danger"}>
                          {item.ativo ? "Ativo" : "Inativo"}
                        </C.Badge>
                      </C.Cell>
                    </>
                  )}
                  <ActionCell
                    type={activeTab}
                    item={item}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onProcess={onProcess}
                    onOpenDamdfe={onOpenDamdfe}
                    onCloseMdfe={onCloseMdfe}
                    onCancelMdfe={onCancelMdfe}
                    processingId={processingId}
                    closingId={closingId}
                    cancelingId={cancelingId}
                  />
                </C.Row>
              ))
            ) : (
              <C.Row>
                <C.Cell colSpan={8}>
                  <C.Empty>Nenhum registro encontrado.</C.Empty>
                </C.Cell>
              </C.Row>
            )}
          </C.Tbody>
        </C.Table>
      </C.Scroll>
      <C.Footer>
        <C.FooterInfo>
          Página {page} de {totalPages}
        </C.FooterInfo>
        <Paginacao page={page} totalPages={totalPages} onPageChange={setPage} />
      </C.Footer>
    </C.TableContainer>
  );
};

export const Mdfe = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    rows,
    page,
    setPage,
    totalPages,
    modalType,
    editingItem,
    saving,
    checkingStatus,
    processingId,
    closingId,
    cancelingId,
    veiculoForm,
    motoristaForm,
    seguradoraForm,
    manifestoForm,
    veiculoOptions,
    motoristaOptions,
    seguradoraOptions,
    selectedMotoristaPessoa,
    pessoaModalOpen,
    openNew,
    openEdit,
    closeModal,
    openPessoaModal,
    closePessoaModal,
    handleSelectMotoristaPessoa,
    loadPessoasOptions,
    updateVeiculoField,
    updateMotoristaField,
    updateSeguradoraField,
    updateManifestoField,
    updateManifestoArrayItem,
    addManifestoArrayItem,
    removeManifestoArrayItem,
    saveCurrent,
    deleteItem,
    checkMdfeStatusService,
    processManifesto,
    openDamdfe,
    closeManifesto,
    cancelManifesto,
  } = useMdfePage();

  const modalTitle = {
    manifestos: editingItem ? "Editar MDF-e" : "Novo MDF-e",
    veiculos: editingItem ? "Editar veículo" : "Novo veículo",
    motoristas: editingItem ? "Editar motorista" : "Novo motorista",
    seguradoras: editingItem ? "Editar seguradora" : "Nova seguradora",
  }[modalType];

  return (
    <C.Shell>
      <Sidebar />
      {mOpen && <C.Overlay onClick={abreFechaMenu} />}

      <C.Content>
        <Header />
        <C.Body>
          <C.Toolbar>
            <C.ToolbarGroup>
              <C.CreateButton type="button" onClick={() => openNew(activeTab)}>
                Novo {tabLabels[activeTab]}
              </C.CreateButton>
              <C.SecondaryActionButton
                type="button"
                onClick={checkMdfeStatusService}
                disabled={checkingStatus}
              >
                {checkingStatus ? "Consultando..." : "Status SEFAZ"}
              </C.SecondaryActionButton>
            </C.ToolbarGroup>

            <C.ToolbarGroup>
              <C.SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por número, placa, nome, CNPJ ou chave"
              />
            </C.ToolbarGroup>
          </C.Toolbar>

          <C.Tabs>
            {Object.entries(tabLabels).map(([key, label]) => (
              <C.TabButton
                key={key}
                type="button"
                $active={activeTab === key}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </C.TabButton>
            ))}
          </C.Tabs>

          <C.TableArea>
            <TableContent
              activeTab={activeTab}
              rows={rows}
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              onEdit={openEdit}
              onDelete={deleteItem}
              onProcess={processManifesto}
              onOpenDamdfe={openDamdfe}
              onCloseMdfe={closeManifesto}
              onCancelMdfe={cancelManifesto}
              processingId={processingId}
              closingId={closingId}
              cancelingId={cancelingId}
            />
          </C.TableArea>
        </C.Body>
      </C.Content>

      {modalType && (
        <C.ModalOverlay>
          <C.Modal $wide={modalType === "manifestos"}>
            <C.ModalHeader>
              <C.ModalTitleBlock>
                <C.ModalTitle>{modalTitle}</C.ModalTitle>
                <C.ModalSubtitle>
                  {modalType === "manifestos"
                    ? "Rascunho do manifesto de carga com veículo, condutor, percurso e documentos."
                    : "Cadastro base usado na montagem e emissão do MDF-e."}
                </C.ModalSubtitle>
              </C.ModalTitleBlock>
              <C.CloseButton type="button" onClick={closeModal} disabled={saving}>
                ×
              </C.CloseButton>
            </C.ModalHeader>

            <C.ModalBody>
              {modalType === "veiculos" && (
                <C.Grid>
                  <C.Field>
                    <C.FieldSpan>Placa</C.FieldSpan>
                    <C.Input
                      value={veiculoForm.placa}
                      onChange={(event) => updateVeiculoField("placa", event.target.value)}
                      placeholder="ABC1D23"
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>UF</C.FieldSpan>
                    <C.Input
                      value={veiculoForm.uf}
                      onChange={(event) => updateVeiculoField("uf", event.target.value)}
                      maxLength={2}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>RENAVAM</C.FieldSpan>
                    <C.Input
                      value={veiculoForm.renavam || ""}
                      onChange={(event) => updateVeiculoField("renavam", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>RNTRC</C.FieldSpan>
                    <C.Input
                      value={veiculoForm.rntrc || ""}
                      onChange={(event) => updateVeiculoField("rntrc", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Tara KG</C.FieldSpan>
                    <C.Input
                      value={veiculoForm.tara_kg}
                      onChange={(event) => updateVeiculoField("tara_kg", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Capacidade KG</C.FieldSpan>
                    <C.Input
                      value={veiculoForm.capacidade_kg}
                      onChange={(event) => updateVeiculoField("capacidade_kg", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Capacidade M3</C.FieldSpan>
                    <C.Input
                      value={veiculoForm.capacidade_m3}
                      onChange={(event) => updateVeiculoField("capacidade_m3", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Tipo rodado</C.FieldSpan>
                    <C.Input
                      value={veiculoForm.tipo_rodado}
                      onChange={(event) => updateVeiculoField("tipo_rodado", event.target.value)}
                      maxLength={2}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Tipo carroceria</C.FieldSpan>
                    <C.Input
                      value={veiculoForm.tipo_carroceria}
                      onChange={(event) =>
                        updateVeiculoField("tipo_carroceria", event.target.value)
                      }
                      maxLength={2}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Tipo proprietário</C.FieldSpan>
                    <C.Input
                      value={veiculoForm.tipo_proprietario || ""}
                      onChange={(event) =>
                        updateVeiculoField("tipo_proprietario", event.target.value)
                      }
                      maxLength={2}
                    />
                  </C.Field>
                  <C.CheckboxRow>
                    <C.Checkbox
                      type="checkbox"
                      checked={!!veiculoForm.ativo}
                      onChange={(event) => updateVeiculoField("ativo", event.target.checked)}
                    />
                    Veículo ativo
                  </C.CheckboxRow>
                </C.Grid>
              )}

              {modalType === "motoristas" && (
                <C.Grid>
                  <C.FieldFull>
                    <C.FieldSpan>Pessoa</C.FieldSpan>
                    <C.SelectActionRow>
                      <AsyncSearchSelect
                        value={motoristaForm.pessoa_id}
                        selectedOption={selectedMotoristaPessoa}
                        onSelect={handleSelectMotoristaPessoa}
                        loadOptions={loadPessoasOptions}
                        placeholder="Selecione a pessoa motorista"
                        searchPlaceholder="Digite nome ou CPF"
                        emptyMessage="Nenhuma pessoa encontrada."
                        minChars={0}
                        getOptionValue={(option) => option.pessoa_id}
                        getOptionLabel={(option) => option.pessoa_nome_razao}
                        getOptionMeta={(option) => option.pessoa_cpf_cnpj || "Sem CPF"}
                      />
                      <C.SmallActionButton type="button" onClick={openPessoaModal}>
                        Cadastrar
                      </C.SmallActionButton>
                    </C.SelectActionRow>
                  </C.FieldFull>
                  <C.Field>
                    <C.FieldSpan>CPF</C.FieldSpan>
                    <C.Input
                      value={motoristaForm.cpf || selectedMotoristaPessoa?.pessoa_cpf_cnpj || ""}
                      disabled
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Telefone</C.FieldSpan>
                    <C.Input
                      value={motoristaForm.telefone || ""}
                      onChange={(event) => updateMotoristaField("telefone", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>CNH</C.FieldSpan>
                    <C.Input
                      value={motoristaForm.cnh || ""}
                      onChange={(event) => updateMotoristaField("cnh", event.target.value)}
                    />
                  </C.Field>
                  <C.CheckboxRow>
                    <C.Checkbox
                      type="checkbox"
                      checked={!!motoristaForm.ativo}
                      onChange={(event) => updateMotoristaField("ativo", event.target.checked)}
                    />
                    Motorista ativo
                  </C.CheckboxRow>
                </C.Grid>
              )}

              {modalType === "seguradoras" && (
                <C.Grid>
                  <C.FieldFull>
                    <C.FieldSpan>Nome</C.FieldSpan>
                    <C.Input
                      value={seguradoraForm.nome}
                      onChange={(event) => updateSeguradoraField("nome", event.target.value)}
                    />
                  </C.FieldFull>
                  <C.Field>
                    <C.FieldSpan>CNPJ</C.FieldSpan>
                    <C.Input
                      value={seguradoraForm.cnpj}
                      onChange={(event) => updateSeguradoraField("cnpj", event.target.value)}
                    />
                  </C.Field>
                  <C.CheckboxRow>
                    <C.Checkbox
                      type="checkbox"
                      checked={!!seguradoraForm.ativo}
                      onChange={(event) => updateSeguradoraField("ativo", event.target.checked)}
                    />
                    Seguradora ativa
                  </C.CheckboxRow>
                </C.Grid>
              )}

              {modalType === "manifestos" && (
                <>
                  <C.Grid>
                    <C.Field>
                      <C.FieldSpan>Veículo tração</C.FieldSpan>
                      <C.Select
                        value={manifestoForm.veiculo_tracao_id}
                        onChange={(event) =>
                          updateManifestoField("veiculo_tracao_id", event.target.value)
                        }
                      >
                        <option value="">Selecione</option>
                        {veiculoOptions.map((item) => (
                          <option key={item.mdfe_veiculo_id} value={item.mdfe_veiculo_id}>
                            {item.placa} - {item.uf}
                          </option>
                        ))}
                      </C.Select>
                    </C.Field>
                    <C.Field>
                      <C.FieldSpan>Ambiente</C.FieldSpan>
                      <C.Select
                        value={manifestoForm.ambiente}
                        onChange={(event) => updateManifestoField("ambiente", event.target.value)}
                      >
                        <option value="2">Homologação</option>
                        <option value="1">Produção</option>
                      </C.Select>
                    </C.Field>
                    <C.Field>
                      <C.FieldSpan>Tipo transportador</C.FieldSpan>
                      <C.Select
                        value={manifestoForm.tipo_transportador}
                        onChange={(event) =>
                          updateManifestoField("tipo_transportador", event.target.value)
                        }
                      >
                        <option value="">Não informar</option>
                        <option value="1">ETC</option>
                        <option value="2">TAC</option>
                        <option value="3">CTC</option>
                      </C.Select>
                    </C.Field>
                    <C.Field>
                      <C.FieldSpan>Série</C.FieldSpan>
                      <C.Input
                        value={manifestoForm.serie}
                        onChange={(event) => updateManifestoField("serie", event.target.value)}
                      />
                    </C.Field>
                    <C.Field>
                      <C.FieldSpan>Número</C.FieldSpan>
                      <C.Input
                        value={manifestoForm.numero}
                        onChange={(event) => updateManifestoField("numero", event.target.value)}
                        placeholder="Opcional"
                      />
                    </C.Field>
                    <C.Field>
                      <C.FieldSpan>UF início</C.FieldSpan>
                      <C.Input
                        value={manifestoForm.uf_inicio}
                        onChange={(event) => updateManifestoField("uf_inicio", event.target.value)}
                        maxLength={2}
                      />
                    </C.Field>
                    <C.Field>
                      <C.FieldSpan>UF fim</C.FieldSpan>
                      <C.Input
                        value={manifestoForm.uf_fim}
                        onChange={(event) => updateManifestoField("uf_fim", event.target.value)}
                        maxLength={2}
                      />
                    </C.Field>
                    <C.Field>
                      <C.FieldSpan>Código IBGE carregamento</C.FieldSpan>
                      <C.Input
                        value={manifestoForm.municipio_carregamento_codigo}
                        onChange={(event) =>
                          updateManifestoField(
                            "municipio_carregamento_codigo",
                            event.target.value
                          )
                        }
                      />
                    </C.Field>
                    <C.Field>
                      <C.FieldSpan>Município carregamento</C.FieldSpan>
                      <C.Input
                        value={manifestoForm.municipio_carregamento_nome}
                        onChange={(event) =>
                          updateManifestoField(
                            "municipio_carregamento_nome",
                            event.target.value
                          )
                        }
                      />
                    </C.Field>
                    <C.FieldFull>
                      <C.FieldSpan>Observação</C.FieldSpan>
                      <C.Textarea
                        value={manifestoForm.observacao}
                        onChange={(event) =>
                          updateManifestoField("observacao", event.target.value)
                        }
                      />
                    </C.FieldFull>
                  </C.Grid>

                  <C.Section>
                    <C.SectionHeader>
                      <C.SectionTitle>Condutores</C.SectionTitle>
                      <C.MiniButton
                        type="button"
                        onClick={() =>
                          addManifestoArrayItem("condutores", {
                            motorista_id: "",
                            principal: false,
                          })
                        }
                      >
                        Adicionar condutor
                      </C.MiniButton>
                    </C.SectionHeader>
                    {manifestoForm.condutores.map((item, index) => (
                      <C.ArrayCard key={`condutor-${index}`}>
                        <C.ArrayGrid>
                          <C.Field>
                            <C.FieldSpan>Motorista</C.FieldSpan>
                            <C.Select
                              value={item.motorista_id}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "condutores",
                                  index,
                                  "motorista_id",
                                  event.target.value
                                )
                              }
                            >
                              <option value="">Selecione</option>
                              {motoristaOptions.map((motorista) => (
                                <option
                                  key={motorista.mdfe_motorista_id}
                                  value={motorista.mdfe_motorista_id}
                                >
                                  {motorista.nome} - {motorista.cpf}
                                </option>
                              ))}
                            </C.Select>
                          </C.Field>
                          <C.MiniButton
                            type="button"
                            onClick={() => removeManifestoArrayItem("condutores", index)}
                          >
                            Remover
                          </C.MiniButton>
                        </C.ArrayGrid>
                      </C.ArrayCard>
                    ))}
                  </C.Section>

                  <C.Section>
                    <C.SectionHeader>
                      <C.SectionTitle>Municípios de descarga</C.SectionTitle>
                      <C.MiniButton
                        type="button"
                        onClick={() =>
                          addManifestoArrayItem("descargas", {
                            municipio_codigo: "",
                            municipio_nome: "",
                            uf: "",
                          })
                        }
                      >
                        Adicionar descarga
                      </C.MiniButton>
                    </C.SectionHeader>
                    {manifestoForm.descargas.map((item, index) => (
                      <C.ArrayCard key={`descarga-${index}`}>
                        <C.ArrayGrid $columns={4}>
                          <C.Field>
                            <C.FieldSpan>Código IBGE</C.FieldSpan>
                            <C.Input
                              value={item.municipio_codigo}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "descargas",
                                  index,
                                  "municipio_codigo",
                                  event.target.value
                                )
                              }
                            />
                          </C.Field>
                          <C.Field>
                            <C.FieldSpan>Município</C.FieldSpan>
                            <C.Input
                              value={item.municipio_nome}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "descargas",
                                  index,
                                  "municipio_nome",
                                  event.target.value
                                )
                              }
                            />
                          </C.Field>
                          <C.Field>
                            <C.FieldSpan>UF</C.FieldSpan>
                            <C.Input
                              value={item.uf}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "descargas",
                                  index,
                                  "uf",
                                  event.target.value
                                )
                              }
                              maxLength={2}
                            />
                          </C.Field>
                          <C.MiniButton
                            type="button"
                            onClick={() => removeManifestoArrayItem("descargas", index)}
                          >
                            Remover
                          </C.MiniButton>
                        </C.ArrayGrid>
                      </C.ArrayCard>
                    ))}
                  </C.Section>

                  <C.Section>
                    <C.SectionHeader>
                      <C.SectionTitle>Documentos vinculados</C.SectionTitle>
                      <C.MiniButton
                        type="button"
                        onClick={() =>
                          addManifestoArrayItem("documentos", {
                            nfe_id: "",
                            tipo_documento: "nfe",
                            chave_acesso: "",
                            valor_documento: "0",
                            peso_kg: "0",
                            municipio_descarga_codigo: "",
                            municipio_descarga_nome: "",
                          })
                        }
                      >
                        Adicionar documento
                      </C.MiniButton>
                    </C.SectionHeader>
                    {manifestoForm.documentos.map((item, index) => (
                      <C.ArrayCard key={`documento-${index}`}>
                        <C.ArrayGrid $columns={3}>
                          <C.Field>
                            <C.FieldSpan>Tipo</C.FieldSpan>
                            <C.Select
                              value={item.tipo_documento}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "documentos",
                                  index,
                                  "tipo_documento",
                                  event.target.value
                                )
                              }
                            >
                              <option value="nfe">NF-e</option>
                              <option value="cte">CT-e</option>
                            </C.Select>
                          </C.Field>
                          <C.Field>
                            <C.FieldSpan>Valor</C.FieldSpan>
                            <C.Input
                              value={item.valor_documento}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "documentos",
                                  index,
                                  "valor_documento",
                                  event.target.value
                                )
                              }
                            />
                          </C.Field>
                          <C.Field>
                            <C.FieldSpan>Peso KG</C.FieldSpan>
                            <C.Input
                              value={item.peso_kg}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "documentos",
                                  index,
                                  "peso_kg",
                                  event.target.value
                                )
                              }
                            />
                          </C.Field>
                          <C.FieldFull>
                            <C.FieldSpan>Chave de acesso</C.FieldSpan>
                            <C.Input
                              value={item.chave_acesso}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "documentos",
                                  index,
                                  "chave_acesso",
                                  event.target.value
                                )
                              }
                              placeholder="44 dígitos"
                            />
                          </C.FieldFull>
                          <C.MiniButton
                            type="button"
                            onClick={() => removeManifestoArrayItem("documentos", index)}
                          >
                            Remover documento
                          </C.MiniButton>
                        </C.ArrayGrid>
                      </C.ArrayCard>
                    ))}
                  </C.Section>

                  <C.Section>
                    <C.SectionHeader>
                      <C.SectionTitle>Seguro, averbações e CIOT</C.SectionTitle>
                      <C.ArrayGrid>
                        <C.MiniButton
                          type="button"
                          onClick={() =>
                            addManifestoArrayItem("seguros", {
                              seguradora_id: "",
                              responsavel_seguro: "",
                              cnpj_responsavel: "",
                              cpf_responsavel: "",
                              numero_apolice: "",
                              averbacoes_texto: "",
                            })
                          }
                        >
                          Adicionar seguro
                        </C.MiniButton>
                        <C.MiniButton
                          type="button"
                          onClick={() =>
                            addManifestoArrayItem("ciot", {
                              ciot: "",
                              cpf_cnpj_responsavel: "",
                            })
                          }
                        >
                          Adicionar CIOT
                        </C.MiniButton>
                      </C.ArrayGrid>
                    </C.SectionHeader>

                    {manifestoForm.seguros.map((item, index) => (
                      <C.ArrayCard key={`seguro-${index}`}>
                        <C.ArrayGrid $columns={3}>
                          <C.Field>
                            <C.FieldSpan>Seguradora</C.FieldSpan>
                            <C.Select
                              value={item.seguradora_id}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "seguros",
                                  index,
                                  "seguradora_id",
                                  event.target.value
                                )
                              }
                            >
                              <option value="">Selecione</option>
                              {seguradoraOptions.map((seguradora) => (
                                <option
                                  key={seguradora.mdfe_seguradora_id}
                                  value={seguradora.mdfe_seguradora_id}
                                >
                                  {seguradora.nome} - {seguradora.cnpj}
                                </option>
                              ))}
                            </C.Select>
                          </C.Field>
                          <C.Field>
                            <C.FieldSpan>Responsável</C.FieldSpan>
                            <C.Select
                              value={item.responsavel_seguro}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "seguros",
                                  index,
                                  "responsavel_seguro",
                                  event.target.value
                                )
                              }
                            >
                              <option value="">Selecione</option>
                              <option value="1">Emitente</option>
                              <option value="2">Contratante</option>
                            </C.Select>
                          </C.Field>
                          <C.Field>
                            <C.FieldSpan>Apólice</C.FieldSpan>
                            <C.Input
                              value={item.numero_apolice}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "seguros",
                                  index,
                                  "numero_apolice",
                                  event.target.value
                                )
                              }
                            />
                          </C.Field>
                          <C.Field>
                            <C.FieldSpan>CNPJ responsável</C.FieldSpan>
                            <C.Input
                              value={item.cnpj_responsavel}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "seguros",
                                  index,
                                  "cnpj_responsavel",
                                  event.target.value
                                )
                              }
                              placeholder="Obrigatório se contratante PJ"
                            />
                          </C.Field>
                          <C.Field>
                            <C.FieldSpan>CPF responsável</C.FieldSpan>
                            <C.Input
                              value={item.cpf_responsavel}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "seguros",
                                  index,
                                  "cpf_responsavel",
                                  event.target.value
                                )
                              }
                              placeholder="Obrigatório se contratante PF"
                            />
                          </C.Field>
                          <C.FieldFull>
                            <C.FieldSpan>Averbações</C.FieldSpan>
                            <C.Textarea
                              value={item.averbacoes_texto}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "seguros",
                                  index,
                                  "averbacoes_texto",
                                  event.target.value
                                )
                              }
                              placeholder="Uma averbação por linha"
                            />
                          </C.FieldFull>
                          <C.MiniButton
                            type="button"
                            onClick={() => removeManifestoArrayItem("seguros", index)}
                          >
                            Remover seguro
                          </C.MiniButton>
                        </C.ArrayGrid>
                      </C.ArrayCard>
                    ))}

                    {manifestoForm.ciot.map((item, index) => (
                      <C.ArrayCard key={`ciot-${index}`}>
                        <C.ArrayGrid $columns={3}>
                          <C.Field>
                            <C.FieldSpan>CIOT</C.FieldSpan>
                            <C.Input
                              value={item.ciot}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "ciot",
                                  index,
                                  "ciot",
                                  event.target.value
                                )
                              }
                              placeholder="12 dígitos"
                            />
                          </C.Field>
                          <C.Field>
                            <C.FieldSpan>CPF/CNPJ responsável</C.FieldSpan>
                            <C.Input
                              value={item.cpf_cnpj_responsavel}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "ciot",
                                  index,
                                  "cpf_cnpj_responsavel",
                                  event.target.value
                                )
                              }
                            />
                          </C.Field>
                          <C.MiniButton
                            type="button"
                            onClick={() => removeManifestoArrayItem("ciot", index)}
                          >
                            Remover CIOT
                          </C.MiniButton>
                        </C.ArrayGrid>
                      </C.ArrayCard>
                    ))}
                  </C.Section>

                  <C.Section>
                    <C.SectionHeader>
                      <C.SectionTitle>Percurso e reboques</C.SectionTitle>
                    </C.SectionHeader>
                    <C.ArrayGrid>
                      <C.MiniButton
                        type="button"
                        onClick={() => addManifestoArrayItem("percurso", { uf: "" })}
                      >
                        Adicionar UF de percurso
                      </C.MiniButton>
                      <C.MiniButton
                        type="button"
                        onClick={() => addManifestoArrayItem("reboques", { veiculo_id: "" })}
                      >
                        Adicionar reboque
                      </C.MiniButton>
                    </C.ArrayGrid>
                    {manifestoForm.percurso.map((item, index) => (
                      <C.ArrayCard key={`percurso-${index}`}>
                        <C.ArrayGrid>
                          <C.Field>
                            <C.FieldSpan>UF percurso</C.FieldSpan>
                            <C.Input
                              value={item.uf}
                              maxLength={2}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "percurso",
                                  index,
                                  "uf",
                                  event.target.value
                                )
                              }
                            />
                          </C.Field>
                          <C.MiniButton
                            type="button"
                            onClick={() => removeManifestoArrayItem("percurso", index)}
                          >
                            Remover
                          </C.MiniButton>
                        </C.ArrayGrid>
                      </C.ArrayCard>
                    ))}
                    {manifestoForm.reboques.map((item, index) => (
                      <C.ArrayCard key={`reboque-${index}`}>
                        <C.ArrayGrid>
                          <C.Field>
                            <C.FieldSpan>Reboque</C.FieldSpan>
                            <C.Select
                              value={item.veiculo_id}
                              onChange={(event) =>
                                updateManifestoArrayItem(
                                  "reboques",
                                  index,
                                  "veiculo_id",
                                  event.target.value
                                )
                              }
                            >
                              <option value="">Selecione</option>
                              {veiculoOptions.map((veiculo) => (
                                <option
                                  key={veiculo.mdfe_veiculo_id}
                                  value={veiculo.mdfe_veiculo_id}
                                >
                                  {veiculo.placa} - {veiculo.uf}
                                </option>
                              ))}
                            </C.Select>
                          </C.Field>
                          <C.MiniButton
                            type="button"
                            onClick={() => removeManifestoArrayItem("reboques", index)}
                          >
                            Remover
                          </C.MiniButton>
                        </C.ArrayGrid>
                      </C.ArrayCard>
                    ))}
                  </C.Section>
                </>
              )}
            </C.ModalBody>

            <C.ModalFooter>
              <C.SecondaryButton type="button" onClick={closeModal} disabled={saving}>
                Cancelar
              </C.SecondaryButton>
              <C.PrimaryButton type="button" onClick={saveCurrent} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </C.PrimaryButton>
            </C.ModalFooter>
          </C.Modal>
        </C.ModalOverlay>
      )}

      <ModalPessoa
        isOpen={pessoaModalOpen}
        pessoaId={null}
        onClose={closePessoaModal}
      />
    </C.Shell>
  );
};
