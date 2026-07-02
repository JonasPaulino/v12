import React, { useCallback, useContext, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  HiOutlineArrowLeftOnRectangle,
  HiOutlineBanknotes,
  HiOutlineBars3,
  HiOutlineBell,
  HiOutlineBriefcase,
  HiOutlineBuildingOffice2,
  HiOutlineChartBarSquare,
  HiOutlineCog8Tooth,
  HiOutlineUsers,
} from "react-icons/hi2";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { logout } from "components/sidebar/components/profile/api";
import * as C from "./style";

const menuItems = [
  {
    path: "/gestao-v12",
    title: "Dashboard Gestão",
    icon: HiOutlineChartBarSquare,
    exact: true,
  },
  {
    path: "/gestao-v12/clientes",
    title: "Clientes",
    icon: HiOutlineBuildingOffice2,
  },
  {
    path: "/gestao-v12/pessoas",
    title: "Pessoas",
    icon: HiOutlineUsers,
  },
  {
    path: "/gestao-v12/financeiro",
    title: "Financeiro",
    icon: HiOutlineBanknotes,
  },
  {
    path: "/gestao-v12/usuarios",
    title: "Usuários internos",
    icon: HiOutlineBriefcase,
  },
  {
    path: "/gestao-v12/configuracoes",
    title: "Configurações",
    icon: HiOutlineCog8Tooth,
  },
];

const isActiveRoute = (pathname, item) =>
  item.exact ? pathname === item.path : pathname === item.path || pathname.startsWith(`${item.path}/`);

export const GestaoV12Layout = ({ title = "Gestão V12", subtitle, children }) => {
  const { user, clearSession } = useContext(AppContext);
  const { askYesNoQuestion } = useSweetAlert();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 900;
  });

  const pageSubtitle = subtitle || "Ambiente interno para administração da empresa V12.";
  const userName = user?.usuario_nome || "Usuário";

  const activeTitle = useMemo(() => {
    const activeItem = menuItems.find((item) => isActiveRoute(location.pathname, item));
    return activeItem?.title || title;
  }, [location.pathname, title]);

  const handleNavigate = useCallback(
    (path) => {
      navigate(path);
      if (typeof window !== "undefined" && window.innerWidth <= 900) {
        setOpen(false);
      }
    },
    [navigate]
  );

  const handleLogout = useCallback(async () => {
    const confirmed = await askYesNoQuestion("Sair do sistema?", "Deseja encerrar a sessão atual?");
    if (!confirmed) return;

    await logout();
    clearSession();
    navigate("/login", { replace: true });
  }, [askYesNoQuestion, clearSession, navigate]);

  return (
    <C.Shell>
      <C.Sidebar $open={open}>
        <C.Brand $open={open} type="button" onClick={() => handleNavigate("/gestao-v12")}>
          <C.BrandMark>V12</C.BrandMark>
          <C.BrandText $open={open}>
            <strong>Gestão V12</strong>
            <small>Administração interna</small>
          </C.BrandText>
        </C.Brand>

        <C.MenuArea>
          <C.MenuLabel $open={open}>Gestão</C.MenuLabel>
          <C.NavList>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <C.NavButton
                  key={item.path}
                  type="button"
                  $open={open}
                  $active={isActiveRoute(location.pathname, item)}
                  onClick={() => handleNavigate(item.path)}
                  title={item.title}
                >
                  <Icon />
                  <C.NavText $open={open}>{item.title}</C.NavText>
                </C.NavButton>
              );
            })}
          </C.NavList>
        </C.MenuArea>
      </C.Sidebar>

      {open ? <C.Overlay onClick={() => setOpen(false)} /> : null}

      <C.Content>
        <C.Header>
          <C.HeaderLeft>
            <C.MenuButton type="button" onClick={() => setOpen((current) => !current)}>
              <HiOutlineBars3 />
            </C.MenuButton>
            <C.TitleBlock>
              <C.Title>{activeTitle}</C.Title>
              <C.Subtitle>{pageSubtitle}</C.Subtitle>
            </C.TitleBlock>
          </C.HeaderLeft>

          <C.HeaderActions>
            <C.ActionButton type="button" title="Notificações internas" $iconOnly>
              <HiOutlineBell />
            </C.ActionButton>
            <C.HeaderUser>
              <strong>{userName.toUpperCase()}</strong>
            </C.HeaderUser>
            <C.ActionButton type="button" onClick={handleLogout}>
              <HiOutlineArrowLeftOnRectangle />
              <span>Sair</span>
            </C.ActionButton>
          </C.HeaderActions>
        </C.Header>

        <C.Body>{children}</C.Body>
      </C.Content>
    </C.Shell>
  );
};
