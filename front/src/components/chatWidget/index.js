import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  HiOutlineArrowsPointingIn,
  HiOutlineArrowsPointingOut,
  HiOutlineChatBubbleLeftRight,
  HiOutlinePaperAirplane,
  HiOutlineXMark,
} from "react-icons/hi2";
import { api } from "api/axiosConfig";
import { AppContext } from "context";
import * as C from "./style";

const STORAGE_KEY = "v12_chat_atendimento";

const readStoredChat = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
};

const writeStoredChat = (value) => {
  if (!value) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

const initialForm = {
  categoria_id: "",
  nome: "",
  email: "",
  telefone: "",
  assunto: "",
  mensagem: "",
};

export const ChatWidget = () => {
  const location = useLocation();
  const { user } = useContext(AppContext);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [atendimento, setAtendimento] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [posicaoFila, setPosicaoFila] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [composer, setComposer] = useState("");
  const [saving, setSaving] = useState(false);
  const [unread, setUnread] = useState(false);
  const [rating, setRating] = useState({ nota: 0, comentario: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const lastMessageIdRef = useRef(0);

  const hiddenInGestao = location.pathname.startsWith("/gestao-v12");
  const chatToken = atendimento?.client_token;

  const canShow = !hiddenInGestao && config?.chat_ativo !== false;

  const isLogged = !!user?.usuario_id || !!user?.userId;

  const headerSubtitle = useMemo(() => {
    if (!atendimento) return "Fale com vendas, financeiro ou suporte";
    if (atendimento.status === "aguardando") {
      return posicaoFila > 0 ? `Você é o ${posicaoFila}º da fila` : "Aguardando atendimento";
    }
    if (atendimento.status === "em_atendimento") {
      return atendimento.atendente_nome
        ? `Em atendimento com ${atendimento.atendente_nome}`
        : "Em atendimento";
    }
    return "Atendimento encerrado";
  }, [atendimento, posicaoFila]);

  const loadConfig = useCallback(async () => {
    try {
      const { data } = await api.get("/chat/config");
      const nextConfig = data?.data?.configuracao || {};
      const nextCategorias = data?.data?.categorias || [];
      setConfig(nextConfig);
      setCategorias(nextCategorias);
      setForm((current) => ({
        ...current,
        categoria_id: current.categoria_id || String(nextCategorias[0]?.categoria_id || ""),
        nome: current.nome || user?.usuario_nome || "",
        email: current.email || user?.usuario_email || "",
      }));
    } catch {
      setConfig({ chat_ativo: false });
    }
  }, [user]);

  const loadAtendimento = useCallback(
    async (token = chatToken, { silent = false } = {}) => {
      if (!token) return;

      try {
        const { data } = await api.get(`/chat/atendimentos/${token}`);
        const detail = data?.data || {};
        const nextAtendimento = detail.atendimento || null;
        const nextMessages = detail.mensagens || [];
        const previousLastId = lastMessageIdRef.current;
        const nextLast = nextMessages[nextMessages.length - 1];

        setAtendimento(nextAtendimento);
        setMensagens(nextMessages);
        setPosicaoFila(detail.posicao_fila || 0);
        lastMessageIdRef.current = nextLast?.mensagem_id || previousLastId;

        if (
          silent &&
          !visible &&
          nextLast?.mensagem_id > previousLastId &&
          nextLast?.autor_tipo === "atendente"
        ) {
          setUnread(true);
        }
      } catch {
        writeStoredChat(null);
        setAtendimento(null);
        setMensagens([]);
      }
    },
    [chatToken, visible]
  );

  useEffect(() => {
    loadConfig();
    const stored = readStoredChat();
    if (stored?.client_token) {
      loadAtendimento(stored.client_token);
    }
  }, [loadConfig, loadAtendimento]);

  useEffect(() => {
    if (!chatToken || atendimento?.status === "encerrado") return undefined;

    const timer = window.setInterval(() => {
      loadAtendimento(chatToken, { silent: true });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [atendimento?.status, chatToken, loadAtendimento]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openPanel = () => {
    setVisible(true);
    setUnread(false);
  };

  const closePanel = () => {
    setVisible(false);
  };

  const startChat = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");

    try {
      const { data } = await api.post("/chat/atendimentos", {
        ...form,
        nome: form.nome || user?.usuario_nome || "",
        email: form.email || user?.usuario_email || "",
      });
      const detail = data?.data || {};
      setAtendimento(detail.atendimento || null);
      setMensagens(detail.mensagens || []);
      setPosicaoFila(detail.posicao_fila || 0);
      writeStoredChat({ client_token: detail.atendimento?.client_token });
      setForm(initialForm);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message || "Não foi possível iniciar o atendimento."
      );
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!chatToken || !composer.trim()) return;

    const conteudo = composer.trim();
    setComposer("");
    setErrorMessage("");

    try {
      const { data } = await api.post(`/chat/atendimentos/${chatToken}/mensagens`, { conteudo });
      const detail = data?.data || {};
      setAtendimento(detail.atendimento || null);
      setMensagens(detail.mensagens || []);
      setPosicaoFila(detail.posicao_fila || 0);
    } catch (error) {
      setComposer(conteudo);
      setErrorMessage(error?.response?.data?.message || "Não foi possível enviar a mensagem.");
    }
  };

  const submitRating = async () => {
    if (!chatToken || !rating.nota) return;
    await api.post(`/chat/atendimentos/${chatToken}/avaliacao`, rating);
    writeStoredChat(null);
    setAtendimento(null);
    setMensagens([]);
    setRating({ nota: 0, comentario: "" });
    setVisible(false);
  };

  if (!canShow) return null;

  return (
    <C.Wrapper>
      {visible ? (
        <C.Panel $expanded={expanded}>
          <C.Header>
            <C.HeaderText>
              <strong>Atendimento V12</strong>
              <span>{headerSubtitle}</span>
            </C.HeaderText>
            <C.HeaderActions>
              <C.IconButton type="button" onClick={() => setExpanded((current) => !current)}>
                {expanded ? <HiOutlineArrowsPointingIn /> : <HiOutlineArrowsPointingOut />}
              </C.IconButton>
              <C.IconButton type="button" onClick={closePanel}>
                <HiOutlineXMark />
              </C.IconButton>
            </C.HeaderActions>
          </C.Header>

          <C.Body>
            {!atendimento ? (
              <C.Form onSubmit={startChat}>
                {errorMessage ? <C.Notice>{errorMessage}</C.Notice> : null}
                {!isLogged ? (
                  <>
                    <C.Field>
                      Nome
                      <C.Input
                        value={form.nome}
                        onChange={(event) => updateForm("nome", event.target.value)}
                        required
                      />
                    </C.Field>
                    <C.Field>
                      E-mail
                      <C.Input
                        type="email"
                        value={form.email}
                        onChange={(event) => updateForm("email", event.target.value)}
                      />
                    </C.Field>
                  </>
                ) : null}

                <C.Field>
                  Setor
                  <C.Select
                    value={form.categoria_id}
                    onChange={(event) => updateForm("categoria_id", event.target.value)}
                    required
                  >
                    {categorias.map((categoria) => (
                      <option key={categoria.categoria_id} value={categoria.categoria_id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </C.Select>
                </C.Field>

                <C.Field>
                  Assunto
                  <C.Input
                    value={form.assunto}
                    onChange={(event) => updateForm("assunto", event.target.value)}
                    required
                  />
                </C.Field>

                <C.Field>
                  Mensagem
                  <C.TextArea
                    value={form.mensagem}
                    onChange={(event) => updateForm("mensagem", event.target.value)}
                    required
                  />
                </C.Field>

                <C.Button type="submit" disabled={saving}>
                  {saving ? "Enviando..." : "Iniciar atendimento"}
                </C.Button>
              </C.Form>
            ) : (
              <>
                {errorMessage ? <C.Notice>{errorMessage}</C.Notice> : null}
                {atendimento.status === "aguardando" ? (
                  <C.Notice>
                    Atendimento em fila.{" "}
                    {posicaoFila ? `Sua posição atual é ${posicaoFila}.` : "Aguarde um atendente."}
                  </C.Notice>
                ) : null}

                <C.Messages>
                  {mensagens.map((mensagem) => (
                    <C.Message
                      key={mensagem.mensagem_id}
                      $mine={mensagem.autor_tipo === "cliente"}
                      $system={mensagem.autor_tipo === "sistema"}
                    >
                      {mensagem.conteudo}
                    </C.Message>
                  ))}
                </C.Messages>

                {atendimento.status === "encerrado" ? (
                  <C.Rating>
                    <strong>Avalie o atendimento</strong>
                    <C.Stars>
                      {[1, 2, 3, 4, 5].map((nota) => (
                        <button
                          key={nota}
                          type="button"
                          onClick={() => setRating((current) => ({ ...current, nota }))}
                        >
                          {rating.nota >= nota ? "★" : "☆"}
                        </button>
                      ))}
                    </C.Stars>
                    <C.TextArea
                      placeholder="Comentário opcional"
                      value={rating.comentario}
                      onChange={(event) =>
                        setRating((current) => ({ ...current, comentario: event.target.value }))
                      }
                    />
                    <C.Button type="button" disabled={!rating.nota} onClick={submitRating}>
                      Finalizar
                    </C.Button>
                  </C.Rating>
                ) : (
                  <C.Composer onSubmit={sendMessage}>
                    <C.ComposerInput
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                      placeholder="Digite sua mensagem"
                    />
                    <C.ComposerButton type="submit">
                      <HiOutlinePaperAirplane />
                    </C.ComposerButton>
                  </C.Composer>
                )}
              </>
            )}
          </C.Body>
        </C.Panel>
      ) : null}

      <C.Toggle type="button" onClick={openPanel} $unread={unread}>
        <HiOutlineChatBubbleLeftRight />
      </C.Toggle>
    </C.Wrapper>
  );
};
