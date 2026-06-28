import React, { useCallback, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Documento from "components/documento";
import DropdownMenu from "components/dropDownMenu";
import Paginacao from "components/paginacao";
import { registrarManifestacaoNfeRecebida } from "../api";
import { useTabelaEntradasMercadoria } from "./use";
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

const formatNfeReference = (entrada) => {
  if (!entrada?.numero_nfe && !entrada?.chave_acesso) return "--";

  const numero = entrada.numero_nfe
    ? `NF ${entrada.serie_nfe ? `${entrada.serie_nfe}/` : ""}${entrada.numero_nfe}`
    : "NF-e XML";
  const chave = entrada.chave_acesso ? `Chave ${entrada.chave_acesso}` : "";

  return { numero, chave };
};

const MANIFESTACAO_LABELS = {
  ciencia_operacao: "Ciência da operação",
  confirmacao_operacao: "Confirmar operação",
  desconhecimento_operacao: "Desconhecer operação",
  operacao_nao_realizada: "Operação não realizada",
};

const Tabela = ({ search, refreshKey, onViewDetails, onlyNfe = false, emptyMessage }) => {
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const { entradas, page, setPage, totalPages, sort, toggleSort } =
    useTabelaEntradasMercadoria({
      search,
      refreshKey: `${refreshKey || 0}-${localRefreshKey}`,
      onlyNfe,
    });
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const openMenu = useCallback((entradaMercadoriaId, element) => {
    setMenuOpenId(entradaMercadoriaId);
    setAnchorEl(element);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpenId(null);
    setAnchorEl(null);
  }, []);

  const rows = useMemo(() => entradas || [], [entradas]);

  const handleManifestar = useCallback(
    async (entrada, tipoEvento) => {
      closeMenu();

      let justificativa = "";
      if (tipoEvento === "operacao_nao_realizada") {
        const result = await Swal.fire({
          title: "Operação não realizada",
          input: "textarea",
          inputLabel: "Justificativa",
          inputPlaceholder: "Informe o motivo da operação não realizada",
          showCancelButton: true,
          confirmButtonText: "Registrar",
          cancelButtonText: "Cancelar",
          inputValidator: (value) =>
            !value || value.trim().length < 15
              ? "Informe uma justificativa com pelo menos 15 caracteres."
              : undefined,
        });

        if (!result.isConfirmed) return;
        justificativa = result.value;
      } else {
        const result = await Swal.fire({
          title: MANIFESTACAO_LABELS[tipoEvento],
          text: "Registrar esta manifestação para a NF-e recebida?",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Registrar",
          cancelButtonText: "Cancelar",
        });

        if (!result.isConfirmed) return;
      }

      try {
        await registrarManifestacaoNfeRecebida(entrada.entrada_mercadoria_id, {
          tipo_evento: tipoEvento,
          justificativa,
        });
        await Swal.fire({
          title: "Manifestação registrada",
          text: "O evento foi registrado na NF-e recebida.",
          icon: "success",
          timer: 1600,
          showConfirmButton: false,
        });
        setLocalRefreshKey((prev) => prev + 1);
      } catch (error) {
        await Swal.fire({
          title: "Falha ao registrar",
          text:
            error?.response?.data?.message ||
            "Não foi possível registrar a manifestação da NF-e.",
          icon: "error",
        });
      }
    },
    [closeMenu]
  );

  return (
    <C.Container>
      <C.Scroll>
        <C.Table>
          <C.Head>
            <C.Row>
              <C.HeaderCell $sortable onClick={() => toggleSort("entrada_mercadoria_id")}>
                Entrada
                <C.SortFlag $active={!!sort.entrada_mercadoria_id}>
                  {sort.entrada_mercadoria_id === "ASC"
                    ? "▲"
                    : sort.entrada_mercadoria_id === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("pedido_compra_id")}>
                Pedido
                <C.SortFlag $active={!!sort.pedido_compra_id}>
                  {sort.pedido_compra_id === "ASC"
                    ? "▲"
                    : sort.pedido_compra_id === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>NF-e</C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("pessoa_nome_razao")}>
                Fornecedor
                <C.SortFlag $active={!!sort.pessoa_nome_razao}>
                  {sort.pessoa_nome_razao === "ASC"
                    ? "▲"
                    : sort.pessoa_nome_razao === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("data_entrada")}>
                Entrada
                <C.SortFlag $active={!!sort.data_entrada}>
                  {sort.data_entrada === "ASC"
                    ? "▲"
                    : sort.data_entrada === "DESC"
                    ? "▼"
                    : "•"}
                </C.SortFlag>
              </C.HeaderCell>
              <C.HeaderCell>Itens</C.HeaderCell>
              <C.HeaderCell $sortable onClick={() => toggleSort("total")}>
                Total
                <C.SortFlag $active={!!sort.total}>
                  {sort.total === "ASC" ? "▲" : sort.total === "DESC" ? "▼" : "•"}
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
              rows.map((entrada) => {
                const nfeReference = formatNfeReference(entrada);

                return (
                  <C.Row key={entrada.entrada_mercadoria_id}>
                    <C.Cell>#{entrada.entrada_mercadoria_id}</C.Cell>
                    <C.Cell>
                      {entrada.pedido_compra_id ? `#${entrada.pedido_compra_id}` : "--"}
                    </C.Cell>
                    <C.Cell $wrap>
                      {typeof nfeReference === "string" ? (
                        nfeReference
                      ) : (
                        <>
                          <C.MainText>{nfeReference.numero}</C.MainText>
                          <C.MetaText>{nfeReference.chave}</C.MetaText>
                        </>
                      )}
                    </C.Cell>
                    <C.Cell $wrap>
                      <C.MainText>{entrada.pessoa_nome_razao}</C.MainText>
                      <C.MetaText>
                        <Documento value={entrada.pessoa_cpf_cnpj} />
                      </C.MetaText>
                    </C.Cell>
                    <C.Cell>{formatDate(entrada.data_entrada)}</C.Cell>
                    <C.Cell>{entrada.total_itens || 0}</C.Cell>
                    <C.Cell>{currencyFormatter.format(Number(entrada.total || 0))}</C.Cell>
                    <C.Cell>
                      <C.Status $tone="success">{entrada.status}</C.Status>
                      {onlyNfe && entrada.manifestacao_tipo && (
                        <C.MetaText>
                          {MANIFESTACAO_LABELS[entrada.manifestacao_tipo] ||
                            entrada.manifestacao_tipo}
                        </C.MetaText>
                      )}
                    </C.Cell>
                    <C.Cell>
                      <C.MenuButton
                        type="button"
                        onClick={(event) =>
                          openMenu(entrada.entrada_mercadoria_id, event.currentTarget)
                        }
                        title="Ações"
                        aria-label="Ações"
                      >
                        <C.MenuIcon />
                      </C.MenuButton>

                      {menuOpenId === entrada.entrada_mercadoria_id && (
                        <DropdownMenu
                          open={!!menuOpenId}
                          anchorEl={anchorEl}
                          onClose={closeMenu}
                          minWidth={170}
                          items={[
                            {
                              label: "Ver detalhes",
                              onClick: () => onViewDetails?.(entrada.entrada_mercadoria_id),
                            },
                            ...(onlyNfe && entrada.chave_acesso
                              ? [
                                  {
                                    label: "Ciência da operação",
                                    onClick: () =>
                                      handleManifestar(entrada, "ciencia_operacao"),
                                  },
                                  {
                                    label: "Confirmar operação",
                                    onClick: () =>
                                      handleManifestar(entrada, "confirmacao_operacao"),
                                  },
                                  {
                                    label: "Desconhecer operação",
                                    onClick: () =>
                                      handleManifestar(entrada, "desconhecimento_operacao"),
                                  },
                                  {
                                    label: "Operação não realizada",
                                    onClick: () =>
                                      handleManifestar(entrada, "operacao_nao_realizada"),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      )}
                    </C.Cell>
                  </C.Row>
                );
              })
            ) : (
              <C.Row>
                <C.Cell colSpan={9}>
                  <C.Empty>{emptyMessage || "Nenhuma entrada de mercadoria encontrada."}</C.Empty>
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
