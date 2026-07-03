import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import DropdownMenu from "components/dropDownMenu";
import Paginacao from "components/paginacao";
import { api } from "api/axiosConfig";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { GestaoV12Layout } from "layouts/gestao_v12";
import * as C from "./style";

const formatMoney = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("pt-BR");
};

const statusLabel = {
  aberto: "Aberto",
  parcial: "Parcial",
  quitado: "Quitado",
  cancelado: "Cancelado",
  vencido: "Vencido",
};

const statusOptions = [
  { value: "aberto", label: "Aberto" },
  { value: "vencido", label: "Vencido" },
  { value: "parcial", label: "Parcial" },
  { value: "quitado", label: "Quitado" },
  { value: "cancelado", label: "Cancelado" },
];

const isTrue = (value) => value === true || value === "true";

const apiBaseUrl = import.meta.env.VITE_API_URL || "/api";

export const GestaoV12Financeiro = () => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [parcelas, setParcelas] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);
  const [baixaModal, setBaixaModal] = useState(null);
  const [baixaForm, setBaixaForm] = useState({
    valor_pago: "",
    pagamento_em: new Date().toISOString().slice(0, 10),
    observacao: "",
  });

  const rows = useMemo(() => parcelas || [], [parcelas]);
  const selectedStatusOptions = useMemo(
    () => statusOptions.filter((option) => status.includes(option.value)),
    [status]
  );

  const loadParcelas = useCallback(async ({ silent = false } = {}) => {
    setLoading(true);
    if (!silent) showLoading("Carregando financeiro...");
    try {
      const { data } = await api.get("/gestao/financeiro/listar", {
        params: {
          page,
          limit: 12,
          search,
          status: status.join(","),
          sync_asaas: false,
        },
      });

      setParcelas(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      hideLoading();
      showAlert?.({
        title: "Falha ao carregar financeiro",
        text: error?.response?.data?.message || "Não foi possível listar as parcelas.",
        icon: "error",
      });
    } finally {
      setLoading(false);
      if (!silent) hideLoading();
    }
  }, [hideLoading, page, search, showAlert, showLoading, status]);

  useEffect(() => {
    loadParcelas();
  }, [loadParcelas]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!statusDropdownRef.current?.contains(event.target)) {
        setStatusDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleStatus = useCallback((value) => {
    setStatus((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpenId(null);
    setAnchorEl(null);
  }, []);

  const openMenu = useCallback((parcelaId, element) => {
    setMenuOpenId(parcelaId);
    setAnchorEl(element);
  }, []);

  const runAction = async ({ title, request, successText, loadingText = "Processando ação..." }) => {
    closeMenu();
    setActionLoading(true);
    showLoading(loadingText);
    try {
      const { data } = await request();
      hideLoading();
      showAlert?.({
        title,
        text: data?.message || successText,
        icon: "success",
        timer: 1800,
      });
      await loadParcelas({ silent: true });
    } catch (error) {
      hideLoading();
      showAlert?.({
        title: "Ação não concluída",
        text: error?.response?.data?.message || "Não foi possível executar a ação.",
        icon: "error",
      });
    } finally {
      setActionLoading(false);
      hideLoading();
    }
  };

  const gerarCobranca = (parcela, tipo, forceNew = false) =>
    runAction({
      title: tipo === "pix" ? "Pix gerado" : forceNew ? "Boleto atualizado" : "Boleto gerado",
      successText: "Cobrança registrada no Asaas.",
      loadingText: tipo === "pix" ? "Gerando Pix..." : "Gerando boleto...",
      request: () =>
        api.post(`/gestao/financeiro/parcelas/${parcela.parcela_id}/cobranca`, {
          tipo,
          force_new: forceNew,
        }),
    });

  const gerarCarne = (parcela) =>
    runAction({
      title: "Carnê gerado",
      successText: "Carnê registrado no Asaas.",
      loadingText: "Gerando carnê...",
      request: () => api.post(`/gestao/financeiro/titulos/${parcela.titulo_id}/carne`),
    });

  const enviarCarneWhatsApp = (parcela) =>
    runAction({
      title: "Carnê enviado",
      successText: "Carnê enviado por WhatsApp.",
      loadingText: "Enviando carnê...",
      request: () =>
        api.post(`/gestao/financeiro/titulos/${parcela.titulo_id}/carne/enviar-whatsapp`),
    });

  const cancelarCarne = async (parcela) => {
    closeMenu();
    const confirmed = await askYesNoQuestion?.(
      "Cancelar carnê?",
      "As parcelas em aberto do carnê serão canceladas no Asaas. Parcelas pagas ou baixadas não serão alteradas."
    );
    if (!confirmed) return;

    await runAction({
      title: "Carnê cancelado",
      successText: "Parcelas em aberto do carnê foram canceladas.",
      loadingText: "Cancelando carnê...",
      request: () => api.post(`/gestao/financeiro/titulos/${parcela.titulo_id}/carne/cancelar`),
    });
  };

  const cancelarCobranca = async (parcela) => {
    closeMenu();
    const confirmed = await askYesNoQuestion?.(
      "Cancelar cobrança?",
      "A cobrança desta parcela será cancelada no Asaas. Essa ação não representa estorno nem baixa financeira."
    );
    if (!confirmed) return;

    await runAction({
      title: "Cobrança cancelada",
      successText: "Cobrança da parcela cancelada no Asaas.",
      loadingText: "Cancelando cobrança...",
      request: () =>
        api.post(`/gestao/financeiro/parcelas/${parcela.parcela_id}/cobranca/cancelar`),
    });
  };

  const gerarCarneSaldoRestante = async (parcela) => {
    closeMenu();
    const confirmed = await askYesNoQuestion?.(
      "Gerar carnê do saldo restante?",
      "Será criado um novo título financeiro com as parcelas pendentes e um novo carnê será gerado no Asaas."
    );
    if (!confirmed) return;

    await runAction({
      title: "Novo carnê gerado",
      successText: "Carnê do saldo restante gerado no Asaas.",
      loadingText: "Gerando carnê do saldo restante...",
      request: () =>
        api.post(`/gestao/financeiro/titulos/${parcela.titulo_id}/carne/saldo-restante`),
    });
  };

  const atualizarStatus = (parcela) =>
    runAction({
      title: "Status atualizado",
      successText: "Status consultado no Asaas.",
      loadingText: "Consultando status...",
      request: () => api.post(`/gestao/financeiro/parcelas/${parcela.parcela_id}/status`),
    });

  const openBaixaManual = (parcela) => {
    closeMenu();
    setBaixaModal(parcela);
    setBaixaForm({
      valor_pago: String(parcela.valor || ""),
      pagamento_em: new Date().toISOString().slice(0, 10),
      observacao: "",
    });
  };

  const submitBaixaManual = async (event) => {
    event.preventDefault();
    if (!baixaModal) return;

    const confirmed = await askYesNoQuestion?.(
      "Registrar baixa manual?",
      "Essa ação marcará a parcela como paga ou parcialmente paga na Gestão V12."
    );
    if (!confirmed) return;

    await runAction({
      title: "Baixa registrada",
      successText: "Parcela baixada manualmente.",
      loadingText: "Registrando baixa...",
      request: () =>
        api.post(`/gestao/financeiro/parcelas/${baixaModal.parcela_id}/baixar-manual`, baixaForm),
    });

    setBaixaModal(null);
  };

  const openInvoice = (parcela) => {
    closeMenu();
    if (!parcela.asaas_invoice_url) {
      showAlert?.({
        title: "Boleto indisponível",
        text: "Gere ou atualize a cobrança antes de abrir o boleto.",
        icon: "warning",
      });
      return;
    }

    window.open(parcela.asaas_invoice_url, "_blank", "noopener,noreferrer");
  };

  const openCarne = (parcela) => {
    closeMenu();
    if (!parcela.asaas_installment_id) {
      showAlert?.({
        title: "Carnê indisponível",
        text: "Gere o carnê do título antes de baixar o PDF.",
        icon: "warning",
      });
      return;
    }

    window.open(
      `${apiBaseUrl}/gestao/financeiro/titulos/${parcela.titulo_id}/carne/pdf`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const openPix = (parcela) => {
    closeMenu();
    const payload = parcela.asaas_payload?.pix?.payload || "";
    if (!payload) {
      showAlert?.({
        title: "Pix indisponível",
        text: "Gere a cobrança Pix antes de copiar o código.",
        icon: "warning",
      });
      return;
    }

    navigator.clipboard?.writeText(payload);
    showAlert?.({
      title: "Código Pix copiado",
      text: "O código copia e cola foi enviado para a área de transferência.",
      icon: "success",
      timer: 1800,
    });
  };

  return (
    <GestaoV12Layout
      title="Financeiro"
      subtitle="Contas a receber dos clientes V12, cobranças Asaas e baixas manuais."
    >
      <C.Stack>
        <C.Toolbar>
          <C.Field>
            <C.Label>Pesquisar</C.Label>
            <C.Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cliente, documento, título ou contrato"
            />
          </C.Field>

          <C.Field>
            <C.Label>Status</C.Label>
            <C.MultiSelect ref={statusDropdownRef}>
              <C.MultiSelectButton
                type="button"
                onClick={() => setStatusDropdownOpen((current) => !current)}
                aria-expanded={statusDropdownOpen}
                aria-haspopup="listbox"
              >
                <C.MultiSelectValue>
                  {selectedStatusOptions.length ? (
                    selectedStatusOptions.map((option) => (
                      <C.MultiSelectTag key={option.value}>
                        {option.label}
                        <C.TagRemove
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleStatus(option.value);
                          }}
                          aria-label={`Remover ${option.label}`}
                        >
                          x
                        </C.TagRemove>
                      </C.MultiSelectTag>
                    ))
                  ) : (
                    <C.MultiSelectPlaceholder>Todos</C.MultiSelectPlaceholder>
                  )}
                </C.MultiSelectValue>
                <C.MultiSelectArrow $open={statusDropdownOpen} />
              </C.MultiSelectButton>

              {statusDropdownOpen ? (
                <C.MultiSelectPanel role="listbox" aria-multiselectable="true">
                  <C.MultiSelectOption type="button" onClick={() => setStatus([])} $active={!status.length}>
                    <C.OptionCheck $active={!status.length} />
                    Todos
                  </C.MultiSelectOption>
                  {statusOptions.map((option) => {
                    const active = status.includes(option.value);

                    return (
                      <C.MultiSelectOption
                        key={option.value}
                        type="button"
                        onClick={() => toggleStatus(option.value)}
                        $active={active}
                        role="option"
                        aria-selected={active}
                      >
                        <C.OptionCheck $active={active} />
                        {option.label}
                      </C.MultiSelectOption>
                    );
                  })}
                </C.MultiSelectPanel>
              ) : null}
            </C.MultiSelect>
          </C.Field>

          <C.PrimaryButton type="button" onClick={loadParcelas} disabled={loading}>
            {loading ? "Carregando..." : "Pesquisar"}
          </C.PrimaryButton>
        </C.Toolbar>

        <C.Card>
          <C.Scroll>
            <C.Table>
              <C.Head>
                <C.Row>
                  <C.HeaderCell>Cliente</C.HeaderCell>
                  <C.HeaderCell>Filial</C.HeaderCell>
                  <C.HeaderCell>Título</C.HeaderCell>
                  <C.HeaderCell>Parcela</C.HeaderCell>
                  <C.HeaderCell>Vencimento</C.HeaderCell>
                  <C.HeaderCell>Valor</C.HeaderCell>
                  <C.HeaderCell>Status</C.HeaderCell>
                  <C.HeaderCell>Cobrança</C.HeaderCell>
                  <C.HeaderCell>Ações</C.HeaderCell>
                </C.Row>
              </C.Head>
              <tbody>
                {rows.length ? (
                  rows.map((parcela) => {
                    const temCobrancaAtiva = isTrue(parcela.tem_cobranca_ativa);
                    const carneTemCobrancaAtiva =
                      isTrue(parcela.carne_tem_cobranca_ativa) && !!parcela.asaas_installment_id;
                    const tituloTemParcelaPaga = isTrue(parcela.titulo_tem_parcela_paga);
                    const tituloTemPendenteSemCobranca = isTrue(
                      parcela.titulo_tem_pendente_sem_cobranca
                    );
                    const podeGerarCobranca =
                      parcela.status !== "quitado" && parcela.status !== "cancelado";

                    return (
                      <C.Row key={parcela.parcela_id}>
                        <C.Cell $wrap>
                          <C.Strong>{parcela.pessoa_nome || "--"}</C.Strong>
                          <C.Meta>{parcela.pessoa_documento || "--"}</C.Meta>
                        </C.Cell>
                        <C.Cell $wrap>{parcela.tenant_nome || "--"}</C.Cell>
                        <C.Cell $wrap>
                          <C.Strong>{parcela.descricao}</C.Strong>
                          <C.Meta>{parcela.documento || `Título #${parcela.titulo_id}`}</C.Meta>
                        </C.Cell>
                        <C.Cell>{parcela.numero_parcela}</C.Cell>
                        <C.Cell>{formatDate(parcela.vencimento)}</C.Cell>
                        <C.Cell>
                          <C.Strong>{formatMoney(parcela.valor)}</C.Strong>
                          <C.Meta>Pago: {formatMoney(parcela.valor_pago)}</C.Meta>
                        </C.Cell>
                        <C.Cell>
                          <C.Badge $status={parcela.status}>
                            {statusLabel[parcela.status] || parcela.status}
                          </C.Badge>
                        </C.Cell>
                        <C.Cell $wrap>
                          <C.Strong>{parcela.forma_cobranca === "pix" ? "Pix" : "Boleto"}</C.Strong>
                          <C.Meta>
                            {carneTemCobrancaAtiva
                              ? "Carnê gerado"
                              : temCobrancaAtiva
                              ? "Gerada no Asaas"
                              : "Pendente"}
                          </C.Meta>
                        </C.Cell>
                        <C.Cell>
                          <C.MenuButton
                            type="button"
                            onClick={(event) => openMenu(parcela.parcela_id, event.currentTarget)}
                            aria-label="Ações"
                            title="Ações"
                            disabled={actionLoading}
                          >
                            <C.MenuIcon />
                          </C.MenuButton>

                          {menuOpenId === parcela.parcela_id ? (
                            <DropdownMenu
                              open={!!menuOpenId}
                              anchorEl={anchorEl}
                              onClose={closeMenu}
                              minWidth={190}
                              items={[
                                {
                                  label: "Gerar carnê",
                                  disabled: !podeGerarCobranca || !!parcela.asaas_installment_id,
                                  onClick: () => gerarCarne(parcela),
                                },
                                {
                                  label: "Baixar carnê",
                                  disabled: !carneTemCobrancaAtiva,
                                  onClick: () => openCarne(parcela),
                                },
                                {
                                  label: "Enviar carnê WhatsApp",
                                  disabled: !carneTemCobrancaAtiva,
                                  onClick: () => enviarCarneWhatsApp(parcela),
                                },
                                {
                                  label: "Cancelar carnê",
                                  danger: true,
                                  disabled: !carneTemCobrancaAtiva || tituloTemParcelaPaga,
                                  onClick: () => cancelarCarne(parcela),
                                },
                                {
                                  label: "Gerar Carnê saldo",
                                  disabled: !tituloTemPendenteSemCobranca || carneTemCobrancaAtiva,
                                  onClick: () => gerarCarneSaldoRestante(parcela),
                                },
                                {
                                  label: "Gerar boleto",
                                  disabled: !podeGerarCobranca || temCobrancaAtiva,
                                  onClick: () => gerarCobranca(parcela, "boleto", false),
                                },
                                {
                                  label: "Atualizar boleto",
                                  disabled: !temCobrancaAtiva || parcela.status === "quitado",
                                  onClick: () => gerarCobranca(parcela, "boleto", true),
                                },
                                {
                                  label: "Baixar boleto",
                                  disabled: !temCobrancaAtiva || !parcela.asaas_invoice_url,
                                  onClick: () => openInvoice(parcela),
                                },
                                {
                                  label: "Cancelar cobrança",
                                  danger: true,
                                  disabled: !temCobrancaAtiva || parcela.status === "quitado",
                                  onClick: () => cancelarCobranca(parcela),
                                },
                                {
                                  label: "Gerar Pix",
                                  disabled: !podeGerarCobranca,
                                  onClick: () => gerarCobranca(parcela, "pix", true),
                                },
                                {
                                  label: "Copiar Pix",
                                  disabled: !temCobrancaAtiva || !parcela.asaas_payload?.pix?.payload,
                                  onClick: () => openPix(parcela),
                                },
                                {
                                  label: "Ver status",
                                  disabled: !temCobrancaAtiva,
                                  onClick: () => atualizarStatus(parcela),
                                },
                                {
                                  label: "Baixa manual",
                                  disabled:
                                    parcela.status === "quitado" || parcela.status === "cancelado",
                                  onClick: () => openBaixaManual(parcela),
                                },
                              ]}
                            />
                          ) : null}
                        </C.Cell>
                      </C.Row>
                    );
                  })
                ) : (
                  <C.Row>
                    <C.Cell colSpan={9}>
                      <C.Empty>
                        {loading
                          ? "Carregando financeiro..."
                          : "Nenhuma parcela encontrada na Gestão V12."}
                      </C.Empty>
                    </C.Cell>
                  </C.Row>
                )}
              </tbody>
            </C.Table>
          </C.Scroll>

          <C.Footer>
            <C.FooterInfo>
              {total} parcela{total === 1 ? "" : "s"} • Página {page} de {totalPages}
            </C.FooterInfo>
            <Paginacao page={page} totalPages={totalPages} onPageChange={setPage} />
          </C.Footer>
        </C.Card>
      </C.Stack>

      {baixaModal ? (
        <C.ModalOverlay>
          <C.Modal onSubmit={submitBaixaManual}>
            <C.ModalTitle>
              <h2>Baixa manual</h2>
              <p>
                {baixaModal.pessoa_nome || "Cliente"} • Parcela {baixaModal.numero_parcela}
              </p>
            </C.ModalTitle>

            <C.ModalGrid>
              <C.Field>
                <C.Label>Valor pago</C.Label>
                <C.Input
                  value={baixaForm.valor_pago}
                  onChange={(event) =>
                    setBaixaForm((current) => ({ ...current, valor_pago: event.target.value }))
                  }
                  required
                />
              </C.Field>

              <C.Field>
                <C.Label>Data do pagamento</C.Label>
                <C.Input
                  type="date"
                  value={baixaForm.pagamento_em}
                  onChange={(event) =>
                    setBaixaForm((current) => ({ ...current, pagamento_em: event.target.value }))
                  }
                  required
                />
              </C.Field>

              <C.Field>
                <C.Label>Observação</C.Label>
                <C.Input
                  value={baixaForm.observacao}
                  onChange={(event) =>
                    setBaixaForm((current) => ({ ...current, observacao: event.target.value }))
                  }
                  placeholder="Opcional"
                />
              </C.Field>
            </C.ModalGrid>

            <C.ModalFooter>
              <C.SecondaryButton type="button" onClick={() => setBaixaModal(null)}>
                Cancelar
              </C.SecondaryButton>
              <C.PrimaryButton type="submit">Registrar baixa</C.PrimaryButton>
            </C.ModalFooter>
          </C.Modal>
        </C.ModalOverlay>
      ) : null}
    </GestaoV12Layout>
  );
};
