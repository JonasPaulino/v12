import React, { useMemo } from "react";
import Documento from "components/documento";
import Paginacao from "components/paginacao";
import { useTabelaEntradasMercadoria } from "./use";
import * as C from "./style";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
};

const Tabela = ({ search, refreshKey }) => {
  const { entradas, page, setPage, totalPages, sort, toggleSort } =
    useTabelaEntradasMercadoria({
      search,
      refreshKey,
    });
  const rows = useMemo(() => entradas || [], [entradas]);

  return (
    <C.Container>
      <C.Scroll>
        <C.Table>
          <C.Head>
            <C.Row>
              <C.HeaderCell $sortable onClick={() => toggleSort("entrada_mercadoria_id")}>
                Entrada
                <C.SortFlag $active={!!sort.entrada_mercadoria_id}>
                  {sort.entrada_mercadoria_id === "ASC"
                    ? "▲"
                    : sort.entrada_mercadoria_id === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("pedido_compra_id")}>
                Pedido
                <C.SortFlag $active={!!sort.pedido_compra_id}>
                  {sort.pedido_compra_id === "ASC"
                    ? "▲"
                    : sort.pedido_compra_id === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("pessoa_nome_razao")}>
                Fornecedor
                <C.SortFlag $active={!!sort.pessoa_nome_razao}>
                  {sort.pessoa_nome_razao === "ASC"
                    ? "▲"
                    : sort.pessoa_nome_razao === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("data_entrada")}>
                Entrada
                <C.SortFlag $active={!!sort.data_entrada}>
                  {sort.data_entrada === "ASC"
                    ? "▲"
                    : sort.data_entrada === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Itens</C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("total")}>
                Total
                <C.SortFlag $active={!!sort.total}>
                  {sort.total === "ASC" ? "▲" : sort.total === "DESC" ? "▼" : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("status")}>
                Status
                <C.SortFlag $active={!!sort.status}>
                  {sort.status === "ASC" ? "▲" : sort.status === "DESC" ? "▼" : "•"}
                </C.SortFlag>
              </C.HeaderCell>
            </C.Row>
          </C.Head>

          <C.Body>
            {rows.length ? (
              rows.map((entrada) => (
                <C.Row key={entrada.entrada_mercadoria_id}>
                  <C.Cell>#{entrada.entrada_mercadoria_id}</C.Cell>
                  <C.Cell>
                    {entrada.pedido_compra_id ? `#${entrada.pedido_compra_id}` : "--"}
                  </C.Cell>
                  <C.Cell $wrap>
                    <C.MainText>{entrada.pessoa_nome_razao}</C.MainText>
                    <C.MetaText>
                      <Documento value={entrada.pessoa_cpf_cnpj} />
                    </C.MetaText>
                  </C.Cell>
                  <C.Cell>{formatDate(entrada.data_entrada)}</C.Cell>
                  <C.Cell>{entrada.total_itens || 0}</C.Cell>
                  <C.Cell>{currencyFormatter.format(Number(entrada.total || 0))}</C.Cell>
                  <C.Cell>
                    <C.Status $tone="success">{entrada.status}</C.Status>
                  </C.Cell>
                </C.Row>
              ))
            ) : (
              <C.Row>
                <C.Cell colSpan={7}>
                  <C.Empty>Nenhuma entrada de mercadoria encontrada.</C.Empty>
                </C.Cell>
              </C.Row>
            )}
          </C.Body>
        </C.Table>
      </C.Scroll>

      <C.Footer>
        <C.FooterInfo>
          Página {page} de {totalPages}
        </C.FooterInfo>

        <Paginacao page={page} totalPages={totalPages} onPageChange={setPage} />
      </C.Footer>
    </C.Container>
  );
};

export default Tabela;

