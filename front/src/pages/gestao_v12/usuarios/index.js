import React, { useCallback, useEffect, useMemo, useState } from "react";
import DropdownMenu from "components/dropDownMenu";
import Paginacao from "components/paginacao";
import { api } from "api/axiosConfig";
import { useSweetAlert } from "context/sweet_alert";
import { GestaoV12Layout } from "layouts/gestao_v12";
import * as C from "./style";

const perfilLabel = {
  admin: "Administrador",
  suporte: "Suporte",
  financeiro: "Financeiro",
  vendedor: "Vendedor",
};

export const GestaoV12Usuarios = () => {
  const { showAlert } = useSweetAlert();
  const [usuarios, setUsuarios] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const rows = useMemo(() => usuarios || [], [usuarios]);

  const loadUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/gestao/usuarios/listar", {
        params: {
          page,
          limit: 12,
          search,
        },
      });

      setUsuarios(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      showAlert?.({
        title: "Falha ao carregar usuários",
        text: error?.response?.data?.message || "Não foi possível listar os usuários internos.",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, showAlert]);

  useEffect(() => {
    loadUsuarios();
  }, [loadUsuarios]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const closeMenu = useCallback(() => {
    setMenuOpenId(null);
    setAnchorEl(null);
  }, []);

  const openMenu = useCallback((usuarioId, element) => {
    setMenuOpenId(usuarioId);
    setAnchorEl(element);
  }, []);

  const openNewUserInfo = () => {
    showAlert?.({
      title: "Cadastro de usuário interno",
      text: "A consulta já está padronizada. O cadastro completo de usuários internos deve ser conectado à regra de acesso da Gestão V12.",
      icon: "info",
    });
  };

  return (
    <GestaoV12Layout
      title="Usuários internos"
      subtitle="Acesso de suporte, financeiro, vendedor e administração da operação V12."
    >
      <C.Stack>
        <C.Toolbar>
          <C.SearchField>
            <C.Label>Pesquisar</C.Label>
            <C.Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, e-mail, login ou perfil"
            />
          </C.SearchField>

          <C.PrimaryButton type="button" onClick={openNewUserInfo}>
            Novo usuário
          </C.PrimaryButton>
        </C.Toolbar>

        <C.Card>
          <C.Scroll>
            <C.Table>
              <C.Head>
                <C.Row>
                  <C.HeaderCell>Código</C.HeaderCell>
                  <C.HeaderCell>Usuário</C.HeaderCell>
                  <C.HeaderCell>Login</C.HeaderCell>
                  <C.HeaderCell>Perfil</C.HeaderCell>
                  <C.HeaderCell>Acesso</C.HeaderCell>
                  <C.HeaderCell>Status</C.HeaderCell>
                  <C.HeaderCell>Ações</C.HeaderCell>
                </C.Row>
              </C.Head>
              <tbody>
                {rows.length ? (
                  rows.map((usuario) => (
                    <C.Row key={usuario.usuario_id}>
                      <C.Cell>#{usuario.usuario_id}</C.Cell>
                      <C.Cell $wrap>
                        <C.Strong>{usuario.usuario_nome}</C.Strong>
                        <C.Meta>{usuario.usuario_email || "--"}</C.Meta>
                      </C.Cell>
                      <C.Cell>{usuario.usuario_username || "--"}</C.Cell>
                      <C.Cell>
                        <C.ProfileBadge>{perfilLabel[usuario.perfil] || usuario.perfil}</C.ProfileBadge>
                      </C.Cell>
                      <C.Cell>
                        <C.Meta>{usuario.usuario_master ? "Master V12" : "Usuário interno"}</C.Meta>
                      </C.Cell>
                      <C.Cell>
                        <C.Status $active={usuario.usuario_ativo && usuario.acesso_gestao_ativo}>
                          {usuario.usuario_ativo && usuario.acesso_gestao_ativo ? "Ativo" : "Inativo"}
                        </C.Status>
                      </C.Cell>
                      <C.Cell>
                        <C.MenuButton
                          type="button"
                          onClick={(event) => openMenu(usuario.usuario_id, event.currentTarget)}
                          aria-label="Ações"
                          title="Ações"
                        >
                          <C.MenuIcon />
                        </C.MenuButton>

                        {menuOpenId === usuario.usuario_id ? (
                          <DropdownMenu
                            open={!!menuOpenId}
                            anchorEl={anchorEl}
                            onClose={closeMenu}
                            minWidth={150}
                            items={[
                              {
                                label: "Ver detalhes",
                                onClick: () => {
                                  closeMenu();
                                  showAlert?.({
                                    title: usuario.usuario_nome,
                                    text: `${usuario.usuario_email || "Sem e-mail"} • ${
                                      perfilLabel[usuario.perfil] || usuario.perfil
                                    }`,
                                    icon: "info",
                                  });
                                },
                              },
                            ]}
                          />
                        ) : null}
                      </C.Cell>
                    </C.Row>
                  ))
                ) : (
                  <C.Row>
                    <C.Cell colSpan={7}>
                      <C.Empty>
                        {loading
                          ? "Carregando usuários..."
                          : "Nenhum usuário interno encontrado na Gestão V12."}
                      </C.Empty>
                    </C.Cell>
                  </C.Row>
                )}
              </tbody>
            </C.Table>
          </C.Scroll>

          <C.Footer>
            <C.FooterInfo>
              {total} registro{total === 1 ? "" : "s"} • Página {page} de {totalPages}
            </C.FooterInfo>
            <Paginacao page={page} totalPages={totalPages} onPageChange={setPage} />
          </C.Footer>
        </C.Card>
      </C.Stack>
    </GestaoV12Layout>
  );
};
