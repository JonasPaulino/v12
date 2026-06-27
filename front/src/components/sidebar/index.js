import React, { useContext } from "react";
import {
  MdClose,
  MdInventory2,
  MdOutlineReceiptLong,
  MdOutlineSettings,
} from "react-icons/md";
import {
  HiOutlineBanknotes,
  HiOutlineCube,
  HiOutlineIdentification,
  HiOutlineShoppingCart,
  HiOutlineUsers,
} from "react-icons/hi2";
import { RxDashboard } from "react-icons/rx";
import { useLocation, useNavigate } from "react-router-dom";
import { AppContext } from "context";
import * as C from "./style";
import ProfileOptions from "./components/profile";

const Sidebar = () => {
  const { mOpen, abreFechaMenu, selecionaPagina } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path, title) => {
    selecionaPagina(title);
    navigate(path);
  };

  return (
    <C.Container $open={mOpen}>
      <C.MobileCloseButton type="button" onClick={abreFechaMenu} aria-label="Fechar menu">
        <MdClose />
      </C.MobileCloseButton>
      <div>
        <C.LogoContainer $open={mOpen}>
          <C.Logo $open={mOpen}>
            <C.Brand>V12</C.Brand>
            {/* <C.BrandSub $open={mOpen}>Sistema de automação  </C.BrandSub> */}
          </C.Logo>
        </C.LogoContainer>

        <C.MenuContainer>
          <C.MenuLabel $open={mOpen}>Menu principal</C.MenuLabel>
          <C.NavList>
            <C.NavButton
              $open={mOpen}
              $active={location.pathname === "/dashboard"}
              onClick={() => handleNavigate("/dashboard", "Dashboard")}
              title="Dashboard"
              aria-label="Dashboard"
            >
              <RxDashboard />
              <C.NavText $open={mOpen}>Dashboard</C.NavText>
            </C.NavButton>
            <C.NavButton
              $open={mOpen}
              $active={location.pathname === "/usuarios"}
              onClick={() => handleNavigate("/usuarios", "Usuários")}
              title="Usuários"
              aria-label="Usuários"
            >
              <HiOutlineUsers />
              <C.NavText $open={mOpen}>Usuários</C.NavText>
            </C.NavButton>
            <C.NavButton
              $open={mOpen}
              $active={location.pathname === "/pessoas"}
              onClick={() => handleNavigate("/pessoas", "Pessoas")}
              title="Pessoas"
              aria-label="Pessoas"
            >
              <HiOutlineIdentification />
              <C.NavText $open={mOpen}>Pessoas</C.NavText>
            </C.NavButton>
            <C.NavButton
              $open={mOpen}
              $active={location.pathname === "/produtos"}
              onClick={() => handleNavigate("/produtos", "Produtos")}
              title="Produtos"
              aria-label="Produtos"
            >
              <HiOutlineCube />
              <C.NavText $open={mOpen}>Produtos</C.NavText>
            </C.NavButton>
            <C.NavButton
              $open={mOpen}
              $active={location.pathname === "/vendas"}
              onClick={() => handleNavigate("/vendas", "Vendas")}
              title="Vendas"
              aria-label="Vendas"
            >
              <HiOutlineShoppingCart />
              <C.NavText $open={mOpen}>Vendas</C.NavText>
            </C.NavButton>
            <C.NavButton
              $open={mOpen}
              $active={location.pathname === "/estoque"}
              onClick={() => handleNavigate("/estoque", "Estoque")}
              title="Estoque"
              aria-label="Estoque"
            >
              <MdInventory2 />
              <C.NavText $open={mOpen}>Estoque</C.NavText>
            </C.NavButton>
            <C.NavButton
              $open={mOpen}
              $active={location.pathname === "/contas"}
              onClick={() => handleNavigate("/contas", "Contas")}
              title="Contas"
              aria-label="Contas"
            >
              <HiOutlineBanknotes />
              <C.NavText $open={mOpen}>Contas</C.NavText>
            </C.NavButton>
            <C.NavButton
              $open={mOpen}
              $active={
                location.pathname === "/configuracao" ||
                location.pathname === "/configuracao-fiscal"
              }
              onClick={() => handleNavigate("/configuracao", "Configuração")}
              title="Configuração"
              aria-label="Configuração"
            >
              <MdOutlineSettings />
              <C.NavText $open={mOpen}>Configuração</C.NavText>
            </C.NavButton>
            <C.NavButton
              $open={mOpen}
              $active={location.pathname === "/nfe"}
              onClick={() => handleNavigate("/nfe", "NF-e")}
              title="NF-e"
              aria-label="NF-e"
            >
              <MdOutlineReceiptLong />
              <C.NavText $open={mOpen}>NF-e</C.NavText>
            </C.NavButton>
          </C.NavList>
        </C.MenuContainer>
      </div>

      <C.BottomArea>
        <ProfileOptions open={mOpen} />
      </C.BottomArea>
    </C.Container>
  );
};

export default Sidebar;
