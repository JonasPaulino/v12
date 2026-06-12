import React, { useCallback, useMemo, useState } from "react";
import DropdownMenu from "components/dropDownMenu";
import { useTabelaFinanceiro } from "./use";
import * as C from "./style";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
};

const formatStatus = (status) => {
  if (!status) return "--";
  return String(status).charAt(0).toUpperCase() + String(status).slice(1);
};

const Tabela = ({ search, tipo, status, refreshKey, onEditar, onResumoChange }) => {
  const {
    titulos,
    resumo,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
    paginationItems,
  } = useTabelaFinanceiro({
    search,
    tipo,
    status,
    refreshKey,
  });
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const openMenu = useCallback((financeiroTituloId, element) => {
    setMenuOpenId(financeiroTituloId);
    setAnchorEl(element);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpenId(null);
    setAnchorEl(null);
  }, []);

  const rows = useMemo(() => titulos || [], [titulos]);

  React.useEffect(() => {
    onResumoChange?.(resumo);
  }, [onResumoChange, resumo]);

  return (
    <C.Container>
      <C.Scroll>
        <C.Table>
          <C.Head>
            <C.Row>
              <C.HeaderCell $sortable onClick={() => toggleSort("financeiro_titulo_id")}>
                Codigo
                <C.SortFlag $active={!!sort.financeiro_titulo_id}>
                  {sort.financeiro_titulo_id === "ASC"
                    ? "▲"
                    : sort.financeiro_titulo_id === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("tipo")}>
                Tipo
                <C.SortFlag $active={!!sort.tipo}>
                  {sort.tipo === "ASC" ? "▲" : sort.tipo === "DESC" ? "▼" : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("pessoa_nome_razao")}>
                Pessoa
                <C.SortFlag $active={!!sort.pessoa_nome_razao}>
                  {sort.pessoa_nome_razao === "ASC"
                    ? "▲"
                    : sort.pessoa_nome_razao === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Origem</C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("data_vencimento")}>
                Vencimento
                <C.SortFlag $active={!!sort.data_vencimento}>
                  {sort.data_vencimento === "ASC"
                    ? "▲"
                    : sort.data_vencimento === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("valor_final")}>
                Valor final
                <C.SortFlag $active={!!sort.valor_final}>
                  {sort.valor_final === "ASC"
                    ? "▲"
                    : sort.valor_final === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("saldo")}>
                Saldo
                <C.SortFlag $active={!!sort.saldo}>
                  {sort.saldo === "ASC" ? "▲" : sort.saldo === "DESC" ? "▼" : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("status")}>
                Status
                <C.SortFlag $active={!!sort.status}>
                  {sort.status === "ASC" ? "▲" : sort.status === "DESC" ? "▼" : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Acoes</C.HeaderCell>
            </C.Row>
          </C.Head>

          <C.Body>
            {rows.length ? (
              rows.map((titulo) => (
                <C.Row key={titulo.financeiro_titulo_id}>
                  <C.Cell>{titulo.financeiro_titulo_id}</C.Cell>
                  <C.Cell>
                    <C.TypeBadge $type={titulo.tipo}>
                      {titulo.tipo === "pagar" ? "Pagar" : "Receber"}
                    </C.TypeBadge>
                  </C.Cell>
                  <C.Cell $wrap>
                    <C.PersonName>{titulo.pessoa_nome_razao}</C.PersonName>
                    <C.PersonMeta>
                      {titulo.pessoa_cpf_cnpj || titulo.numero_documento || "Sem documento"}
                    </C.PersonMeta>
                  </C.Cell>
                  <C.Cell>
                    <C.OriginTag>
                      {titulo.pedido_venda_id ? `Pedido #${titulo.pedido_venda_id}` : "Manual"}
                    </C.OriginTag>
                  </C.Cell>
                  <C.Cell>{dateFormatter(titulo.data_vencimento)}</C.Cell>
                  <C.Cell>{currencyFormatter.format(Number(titulo.valor_final || 0))}</C.Cell>
                  <C.Cell>{currencyFormatter.format(Number(titulo.saldo || 0))}</C.Cell>
                  <C.Cell>
                    <C.StatusBadge $status={titulo.status_calculado}>
                      {formatStatus(titulo.status_calculado)}
                    </C.StatusBadge>
                  </C.Cell>
                  <C.Cell>
                    <C.MenuButton
                      type="button"
                      onClick={(event) => openMenu(titulo.financeiro_titulo_id, event.currentTarget)}
                      title="Acoes"
                      aria-label="Acoes"
                    >
                      <C.MenuIcon />
                    </C.MenuButton>

                    {menuOpenId === titulo.financeiro_titulo_id && (
                      <DropdownMenu
                        open={!!menuOpenId}
                        anchorEl={anchorEl}
                        onClose={closeMenu}
                        minWidth={200}
                        items={[
                          {
                            label: "Editar",
                            disabled:
                              !!titulo.pedido_venda_id || Number(titulo.valor_baixado || 0) > 0,
                            onClick: () => onEditar?.(titulo.financeiro_titulo_id),
                          },
                        ]}
                      />
                    )}
                  </C.Cell>
                </C.Row>
              ))
            ) : (
              <C.Row>
                <C.Cell colSpan={9}>
                  <C.Empty>Nenhum titulo encontrado para os filtros informados.</C.Empty>
                </C.Cell>
              </C.Row>
            )}
          </C.Body>
        </C.Table>
      </C.Scroll>

      <C.Footer>
        <C.FooterInfo>
          Pagina {page} de {totalPages}
        </C.FooterInfo>

        <C.Pagination>
          <C.PaginationButton
            type="button"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
          >
            Anterior
          </C.PaginationButton>

          {paginationItems.map((item) =>
            item.type === "dots" ? (
              <C.PaginationButton key={item.value} type="button" disabled>
                ...
              </C.PaginationButton>
            ) : (
              <C.PaginationButton
                key={item.value}
                type="button"
                $active={item.value === page}
                onClick={() => setPage(item.value)}
              >
                {item.value}
              </C.PaginationButton>
            )
          )}

          <C.PaginationButton
            type="button"
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page === totalPages}
          >
            Proxima
          </C.PaginationButton>
        </C.Pagination>
      </C.Footer>
    </C.Container>
  );
};

export default Tabela;
