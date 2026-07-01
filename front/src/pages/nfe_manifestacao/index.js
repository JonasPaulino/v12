import React, { useContext, useRef, useState } from "react";
import DropdownMenu from "components/dropDownMenu";
import Header from "components/header";
import Paginacao from "components/paginacao";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import { useNfeManifestacaoPage } from "./use";
import * as C from "./style";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR");

const statusLabel = {
  pendente: "Pendente",
  ciencia_operacao: "Ciência",
  confirmacao_operacao: "Confirmada",
  desconhecimento_operacao: "Desconhecida",
  operacao_nao_realizada: "Não realizada",
};

const statusTone = (status) => {
  if (status === "confirmacao_operacao") return "success";
  if (status === "desconhecimento_operacao" || status === "operacao_nao_realizada") return "danger";
  return "info";
};

const xmlLabel = {
  completo: "XML completo",
  resumo: "Resumo",
  indisponivel: "Indisponível",
};

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : dateFormatter.format(date);
};

const shortKey = (value) => {
  const text = String(value || "");
  if (text.length <= 16) return text || "--";
  return `${text.slice(0, 8)}...${text.slice(-8)}`;
};

const ActionMenu = ({ item, onManifestar, onImportar }) => {
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const hasXml = item.status_xml === "completo" || !!item.tem_xml_completo;

  const items = [
    {
      label: "Ciência da operação",
      onClick: () => onManifestar(item, "ciencia_operacao"),
    },
    {
      label: "Confirmar operação",
      onClick: () => onManifestar(item, "confirmacao_operacao"),
    },
    {
      label: "Desconhecer operação",
      onClick: () => onManifestar(item, "desconhecimento_operacao"),
      danger: true,
    },
    {
      label: "Operação não realizada",
      onClick: () => onManifestar(item, "operacao_nao_realizada"),
      danger: true,
    },
    { isDivider: true },
    {
      label: "Importar XML",
      onClick: () => onImportar(item),
      disabled: !hasXml || !!item.entrada_mercadoria_id,
      title: hasXml ? "" : "XML completo ainda não disponível.",
    },
  ];

  return (
    <>
      <C.MenuButton
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ações da NF-e recebida"
      >
        <C.MenuIcon />
      </C.MenuButton>
      <DropdownMenu
        open={open}
        anchorEl={buttonRef.current}
        onClose={() => setOpen(false)}
        items={items}
        minWidth={220}
      />
    </>
  );
};

export const NfeManifestacao = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const {
    search,
    setSearch,
    items,
    page,
    setPage,
    pagination,
    handleSync,
    handleManifestar,
    handleImportar,
  } = useNfeManifestacaoPage();

  return (
    <C.Shell>
      <Sidebar />
      {mOpen && <C.Overlay onClick={abreFechaMenu} />}

      <C.Content>
        <Header />

        <C.Body>
          <C.Toolbar>
            <C.ToolbarGroup>
              <C.CreateButton type="button" onClick={handleSync}>
                Consultar SEFAZ
              </C.CreateButton>
            </C.ToolbarGroup>

            <C.ToolbarGroup>
              <C.SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por chave, fornecedor ou CNPJ"
              />
            </C.ToolbarGroup>
          </C.Toolbar>

          <C.TableArea>
            <C.TableWrap>
              <C.Scroll>
                <C.Table>
                  <C.Head>
                    <tr>
                      <C.HeaderCell>Fornecedor</C.HeaderCell>
                      <C.HeaderCell>NF-e</C.HeaderCell>
                      <C.HeaderCell>Emissão</C.HeaderCell>
                      <C.HeaderCell>Valor</C.HeaderCell>
                      <C.HeaderCell>Manifestação</C.HeaderCell>
                      <C.HeaderCell>XML</C.HeaderCell>
                      <C.HeaderCell>Ações</C.HeaderCell>
                    </tr>
                  </C.Head>
                  <tbody>
                    {items.map((item) => (
                      <C.Row key={item.nfe_recebida_distribuicao_id}>
                        <C.Cell $wrap>
                          <C.Strong>{item.emitente_nome || "--"}</C.Strong>
                          <C.Meta>{item.emitente_documento || "--"}</C.Meta>
                        </C.Cell>
                        <C.Cell>
                          <C.Strong>{item.numero_nfe ? `NF ${item.numero_nfe}` : "NF-e"}</C.Strong>
                          <C.Meta title={item.chave_acesso}>{shortKey(item.chave_acesso)}</C.Meta>
                        </C.Cell>
                        <C.Cell>{formatDate(item.data_emissao)}</C.Cell>
                        <C.Cell>
                          {currencyFormatter.format(Number(item.valor_total || 0))}
                        </C.Cell>
                        <C.Cell>
                          <C.Badge $tone={statusTone(item.status_manifestacao)}>
                            {statusLabel[item.status_manifestacao] || item.status_manifestacao}
                          </C.Badge>
                        </C.Cell>
                        <C.Cell>
                          <C.Badge $tone={item.status_xml === "completo" ? "success" : "info"}>
                            {xmlLabel[item.status_xml] || item.status_xml}
                          </C.Badge>
                        </C.Cell>
                        <C.Cell>
                          <ActionMenu
                            item={item}
                            onManifestar={handleManifestar}
                            onImportar={handleImportar}
                          />
                        </C.Cell>
                      </C.Row>
                    ))}
                  </tbody>
                </C.Table>
                {!items.length && <C.Empty>Nenhuma NF-e recebida encontrada.</C.Empty>}
              </C.Scroll>

              <C.Footer>
                <C.FooterInfo>
                  {pagination.total} registro(s) encontrados
                </C.FooterInfo>
                <Paginacao
                  page={page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                />
              </C.Footer>
            </C.TableWrap>
          </C.TableArea>
        </C.Body>
      </C.Content>
    </C.Shell>
  );
};
