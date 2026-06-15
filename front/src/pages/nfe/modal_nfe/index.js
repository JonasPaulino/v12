import React from "react";
import AsyncSearchSelect from "components/asyncSearchSelect";
import { useModalNfe } from "./use";
import * as C from "./style";

export const ModalNfe = ({ isOpen, supportData, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    submitting,
    emitForm,
    importForm,
    selectedPedido,
    fileInputRef,
    prontidao,
    updateEmitField,
    updateImportField,
    loadPedidosOptions,
    handleSelectPedido,
    handleFileXml,
    handleSubmit,
  } = useModalNfe({
    isOpen,
    supportData,
    onClose,
  });

  const renderRequiredLabel = (label) => (
    <C.FieldSpan>
      {label}
      <C.RequiredMark title="Este campo é obrigatório." aria-label="Campo obrigatório">
        *
      </C.RequiredMark>
    </C.FieldSpan>
  );

  if (!isOpen) return null;

  return (
    <C.Overlay>
      <C.Modal>
        <C.Header>
          <C.TitleBlock>
            <C.Title>Nova NF-e</C.Title>
            <C.Subtitle>
              Registre uma NF-e a partir de pedido de venda ou importe um XML no schema
              fiscal.
            </C.Subtitle>
          </C.TitleBlock>

          <C.CloseButton type="button" onClick={() => onClose(false)} disabled={submitting}>
            ×
          </C.CloseButton>
        </C.Header>

        <C.Tabs>
          <C.TabButton
            type="button"
            $active={activeTab === "emitir"}
            onClick={() => setActiveTab("emitir")}
          >
            Emitir por pedido
          </C.TabButton>
          <C.TabButton
            type="button"
            $active={activeTab === "importar"}
            onClick={() => setActiveTab("importar")}
          >
            Importar XML
          </C.TabButton>
        </C.Tabs>

        <C.Form onSubmit={handleSubmit} noValidate>
          <C.Body>
            <C.StatusCard>
              <C.StatusBadge $ok={prontidao}>
                {prontidao ? "Filial pronta para emitir" : "Revise a configuração fiscal"}
              </C.StatusBadge>
              <C.Hint>
                Emitente: {supportData?.emitente?.pessoa_nome_razao || "--"} • Ambiente:{" "}
                {supportData?.configuracao?.ambiente_nfe === "1" ? "Produção" : "Homologação"} •
                Certificado: {supportData?.certificado?.configurado ? " configurado" : " pendente"}
              </C.Hint>
            </C.StatusCard>

            {activeTab === "emitir" ? (
              <>
                <C.Field>
                  {renderRequiredLabel("Pedido de venda")}
                  <AsyncSearchSelect
                    value={emitForm.pedido_venda_id}
                    selectedOption={selectedPedido}
                    onSelect={handleSelectPedido}
                    loadOptions={loadPedidosOptions}
                    placeholder="Selecione um pedido"
                    searchPlaceholder="Digite número, cliente ou documento"
                    emptyMessage="Nenhum pedido elegível encontrado."
                    minChars={0}
                    getOptionMeta={(option) => option?.meta || ""}
                  />
                </C.Field>

                <C.GridThree>
                  <C.Field>
                    {renderRequiredLabel("Natureza de operação")}
                    <C.Input
                      value={emitForm.natureza_operacao}
                      onChange={(event) =>
                        updateEmitField("natureza_operacao", event.target.value)
                      }
                      placeholder="Ex.: Venda de mercadoria"
                    />
                  </C.Field>

                  <C.Field>
                    {renderRequiredLabel("Finalidade")}
                    <C.Select
                      value={emitForm.finalidade}
                      onChange={(event) => updateEmitField("finalidade", event.target.value)}
                    >
                      <option value="normal">Normal</option>
                      <option value="devolucao">Devolução</option>
                      <option value="ajuste">Ajuste</option>
                      <option value="complementar">Complementar</option>
                    </C.Select>
                  </C.Field>

                  <C.Field>
                    {renderRequiredLabel("Tipo de operação")}
                    <C.Select
                      value={emitForm.tipo_operacao}
                      onChange={(event) => updateEmitField("tipo_operacao", event.target.value)}
                    >
                      <option value="saida">Saída</option>
                      <option value="entrada">Entrada</option>
                    </C.Select>
                  </C.Field>
                </C.GridThree>

                <C.Field>
                  <C.FieldSpan>Observação</C.FieldSpan>
                  <C.Textarea
                    value={emitForm.observacao}
                    onChange={(event) => updateEmitField("observacao", event.target.value)}
                    placeholder="Observação interna da NF-e"
                  />
                </C.Field>
              </>
            ) : (
              <>
                <C.Grid>
                  <C.Field>
                    <C.FieldSpan>Arquivo XML</C.FieldSpan>
                    <C.FileInput ref={fileInputRef} type="file" accept=".xml" onChange={handleFileXml} />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Chave de acesso</C.FieldSpan>
                    <C.Input
                      value={importForm.chave_acesso}
                      onChange={(event) => updateImportField("chave_acesso", event.target.value)}
                      placeholder="Opcional se o XML já tiver a chave"
                    />
                  </C.Field>
                </C.Grid>

                <C.GridThree>
                  <C.Field>
                    {renderRequiredLabel("Natureza de operação")}
                    <C.Input
                      value={importForm.natureza_operacao}
                      onChange={(event) =>
                        updateImportField("natureza_operacao", event.target.value)
                      }
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Origem</C.FieldSpan>
                    <C.Input
                      value={importForm.origem}
                      onChange={(event) => updateImportField("origem", event.target.value)}
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Observação</C.FieldSpan>
                    <C.Input
                      value={importForm.observacao}
                      onChange={(event) => updateImportField("observacao", event.target.value)}
                    />
                  </C.Field>
                </C.GridThree>

                <C.Field>
                  {renderRequiredLabel("Conteúdo XML")}
                  <C.Textarea
                    value={importForm.xml_conteudo}
                    onChange={(event) => updateImportField("xml_conteudo", event.target.value)}
                    placeholder="<NFe>...</NFe>"
                  />
                </C.Field>
              </>
            )}
          </C.Body>

          <C.Footer>
            <C.SecondaryButton type="button" onClick={() => onClose(false)} disabled={submitting}>
              Cancelar
            </C.SecondaryButton>
            <C.PrimaryButton type="submit" disabled={submitting}>
              {submitting
                ? "Salvando..."
                : activeTab === "emitir"
                ? "Registrar NF-e"
                : "Importar XML"}
            </C.PrimaryButton>
          </C.Footer>
        </C.Form>
      </C.Modal>
    </C.Overlay>
  );
};
