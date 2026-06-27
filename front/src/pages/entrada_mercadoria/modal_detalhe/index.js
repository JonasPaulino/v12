import React from "react";
import Documento from "components/documento";
import { useModalDetalheEntradaMercadoria } from "./use";
import * as C from "./style";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
};

const formatNfe = (entrada = {}) => {
  if (entrada.numero_nfe) {
    return `NF ${entrada.serie_nfe ? `${entrada.serie_nfe}/` : ""}${entrada.numero_nfe}`;
  }

  return entrada.chave_acesso ? "NF-e XML" : "--";
};

export const ModalDetalheEntradaMercadoria = ({ entradaMercadoriaId, onClose }) => {
  const isOpen = !!entradaMercadoriaId;
  const { data } = useModalDetalheEntradaMercadoria({ entradaMercadoriaId });
  const entrada = data?.entrada || null;
  const items = data?.items || [];

  if (!isOpen) return null;

  return (
    <C.Overlay>
      <C.Modal>
        <C.Header>
          <C.TitleBlock>
            <C.Title>Detalhes da entrada</C.Title>
            <C.Subtitle>
              Consulte os dados da entrada de mercadoria, NF-e vinculada e itens recebidos.
            </C.Subtitle>
          </C.TitleBlock>

          <C.CloseButton type="button" onClick={onClose}>
            ×
          </C.CloseButton>
        </C.Header>

        <C.Body>
          {entrada ? (
            <>
              <C.DetailsGrid>
                <C.DetailCard>
                  <C.DetailLabel>Entrada</C.DetailLabel>
                  <C.DetailValue>#{entrada.entrada_mercadoria_id}</C.DetailValue>
                </C.DetailCard>

                <C.DetailCard>
                  <C.DetailLabel>Status</C.DetailLabel>
                  <C.DetailValue>{entrada.status || "--"}</C.DetailValue>
                </C.DetailCard>

                <C.DetailCard>
                  <C.DetailLabel>Data</C.DetailLabel>
                  <C.DetailValue>{formatDate(entrada.data_entrada)}</C.DetailValue>
                </C.DetailCard>

                <C.DetailCard>
                  <C.DetailLabel>Total</C.DetailLabel>
                  <C.DetailValue>
                    {currencyFormatter.format(Number(entrada.total || 0))}
                  </C.DetailValue>
                </C.DetailCard>
              </C.DetailsGrid>

              <C.DetailsGrid>
                <C.DetailCard>
                  <C.DetailLabel>Fornecedor</C.DetailLabel>
                  <C.DetailValue>{entrada.pessoa_nome_razao || "--"}</C.DetailValue>
                  <C.Hint>
                    <Documento value={entrada.pessoa_cpf_cnpj} />
                  </C.Hint>
                </C.DetailCard>

                <C.DetailCard>
                  <C.DetailLabel>Pedido de compra</C.DetailLabel>
                  <C.DetailValue>
                    {entrada.pedido_compra_id ? `#${entrada.pedido_compra_id}` : "--"}
                  </C.DetailValue>
                </C.DetailCard>

                <C.DetailCard>
                  <C.DetailLabel>NF-e</C.DetailLabel>
                  <C.DetailValue>{formatNfe(entrada)}</C.DetailValue>
                  <C.Hint>{entrada.chave_acesso || "Sem chave vinculada."}</C.Hint>
                </C.DetailCard>

                <C.DetailCard>
                  <C.DetailLabel>Arquivo XML</C.DetailLabel>
                  <C.DetailValue>{entrada.nome_arquivo_xml || "--"}</C.DetailValue>
                </C.DetailCard>
              </C.DetailsGrid>

              {entrada.observacao && (
                <C.Section>
                  <C.SectionTitle>Observação</C.SectionTitle>
                  <C.Hint>{entrada.observacao}</C.Hint>
                </C.Section>
              )}

              <C.Section>
                <C.SectionTitle>Itens recebidos</C.SectionTitle>
                <C.DetailItemsTable>
                  <C.DetailItemsScroll>
                    <C.ItemsGridDetail>
                      <C.ItemsHeaderDetail>
                        <div>Código</div>
                        <div>Produto</div>
                        <div>Unidade</div>
                        <div>Qtd.</div>
                        <div>Valor unit.</div>
                        <div>Total</div>
                      </C.ItemsHeaderDetail>

                      {items.length ? (
                        items.map((item) => (
                          <C.ItemsRowDetail key={item.entrada_mercadoria_item_id}>
                            <C.ItemText>{item.codigo_interno || item.produto_id}</C.ItemText>
                            <C.ItemText>{item.descricao}</C.ItemText>
                            <C.ItemText>{item.unidade_sigla || "--"}</C.ItemText>
                            <C.ItemText>
                              {decimalFormatter.format(Number(item.quantidade || 0))}
                            </C.ItemText>
                            <C.ItemText>
                              {currencyFormatter.format(Number(item.valor_unitario || 0))}
                            </C.ItemText>
                            <C.ItemText>
                              {currencyFormatter.format(Number(item.valor_total || 0))}
                            </C.ItemText>
                          </C.ItemsRowDetail>
                        ))
                      ) : (
                        <C.ItemsRowDetail>
                          <C.ItemText>--</C.ItemText>
                          <C.ItemText>Nenhum item encontrado.</C.ItemText>
                          <C.ItemText>--</C.ItemText>
                          <C.ItemText>--</C.ItemText>
                          <C.ItemText>--</C.ItemText>
                          <C.ItemText>--</C.ItemText>
                        </C.ItemsRowDetail>
                      )}
                    </C.ItemsGridDetail>
                  </C.DetailItemsScroll>
                </C.DetailItemsTable>
              </C.Section>
            </>
          ) : (
            <C.Hint>Carregando detalhes da entrada...</C.Hint>
          )}
        </C.Body>

        <C.Footer>
          <C.SecondaryButton type="button" onClick={onClose}>
            Fechar
          </C.SecondaryButton>
        </C.Footer>
      </C.Modal>
    </C.Overlay>
  );
};
