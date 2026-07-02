import React, { useCallback, useEffect, useMemo, useState } from "react";
import Documento from "components/documento";
import DropdownMenu from "components/dropDownMenu";
import Paginacao from "components/paginacao";
import { api } from "api/axiosConfig";
import { useSweetAlert } from "context/sweet_alert";
import { formatTelefone } from "utils";
import { GestaoV12Layout } from "layouts/gestao_v12";
import * as C from "./style";

const emptyForm = {
  pessoa_tipo: "F",
  pessoa_nome_razao: "",
  pessoa_nome_fantasia: "",
  pessoa_cpf_cnpj: "",
  pessoa_rg: "",
  pessoa_inscricao_estadual: "",
  pessoa_inscricao_municipal: "",
  pessoa_email: "",
  pessoa_telefone: "",
  pessoa_whatsapp: "",
  pessoa_data_nascimento: "",
  pessoa_observacao: "",
  pessoa_ativo: true,
  endereco: {
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    codigo_ibge: "",
    pais: "Brasil",
  },
};

const normalizeForm = (data = {}) => ({
  ...emptyForm,
  ...data,
  pessoa_ativo: data.pessoa_ativo !== false,
  endereco: {
    ...emptyForm.endereco,
    ...(data.endereco || {}),
  },
});

