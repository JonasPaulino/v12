import React, { useCallback, useMemo, useState } from "react";
import Documento from "components/documento";
import DropdownMenu from "components/dropDownMenu";
import Paginacao from "components/paginacao";
import { useTabelaVendas } from "./use";
import * as C from "./style";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const mapStatusTone = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (["quitado", "faturado"].includes(normalized)) return "success";
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
  const {
    vendas,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
    handleDelete,
    handleDownloadBoletos,
    handleEnviarBoletoWhatsApp,
  } = useTabelaVendas({
    search,
    refreshKey,
    onDeleted,
  });
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const openMenu = useCallback((vendaId, element) => {
    setMenuOpenId(vendaId);
    setAnchorEl(element);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpenId(null);
    setAnchorEl(null);
  }, []);

  const rows = useMemo(() => vendas || [], [vendas]);

  return (
    <C.Container>
      <C.Scroll>
        <C.Table>
          <C.Head>
            <C.Row>
              <C.HeaderCell $sortable onClick={() => toggleSort("pedido_venda_id")}>
                Pedido
                <C.SortFlag $active={!!sort.pedido_venda_id}>
                  {sort.pedido_venda_id === "ASC"
                    ? "▲"
                    : sort.pedido_venda_id === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("pessoa_nome_razao")}>
                Cliente
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
              rows.map((venda) => (
                <C.Row key={venda.pedido_venda_id}>
                  <C.Cell>#{venda.pedido_venda_id}</C.Cell>
                  <C.Cell $wrap>
                    <C.MainText>{venda.pessoa_nome_razao}</C.MainText>
                    <C.MetaText>
                      <Documento value={venda.pessoa_cpf_cnpj} />
                    </C.MetaText>
                  </C.Cell>
                  <C.Cell>{formatDate(venda.data_emissao)}</C.Cell>
                  <C.Cell>{currencyFormatter.format(Number(venda.total || 0))}</C.Cell>
                  <C.Cell>{venda.condicao_pagamento_descricao || "--"}</C.Cell>
                  <C.Cell $wrap>
                    <C.Status $tone={mapStatusTone(venda.financeiro_status)}>
                      {venda.financeiro_status || "aberto"}
                    </C.Status>
                    <C.MetaText>Venc. {formatDate(venda.financeiro_data_vencimento)}</C.MetaText>
                  </C.Cell>
                  <C.Cell>
                    <C.Status $tone={mapStatusTone(venda.status)}>{venda.status}</C.Status>
                  </C.Cell>
                  <C.Cell>
                    <C.MenuButton
                      type="button"
                      onClick={(event) => openMenu(venda.pedido_venda_id, event.currentTarget)}
                      title="Ações"
                      aria-label="Ações"
                    >
                      <C.MenuIcon />
                    </C.MenuButton>

                    {menuOpenId === venda.pedido_venda_id && (
                      <DropdownMenu
                        open={!!menuOpenId}
                        anchorEl={anchorEl}
                        onClose={closeMenu}
                        minWidth={170}
                        items={[
                          {
                            label: "Editar",
                            onClick: () => onEditar(venda.pedido_venda_id),
                          },
                          ...(venda.condicao_gera_boleto
                            ? [
                                {
                                  label: "Baixar boletos",
                                  onClick: () => handleDownloadBoletos(venda),
                                },
                                {
                                  label: "Enviar boleto no WhatsApp",
                                  disabled: !venda.financeiro_titulo_id,
                                  title: venda.financeiro_titulo_id
                                    ? ""
                                    : "Este pedido ainda não possui título financeiro.",
                                  onClick: () => handleEnviarBoletoWhatsApp(venda),
                                },
                              ]
                            : []),
                          {
                            label: "Remover",
                            danger: true,
                            onClick: () => handleDelete(venda),
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
                  <C.Empty>Nenhum pedido de venda encontrado para a filial ativa.</C.Empty>
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
