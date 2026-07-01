import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "api/axiosConfig";
import * as C from "./style";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const BellIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M12 22a2.75 2.75 0 0 0 2.62-1.9H9.38A2.75 2.75 0 0 0 12 22Z"
      fill="currentColor"
    />
    <path
      d="M19.4 17.2c-.78-.98-1.27-1.5-1.27-4.4 0-2.66-1.36-4.73-3.76-5.45a2.48 2.48 0 0 0-4.74 0c-2.4.72-3.76 2.79-3.76 5.45 0 2.9-.49 3.42-1.27 4.4-.33.42-.52.93-.39 1.44.14.55.6.86 1.2.86h13.18c.6 0 1.06-.31 1.2-.86.13-.51-.06-1.02-.39-1.44Z"
      fill="currentColor"
      opacity="0.78"
    />
  </svg>
);

const HeaderNotifications = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const loadNotifications = async () => {
    try {
      const { data } = await api.get("/notificacoes", { params: { limit: 8 } });
      setItems(data?.data || []);
      setUnread(Number(data?.unread || 0));
    } catch {
      setItems([]);
      setUnread(0);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const handleRefresh = () => loadNotifications();
    const interval = window.setInterval(handleRefresh, 30000);
    document.addEventListener("app:notifications:refresh", handleRefresh);
    window.addEventListener("focus", handleRefresh);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("app:notifications:refresh", handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleClick = async (item) => {
    try {
      if (!item.lida) {
        await api.post(`/notificacoes/${item.notificacao_id}/lida`);
      }
    } catch {
      // A navegação não deve depender da confirmação visual de leitura.
    }

    await loadNotifications();
    setOpen(false);
    if (item.rota) navigate(item.rota);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post("/notificacoes/lidas");
      await loadNotifications();
    } catch {
      // A ação é auxiliar; falha não deve travar a navegação do usuário.
    }
  };

  return (
    <>
      <C.NotificationButton
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          loadNotifications();
        }}
        aria-label="Notificações"
        aria-expanded={open}
      >
        <BellIcon />
        {unread > 0 && <C.NotificationBadge>{unread > 9 ? "9+" : unread}</C.NotificationBadge>}
      </C.NotificationButton>

      {open && (
        <>
          <C.NotificationBackdrop onClick={() => setOpen(false)} />
          <C.NotificationPanel role="dialog" aria-label="Notificações">
            <C.NotificationPanelHeader>
              <C.NotificationHeaderText>
                <strong>Notificações</strong>
                <span>{unread > 0 ? `${unread} aviso(s) não lido(s)` : "Tudo em dia"}</span>
              </C.NotificationHeaderText>
              {unread > 0 && (
                <C.NotificationMarkAllButton type="button" onClick={handleMarkAllAsRead}>
                  Marcar todas como lidas
                </C.NotificationMarkAllButton>
              )}
            </C.NotificationPanelHeader>

            <C.NotificationList>
              {items.length ? (
                items.map((item) => (
                  <C.NotificationItem
                    key={item.notificacao_id}
                    type="button"
                    $unread={!item.lida}
                    onClick={() => handleClick(item)}
                  >
                    <C.NotificationGlyph $unread={!item.lida}>
                      <BellIcon />
                    </C.NotificationGlyph>
                    <C.NotificationContent>
                      <C.NotificationTitle>{item.titulo}</C.NotificationTitle>
                      <C.NotificationMessage>{item.mensagem}</C.NotificationMessage>
                      <C.NotificationTime>{formatDate(item.criado_em)}</C.NotificationTime>
                    </C.NotificationContent>
                    {!item.lida && <C.NotificationUnreadDot />}
                  </C.NotificationItem>
                ))
              ) : (
                <C.NotificationEmpty>
                  <strong>Nenhuma notificação</strong>
                  <span>Novos avisos do sistema aparecerão aqui.</span>
                </C.NotificationEmpty>
              )}
            </C.NotificationList>
          </C.NotificationPanel>
        </>
      )}
    </>
  );
};

export default HeaderNotifications;
