import React, { useContext, useEffect, useMemo, useState } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import Paginacao from "components/paginacao";
import { AppContext } from "context";
import { getPdvVenda, listPdvVendas } from "./api";
import * as C from "./style";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("pt-BR");
};

const statusTone = (status) => {
  if (status === "cancelada") return "danger";
  return "primary";
};

const nfceTone = (status) => {
  if (status === "cancelada" || status === "rejeitada") return "danger";
  if (status === "pendente") return "warning";
  return "primary";
};

export const PdvVendas = () => {
  const { mOpen, abreFechaMenu, business } = useContext(AppContext);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const response = await listPdvVendas({
        page,
        limit: 12,
        search,
        status,
      });
      if (!active) return;
      setRows(Array.isArray(response.data) ? response.data : []);
      setTotalPages(Number(response.totalPages || 1));
      const nextSelected =
        (Array.isArray(response.data) ? response.data : []).find(
          (item) => Number(item.pdv_venda_id) === Number(selectedId),
        )?.pdv_venda_id || response.data?.[0]?.pdv_venda_id || null;
      setSelectedId(nextSelected);
    })().catch(() => {
      if (!active) return;
      setRows([]);
      setTotalPages(1);
      setSelectedId(null);
    });

    return () => {
      active = false;
    };
  }, [page, search, status]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    let active = true;
    getPdvVenda(selectedId)
      .then((response) => {
        if (!active) return;
        setDetail(response.data || null);
      })
      .catch(() => {
        if (!active) return;
        setDetail(null);
      });

    return () => {
      active = false;
    };
  }, [selectedId]);

  const totais = useMemo(() => {
    return rows.reduce(
      (acc, item) => {
        if (item.status === "concluida") acc.vendido += Number(item.total_liquido || 0);
        if (item.status === "cancelada") acc.cancelado += Number(item.total_liquido || 0);
        return acc;
      },
      { vendido: 0, cancelado: 0 },
    );
  }, [rows]);

  return (
    <C.Shell>
      <Sidebar />
      {mOpen && <C.Overlay onClick={abreFechaMenu} />}

      <C.Content>
        <Header />

        <C.Body>
          <C.Toolbar>
            <C.ToolbarGroup>
              <C.SearchInput
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Pesquisar por venda, cliente, documento, terminal ou valor"
              />
              <C.Select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos os status</option>
                <option value="concluida">Concluídas</option>
                <option value="cancelada">Canceladas</option>
              </C.Select>
            </C.ToolbarGroup>
            <C.ToolbarGroup>
              <C.Subtitle>
                Filial PDV: {business?.tenant_nome || "Sem filial selecionada"}
              </C.Subtitle>
            </C.ToolbarGroup>
          </C.Toolbar>

          <C.Grid>
            <C.Panel>
              <C.PanelHeader>
                <C.PanelTitle>
                  <C.Title>Vendas do PDV</C.Title>
                  <C.Subtitle>{rows.length} venda(s) nesta página</C.Subtitle>
                </C.PanelTitle>
              </C.PanelHeader>

              <C.List>
                {rows.length ? (
                  rows.map((item) => (
                    <C.Row
                      key={item.pdv_venda_id}
                      type="button"
                      $active={Number(item.pdv_venda_id) === Number(selectedId)}
                      onClick={() => setSelectedId(item.pdv_venda_id)}
                    >
                      <C.RowTop>
                        <C.RowNumber>PDV #{String(item.venda_local_id).padStart(6, "0")}</C.RowNumber>
                        <C.Badge $tone={statusTone(item.status)}>{item.status}</C.Badge>
                      </C.RowTop>
                      <C.RowMeta>
                        <span>{item.cliente_nome || "Consumidor não identificado"}</span>
                        <span>{item.terminal_codigo || "--"}</span>
                        <span>{formatDateTime(item.concluida_em || item.criada_em)}</span>
                      </C.RowMeta>
                      <C.RowTop>
                        <C.Badge $tone={nfceTone(item.nfce_status)}>{item.nfce_status || "pendente"}</C.Badge>
                        <C.RowValue>{formatCurrency(item.total_liquido)}</C.RowValue>
                      </C.RowTop>
                    </C.Row>
                  ))
                ) : (
                  <C.Empty>Nenhuma venda do PDV encontrada para os filtros informados.</C.Empty>
                )}
              </C.List>

              <C.Footer>
                <Paginacao page={page} totalPages={totalPages} onPageChange={setPage} />
              </C.Footer>
            </C.Panel>

            <C.Panel>
              <C.PanelHeader>
                <C.PanelTitle>
                  <C.Title>Detalhes da venda</C.Title>
                  <C.Subtitle>
                    {detail
                      ? `Sessão ${detail.sessao_codigo || "--"} • Terminal ${detail.terminal_codigo || "--"}`
                      : "Selecione uma venda para visualizar"}
                  </C.Subtitle>
                </C.PanelTitle>
              </C.PanelHeader>

              <C.DetailBody>
                {detail ? (
                  <>
                    <C.StatsGrid>
                      <C.StatCard>
                        <C.StatLabel>Total líquido</C.StatLabel>
                        <C.StatValue>{formatCurrency(detail.total_liquido)}</C.StatValue>
                      </C.StatCard>
                      <C.StatCard>
                        <C.StatLabel>Total produtos</C.StatLabel>
                        <C.StatValue>{formatCurrency(detail.total_produtos)}</C.StatValue>
                      </C.StatCard>
                      <C.StatCard>
                        <C.StatLabel>Desconto</C.StatLabel>
                        <C.StatValue>{formatCurrency(detail.total_desconto)}</C.StatValue>
                      </C.StatCard>
                      <C.StatCard>
                        <C.StatLabel>NFC-e</C.StatLabel>
                        <C.StatValue>{detail.nfce_status || "pendente"}</C.StatValue>
                      </C.StatCard>
                    </C.StatsGrid>

                    <C.Section>
                      <C.SectionTitle>Cliente e operação</C.SectionTitle>
                      <C.InfoGrid>
                        <C.InfoCard>
                          <C.StatLabel>Cliente</C.StatLabel>
                          <C.StatValue>{detail.cliente_nome || detail.pessoa_nome_razao || "Consumidor não identificado"}</C.StatValue>
                          <C.Subtitle>{detail.cliente_documento || detail.pessoa_cpf_cnpj || "Sem documento"}</C.Subtitle>
                        </C.InfoCard>
                        <C.InfoCard>
                          <C.StatLabel>Operador</C.StatLabel>
                          <C.StatValue>{detail.operador_nome || "--"}</C.StatValue>
                          <C.Subtitle>{formatDateTime(detail.concluida_em || detail.criada_em)}</C.Subtitle>
                        </C.InfoCard>
                      </C.InfoGrid>
                    </C.Section>

                    <C.Section>
                      <C.SectionTitle>Itens</C.SectionTitle>
                      <div style={{ overflow: "auto" }}>
                        <C.Table>
                          <C.Head>
                            <tr>
                              <C.HeadCell>Código</C.HeadCell>
                              <C.HeadCell>Descrição</C.HeadCell>
                              <C.HeadCell>Qtd.</C.HeadCell>
                              <C.HeadCell>Unidade</C.HeadCell>
                              <C.HeadCell>Unitário</C.HeadCell>
                              <C.HeadCell>Total</C.HeadCell>
                            </tr>
                          </C.Head>
                          <tbody>
                            {(detail.itens || []).map((item) => (
                              <tr key={item.pdv_venda_item_id}>
                                <C.Cell>{item.codigo_produto || item.produto_erp_id || "--"}</C.Cell>
                                <C.Cell>{item.descricao}</C.Cell>
                                <C.Cell>{Number(item.quantidade || 0).toFixed(4)}</C.Cell>
                                <C.Cell>{item.unidade || "--"}</C.Cell>
                                <C.Cell>{formatCurrency(item.valor_unitario)}</C.Cell>
                                <C.Cell>{formatCurrency(item.valor_total)}</C.Cell>
                              </tr>
                            ))}
                          </tbody>
                        </C.Table>
                      </div>
                    </C.Section>

                    <C.Section>
                      <C.SectionTitle>Pagamentos</C.SectionTitle>
                      <div style={{ overflow: "auto" }}>
                        <C.Table>
                          <C.Head>
                            <tr>
                              <C.HeadCell>Forma</C.HeadCell>
                              <C.HeadCell>Valor</C.HeadCell>
                              <C.HeadCell>Autorizado</C.HeadCell>
                              <C.HeadCell>Lançado em</C.HeadCell>
                            </tr>
                          </C.Head>
                          <tbody>
                            {(detail.pagamentos || []).map((item) => (
                              <tr key={item.pdv_venda_pagamento_id}>
                                <C.Cell>{item.forma}</C.Cell>
                                <C.Cell>{formatCurrency(item.valor)}</C.Cell>
                                <C.Cell>{item.autorizado ? "Sim" : "Não"}</C.Cell>
                                <C.Cell>{formatDateTime(item.criado_em)}</C.Cell>
                              </tr>
                            ))}
                          </tbody>
                        </C.Table>
                      </div>
                    </C.Section>

                    {detail.cancelamento_motivo ? (
                      <C.Section>
                        <C.SectionTitle>Cancelamento</C.SectionTitle>
                        <C.InfoCard>
                          <C.StatValue>{detail.cancelamento_motivo}</C.StatValue>
                          <C.Subtitle>{formatDateTime(detail.cancelada_em)}</C.Subtitle>
                        </C.InfoCard>
                      </C.Section>
                    ) : null}
                  </>
                ) : (
                  <C.Empty>Selecione uma venda para carregar os detalhes do PDV.</C.Empty>
                )}
              </C.DetailBody>

              <C.Footer>
                <C.Subtitle>
                  Vendido na página: {formatCurrency(totais.vendido)} • Cancelado na página: {formatCurrency(totais.cancelado)}
                </C.Subtitle>
              </C.Footer>
            </C.Panel>
          </C.Grid>
        </C.Body>
      </C.Content>
    </C.Shell>
  );
};
