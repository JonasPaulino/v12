import React, { useContext, useEffect, useState } from "react";
import { MdClose, MdKeyboardArrowDown } from "react-icons/md";
import {
  HiOutlineBanknotes,
  HiOutlineChartBarSquare,
  HiOutlineCog8Tooth,
  HiOutlineCube,
  HiOutlineClipboardDocumentCheck,
  HiOutlineDocumentText,
  HiOutlineIdentification,
  HiOutlineArchiveBox,
  HiOutlineShoppingBag,
  HiOutlineShoppingCart,
  HiOutlineUsers,
} from "react-icons/hi2";
import { useLocation, useNavigate } from "react-router-dom";
import { AppContext } from "context";
import * as C from "./style";
import ProfileOptions from "./components/profile";

const Sidebar = () => {
  const { mOpen, abreFechaMenu, selecionaPagina } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({
    pedidos: ["/vendas", "/compras"].includes(location.pathname),
    nfe: location.pathname.startsWith("/nfe"),
  });

  const handleNavigate = (path, title) => {
    selecionaPagina(title);
    navigate(path);
    if (typeof window !== "undefined" && window.innerWidth <= 900 && mOpen) {
      abreFechaMenu();
    }
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  useEffect(() => {
    if (["/vendas", "/compras"].includes(location.pathname)) {
      setExpandedGroups((prev) => ({ ...prev, pedidos: true }));
    }
    if (location.pathname.startsWith("/nfe")) {
      setExpandedGroups((prev) => ({ ...prev, nfe: true }));
    }
  }, [location.pathname]);

  return (
    <C.Container $open={mOpen}>
      <C.MobileCloseButton type="button" onClick={abreFechaMenu} aria-label="Fechar menu">
        <MdClose />
      </C.MobileCloseButton>
      <C.TopArea>
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
              title="Painel inicial com indicadores da operação"
              aria-label="Painel inicial com indicadores da operação"
            >
              <HiOutlineChartBarSquare />
              <C.NavText $open={mOpen}>Dashboard</C.NavText>
            </C.NavButton>

            <C.NavButton
              $open={mOpen}
              $active={location.pathname === "/pessoas"}
              onClick={() => handleNavigate("/pessoas", "Pessoas")}
              title="Cadastro de clientes, fornecedores e contatos"
              aria-label="Cadastro de clientes, fornecedores e contatos"
            >
              <HiOutlineIdentification />
              <C.NavText $open={mOpen}>Pessoas</C.NavText>
            </C.NavButton>
            <C.NavButton
              $open={mOpen}
              $active={location.pathname === "/produtos"}
              onClick={() => handleNavigate("/produtos", "Produtos")}
              title="Cadastro de produtos, preços e dados fiscais básicos"
              aria-label="Cadastro de produtos, preços e dados fiscais básicos"
            >
              <HiOutlineCube />
              <C.NavText $open={mOpen}>Produtos</C.NavText>
            </C.NavButton>

            <C.NavGroup>
              <C.GroupButton
                $open={mOpen}
                $active={["/vendas", "/compras"].includes(location.pathname)}
                onClick={() => toggleGroup("pedidos")}
                title="Pedidos de venda e pedidos de compra"
                aria-label="Pedidos de venda e pedidos de compra"
                type="button"
              >
                <C.GroupLabel>
                  <HiOutlineShoppingCart />
                  <C.NavText $open={mOpen}>Pedidos</C.NavText>
                </C.GroupLabel>
                <C.GroupChevron $open={mOpen} $expanded={expandedGroups.pedidos}>
                  <MdKeyboardArrowDown />
                </C.GroupChevron>
              </C.GroupButton>
              <C.SubNavList $open={mOpen} $expanded={expandedGroups.pedidos}>
                <C.SubNavButton
                  $open={mOpen}
                  $active={location.pathname === "/vendas"}
                  onClick={() => handleNavigate("/vendas", "Vendas")}
                  title="Pedidos de venda para clientes"
                  aria-label="Pedidos de venda para clientes"
                >
                  <HiOutlineShoppingCart />
                  <C.NavText $open={mOpen}>Vendas</C.NavText>
                </C.SubNavButton>
                <C.SubNavButton
                  $open={mOpen}
                  $active={location.pathname === "/compras"}
                  onClick={() => handleNavigate("/compras", "Compras")}
                  title="Pedidos de compra para fornecedores"
                  aria-label="Pedidos de compra para fornecedores"
                >
                  <HiOutlineShoppingBag />
                  <C.NavText $open={mOpen}>Compras</C.NavText>
                </C.SubNavButton>
              </C.SubNavList>
            </C.NavGroup>

            <C.NavButton
              $open={mOpen}
              $active={location.pathname === "/entradas"}
              onClick={() => handleNavigate("/entradas", "Entradas")}
              title="Entrada e conferência de mercadorias recebidas"
              aria-label="Entrada e conferência de mercadorias recebidas"
            >
              <HiOutlineClipboardDocumentCheck />
              <C.NavText $open={mOpen}>Entradas</C.NavText>
            </C.NavButton>
            <C.NavButton
              $open={mOpen}
              $active={location.pathname === "/devolucoes"}
              onClick={() => handleNavigate("/devolucoes", "Devoluções")}
              title="Devoluções de venda e compra com movimentação de estoque"
              aria-label="Devoluções de venda e compra com movimentação de estoque"
            >
              <HiOutlineClipboardDocumentCheck />
              <C.NavText $open={mOpen}>Devoluções</C.NavText>
            </C.NavButton>
            <C.NavButton
              $open={mOpen}
              $active={location.pathname === "/estoque"}
              onClick={() => handleNavigate("/estoque", "Estoque")}
              title="Saldos, movimentações e ajustes de estoque"
              aria-label="Saldos, movimentações e ajustes de estoque"
            >
              <HiOutlineArchiveBox />
              <C.NavText $open={mOpen}>Estoque</C.NavText>
            </C.NavButton>
            <C.NavButton
              $open={mOpen}
              $active={location.pathname === "/contas"}
              onClick={() => handleNavigate("/contas", "Contas")}
              title="Contas a pagar, receber, boletos e PIX"
              aria-label="Contas a pagar, receber, boletos e PIX"
            >
              <HiOutlineBanknotes />
              <C.NavText $open={mOpen}>Contas</C.NavText>
            </C.NavButton>

            <C.NavGroup>
              <C.GroupButton
                $open={mOpen}
                $active={location.pathname === "/nfe/emitidas" || location.pathname === "/nfe/recebidas" || location.pathname === "/nfe"}
                onClick={() => toggleGroup("nfe")}
                title="Notas fiscais eletrônicas emitidas e recebidas"
                aria-label="Notas fiscais eletrônicas emitidas e recebidas"
                type="button"
              >
                <C.GroupLabel>
                  <HiOutlineDocumentText />
                  <C.NavText $open={mOpen}>NF-e</C.NavText>
                </C.GroupLabel>
                <C.GroupChevron $open={mOpen} $expanded={expandedGroups.nfe}>
                  <MdKeyboardArrowDown />
                </C.GroupChevron>
              </C.GroupButton>
              <C.SubNavList $open={mOpen} $expanded={expandedGroups.nfe}>
                <C.SubNavButton
                  $open={mOpen}
                  $active={location.pathname === "/nfe/emitidas" || location.pathname === "/nfe"}
                  onClick={() => handleNavigate("/nfe/emitidas", "NF-e emitidas")}
                  title="Notas fiscais de saída emitidas pela empresa"
                  aria-label="Notas fiscais de saída emitidas pela empresa"
                >
                  <HiOutlineDocumentText />
                  <C.NavText $open={mOpen}>Emitidas</C.NavText>
                </C.SubNavButton>
                <C.SubNavButton
                  $open={mOpen}
                  $active={location.pathname === "/nfe/recebidas"}
                  onClick={() => handleNavigate("/nfe/recebidas", "NF-e recebidas")}
                  title="Notas fiscais recebidas de fornecedores"
                  aria-label="Notas fiscais recebidas de fornecedores"
                >
                  <HiOutlineDocumentText />
                  <C.NavText $open={mOpen}>Recebidas</C.NavText>
                </C.SubNavButton>
              </C.SubNavList>
            </C.NavGroup>

            <C.NavButton
              $open={mOpen}
              $active={location.pathname === "/usuarios"}
              onClick={() => handleNavigate("/usuarios", "Usuários")}
              title="Controle de usuários e permissões de acesso"
              aria-label="Controle de usuários e permissões de acesso"
            >
              <HiOutlineUsers />
              <C.NavText $open={mOpen}>Usuários</C.NavText>
            </C.NavButton>

            <C.NavButton
              $open={mOpen}
              $active={
                location.pathname === "/configuracao" ||
                location.pathname === "/configuracao-fiscal"
              }
              onClick={() => handleNavigate("/configuracao", "Configuração")}
              title="Configurações fiscais, integrações e parâmetros do sistema"
              aria-label="Configurações fiscais, integrações e parâmetros do sistema"
            >
              <HiOutlineCog8Tooth />
              <C.NavText $open={mOpen}>Configuração</C.NavText>
            </C.NavButton>
          </C.NavList>
        </C.MenuContainer>
      </C.TopArea>

      <C.BottomArea>
        <ProfileOptions open={mOpen} />
      </C.BottomArea>
    </C.Container>
  );
};

export default Sidebar;
