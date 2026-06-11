import React, { useCallback, useMemo, useState } from "react";
import DropdownMenu from "components/dropDownMenu";
import { useTabelaPessoas } from "./use";
import * as C from "./style";

const buildClassification = (pessoa) => {
  const items = [];

  if (pessoa.pessoa_cliente) items.push({ label: "Cliente", tone: "green" });
  if (pessoa.pessoa_fornecedor) items.push({ label: "Fornecedor", tone: "orange" });
  if (pessoa.pessoa_funcionario) items.push({ label: "Funcionario", tone: "purple" });
  if (pessoa.pessoa_transportadora) items.push({ label: "Transportadora", tone: "blue" });

  return items.length ? items : [{ label: "Sem classificacao", tone: "blue" }];
};

const Tabela = ({ search, refreshKey, onEditar, onDeleted }) => {
  const {
    pessoas,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
    paginationItems,
    handleDelete,
  } = useTabelaPessoas({
    search,
    refreshKey,
    onDeleted,
  });
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const openMenu = useCallback((pessoaId, element) => {
    setMenuOpenId(pessoaId);
    setAnchorEl(element);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpenId(null);
    setAnchorEl(null);
  }, []);

  const rows = useMemo(() => pessoas || [], [pessoas]);

  return (
    <C.Container>
      <C.Scroll>
        <C.Table>
          <C.Head>
            <C.Row>
              <C.HeaderCell $sortable onClick={() => toggleSort("pessoa_id")}>
                Codigo
                <C.SortFlag $active={!!sort.pessoa_id}>
                  {sort.pessoa_id === "ASC" ? "▲" : sort.pessoa_id === "DESC" ? "▼" : "•"}
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
              <C.HeaderCell $sortable onClick={() => toggleSort("pessoa_cpf_cnpj")}>
                Documento
                <C.SortFlag $active={!!sort.pessoa_cpf_cnpj}>
                  {sort.pessoa_cpf_cnpj === "ASC"
                    ? "▲"
                    : sort.pessoa_cpf_cnpj === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Contato</C.HeaderCell>
              <C.HeaderCell>Classificacao</C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("pessoa_ativo")}>
                Status
                <C.SortFlag $active={!!sort.pessoa_ativo}>
                  {sort.pessoa_ativo === "ASC"
                    ? "▲"
                    : sort.pessoa_ativo === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Ações</C.HeaderCell>
            </C.Row>
          </C.Head>

          <C.Body>
            {rows.length ? (
              rows.map((pessoa) => {
                const classifications = buildClassification(pessoa);

                return (
                  <C.Row key={pessoa.pessoa_id}>
                    <C.Cell>#{pessoa.pessoa_id}</C.Cell>
                    <C.Cell $wrap>
                      <C.PessoaNome>{pessoa.pessoa_nome_razao}</C.PessoaNome>
                      <C.PessoaMeta>
                        {pessoa.pessoa_nome_fantasia ||
                          [pessoa.cidade, pessoa.uf].filter(Boolean).join(" / ") ||
                          (pessoa.pessoa_tipo === "J" ? "Pessoa juridica" : "Pessoa fisica")}
                      </C.PessoaMeta>
                    </C.Cell>
                    <C.Cell>{pessoa.pessoa_cpf_cnpj || "--"}</C.Cell>
                    <C.Cell $wrap>
                      <C.PessoaNome>{pessoa.pessoa_email || "--"}</C.PessoaNome>
                      <C.PessoaMeta>{pessoa.pessoa_telefone || pessoa.pessoa_whatsapp || "--"}</C.PessoaMeta>
                    </C.Cell>
                    <C.Cell $wrap>
                      <C.BadgeWrap>
                        {classifications.map((item) => (
                          <C.Badge key={item.label} $tone={item.tone}>
                            {item.label}
                          </C.Badge>
                        ))}
                      </C.BadgeWrap>
                    </C.Cell>
                    <C.Cell>
                      <C.Status $active={pessoa.pessoa_ativo}>
                        {pessoa.pessoa_ativo ? "Ativa" : "Inativa"}
                      </C.Status>
                    </C.Cell>
                    <C.Cell>
                      <C.MenuButton
                        type="button"
                        onClick={(event) => openMenu(pessoa.pessoa_id, event.currentTarget)}
                        title="Ações"
                        aria-label="Ações"
                      >
                        <C.MenuIcon />
                      </C.MenuButton>

                      {menuOpenId === pessoa.pessoa_id && (
                        <DropdownMenu
                          open={!!menuOpenId}
                          anchorEl={anchorEl}
                          onClose={closeMenu}
                          minWidth={170}
                          items={[
                            {
                              label: "Editar",
                              onClick: () => onEditar(pessoa.pessoa_id),
                            },
                            {
                              label: "Remover",
                              danger: true,
                              onClick: () => handleDelete(pessoa),
                            },
                          ]}
                        />
                      )}
                    </C.Cell>
                  </C.Row>
                );
              })
            ) : (
              <C.Row>
                <C.Cell colSpan={7}>
                  <C.Empty>Nenhuma pessoa encontrada para a filial ativa.</C.Empty>
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
