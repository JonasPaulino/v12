import React, { useEffect, useRef, useState } from "react";
import { MdNotificationsNone } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { api } from "api/axiosConfig";
import DropdownMenu from "components/dropDownMenu";
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

const NotificationLabel = ({ item }) => (
  <C.NotificationItem $unread={!item.lida}>
    <C.NotificationTitle>{item.titulo}</C.NotificationTitle>
    <C.NotificationMessage>{item.mensagem}</C.NotificationMessage>
    <C.NotificationTime>{formatDate(item.criado_em)}</C.NotificationTime>
  </C.NotificationItem>
);

const HeaderNotifications = () => {
  const buttonRef = useRef(null);
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

  const handleClick = async (item) => {
    try {
      if (!item.lida) {
        await api.post(`/notificacoes/${item.notificacao_id}/lida`);
      }
    } catch {
      // A navegação não deve depender da confirmação visual de leitura.
    }

    await loadNotifications();
    if (item.rota) navigate(item.rota);
  };

  const menuItems = items.length
    ? items.map((item) => ({
        key: item.notificacao_id,
        label: <NotificationLabel item={item} />,
        ariaLabel: item.titulo,
        onClick: () => handleClick(item),
      }))
    : [
        {
          key: "empty",
          label: (
            <C.NotificationItem>
              <C.NotificationTitle>Nenhuma notificação</C.NotificationTitle>
              <C.NotificationMessage>Novos avisos aparecerão aqui.</C.NotificationMessage>
            </C.NotificationItem>
          ),
          ariaLabel: "Nenhuma notificação",
          disabled: true,
        },
      ];

  return (
    <>
      <C.NotificationButton
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen(true);
          loadNotifications();
        }}
        aria-label="Notificações"
      >
        <MdNotificationsNone />
        {unread > 0 && <C.NotificationBadge>{unread > 9 ? "9+" : unread}</C.NotificationBadge>}
      </C.NotificationButton>

      <DropdownMenu
        open={open}
        anchorEl={buttonRef.current}
        onClose={() => setOpen(false)}
        items={menuItems}
        minWidth={320}
      />
    </>
  );
};

export default HeaderNotifications;
