import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthMiddleware } from "middleware";
import PageWrapper from "./PageWrapper";
import { Login } from "pages/login";
import { Dashboard } from "pages/dashboard";
import { Usuario } from "pages/usuario";
import { Produto } from "pages/produto";
import { Pessoa } from "pages/pessoa";
import { NotFound } from "pages/404";

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
            <PageWrapper title="Usuarios">
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
