import React, { useCallback, useMemo, useState } from "react";
import Documento from "components/documento";
import DropdownMenu from "components/dropDownMenu";
import Paginacao from "components/paginacao";
import { useTabelaCompras } from "./use";
import * as C from "./style";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const mapStatusTone = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (["quitado", "recebido"].includes(normalized)) return "success";
  if (["parcial", "vencido"].includes(normalized)) return "warning";
  if (["cancelado"].includes(normalized)) return "danger";
  return "primary";
};

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
};

const Tabela = ({ search, refreshKey, onEditar, onDeleted }) => {
  const { compras, page, setPage, totalPages, sort, toggleSort, handleDelete } =
    useTabelaCompras({
      search,
      refreshKey,
      onDeleted,
    });
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const openMenu = useCallback((compraId, element) => {
    setMenuOpenId(compraId);
    setAnchorEl(element);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpenId(null);
    setAnchorEl(null);
  }, []);

  const rows = useMemo(() => compras || [], [compras]);

  return (
    <C.Container>
      <C.Scroll>
        <C.Table>
          <C.Head>
            <C.Row>
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
              <C.HeaderCell $sortable onClick={() => toggleSort("data_emissao")}>
                Emissão
                <C.SortFlag $active={!!sort.data_emissao}>
                  {sort.data_emissao === "ASC"
                    ? "▲"
                    : sort.data_emissao === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Previsão</C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("total")}>
                Total
                <C.SortFlag $active={!!sort.total}>
                  {sort.total === "ASC" ? "▲" : sort.total === "DESC" ? "▼" : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Condição</C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("financeiro_status")}>
                Financeiro
                <C.SortFlag $active={!!sort.financeiro_status}>
                  {sort.financeiro_status === "ASC"
                    ? "▲"
                    : sort.financeiro_status === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("status")}>
                Status
                <C.SortFlag $active={!!sort.status}>
                  {sort.status === "ASC" ? "▲" : sort.status === "DESC" ? "▼" : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Ações</C.HeaderCell>
            </C.Row>
          </C.Head>

          <C.Body>
            {rows.length ? (
              rows.map((compra) => (
                <C.Row key={compra.pedido_compra_id}>
                  <C.Cell>#{compra.pedido_compra_id}</C.Cell>
                  <C.Cell $wrap>
                    <C.MainText>{compra.pessoa_nome_razao}</C.MainText>
                    <C.MetaText>
                      <Documento value={compra.pessoa_cpf_cnpj} />
                    </C.MetaText>
                  </C.Cell>
                  <C.Cell>{formatDate(compra.data_emissao)}</C.Cell>
                  <C.Cell>{formatDate(compra.data_previsao)}</C.Cell>
                  <C.Cell>{currencyFormatter.format(Number(compra.total || 0))}</C.Cell>
                  <C.Cell>{compra.condicao_pagamento_descricao || "--"}</C.Cell>
                  <C.Cell $wrap>
                    <C.Status $tone={mapStatusTone(compra.financeiro_status)}>
                      {compra.financeiro_status || "aguardando entrada"}
                    </C.Status>
                    <C.MetaText>
                      {compra.financeiro_data_vencimento
                        ? `Venc. ${formatDate(compra.financeiro_data_vencimento)}`
                        : "Gerado no recebimento"}
                    </C.MetaText>
                  </C.Cell>
                  <C.Cell>
                    <C.Status $tone={mapStatusTone(compra.status)}>{compra.status}</C.Status>
                  </C.Cell>
                  <C.Cell>
                    <C.MenuButton
                      type="button"
                      onClick={(event) => openMenu(compra.pedido_compra_id, event.currentTarget)}
                      title="Ações"
                      aria-label="Ações"
                    >
                      <C.MenuIcon />
                    </C.MenuButton>

                    {menuOpenId === compra.pedido_compra_id && (
                      <DropdownMenu
                        open={!!menuOpenId}
                        anchorEl={anchorEl}
                        onClose={closeMenu}
                        minWidth={170}
                        items={[
                          {
                            label: "Editar",
                            onClick: () => onEditar(compra.pedido_compra_id),
                          },
                          {
                            label: "Cancelar",
                            danger: true,
                            onClick: () => handleDelete(compra),
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
                  <C.Empty>Nenhum pedido de compra encontrado para a filial ativa.</C.Empty>
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
