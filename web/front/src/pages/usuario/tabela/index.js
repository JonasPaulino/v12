import React, { useCallback, useState } from "react";
import DropdownMenu from "components/dropDownMenu";
import Paginacao from "components/paginacao";
import { useTabelaUsuarios } from "./use";
import * as C from "./style";

const Tabela = ({ search, refreshKey, onEditar, onDeleted }) => {
  const {
    usuarios,
    page,
    setPage,
    totalPages,
    sort,
    toggleSort,
    handleDelete,
    currentUserId,
  } = useTabelaUsuarios({
    search,
    refreshKey,
    onDeleted,
  });
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const openMenu = useCallback((usuarioId, element) => {
    setMenuOpenId(usuarioId);
    setAnchorEl(element);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpenId(null);
    setAnchorEl(null);
  }, []);

  return (
    <C.Container>
      <C.Scroll>
        <C.Table>
          <C.Head>
            <C.Row>
              <C.HeaderCell $sortable onClick={() => toggleSort("usuario_id")}>
                Código
                <C.SortFlag $active={!!sort.usuario_id}>
                  {sort.usuario_id === "ASC" ? "▲" : sort.usuario_id === "DESC" ? "▼" : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("usuario_nome")}>
                Usuário
                <C.SortFlag $active={!!sort.usuario_nome}>
                  {sort.usuario_nome === "ASC" ? "▲" : sort.usuario_nome === "DESC" ? "▼" : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("tenant_nome_default")}>
                Filial padrão
                <C.SortFlag $active={!!sort.tenant_nome_default}>
                  {sort.tenant_nome_default === "ASC"
                    ? "▲"
                    : sort.tenant_nome_default === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("usuario_ativo")}>
                Status
                <C.SortFlag $active={!!sort.usuario_ativo}>
                  {sort.usuario_ativo === "ASC" ? "▲" : sort.usuario_ativo === "DESC" ? "▼" : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Ações</C.HeaderCell>
            </C.Row>
          </C.Head>

          <C.Body>
            {usuarios.length ? (
              usuarios.map((usuario) => (
                <C.Row key={usuario.usuario_id}>
                  <C.Cell>#{usuario.usuario_id}</C.Cell>
                  <C.Cell $wrap>
                    <C.UserName>{usuario.usuario_nome}</C.UserName>
                    <C.UserMail>{usuario.usuario_email}</C.UserMail>
                    {usuario.usuario_primeiro_login && (
                      <C.FirstAccessBadge>Primeiro acesso pendente</C.FirstAccessBadge>
                    )}
                  </C.Cell>
                  <C.Cell>{usuario.tenant_nome_default || "--"}</C.Cell>
                  <C.Cell>
                    <C.Status $active={usuario.usuario_ativo}>
                      {usuario.usuario_ativo ? "Ativo" : "Inativo"}
                    </C.Status>
                  </C.Cell>
                  <C.Cell>
                    <C.MenuButton
                      type="button"
                      onClick={(event) => openMenu(usuario.usuario_id, event.currentTarget)}
                      title="Ações"
                      aria-label="Ações"
                    >
                      <C.MenuIcon />
                    </C.MenuButton>

                    {menuOpenId === usuario.usuario_id && (
                      <DropdownMenu
                        open={!!menuOpenId}
                        anchorEl={anchorEl}
                        onClose={closeMenu}
                        minWidth={170}
                        items={[
                          {
                            label: "Editar",
                            onClick: () => onEditar(usuario.usuario_id),
                          },
                          {
                            label: "Remover",
                            danger: true,
                            disabled: usuario.usuario_id === currentUserId,
                            onClick: () => handleDelete(usuario),
                          },
                        ]}
                      />
                    )}
                  </C.Cell>
                </C.Row>
              ))
            ) : (
              <C.Row>
                <C.Cell colSpan={5}>
                  <C.Empty>Nenhum usuário encontrado para a filial ativa.</C.Empty>
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
