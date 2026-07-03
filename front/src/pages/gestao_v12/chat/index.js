import React, { useCallback, useContext, useEffect, useState } from "react";
import { api } from "api/axiosConfig";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { GestaoV12Layout } from "layouts/gestao_v12";
import { linkifyText } from "utils/linkifyText";
import * as C from "./style";

const filters = [
  { value: "aguardando", label: "Fila" },
  { value: "em_atendimento", label: "Atendendo" },
  { value: "encerrado", label: "Encerrados" },
];

const statusLabel = (status) => {
  if (status === "aguardando") return "Fila";
  if (status === "em_atendimento") return "Atendimento";
  if (status === "encerrado") return "Encerrado";
  return status || "--";
};

export const GestaoV12Chat = () => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [status, setStatus] = useState([]);
  const [statusOpen, setStatusOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [loading, setLoading] = useState(false);

  const loadConfig = useCallback(async () => {
    const { data } = await api.get("/gestao/chat/configuracao");
    setCategorias(data?.data?.categorias || []);
  }, []);

  const loadItems = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const { data } = await api.get("/gestao/chat/atendimentos", {
          params: { status: status.join(","), search },
        });
        setItems(data?.data || []);
      } catch (error) {
        showAlert?.({
          title: "Falha ao carregar chat",
          text: error?.response?.data?.message || "Não foi possível listar atendimentos.",
          icon: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [search, showAlert, status]
  );

  const loadDetail = useCallback(
    async (id = selectedId) => {
      if (!id) return;
      try {
        const { data } = await api.get(`/gestao/chat/atendimentos/${id}`);
        setDetail(data?.data || null);
        setSelectedId(Number(id));
      } catch (error) {
        showAlert?.({
          title: "Atendimento indisponível",
          text: error?.response?.data?.message || "Não foi possível carregar a conversa.",
          icon: "error",
        });
      }
    },
    [selectedId, showAlert]
  );

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadItems({ silent: true });
      if (selectedId) loadDetail(selectedId);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [loadDetail, loadItems, selectedId]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!selectedId || !message.trim()) return;

    showLoading("Enviando mensagem...");
    try {
      const { data } = await api.post(`/gestao/chat/atendimentos/${selectedId}/mensagens`, {
        conteudo: message,
      });
      setMessage("");
      setDetail(data?.data || null);
      await loadItems({ silent: true });
    } catch (error) {
      showAlert?.({
        title: "Falha ao enviar",
        text: error?.response?.data?.message || "Não foi possível enviar a mensagem.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  };

  const transferir = async () => {
    if (!selectedId || !transferTo) return;

    showLoading("Transferindo atendimento...");
    try {
      const { data } = await api.post(`/gestao/chat/atendimentos/${selectedId}/transferir`, {
        categoria_id: transferTo,
      });
      setTransferTo("");
      setDetail(data?.data || null);
      await loadItems({ silent: true });
    } catch (error) {
      showAlert?.({
        title: "Falha ao transferir",
        text: error?.response?.data?.message || "Não foi possível transferir o atendimento.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  };

  const encerrar = async () => {
    if (!selectedId) return;
    const confirmed = await askYesNoQuestion?.(
      "Encerrar atendimento?",
      "O cliente será direcionado para avaliação do atendimento."
    );
    if (!confirmed) return;

    showLoading("Encerrando atendimento...");
    try {
      const { data } = await api.post(`/gestao/chat/atendimentos/${selectedId}/encerrar`);
      setDetail(data?.data || null);
      await loadItems({ silent: true });
    } catch (error) {
      showAlert?.({
        title: "Falha ao encerrar",
        text: error?.response?.data?.message || "Não foi possível encerrar o atendimento.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  };

  const atendimento = detail?.atendimento;
  const mensagens = detail?.mensagens || [];
  const statusFilterLabel =
    status.length === 0
      ? "Todos os status"
      : filters
          .filter((item) => status.includes(item.value))
          .map((item) => item.label)
          .join(", ");

  const toggleStatus = (value) => {
    setStatus((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  return (
    <GestaoV12Layout title="Chat" subtitle="Atendimento de clientes e visitantes do V12.">
      <C.Shell>
        <C.Card>
          <C.SidebarHeader>
            <C.Search
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar atendimento"
            />
            <C.FilterRow>
              <C.StatusFilter>
                <C.StatusFilterButton
                  type="button"
                  onClick={() => setStatusOpen((current) => !current)}
                >
                  <span>{statusFilterLabel}</span>
                  <strong>⌄</strong>
                </C.StatusFilterButton>
                {statusOpen ? (
                  <C.StatusFilterMenu>
                    <C.StatusFilterOption type="button" onClick={() => setStatus([])}>
                      <input type="checkbox" checked={status.length === 0} readOnly />
                      Todos
                    </C.StatusFilterOption>
                    {filters.map((item) => (
                      <C.StatusFilterOption
                        key={item.value}
                        type="button"
                        onClick={() => toggleStatus(item.value)}
                      >
                        <input type="checkbox" checked={status.includes(item.value)} readOnly />
                        {item.label}
                      </C.StatusFilterOption>
                    ))}
                  </C.StatusFilterMenu>
                ) : null}
              </C.StatusFilter>
            </C.FilterRow>
          </C.SidebarHeader>

          <C.List>
            {items.length ? (
              items.map((item) => (
                <C.Ticket
                  key={item.atendimento_id}
                  type="button"
                  $active={selectedId === item.atendimento_id}
                  onClick={() => loadDetail(item.atendimento_id)}
                >
                  <C.TicketMeta>
                    <strong>{item.cliente_nome}</strong>
                    <C.Badge $status={item.status}>{statusLabel(item.status)}</C.Badge>
                  </C.TicketMeta>
                  <span>{item.assunto}</span>
                  <C.TicketSupport>
                    {item.categoria_nome} •{" "}
                    {item.atendente_nome
                      ? `Atendente: ${item.atendente_nome}`
                      : "Novo atendimento sem atendente"}
                  </C.TicketSupport>
                  <small>{item.protocolo}</small>
                  {item.ultima_mensagem ? (
                    <C.TicketPreview>{item.ultima_mensagem}</C.TicketPreview>
                  ) : null}
                </C.Ticket>
              ))
            ) : (
              <C.Empty>{loading ? "Carregando atendimentos..." : "Nenhum atendimento encontrado."}</C.Empty>
            )}
          </C.List>
        </C.Card>

        <C.Card>
          {atendimento ? (
            <>
              <C.ChatHeader>
                <div>
                  <h2>{atendimento.cliente_nome}</h2>
                  <p>
                    {atendimento.categoria_nome} • {atendimento.assunto} •{" "}
                    {statusLabel(atendimento.status)}
                  </p>
                </div>
                <C.Actions>
                  <C.ActionButton
                    type="button"
                    $danger
                    disabled={atendimento.status === "encerrado"}
                    onClick={encerrar}
                  >
                    Encerrar
                  </C.ActionButton>
                </C.Actions>
              </C.ChatHeader>

              <C.TransferBar>
                <span>Transferir para</span>
                <select value={transferTo} onChange={(event) => setTransferTo(event.target.value)}>
                  <option value="">Selecione</option>
                  {categorias
                    .filter((categoria) => categoria.ativo)
                    .map((categoria) => (
                      <option key={categoria.categoria_id} value={categoria.categoria_id}>
                        {categoria.nome}
                      </option>
                    ))}
                </select>
                <C.ActionButton
                  type="button"
                  disabled={!transferTo || atendimento.status === "encerrado"}
                  onClick={transferir}
                >
                  Transferir
                </C.ActionButton>
              </C.TransferBar>

              <C.Messages>
                {mensagens.map((item) => (
                  <C.Message
                    key={item.mensagem_id}
                    $mine={item.autor_tipo === "atendente"}
                    $system={item.autor_tipo === "sistema"}
                  >
                    {linkifyText(item.conteudo)}
                  </C.Message>
                ))}
              </C.Messages>

              <C.Composer onSubmit={sendMessage}>
                <C.ComposerInput
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={
                    atendimento.status === "encerrado"
                      ? "Atendimento encerrado"
                      : "Digite a resposta"
                  }
                  disabled={atendimento.status === "encerrado"}
                />
                <C.SendButton type="submit" disabled={atendimento.status === "encerrado"}>
                  Enviar
                </C.SendButton>
              </C.Composer>
            </>
          ) : (
            <C.Empty>Selecione um atendimento para visualizar a conversa.</C.Empty>
          )}
        </C.Card>
      </C.Shell>
    </GestaoV12Layout>
  );
};
