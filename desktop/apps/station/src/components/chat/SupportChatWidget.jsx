import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiOutlineArrowsPointingIn,
  HiOutlineArrowsPointingOut,
  HiOutlineChatBubbleLeftRight,
  HiOutlinePaperAirplane,
  HiOutlineXMark,
} from "react-icons/hi2";
import { api } from "../../api.js";
import { linkifyText } from "../../utils/linkifyText.jsx";
import "./SupportChatWidget.css";

const STORAGE_KEY = "v12_pdv_chat_atendimento";
const CONFIG_REFRESH_INTERVAL_MS = 30000;
const MESSAGE_REFRESH_INTERVAL_MS = 5000;

const initialForm = {
  categoria_id: "",
  nome: "",
  email: "",
  telefone: "",
  assunto: "",
  mensagem: "",
};

function formatQueuePosition(value) {
  const position = Number(value || 0);
  if (!Number.isFinite(position) || position <= 0) {
    return "";
  }

  return `${position}º`;
}

function readStoredChat() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeStoredChat(value) {
  if (!value) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function SupportChatWidget({
  entryPoint = "floating",
  operator = null,
  openRequestId = 0,
  onAvailabilityChange,
  onUnreadChange,
}) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [supportState, setSupportState] = useState({
    available: false,
    active: false,
    reason: null,
    configuracao: null,
    categorias: [],
  });
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
  const lastOpenRequestRef = useRef(openRequestId);

  const isFooterEntry = entryPoint === "footer";
  const isLogged = !!operator?.operador_id;
  const chatToken = atendimento?.client_token;

  const headerSubtitle = useMemo(() => {
    if (!atendimento) return "Fale com vendas, financeiro ou suporte";
    if (atendimento.status === "aguardando") {
      return posicaoFila > 0
        ? `Você é o ${formatQueuePosition(posicaoFila)} da fila`
        : "Aguardando atendimento";
    }
    if (atendimento.status === "em_atendimento") {
      return atendimento.atendente_nome
        ? `Em atendimento com ${atendimento.atendente_nome}`
        : "Em atendimento";
    }
    return "Atendimento encerrado";
  }, [atendimento, posicaoFila]);

  const refreshConfig = useCallback(async () => {
    try {
      const result = await api.chatConfig();
      const nextCategorias = Array.isArray(result?.categorias) ? result.categorias : [];
      const nextState = {
        available: result?.available === true,
        active: result?.active === true,
        reason: result?.reason || null,
        configuracao: result?.configuracao || null,
        categorias: nextCategorias,
      };

      setSupportState(nextState);
      onAvailabilityChange?.(nextState);
      setForm((current) => ({
        ...current,
        categoria_id: current.categoria_id || String(nextCategorias[0]?.categoria_id || ""),
        nome: current.nome || operator?.nome || "",
        email: current.email || operator?.email || "",
      }));
      return nextState;
    } catch (error) {
      const nextState = {
        available: false,
        active: false,
        reason: error.message || "Nao foi possivel carregar o suporte.",
        configuracao: null,
        categorias: [],
      };
      setSupportState(nextState);
      onAvailabilityChange?.(nextState);
      return nextState;
    }
  }, [onAvailabilityChange, operator?.email, operator?.nome]);

  const loadAtendimento = useCallback(
    async (token = chatToken, { silent = false } = {}) => {
      if (!token) return;

      try {
        const detail = await api.chatAtendimento(token);
        const nextAtendimento = detail?.atendimento || null;
        const nextMessages = Array.isArray(detail?.mensagens) ? detail.mensagens : [];
        const previousLastId = lastMessageIdRef.current;
        const nextLast = nextMessages[nextMessages.length - 1];

        setAtendimento(nextAtendimento);
        setMensagens(nextMessages);
        setPosicaoFila(detail?.posicao_fila || 0);
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
    [chatToken, visible],
  );

  useEffect(() => {
    void refreshConfig();
    const stored = readStoredChat();
    if (stored?.client_token) {
      void loadAtendimento(stored.client_token);
    }
  }, [loadAtendimento, refreshConfig]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshConfig();
    }, CONFIG_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [refreshConfig]);

  useEffect(() => {
    if (!chatToken || atendimento?.status === "encerrado") return undefined;

    const timer = window.setInterval(() => {
      void loadAtendimento(chatToken, { silent: true });
    }, MESSAGE_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [atendimento?.status, chatToken, loadAtendimento]);

  useEffect(() => {
    if (lastOpenRequestRef.current === openRequestId) return;
    lastOpenRequestRef.current = openRequestId;

    if (!isFooterEntry) return;

    void (async () => {
      const state = await refreshConfig();
      if (state?.available) {
        setExpanded(false);
        setVisible(true);
        setUnread(false);
      }
    })();
  }, [entryPoint, isFooterEntry, openRequestId, refreshConfig]);

  useEffect(() => {
    onUnreadChange?.(unread);
  }, [onUnreadChange, unread]);

  useEffect(() => {
    if (!visible) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setVisible(false);
        setExpanded(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible]);

  useEffect(() => {
    if (!visible || !expanded) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded, visible]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openPanel() {
    if (!supportState.available) return;
    setExpanded(false);
    setVisible(true);
    setUnread(false);
  }

  function closePanel() {
    setVisible(false);
    setExpanded(false);
  }

  async function startChat(event) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");

    try {
      const detail = await api.chatIniciarAtendimento({
        ...form,
        nome: form.nome || operator?.nome || "",
        email: form.email || operator?.email || "",
      });

      setAtendimento(detail?.atendimento || null);
      setMensagens(Array.isArray(detail?.mensagens) ? detail.mensagens : []);
      setPosicaoFila(detail?.posicao_fila || 0);
      writeStoredChat({ client_token: detail?.atendimento?.client_token });
      setForm((current) => ({
        ...initialForm,
        categoria_id: current.categoria_id || String(supportState.categorias[0]?.categoria_id || ""),
        nome: operator?.nome || "",
        email: operator?.email || "",
      }));
    } catch (error) {
      setErrorMessage(error.message || "Nao foi possivel iniciar o atendimento.");
    } finally {
      setSaving(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!chatToken || !composer.trim()) return;

    const conteudo = composer.trim();
    setComposer("");
    setErrorMessage("");

    try {
      const detail = await api.chatEnviarMensagem(chatToken, { conteudo });
      setAtendimento(detail?.atendimento || null);
      setMensagens(Array.isArray(detail?.mensagens) ? detail.mensagens : []);
      setPosicaoFila(detail?.posicao_fila || 0);
    } catch (error) {
      setComposer(conteudo);
      setErrorMessage(error.message || "Nao foi possivel enviar a mensagem.");
    }
  }

  async function submitRating() {
    if (!chatToken || !rating.nota) return;

    try {
      await api.chatAvaliarAtendimento(chatToken, rating);
      writeStoredChat(null);
      setAtendimento(null);
      setMensagens([]);
      setRating({ nota: 0, comentario: "" });
      setVisible(false);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message || "Nao foi possivel registrar a avaliacao.");
    }
  }

  const shouldShowToggle = !isFooterEntry && !visible && supportState.available;

  return (
    <div
      className={[
        "support-chat-wrapper",
        isFooterEntry ? "footer-entry" : "",
        visible ? "panel-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {visible ? (
        <>
          <button
            type="button"
            className={`support-chat-backdrop ${expanded ? "expanded" : ""}`}
            onClick={() => {
              if (!expanded) closePanel();
            }}
            aria-label={expanded ? "Fundo do chat expandido" : "Fechar chat"}
          />

          <div
            className={`support-chat-panel ${expanded ? "expanded" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="support-chat-header">
              <div className="support-chat-header-text">
                <strong>Atendimento V12</strong>
                <span>{headerSubtitle}</span>
              </div>

              <div className="support-chat-header-actions">
                <button
                  type="button"
                  className="support-chat-icon-button"
                  onClick={() => setExpanded((current) => !current)}
                  aria-label={expanded ? "Reduzir chat" : "Expandir chat"}
                >
                  {expanded ? <HiOutlineArrowsPointingIn /> : <HiOutlineArrowsPointingOut />}
                </button>
                <button
                  type="button"
                  className="support-chat-icon-button"
                  onClick={closePanel}
                  aria-label="Fechar chat"
                >
                  <HiOutlineXMark />
                </button>
              </div>
            </div>

            <div className="support-chat-body">
              {!supportState.available ? (
                <div className="support-chat-unavailable">
                  <div className="support-chat-unavailable-card">
                    <strong>Suporte indisponivel</strong>
                    <p>
                      {supportState.reason ||
                        "Nao foi possivel comunicar com o suporte neste momento."}
                    </p>
                    <button
                      type="button"
                      className="support-chat-secondary"
                      onClick={() => void refreshConfig()}
                    >
                      Atualizar situacao
                    </button>
                  </div>
                </div>
              ) : !atendimento ? (
                <form className="support-chat-form" onSubmit={startChat}>
                  {errorMessage ? <div className="support-chat-notice">{errorMessage}</div> : null}

                  {!isLogged ? (
                    <>
                      <label className="support-chat-field">
                        <span>Nome</span>
                        <input
                          value={form.nome}
                          onChange={(event) => updateForm("nome", event.target.value)}
                          required
                        />
                      </label>

                      <label className="support-chat-field">
                        <span>Telefone de contato</span>
                        <input
                          value={form.telefone}
                          onChange={(event) => updateForm("telefone", event.target.value)}
                          placeholder="Ex.: 81999999999"
                        />
                      </label>
                    </>
                  ) : null}

                  <label className="support-chat-field">
                    <span>Setor</span>
                    <select
                      value={form.categoria_id}
                      onChange={(event) => updateForm("categoria_id", event.target.value)}
                      required
                    >
                      {supportState.categorias.map((categoria) => (
                        <option key={categoria.categoria_id} value={categoria.categoria_id}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="support-chat-field">
                    <span>Assunto</span>
                    <input
                      value={form.assunto}
                      onChange={(event) => updateForm("assunto", event.target.value)}
                      required
                    />
                  </label>

                  <label className="support-chat-field fill">
                    <span>Mensagem</span>
                    <textarea
                      value={form.mensagem}
                      onChange={(event) => updateForm("mensagem", event.target.value)}
                      required
                    />
                  </label>

                  <button type="submit" className="support-chat-primary" disabled={saving}>
                    {saving ? "Enviando..." : "Iniciar atendimento"}
                  </button>
                </form>
              ) : (
                <>
                  {errorMessage ? <div className="support-chat-notice">{errorMessage}</div> : null}

                  {atendimento.status === "aguardando" ? (
                    <div className="support-chat-notice">
                      Atendimento em fila.{" "}
                      {posicaoFila
                        ? `Sua posição atual é ${formatQueuePosition(posicaoFila)}.`
                        : "Aguarde um atendente."}
                    </div>
                  ) : null}

                  <div className="support-chat-messages">
                    {mensagens.map((mensagem) => (
                      <div
                        key={mensagem.mensagem_id}
                        className={[
                          "support-chat-message",
                          mensagem.autor_tipo === "cliente" ? "mine" : "",
                          mensagem.autor_tipo === "sistema" ? "system" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {linkifyText(mensagem.conteudo)}
                      </div>
                    ))}
                  </div>

                  {atendimento.status === "encerrado" ? (
                    <div className="support-chat-rating">
                      <strong>Avalie o atendimento</strong>

                      <div className="support-chat-stars">
                        {[1, 2, 3, 4, 5].map((nota) => (
                          <button
                            key={nota}
                            type="button"
                            onClick={() => setRating((current) => ({ ...current, nota }))}
                          >
                            {rating.nota >= nota ? "★" : "☆"}
                          </button>
                        ))}
                      </div>

                      <label className="support-chat-field">
                        <span>Comentario opcional</span>
                        <textarea
                          value={rating.comentario}
                          onChange={(event) =>
                            setRating((current) => ({
                              ...current,
                              comentario: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <button
                        type="button"
                        className="support-chat-primary"
                        disabled={!rating.nota}
                        onClick={submitRating}
                      >
                        Finalizar
                      </button>
                    </div>
                  ) : (
                    <form className="support-chat-composer" onSubmit={sendMessage}>
                      <input
                        value={composer}
                        onChange={(event) => setComposer(event.target.value)}
                        placeholder="Digite sua mensagem"
                      />
                      <button type="submit" aria-label="Enviar mensagem">
                        <HiOutlinePaperAirplane />
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      ) : null}

      {shouldShowToggle ? (
        <button
          type="button"
          className={`support-chat-toggle ${unread ? "unread" : ""}`}
          onClick={openPanel}
          aria-label="Abrir suporte"
        >
          <HiOutlineChatBubbleLeftRight />
        </button>
      ) : null}
    </div>
  );
}