export const GestaoV12Pessoas = () => {
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [pessoas, setPessoas] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const rows = useMemo(() => pessoas || [], [pessoas]);

  const loadPessoas = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/gestao/pessoas/listar", {
        params: {
          page,
          limit: 12,
          search,
        },
      });

      setPessoas(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      showAlert?.({
        title: "Falha ao carregar pessoas",
        text: error?.response?.data?.message || "Não foi possível listar as pessoas da gestão.",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, showAlert]);

  useEffect(() => {
    loadPessoas();
  }, [loadPessoas]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const closeMenu = useCallback(() => {
    setMenuOpenId(null);
    setAnchorEl(null);
  }, []);

  const openMenu = useCallback((pessoaId, element) => {
    setMenuOpenId(pessoaId);
    setAnchorEl(element);
  }, []);

  const openNewModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = async (pessoaId) => {
    closeMenu();
    try {
      const { data } = await api.get(`/gestao/pessoas/${pessoaId}`);
      setEditingId(pessoaId);
      setForm(normalizeForm(data.data));
      setModalOpen(true);
    } catch (error) {
      showAlert?.({
        title: "Falha ao carregar pessoa",
        text: error?.response?.data?.message || "Não foi possível carregar os dados.",
        icon: "error",
      });
    }
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateEndereco = (field, value) => {
    setForm((current) => ({
      ...current,
      endereco: {
        ...current.endereco,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/gestao/pessoas/${editingId}`, form);
      } else {
        await api.post("/gestao/pessoas", form);
      }

      showAlert?.({
        title: editingId ? "Pessoa atualizada" : "Pessoa cadastrada",
        text: "Cadastro salvo na Gestão V12.",
        icon: "success",
        timer: 1800,
      });
      closeModal();
      loadPessoas();
    } catch (error) {
      showAlert?.({
        title: "Não foi possível salvar",
        text: error?.response?.data?.message || "Revise os dados informados.",
        icon: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInactive = async (pessoa) => {
    closeMenu();
    const confirmed = await askYesNoQuestion?.(
      "Inativar pessoa?",
      `A pessoa ${pessoa.pessoa_nome_razao} ficará indisponível nos cadastros ativos da Gestão V12.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/gestao/pessoas/${pessoa.pessoa_id}`);
      showAlert?.({
        title: "Pessoa inativada",
        text: "O cadastro foi inativado com sucesso.",
        icon: "success",
        timer: 1800,
      });
      loadPessoas();
    } catch (error) {
      showAlert?.({
        title: "Falha ao inativar",
        text: error?.response?.data?.message || "Não foi possível inativar a pessoa.",
        icon: "error",
      });
    }
  };

  return (
    <GestaoV12Layout
      title="Pessoas"
      subtitle="Cadastro interno de funcionários, fornecedores, parceiros e contatos da V12."
    >
      <C.Stack>
        <C.Toolbar>
          <C.SearchField>
            <C.Label>Pesquisar</C.Label>
            <C.Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, documento, e-mail ou fantasia"
            />
          </C.SearchField>

          <C.PrimaryButton type="button" onClick={openNewModal}>
            Nova pessoa
          </C.PrimaryButton>
        </C.Toolbar>

        <C.Card>
          <C.Scroll>
            <C.Table>
              <C.Head>
                <C.Row>
                  <C.HeaderCell>Código</C.HeaderCell>
                  <C.HeaderCell>Pessoa</C.HeaderCell>
                  <C.HeaderCell>Documento</C.HeaderCell>
                  <C.HeaderCell>Contato</C.HeaderCell>
                  <C.HeaderCell>Cidade</C.HeaderCell>
                  <C.HeaderCell>Status</C.HeaderCell>
                  <C.HeaderCell>Ações</C.HeaderCell>
                </C.Row>
              </C.Head>
              <tbody>
                {rows.length ? (
                  rows.map((pessoa) => (
                    <C.Row key={pessoa.pessoa_id}>
                      <C.Cell>#{pessoa.pessoa_id}</C.Cell>
                      <C.Cell $wrap>
                        <C.PersonName>{pessoa.pessoa_nome_razao}</C.PersonName>
                        <C.PersonMeta>
                          {pessoa.pessoa_nome_fantasia ||
                            (pessoa.pessoa_tipo === "J" ? "Pessoa jurídica" : "Pessoa física")}
                        </C.PersonMeta>
                      </C.Cell>
                      <C.Cell>
                        <Documento value={pessoa.pessoa_cpf_cnpj} />
                      </C.Cell>
                      <C.Cell $wrap>
                        <C.PersonName>{pessoa.pessoa_email || "--"}</C.PersonName>
                        <C.PersonMeta>
                          {formatTelefone(pessoa.pessoa_telefone || pessoa.pessoa_whatsapp) || "--"}
                        </C.PersonMeta>
                      </C.Cell>
                      <C.Cell>
                        {[pessoa.cidade, pessoa.uf].filter(Boolean).join(" / ") || "--"}
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
                          aria-label="Ações"
                          title="Ações"
                        >
                          <C.MenuIcon />
                        </C.MenuButton>

                        {menuOpenId === pessoa.pessoa_id ? (
                          <DropdownMenu
                            open={!!menuOpenId}
                            anchorEl={anchorEl}
                            onClose={closeMenu}
                            minWidth={150}
                            items={[
                              {
                                label: "Editar",
                                onClick: () => openEditModal(pessoa.pessoa_id),
                              },
                              {
                                label: "Inativar",
                                danger: true,
                                disabled: pessoa.pessoa_ativo === false,
                                onClick: () => handleInactive(pessoa),
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
                          ? "Carregando pessoas..."
                          : "Nenhuma pessoa encontrada na Gestão V12."}
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
                <h2>{editingId ? "Editar pessoa" : "Nova pessoa"}</h2>
                <p>Cadastro interno da empresa V12, separado dos clientes do ERP.</p>
              </C.ModalTitle>
              <C.CloseButton type="button" onClick={closeModal} aria-label="Fechar">
                ×
              </C.CloseButton>
            </C.ModalHeader>

            <C.ModalBody>
              <C.FormGrid>
                <C.Field>
                  <C.Label>Tipo de pessoa</C.Label>
                  <C.Select
                    value={form.pessoa_tipo}
                    onChange={(event) => updateField("pessoa_tipo", event.target.value)}
                  >
                    <option value="F">Pessoa física</option>
                    <option value="J">Pessoa jurídica</option>
                  </C.Select>
                </C.Field>

                <C.Field>
                  <C.Label>
                    {form.pessoa_tipo === "J" ? "Razão social" : "Nome completo"}{" "}
                    <C.Required>*</C.Required>
                  </C.Label>
                  <C.Input
                    value={form.pessoa_nome_razao}
                    onChange={(event) => updateField("pessoa_nome_razao", event.target.value)}
                    required
                  />
                </C.Field>

                <C.Field>
                  <C.Label>Apelido / nome fantasia</C.Label>
                  <C.Input
                    value={form.pessoa_nome_fantasia || ""}
                    onChange={(event) => updateField("pessoa_nome_fantasia", event.target.value)}
                  />
                </C.Field>

                <C.Field>
                  <C.Label>
                    {form.pessoa_tipo === "J" ? "CNPJ" : "CPF"} <C.Required>*</C.Required>
                  </C.Label>
                  <C.Input
                    value={form.pessoa_cpf_cnpj}
                    onChange={(event) => updateField("pessoa_cpf_cnpj", event.target.value)}
                    required
                  />
                </C.Field>

                <C.Field>
                  <C.Label>RG</C.Label>
                  <C.Input
                    value={form.pessoa_rg || ""}
                    onChange={(event) => updateField("pessoa_rg", event.target.value)}
                  />
                </C.Field>

                <C.Field>
                  <C.Label>Inscrição estadual</C.Label>
                  <C.Input
                    value={form.pessoa_inscricao_estadual || ""}
                    onChange={(event) =>
                      updateField("pessoa_inscricao_estadual", event.target.value)
                    }
                  />
                </C.Field>

                <C.Field>
                  <C.Label>E-mail</C.Label>
                  <C.Input
                    type="email"
                    value={form.pessoa_email || ""}
                    onChange={(event) => updateField("pessoa_email", event.target.value)}
                  />
                </C.Field>

                <C.Field>
                  <C.Label>Telefone</C.Label>
                  <C.Input
                    value={form.pessoa_telefone || ""}
                    onChange={(event) => updateField("pessoa_telefone", event.target.value)}
                  />
                </C.Field>

                <C.Field>
                  <C.Label>CEP</C.Label>
                  <C.Input
                    value={form.endereco.cep || ""}
                    onChange={(event) => updateEndereco("cep", event.target.value)}
                  />
                </C.Field>

                <C.Field>
                  <C.Label>Logradouro</C.Label>
                  <C.Input
                    value={form.endereco.logradouro || ""}
                    onChange={(event) => updateEndereco("logradouro", event.target.value)}
                  />
                </C.Field>

                <C.Field>
                  <C.Label>Número</C.Label>
                  <C.Input
                    value={form.endereco.numero || ""}
                    onChange={(event) => updateEndereco("numero", event.target.value)}
                  />
                </C.Field>

                <C.Field>
                  <C.Label>Bairro</C.Label>
                  <C.Input
                    value={form.endereco.bairro || ""}
                    onChange={(event) => updateEndereco("bairro", event.target.value)}
                  />
                </C.Field>

                <C.Field>
                  <C.Label>Cidade</C.Label>
                  <C.Input
                    value={form.endereco.cidade || ""}
                    onChange={(event) => updateEndereco("cidade", event.target.value)}
                  />
                </C.Field>

                <C.Field>
                  <C.Label>UF</C.Label>
                  <C.Input
                    value={form.endereco.uf || ""}
                    maxLength={2}
                    onChange={(event) => updateEndereco("uf", event.target.value.toUpperCase())}
                  />
                </C.Field>

                <C.Field>
                  <C.Label>Status</C.Label>
                  <C.Select
                    value={form.pessoa_ativo ? "true" : "false"}
                    onChange={(event) =>
                      updateField("pessoa_ativo", event.target.value === "true")
                    }
                  >
                    <option value="true">Ativa</option>
                    <option value="false">Inativa</option>
                  </C.Select>
                </C.Field>

                <C.FieldFull>
                  <C.Label>Observação</C.Label>
                  <C.TextArea
                    value={form.pessoa_observacao || ""}
                    onChange={(event) => updateField("pessoa_observacao", event.target.value)}
                  />
                </C.FieldFull>
              </C.FormGrid>
            </C.ModalBody>

            <C.ModalFooter>
              <C.SecondaryButton type="button" onClick={closeModal}>
                Cancelar
              </C.SecondaryButton>
              <C.PrimaryButton type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar pessoa"}
              </C.PrimaryButton>
            </C.ModalFooter>
          </C.Modal>
        </C.ModalOverlay>
      ) : null}
    </GestaoV12Layout>
  );
};
