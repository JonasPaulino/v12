import React from "react";
import { GestaoV12Layout } from "layouts/gestao_v12";
import { TenantSetup } from "pages/tenant_setup";

export const GestaoV12Clientes = () => (
  <GestaoV12Layout
    title="Clientes"
    subtitle="Cadastro de clientes, filiais, certificados A1, usuários admin e contrato inicial."
  >
    <TenantSetup embedded />
  </GestaoV12Layout>
);
