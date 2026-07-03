import React, { useContext } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthMiddleware } from "middleware";
import { AppContext } from "context";
import PageWrapper from "./PageWrapper";
import { Login } from "pages/login";
import { Dashboard } from "pages/dashboard";
import { Usuario } from "pages/usuario";
import { Produto } from "pages/produto";
import { Pessoa } from "pages/pessoa";
import { Venda } from "pages/venda";
import { Compra } from "pages/compra";
import { Estoque } from "pages/estoque";
import { EntradaMercadoria } from "pages/entrada_mercadoria";
import { Devolucao } from "pages/devolucao";
import { Financeiro } from "pages/financeiro";
import { ConfiguracaoFiscal } from "pages/configuracao_fiscal";
import { Nfe } from "pages/nfe";
import { NfeRecebidas } from "pages/nfe_recebidas";
import { NfeManifestacao } from "pages/nfe_manifestacao";
import { Mdfe } from "pages/mdfe";
import { ChatWidget } from "components/chatWidget";
import { EasterEggActivator, JesusStoryEasterEgg } from "../jogo/jesus_story";
import { GestaoV12Dashboard } from "pages/gestao_v12/dashboard";
import { GestaoV12Clientes } from "pages/gestao_v12/clientes";
import { GestaoV12Pessoas } from "pages/gestao_v12/pessoas";
import { GestaoV12Financeiro } from "pages/gestao_v12/financeiro";
import { GestaoV12Usuarios } from "pages/gestao_v12/usuarios";
import { GestaoV12Chat } from "pages/gestao_v12/chat";
import { GestaoV12Configuracoes } from "pages/gestao_v12/configuracoes";
import { NotFound } from "pages/404";

const canManageUsers = ({ user, business }) =>
  !!user?.usuario_master || String(business?.perfil || "").toLowerCase() === "admin";

const MasterOnly = ({ children }) => {
  const { user } = useContext(AppContext);

  if (!user?.usuario_master) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AdminOnly = ({ children }) => {
  const { user, business } = useContext(AppContext);

  if (!canManageUsers({ user, business })) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const RouteHelpers = () => {
  const location = useLocation();
  const isEasterEgg = location.pathname.startsWith("/easter-egg");

  return (
    <>
      <EasterEggActivator />
      {!isEasterEgg ? <ChatWidget /> : null}
    </>
  );
};

export const RouteApp = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/easter-egg/jesus" element={<JesusStoryEasterEgg />} />
      <Route
        path="/dashboard"
        element={
          <AuthMiddleware>
            <PageWrapper title="Dashboard">
              <Dashboard />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/usuarios"
        element={
          <AuthMiddleware>
            <AdminOnly>
              <PageWrapper title="Usuários">
                <Usuario />
              </PageWrapper>
            </AdminOnly>
          </AuthMiddleware>
        }
      />
      <Route
        path="/pessoas"
        element={
          <AuthMiddleware>
            <PageWrapper title="Pessoas">
              <Pessoa />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/vendas"
        element={
          <AuthMiddleware>
            <PageWrapper title="Vendas">
              <Venda />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/compras"
        element={
          <AuthMiddleware>
            <PageWrapper title="Compras">
              <Compra />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/entradas"
        element={
          <AuthMiddleware>
            <PageWrapper title="Entradas">
              <EntradaMercadoria />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/devolucoes"
        element={
          <AuthMiddleware>
            <PageWrapper title="Devoluções">
              <Devolucao />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/contas"
        element={
          <AuthMiddleware>
            <PageWrapper title="Contas">
              <Financeiro />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/estoque"
        element={
          <AuthMiddleware>
            <PageWrapper title="Estoque">
              <Estoque />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/configuracao"
        element={
          <AuthMiddleware>
            <AdminOnly>
              <PageWrapper title="Configuração">
                <ConfiguracaoFiscal />
              </PageWrapper>
            </AdminOnly>
          </AuthMiddleware>
        }
      />
      <Route path="/configuracao-fiscal" element={<Navigate to="/configuracao" replace />} />
      <Route
        path="/gestao-v12"
        element={
          <AuthMiddleware>
            <MasterOnly>
              <GestaoV12Dashboard />
            </MasterOnly>
          </AuthMiddleware>
        }
      />
      <Route
        path="/gestao-v12/clientes"
        element={
          <AuthMiddleware>
            <MasterOnly>
              <GestaoV12Clientes />
            </MasterOnly>
          </AuthMiddleware>
        }
      />
      <Route
        path="/gestao-v12/pessoas"
        element={
          <AuthMiddleware>
            <MasterOnly>
              <GestaoV12Pessoas />
            </MasterOnly>
          </AuthMiddleware>
        }
      />
      <Route
        path="/gestao-v12/financeiro"
        element={
          <AuthMiddleware>
            <MasterOnly>
              <GestaoV12Financeiro />
            </MasterOnly>
          </AuthMiddleware>
        }
      />
      <Route
        path="/gestao-v12/usuarios"
        element={
          <AuthMiddleware>
            <MasterOnly>
              <GestaoV12Usuarios />
            </MasterOnly>
          </AuthMiddleware>
        }
      />
      <Route
        path="/gestao-v12/chat"
        element={
          <AuthMiddleware>
            <MasterOnly>
              <GestaoV12Chat />
            </MasterOnly>
          </AuthMiddleware>
        }
      />
      <Route
        path="/gestao-v12/configuracoes"
        element={
          <AuthMiddleware>
            <MasterOnly>
              <GestaoV12Configuracoes />
            </MasterOnly>
          </AuthMiddleware>
        }
      />
      <Route path="/filiais/nova" element={<Navigate to="/gestao-v12" replace />} />
      <Route path="/nfe" element={<Navigate to="/nfe/emitidas" replace />} />
      <Route
        path="/nfe/emitidas"
        element={
          <AuthMiddleware>
            <PageWrapper title="NF-e emitidas">
              <Nfe />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/nfe/recebidas"
        element={
          <AuthMiddleware>
            <PageWrapper title="NF-e recebidas">
              <NfeRecebidas />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/mdfe"
        element={
          <AuthMiddleware>
            <PageWrapper title="MDF-e">
              <Mdfe />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/nfe/manifestacoes"
        element={
          <AuthMiddleware>
            <PageWrapper title="Manifestação NF-e">
              <NfeManifestacao />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/produtos"
        element={
          <AuthMiddleware>
            <PageWrapper title="Produtos">
              <Produto />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <RouteHelpers />
  </BrowserRouter>
);
