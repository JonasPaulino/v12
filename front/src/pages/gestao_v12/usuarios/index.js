import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import DropdownMenu from "components/dropDownMenu";
import Paginacao from "components/paginacao";
import { api } from "api/axiosConfig";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { GestaoV12Layout } from "layouts/gestao_v12";
import * as C from "./style";

const perfilLabel = {
  admin: "Administrador",
  suporte: "Suporte",
  financeiro: "Financeiro",
  vendedor: "Vendedor",
};

const emptyForm = {
  usuario_nome: "",
  usuario_email: "",
  usuario_username: "",
  usuario_senha: "",
  perfil: "suporte",
  usuario_ativo: true,
};

export const GestaoV12Usuarios = () => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [usuarios, setUsuarios] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const rows = useMemo(() => usuarios || [], [usuarios]);

  const loadUsuarios = useCallback(async () => {
    setLoading(true);
    showLoading("Carregando usuários...");
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
      hideLoading();
      showAlert?.({
        title: "Falha ao carregar usuários",
        text: error?.response?.data?.message || "Não foi possível listar os usuários internos.",
        icon: "error",
      });
    } finally {
      setLoading(false);
      hideLoading();
    }
  }, [hideLoading, page, search, showAlert, showLoading]);

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

  const openNewUser = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setForm(emptyForm);
  };

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    showLoading("Cadastrando usuário...");
    try {
      await api.post("/gestao/usuarios", form);
      hideLoading();
      showAlert?.({
        title: "Usuário cadastrado",
        text: "O usuário foi criado como master da Gestão V12.",
        icon: "success",
        timer: 1800,
      });
      setModalOpen(false);
      setForm(emptyForm);
      await loadUsuarios();
    } catch (error) {
      hideLoading();
      showAlert?.({
        title: "Não foi possível cadastrar",
        text: error?.response?.data?.message || "Revise os dados informados.",
        icon: "error",
      });
    } finally {
      setSaving(false);
      hideLoading();
    }
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

          <C.PrimaryButton type="button" onClick={openNewUser}>
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

      {modalOpen ? (
        <C.ModalOverlay>
          <C.Modal onSubmit={handleSubmit}>
            <C.ModalHeader>
              <C.ModalTitle>
                <h2>Novo usuário interno</h2>
                <p>Usuários cadastrados aqui serão criados como master da Gestão V12.</p>
              </C.ModalTitle>
              <C.CloseButton type="button" onClick={closeModal} aria-label="Fechar">
                ×
              </C.CloseButton>
            </C.ModalHeader>

            <C.ModalBody>
              <C.FormGrid>
                <C.Field>
                  <C.Label>
                    Nome completo <C.Required>*</C.Required>
                  </C.Label>
                  <C.Input
                    value={form.usuario_nome}
                    onChange={(event) => updateField("usuario_nome", event.target.value)}
                    required
                  />
                </C.Field>

                <C.Field>
                  <C.Label>
                    E-mail <C.Required>*</C.Required>
                  </C.Label>
                  <C.Input
                    type="email"
                    value={form.usuario_email}
                    onChange={(event) => updateField("usuario_email", event.target.value)}
                    required
                  />
                </C.Field>

                <C.Field>
                  <C.Label>
                    Login <C.Required>*</C.Required>
                  </C.Label>
                  <C.Input
                    value={form.usuario_username}
                    onChange={(event) => updateField("usuario_username", event.target.value)}
                    required
                  />
                </C.Field>

                <C.Field>
                  <C.Label>
                    Senha inicial <C.Required>*</C.Required>
                  </C.Label>
                  <C.Input
                    type="password"
                    value={form.usuario_senha}
                    onChange={(event) => updateField("usuario_senha", event.target.value)}
                    minLength={6}
                    required
                  />
                </C.Field>

                <C.Field>
                  <C.Label>Perfil interno</C.Label>
                  <C.Select
                    value={form.perfil}
                    onChange={(event) => updateField("perfil", event.target.value)}
                  >
                    <option value="suporte">Suporte</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="vendedor">Vendedor</option>
                    <option value="admin">Administrador</option>
                  </C.Select>
                </C.Field>

                <C.Field>
                  <C.Label>Status</C.Label>
                  <C.Select
                    value={form.usuario_ativo ? "true" : "false"}
                    onChange={(event) =>
                      updateField("usuario_ativo", event.target.value === "true")
                    }
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </C.Select>
                </C.Field>

                <C.FieldFull>
                  <C.InfoBox>
                    Este usuário será salvo como <strong>master</strong>. Ao entrar no login, ele
                    poderá acessar o ambiente Gestão V12.
                  </C.InfoBox>
                </C.FieldFull>
              </C.FormGrid>
            </C.ModalBody>

            <C.ModalFooter>
              <C.SecondaryButton type="button" onClick={closeModal}>
                Cancelar
              </C.SecondaryButton>
              <C.PrimaryButton type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar usuário"}
              </C.PrimaryButton>
            </C.ModalFooter>
          </C.Modal>
        </C.ModalOverlay>
      ) : null}
    </GestaoV12Layout>
  );
};
