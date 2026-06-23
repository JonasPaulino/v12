import React, { useContext } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthMiddleware } from "middleware";
import { AppContext } from "context";
import PageWrapper from "./PageWrapper";
import { Login } from "pages/login";
import { Dashboard } from "pages/dashboard";
import { Usuario } from "pages/usuario";
import { Produto } from "pages/produto";
import { Pessoa } from "pages/pessoa";
import { Venda } from "pages/venda";
import { Financeiro } from "pages/financeiro";
import { ConfiguracaoFiscal } from "pages/configuracao_fiscal";
import { Nfe } from "pages/nfe";
import { TenantSetup } from "pages/tenant_setup";
import { NotFound } from "pages/404";

const MasterOnly = ({ children }) => {
  const { user } = useContext(AppContext);

  if (!user?.usuario_master) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const RouteApp = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
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
            <PageWrapper title="Usuários">
              <Usuario />
            </PageWrapper>
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
        path="/configuracao"
        element={
          <AuthMiddleware>
            <PageWrapper title="Configuração">
              <ConfiguracaoFiscal />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route path="/configuracao-fiscal" element={<Navigate to="/configuracao" replace />} />
      <Route
        path="/filiais/nova"
        element={
          <AuthMiddleware>
            <MasterOnly>
              <PageWrapper title="Cadastrar empresa">
                <TenantSetup />
              </PageWrapper>
            </MasterOnly>
          </AuthMiddleware>
        }
      />
      <Route
        path="/nfe"
        element={
          <AuthMiddleware>
            <PageWrapper title="NF-e">
              <Nfe />
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
  </BrowserRouter>
);
