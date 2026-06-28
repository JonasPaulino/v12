import React, { useCallback, useMemo, useState } from "react";
import Documento from "components/documento";
import DropdownMenu from "components/dropDownMenu";
import Paginacao from "components/paginacao";
import { useTabelaDevolucoes } from "./use";
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

const mapTipoLabel = (tipo) =>
  tipo === "compra" ? "Devolução de compra" : "Devolução de venda";

const mapStatusTone = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "registrada") return "success";
  if (normalized === "cancelada") return "danger";
  return "primary";
};

const sortFlag = (direction) =>
  direction === "ASC" ? "▲" : direction === "DESC" ? "▼" : "•";

const Tabela = ({ search, refreshKey, onEditar, onCanceled }) => {
  const { devolucoes, page, setPage, totalPages, sort, toggleSort, handleCancel } =
    useTabelaDevolucoes({
      search,
      refreshKey,
      onCanceled,
    });
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const openMenu = useCallback((devolucaoId, element) => {
    setMenuOpenId(devolucaoId);
    setAnchorEl(element);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpenId(null);
    setAnchorEl(null);
  }, []);

  const rows = useMemo(() => devolucoes || [], [devolucoes]);

  return (
    <C.Container>
      <C.Scroll>
        <C.Table>
          <C.Head>
            <C.Row>
              <C.HeaderCell $sortable onClick={() => toggleSort("devolucao_mercadoria_id")}>
                Devolução
                <C.SortFlag $active={!!sort.devolucao_mercadoria_id}>
                  {sortFlag(sort.devolucao_mercadoria_id)}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("tipo")}>
                Tipo
                <C.SortFlag $active={!!sort.tipo}>{sortFlag(sort.tipo)}</C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Origem</C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("pessoa_nome_razao")}>
                Pessoa
                <C.SortFlag $active={!!sort.pessoa_nome_razao}>
                  {sortFlag(sort.pessoa_nome_razao)}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("data_devolucao")}>
                Data
                <C.SortFlag $active={!!sort.data_devolucao}>
                  {sortFlag(sort.data_devolucao)}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Itens</C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("total")}>
                Total
                <C.SortFlag $active={!!sort.total}>{sortFlag(sort.total)}</C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("status")}>
                Status
                <C.SortFlag $active={!!sort.status}>{sortFlag(sort.status)}</C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Ações</C.HeaderCell>
            </C.Row>
          </C.Head>

          <C.Body>
            {rows.length ? (
              rows.map((devolucao) => (
                <C.Row key={devolucao.devolucao_mercadoria_id}>
                  <C.Cell>#{devolucao.devolucao_mercadoria_id}</C.Cell>
                  <C.Cell>{mapTipoLabel(devolucao.tipo)}</C.Cell>
                  <C.Cell>
                    {devolucao.tipo === "compra"
                      ? `Entrada #${devolucao.entrada_mercadoria_id}`
                      : `Venda #${devolucao.pedido_venda_id}`}
                  </C.Cell>
                  <C.Cell $wrap>
                    <C.MainText>{devolucao.pessoa_nome_razao}</C.MainText>
                    <C.MetaText>
                      <Documento value={devolucao.pessoa_cpf_cnpj} />
                    </C.MetaText>
                  </C.Cell>
                  <C.Cell>{formatDate(devolucao.data_devolucao)}</C.Cell>
                  <C.Cell>{devolucao.total_itens || 0}</C.Cell>
                  <C.Cell>{currencyFormatter.format(Number(devolucao.total || 0))}</C.Cell>
                  <C.Cell>
                    <C.Status $tone={mapStatusTone(devolucao.status)}>
                      {devolucao.status}
                    </C.Status>
                  </C.Cell>
                  <C.Cell>
                    <C.MenuButton
                      type="button"
                      onClick={(event) =>
                        openMenu(devolucao.devolucao_mercadoria_id, event.currentTarget)
                      }
                      title="Ações"
                      aria-label="Ações"
                    >
                      <C.MenuIcon />
                    </C.MenuButton>

                    {menuOpenId === devolucao.devolucao_mercadoria_id && (
                      <DropdownMenu
                        open={!!menuOpenId}
                        anchorEl={anchorEl}
                        onClose={closeMenu}
                        minWidth={170}
                        items={[
                          {
                            label: "Editar",
                            disabled: devolucao.status === "cancelada",
                            onClick: () => onEditar?.(devolucao.devolucao_mercadoria_id),
                          },
                          {
                            label: "Cancelar",
                            danger: true,
                            disabled: devolucao.status === "cancelada",
                            onClick: () => handleCancel(devolucao),
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
                  <C.Empty>Nenhuma devolução encontrada para a filial ativa.</C.Empty>
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
