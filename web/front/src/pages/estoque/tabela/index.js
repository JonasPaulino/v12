import React, { useCallback, useMemo, useState } from "react";
import DropdownMenu from "components/dropDownMenu";
import Paginacao from "components/paginacao";
import { useTabelaEstoque } from "./use";
import * as C from "./style";

const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

const dateFormatter = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("pt-BR");
};

const getStockTone = (row) => {
  const atual = Number(row.estoque_atual || 0);
  const minimo = Number(row.estoque_minimo || 0);

  if (atual <= 0) return "danger";
  if (minimo > 0 && atual <= minimo) return "warning";
  return "default";
};

const Tabela = ({ activeTab, search, refreshKey, onAjusteProduto }) => {
  const { rows, page, setPage, totalPages, sort, toggleSort } = useTabelaEstoque({
    activeTab,
    search,
    refreshKey,
  });
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const openMenu = useCallback((rowId, element) => {
    setMenuOpenId(rowId);
    setAnchorEl(element);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpenId(null);
    setAnchorEl(null);
  }, []);

  const list = useMemo(() => rows || [], [rows]);

  if (activeTab === "movimentacoes") {
    return (
      <C.Container>
        <C.Scroll>
          <C.Table $wide>
            <C.Head>
              <C.Row>
                <C.HeaderCell $sortable onClick={() => toggleSort("data_movimento")}>
                  Data
                  <C.SortFlag $active={!!sort.data_movimento}>
                    {sort.data_movimento === "ASC"
                      ? "▲"
                      : sort.data_movimento === "DESC"
                      ? "▼"
                      : "•"}
                  </C.SortFlag>
                </C.HeaderCell>
                <C.HeaderCell $sortable onClick={() => toggleSort("descricao")}>
                  Produto
                  <C.SortFlag $active={!!sort.descricao}>
                    {sort.descricao === "ASC" ? "▲" : sort.descricao === "DESC" ? "▼" : "•"}
                  </C.SortFlag>
                </C.HeaderCell>
                <C.HeaderCell $sortable onClick={() => toggleSort("tipo_movimento")}>
                  Movimento
                  <C.SortFlag $active={!!sort.tipo_movimento}>
                    {sort.tipo_movimento === "ASC"
                      ? "▲"
                      : sort.tipo_movimento === "DESC"
                      ? "▼"
                      : "•"}
                  </C.SortFlag>
                </C.HeaderCell>
                <C.HeaderCell $sortable onClick={() => toggleSort("quantidade")}>
                  Quantidade
                  <C.SortFlag $active={!!sort.quantidade}>
                    {sort.quantidade === "ASC"
                      ? "▲"
                      : sort.quantidade === "DESC"
                      ? "▼"
                      : "•"}
                  </C.SortFlag>
                </C.HeaderCell>
                <C.HeaderCell>Saldo</C.HeaderCell>
                <C.HeaderCell>Origem</C.HeaderCell>
                <C.HeaderCell>Observação</C.HeaderCell>
              </C.Row>
            </C.Head>
            <C.Body>
              {list.length ? (
                list.map((movimento) => (
                  <C.Row key={movimento.estoque_movimento_id}>
                    <C.Cell>{dateFormatter(movimento.data_movimento)}</C.Cell>
                    <C.Cell $wrap>
                      <C.MainText>{movimento.produto_descricao}</C.MainText>
                      <C.MetaText>
                        {movimento.codigo_interno} · {movimento.unidade_sigla || "--"}
                      </C.MetaText>
                    </C.Cell>
                    <C.Cell>
                      <C.TypeBadge $operation={movimento.operacao}>
                        {movimento.tipo_movimento_descricao}
                      </C.TypeBadge>
                    </C.Cell>
                    <C.Cell>
                      {decimalFormatter.format(Number(movimento.quantidade || 0))}
                    </C.Cell>
                    <C.Cell>
                      {movimento.saldo_anterior === null
                        ? "--"
                        : decimalFormatter.format(movimento.saldo_anterior)}
                      {" -> "}
                      {movimento.saldo_posterior === null
                        ? "--"
                        : decimalFormatter.format(movimento.saldo_posterior)}
                    </C.Cell>
                    <C.Cell>{movimento.origem || "--"}</C.Cell>
                    <C.Cell $wrap>{movimento.observacao || "--"}</C.Cell>
                  </C.Row>
                ))
              ) : (
                <C.Row>
                  <C.Cell colSpan={7}>
                    <C.Empty>Nenhuma movimentação de estoque encontrada.</C.Empty>
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
  }

  return (
    <C.Container>
      <C.Scroll>
        <C.Table>
          <C.Head>
            <C.Row>
              <C.HeaderCell $sortable onClick={() => toggleSort("codigo_interno")}>
                Código
                <C.SortFlag $active={!!sort.codigo_interno}>
                  {sort.codigo_interno === "ASC"
                    ? "▲"
                    : sort.codigo_interno === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("descricao")}>
                Produto
                <C.SortFlag $active={!!sort.descricao}>
                  {sort.descricao === "ASC" ? "▲" : sort.descricao === "DESC" ? "▼" : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("ncm")}>
                NCM
                <C.SortFlag $active={!!sort.ncm}>
                  {sort.ncm === "ASC" ? "▲" : sort.ncm === "DESC" ? "▼" : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("estoque_atual")}>
                Disponível
                <C.SortFlag $active={!!sort.estoque_atual}>
                  {sort.estoque_atual === "ASC"
                    ? "▲"
                    : sort.estoque_atual === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Reservado</C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("estoque_minimo")}>
                Mínimo
                <C.SortFlag $active={!!sort.estoque_minimo}>
                  {sort.estoque_minimo === "ASC"
                    ? "▲"
                    : sort.estoque_minimo === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Ações</C.HeaderCell>
            </C.Row>
          </C.Head>
          <C.Body>
            {list.length ? (
              list.map((saldo) => (
                <C.Row key={saldo.produto_id}>
                  <C.Cell>{saldo.codigo_interno}</C.Cell>
                  <C.Cell $wrap>
                    <C.MainText>{saldo.descricao}</C.MainText>
                    <C.MetaText>{saldo.unidade_sigla || "--"}</C.MetaText>
                  </C.Cell>
                  <C.Cell>{saldo.ncm || "--"}</C.Cell>
                  <C.Cell>
                    <C.Quantity $tone={getStockTone(saldo)}>
                      {decimalFormatter.format(Number(saldo.estoque_atual || 0))}
                    </C.Quantity>
                  </C.Cell>
                  <C.Cell>{decimalFormatter.format(Number(saldo.estoque_reservado || 0))}</C.Cell>
                  <C.Cell>{decimalFormatter.format(Number(saldo.estoque_minimo || 0))}</C.Cell>
                  <C.Cell>
                    <C.MenuButton
                      type="button"
                      onClick={(event) => openMenu(saldo.produto_id, event.currentTarget)}
                      title="Ações"
                      aria-label="Ações"
                    >
                      <C.MenuIcon />
                    </C.MenuButton>
                    {menuOpenId === saldo.produto_id && (
                      <DropdownMenu
                        open={!!menuOpenId}
                        anchorEl={anchorEl}
                        onClose={closeMenu}
                        minWidth={170}
                        items={[
                          {
                            label: "Ajustar estoque",
                            onClick: () => onAjusteProduto?.(saldo),
                          },
                        ]}
                      />
                    )}
                  </C.Cell>
                </C.Row>
              ))
            ) : (
              <C.Row>
                <C.Cell colSpan={7}>
                  <C.Empty>Nenhum saldo de estoque encontrado para a filial ativa.</C.Empty>
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
