import React, { useCallback, useMemo, useState } from "react";
import DropdownMenu from "components/dropDownMenu";
import { useTabelaNfe } from "./use";
import * as C from "./style";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const mapStatusTone = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (["autorizada"].includes(normalized)) return "success";
  if (["rejeitada", "erro_integracao", "denegada"].includes(normalized)) return "danger";
  if (["cancelamento_pendente", "processando"].includes(normalized)) return "warning";
  return "primary";
};

const canProcessar = (status) =>
  ["rascunho", "erro_integracao", "rejeitada"].includes(String(status || "").toLowerCase());

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
};

const Tabela = ({ search, status, refreshKey, onChanged }) => {
  const {
    nfes,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
    paginationItems,
    handleProcessar,
    handleConsultarStatus,
    handleCancelar,
  } = useTabelaNfe({
    search,
    status,
    refreshKey,
    onChanged,
  });
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const openMenu = useCallback((nfeId, element) => {
    setMenuOpenId(nfeId);
    setAnchorEl(element);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpenId(null);
    setAnchorEl(null);
  }, []);

  const rows = useMemo(() => nfes || [], [nfes]);

  return (
    <C.Container>
      <C.Scroll>
        <C.Table>
          <C.Head>
            <C.Row>
              <C.HeaderCell $sortable onClick={() => toggleSort("nfe_id")}>
                NF-e
                <C.SortFlag $active={!!sort.nfe_id}>
                  {sort.nfe_id === "ASC" ? "▲" : sort.nfe_id === "DESC" ? "▼" : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("pedido_venda_id")}>
                Origem
                <C.SortFlag $active={!!sort.pedido_venda_id}>
                  {sort.pedido_venda_id === "ASC"
                    ? "▲"
                    : sort.pedido_venda_id === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("destinatario_nome")}>
                Destinatário
                <C.SortFlag $active={!!sort.destinatario_nome}>
                  {sort.destinatario_nome === "ASC"
                    ? "▲"
                    : sort.destinatario_nome === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("chave_acesso")}>
                Chave
                <C.SortFlag $active={!!sort.chave_acesso}>
                  {sort.chave_acesso === "ASC"
                    ? "▲"
                    : sort.chave_acesso === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Natureza</C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("criado_em")}>
                Criação
                <C.SortFlag $active={!!sort.criado_em}>
                  {sort.criado_em === "ASC"
                    ? "▲"
                    : sort.criado_em === "DESC"
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
              <C.HeaderCell>Valor</C.HeaderCell>
              <C.HeaderCell>Ações</C.HeaderCell>
            </C.Row>
          </C.Head>

          <C.Body>
            {rows.length ? (
              rows.map((nfe) => (
                <C.Row key={nfe.nfe_id}>
                  <C.Cell $wrap>
                    <C.MainText>#{nfe.nfe_id}</C.MainText>
                    <C.MetaText>
                      {nfe.modelo}/{nfe.serie || "--"}/{nfe.numero || "--"}
                    </C.MetaText>
                  </C.Cell>
                  <C.Cell>
                    <C.OriginTag>
                      {nfe.pedido_venda_id ? `Pedido #${nfe.pedido_venda_id}` : "XML importado"}
                    </C.OriginTag>
                  </C.Cell>
                  <C.Cell $wrap>
                    <C.MainText>{nfe.destinatario_nome_razao || "--"}</C.MainText>
                    <C.MetaText>{nfe.destinatario_cpf_cnpj || "--"}</C.MetaText>
                  </C.Cell>
                  <C.Cell $wrap>
                    <C.MainText>{nfe.chave_acesso || "--"}</C.MainText>
                    <C.MetaText>{nfe.ambiente_nfe === "1" ? "Produção" : "Homologação"}</C.MetaText>
                  </C.Cell>
                  <C.Cell>{nfe.natureza_operacao || "--"}</C.Cell>
                  <C.Cell>{formatDate(nfe.criado_em)}</C.Cell>
                  <C.Cell>
                    <C.Status $tone={mapStatusTone(nfe.status)}>{nfe.status}</C.Status>
                  </C.Cell>
                  <C.Cell>{currencyFormatter.format(Number(nfe.valor_total || 0))}</C.Cell>
                  <C.Cell>
                    <C.MenuButton
                      type="button"
                      onClick={(event) => openMenu(nfe.nfe_id, event.currentTarget)}
                      title="Ações"
                      aria-label="Ações"
                    >
                      <C.MenuIcon />
                    </C.MenuButton>

                    {menuOpenId === nfe.nfe_id && (
                      <DropdownMenu
                        open={!!menuOpenId}
                        anchorEl={anchorEl}
                        onClose={closeMenu}
                        minWidth={210}
                        items={[
                          {
                            label: "Processar emissão",
                            disabled: !canProcessar(nfe.status),
                            onClick: () => handleProcessar(nfe),
                          },
                          {
                            label: "Consultar status",
                            disabled: !nfe.chave_acesso,
                            onClick: () => handleConsultarStatus(nfe),
                          },
                          {
                            label: "Solicitar cancelamento",
                            danger: true,
                            disabled: !["autorizada", "cancelamento_pendente"].includes(
                              String(nfe.status || "").toLowerCase()
                            ),
                            onClick: () => handleCancelar(nfe),
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
                  <C.Empty>Nenhuma NF-e encontrada para os filtros informados.</C.Empty>
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
            Próxima
          </C.PaginationButton>
        </C.Pagination>
      </C.Footer>
    </C.Container>
  );
};

export default Tabela;
