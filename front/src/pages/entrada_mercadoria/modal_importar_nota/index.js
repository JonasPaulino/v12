import React from "react";
import { useModalImportarNota } from "./use";
import * as C from "./style";

const STATUS_LABEL = {
  solicitada: "Solicitada",
  consultando: "Consultando",
  aguardando_sefaz: "Aguardando SEFAZ",
  xml_disponivel: "XML disponível",
  resumo_disponivel: "Resumo disponível",
  importada: "Importada",
  erro: "Erro",
};

const statusTone = (status) => {
  if (["xml_disponivel", "importada"].includes(status)) return "success";
  if (["erro"].includes(status)) return "danger";
  return "warning";
};

const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
};

const shortKey = (value) => {
  const key = String(value || "");
  if (key.length <= 16) return key || "--";
  return `${key.slice(0, 8)}...${key.slice(-8)}`;
};

export const ModalImportarNota = ({ isOpen, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    chaveAcesso,
    setChaveAcesso,
    solicitacoes,
    loading,
    submitting,
    searchingKey,
    importingFile,
    fileInputRef,
    loadSolicitacoes,
    handleBuscarChave,
    handleAtualizarSolicitacao,
    handleImportarSolicitacao,
    handleSelectXml,
  } = useModalImportarNota({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <C.Overlay>
      <C.Modal>
        <C.Header>
          <C.TitleBlock>
            <C.Title>Importar nota</C.Title>
            <C.Subtitle>
              Consulte XML por chave via SEFAZ/ACBr ou importe um arquivo XML já recebido.
            </C.Subtitle>
          </C.TitleBlock>

          <C.CloseButton type="button" onClick={() => onClose(false)} disabled={submitting}>
            ×
          </C.CloseButton>
        </C.Header>

        <C.Tabs>
          <C.TabButton
            type="button"
            $active={activeTab === "chave"}
            onClick={() => setActiveTab("chave")}
          >
            Importar com chave
          </C.TabButton>
          <C.TabButton
            type="button"
            $active={activeTab === "arquivo"}
            onClick={() => setActiveTab("arquivo")}
          >
            Importar arquivo XML
          </C.TabButton>
        </C.Tabs>

        <C.Body>
          {activeTab === "chave" ? (
            <>
              <C.SearchRow>
                <C.Field>
                  <C.FieldSpan>Chave de acesso da NF-e</C.FieldSpan>
                  <C.Input
                    value={chaveAcesso}
                    onChange={(event) => setChaveAcesso(event.target.value)}
                    placeholder="Informe os 44 dígitos da chave"
                    disabled={searchingKey}
                  />
                </C.Field>
                <C.PrimaryButton type="button" onClick={handleBuscarChave} disabled={submitting}>
                  {searchingKey ? "Buscando..." : "Buscar"}
                </C.PrimaryButton>
              </C.SearchRow>

              {searchingKey ? (
                <C.SearchFeedback aria-live="polite">
                  <C.SearchPulse />
                  Consultando a SEFAZ pela chave informada...
                </C.SearchFeedback>
              ) : null}

              <C.RequestPanel>
                <C.RequestPanelHeader>
                  <C.MainText>Solicitações de consulta</C.MainText>
                  <C.MetaText>
                    Acompanhe as chaves já consultadas e importe quando o XML completo estiver
                    disponível.
                  </C.MetaText>
                </C.RequestPanelHeader>

                <C.SearchRow>
                  <C.Field>
                    <C.FieldSpan>Pesquisar solicitações</C.FieldSpan>
                    <C.Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Chave, status ou retorno da SEFAZ"
                    />
                  </C.Field>
                  <C.SecondaryButton type="button" onClick={loadSolicitacoes} disabled={loading}>
                    {loading ? "Carregando..." : "Pesquisar"}
                  </C.SecondaryButton>
                </C.SearchRow>

                <C.RequestTable>
                  <C.RequestHeader>
                    <div>Chave</div>
                    <div>Status</div>
                    <div>Retorno</div>
                    <div>Ações</div>
                  </C.RequestHeader>

                  {solicitacoes.length ? (
                    solicitacoes.map((item) => (
                      <C.RequestRow key={item.entrada_xml_solicitacao_id}>
                        <div>
                          <C.MainText>{shortKey(item.chave_acesso)}</C.MainText>
                          <C.MetaText>{formatDateTime(item.atualizado_em)}</C.MetaText>
                        </div>
                        <div>
                          <C.StatusChip $tone={statusTone(item.status)}>
                            {STATUS_LABEL[item.status] || item.status}
                          </C.StatusChip>
                        </div>
                        <div>
                          <C.MainText>{item.cstat || "--"}</C.MainText>
                          <C.MetaText>{item.xmotivo || "Sem retorno detalhado."}</C.MetaText>
                        </div>
                        <C.RequestActions>
                          <C.SmallButton
                            type="button"
                            onClick={() =>
                              handleAtualizarSolicitacao(item.entrada_xml_solicitacao_id)
                            }
                            disabled={submitting || item.status === "importada"}
                          >
                            Atualizar
                          </C.SmallButton>
                          <C.SmallButton
                            type="button"
                            $primary
                            onClick={() =>
                              handleImportarSolicitacao(item.entrada_xml_solicitacao_id)
                            }
                            disabled={submitting || item.status !== "xml_disponivel"}
                          >
                            Usar XML
                          </C.SmallButton>
                        </C.RequestActions>
                      </C.RequestRow>
                    ))
                  ) : (
                    <C.RequestRow>
                      <C.Hint>
                        Nenhuma solicitação encontrada. Informe a chave de acesso para iniciar a
                        consulta.
                      </C.Hint>
                    </C.RequestRow>
                  )}
                </C.RequestTable>
              </C.RequestPanel>
            </>
          ) : (
            <>
              <C.UploadBox onClick={() => fileInputRef.current?.click()}>
                <C.UploadText>
                  <C.Title>Selecionar XML da NF-e</C.Title>
                  <C.Hint>
                    Use esta opção quando você já possui o arquivo XML autorizado enviado pelo
                    fornecedor.
                  </C.Hint>
                  <C.PrimaryButton
                    type="button"
                    disabled={importingFile}
                    onClick={(event) => {
                      event.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    {importingFile ? "Importando..." : "Procurar arquivo XML"}
                  </C.PrimaryButton>
                </C.UploadText>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml,text/xml,application/xml"
                  onChange={handleSelectXml}
                  hidden
                />
              </C.UploadBox>
            </>
          )}
        </C.Body>

        <C.Footer>
          <C.SecondaryButton type="button" onClick={() => onClose(false)} disabled={submitting}>
            Fechar
          </C.SecondaryButton>
        </C.Footer>
      </C.Modal>
    </C.Overlay>
  );
};
