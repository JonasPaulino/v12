import React from "react";
import AsyncSearchSelect from "components/asyncSearchSelect";
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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

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
    importingFile,
    preview,
    produtoVinculos,
    produtosSelecionados,
    fileInputRef,
    loadSolicitacoes,
    handleBuscarChave,
    handleAtualizarSolicitacao,
    handleImportarSolicitacao,
    handleSelectXml,
    handleSelectProdutoVinculo,
    loadProdutosOptions,
    handleConfirmarImportacao,
    closePreview,
  } = useModalImportarNota({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <C.Overlay>
      <C.Modal>
        <C.Header>
          <C.TitleBlock>
            <C.Title>Importar nota</C.Title>
            <C.Subtitle>
              Consulte XML por chave via SEFAZ ou importe um arquivo XML já recebido.
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
          {preview ? (
            <C.PreviewPanel>
              <C.PreviewHeader>
                <div>
                  <C.Title>Conferir XML da NF-e</C.Title>
                  <C.Hint>
                    Confirme o fornecedor e vincule os produtos do XML aos produtos internos antes
                    de gerar a entrada.
                  </C.Hint>
                </div>
                <C.StatusChip $tone={preview.data?.precisa_vinculo_produto ? "warning" : "success"}>
                  {preview.data?.precisa_vinculo_produto ? "Vínculo pendente" : "Pronto"}
                </C.StatusChip>
              </C.PreviewHeader>

              <C.SummaryGrid>
                <C.SummaryCard>
                  <C.MetaText>Fornecedor</C.MetaText>
                  <C.MainText>{preview.data?.fornecedor?.nome || "--"}</C.MainText>
                  <C.MetaText>
                    {preview.data?.fornecedor?.documento || "--"} ·{" "}
                    {preview.data?.fornecedor?.cadastrado
                      ? "já cadastrado"
                      : "será cadastrado automaticamente"}
                  </C.MetaText>
                </C.SummaryCard>
                <C.SummaryCard>
                  <C.MetaText>NF-e</C.MetaText>
                  <C.MainText>
                    {preview.data?.serie_nfe || "--"}/{preview.data?.numero_nfe || "--"}
                  </C.MainText>
                  <C.MetaText>{shortKey(preview.data?.chave_acesso)}</C.MetaText>
                </C.SummaryCard>
                <C.SummaryCard>
                  <C.MetaText>Total XML</C.MetaText>
                  <C.MainText>{currencyFormatter.format(Number(preview.data?.valor_xml || 0))}</C.MainText>
                  <C.MetaText>{preview.data?.data_emissao_nfe || "Sem data de emissão"}</C.MetaText>
                </C.SummaryCard>
              </C.SummaryGrid>

              <C.ProductTable>
                <C.ProductHeader>
                  <div>Produto no XML</div>
                  <div>Qtde</div>
                  <div>Total</div>
                  <div>Produto interno</div>
                </C.ProductHeader>

                {(preview.data?.items || []).map((item) => (
                  <C.ProductRow key={item.codigo_xml}>
                    <div>
                      <C.MainText>{item.descricao_xml || "--"}</C.MainText>
                      <C.MetaText>
                        Código XML: {item.codigo_xml} · NCM: {item.ncm || "--"} ·{" "}
                        {item.unidade_xml || "--"}
                      </C.MetaText>
                    </div>
                    <C.MainText>{decimalFormatter.format(Number(item.quantidade || 0))}</C.MainText>
                    <C.MainText>{currencyFormatter.format(Number(item.valor_total || 0))}</C.MainText>
                    <AsyncSearchSelect
                      value={produtoVinculos[item.codigo_xml] || ""}
                      selectedOption={produtosSelecionados[item.codigo_xml] || item.produto || null}
                      onSelect={(value, produto) =>
                        handleSelectProdutoVinculo(item.codigo_xml, value, produto)
                      }
                      loadOptions={loadProdutosOptions}
                      placeholder="Vincule um produto"
                      searchPlaceholder="Digite código ou descrição"
                      emptyMessage="Nenhum produto encontrado."
                      minChars={0}
                      getOptionValue={(option) => option.produto_id}
                      getOptionLabel={(option) =>
                        `${option.codigo_interno} - ${option.descricao}`
                      }
                      getOptionMeta={(option) =>
                        `${option.unidade_sigla || "--"} · ${currencyFormatter.format(
                          Number(option.preco_compra || 0)
                        )}`
                      }
                    />
                  </C.ProductRow>
                ))}
              </C.ProductTable>

              <C.PreviewActions>
                <C.SecondaryButton type="button" onClick={closePreview} disabled={submitting}>
                  Voltar
                </C.SecondaryButton>
                <C.PrimaryButton
                  type="button"
                  onClick={handleConfirmarImportacao}
                  disabled={submitting}
                >
                  {submitting ? "Importando..." : "Confirmar entrada"}
                </C.PrimaryButton>
              </C.PreviewActions>
            </C.PreviewPanel>
          ) : activeTab === "chave" ? (
            <>
              <C.KeySearchRow>
                <C.Field>
                  <C.FieldSpan>Chave de acesso da NF-e</C.FieldSpan>
                  <C.Input
                    value={chaveAcesso}
                    onChange={(event) => setChaveAcesso(event.target.value)}
                    placeholder="Informe os 44 dígitos da chave"
                  />
                </C.Field>
                <C.PrimaryButton type="button" onClick={handleBuscarChave} disabled={submitting}>
                  Buscar
                </C.PrimaryButton>
              </C.KeySearchRow>

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
