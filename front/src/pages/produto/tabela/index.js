import React, { useCallback, useMemo, useState } from "react";
import DropdownMenu from "components/dropDownMenu";
import { useTabelaProdutos } from "./use";
import * as C from "./style";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

const Tabela = ({ search, refreshKey, onEditar, onDeleted }) => {
  const {
    produtos,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
    paginationItems,
    handleDelete,
  } = useTabelaProdutos({
    search,
    refreshKey,
    onDeleted,
  });
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const openMenu = useCallback((produtoId, element) => {
    setMenuOpenId(produtoId);
    setAnchorEl(element);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpenId(null);
    setAnchorEl(null);
  }, []);

  const rows = useMemo(() => produtos || [], [produtos]);

  return (
    <C.Container>
      <C.Scroll>
        <C.Table>
          <C.Head>
            <C.Row>
              <C.HeaderCell $sortable onClick={() => toggleSort("codigo_interno")}>
                Codigo
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
              <C.HeaderCell>Unidades</C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("preco_venda")}>
                Preco venda
                <C.SortFlag $active={!!sort.preco_venda}>
                  {sort.preco_venda === "ASC"
                    ? "▲"
                    : sort.preco_venda === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("estoque_atual")}>
                Estoque
                <C.SortFlag $active={!!sort.estoque_atual}>
                  {sort.estoque_atual === "ASC"
                    ? "▲"
                    : sort.estoque_atual === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("ativo")}>
                Status
                <C.SortFlag $active={!!sort.ativo}>
                  {sort.ativo === "ASC" ? "▲" : sort.ativo === "DESC" ? "▼" : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Acoes</C.HeaderCell>
            </C.Row>
          </C.Head>

          <C.Body>
            {rows.length ? (
              rows.map((produto) => (
                <C.Row key={produto.produto_id}>
                  <C.Cell>{produto.codigo_interno}</C.Cell>
                  <C.Cell $wrap>
                    <C.ProductName>{produto.descricao}</C.ProductName>
                    <C.ProductMeta>{produto.descricao_fiscal}</C.ProductMeta>
                  </C.Cell>
                  <C.Cell>{produto.ncm || "--"}</C.Cell>
                  <C.Cell>
                    {produto.unidade_comercial_sigla || "--"} /{" "}
                    {produto.unidade_tributavel_sigla || "--"}
                  </C.Cell>
                  <C.Cell>{currencyFormatter.format(Number(produto.preco_venda || 0))}</C.Cell>
                  <C.Cell>{decimalFormatter.format(Number(produto.estoque_atual || 0))}</C.Cell>
                  <C.Cell>
                    <C.Status $active={produto.ativo}>
                      {produto.ativo ? "Ativo" : "Inativo"}
                    </C.Status>
                  </C.Cell>
                  <C.Cell>
                    <C.MenuButton
                      type="button"
                      onClick={(event) => openMenu(produto.produto_id, event.currentTarget)}
                      title="Acoes"
                      aria-label="Acoes"
                    >
                      <C.MenuIcon />
                    </C.MenuButton>

                    {menuOpenId === produto.produto_id && (
                      <DropdownMenu
                        open={!!menuOpenId}
                        anchorEl={anchorEl}
                        onClose={closeMenu}
                        minWidth={170}
                        items={[
                          {
                            label: "Editar",
                            onClick: () => onEditar(produto.produto_id),
                          },
                          {
                            label: "Remover",
                            danger: true,
                            onClick: () => handleDelete(produto),
                          },
                        ]}
                      />
                    )}
                  </C.Cell>
                </C.Row>
              ))
            ) : (
              <C.Row>
                <C.Cell colSpan={8}>
                  <C.Empty>Nenhum produto encontrado para a filial ativa.</C.Empty>
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
