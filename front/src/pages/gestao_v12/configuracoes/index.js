import React, { useCallback, useContext, useEffect, useState } from "react";
import { api } from "api/axiosConfig";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { GestaoV12Layout } from "layouts/gestao_v12";
import * as C from "./style";

const initialAsaasForm = {
  ativo: false,
  ambiente: "sandbox",
  api_key: "",
};

export const GestaoV12Configuracoes = () => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [activeTab, setActiveTab] = useState("cobranca");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [asaasConfig, setAsaasConfig] = useState(null);
  const [asaasForm, setAsaasForm] = useState(initialAsaasForm);

  const loadAsaasConfig = useCallback(async () => {
    setLoading(true);
    showLoading("Carregando configurações...");
    try {
      const { data } = await api.get("/gestao/financeiro/configuracao/asaas");
      const config = data.data || {};
      setAsaasConfig(config);
      setAsaasForm({
        ativo: config.ativo === true,
        ambiente: config.ambiente || "sandbox",
        api_key: "",
      });
    } catch (error) {
      showAlert?.({
        title: "Falha ao carregar configuração",
        text: error?.response?.data?.message || "Não foi possível carregar o Asaas da V12.",
        icon: "error",
      });
    } finally {
      setLoading(false);
      hideLoading();
    }
  }, [hideLoading, showAlert, showLoading]);

  useEffect(() => {
    loadAsaasConfig();
  }, [loadAsaasConfig]);

  const updateAsaasField = (field, value) => {
    setAsaasForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmitAsaas = async (event) => {
    event.preventDefault();
    setSaving(true);
    showLoading("Salvando configurações...");
    try {
      const { data } = await api.put("/gestao/financeiro/configuracao/asaas", asaasForm);
      const config = data.data || {};
      setAsaasConfig(config);
      setAsaasForm((current) => ({
        ...current,
        api_key: "",
      }));
      showAlert?.({
        title: "Configuração salva",
        text: "A conta Asaas da Gestão V12 foi atualizada.",
        icon: "success",
        timer: 1800,
      });
    } catch (error) {
      showAlert?.({
        title: "Falha ao salvar configuração",
        text: error?.response?.data?.message || "Não foi possível salvar a conta Asaas.",
        icon: "error",
      });
    } finally {
      setSaving(false);
      hideLoading();
    }
  };

  return (
    <GestaoV12Layout
      title="Configurações"
      subtitle="Parâmetros próprios da empresa V12, separados das filiais dos clientes."
    >
      <C.Stack>
        <C.Card as="form" onSubmit={handleSubmitAsaas}>
          <C.CardHeader>
            <C.CardTitle>Configurações da Gestão V12</C.CardTitle>
            <C.CardText>
              Esta área configura a operação interna da V12. As credenciais salvas ficam
              mascaradas e não retornam abertas para o navegador.
            </C.CardText>
          </C.CardHeader>

          <C.Tabs>
            <C.TabButton
              type="button"
              $active={activeTab === "cobranca"}
              onClick={() => setActiveTab("cobranca")}
            >
              Cobrança
            </C.TabButton>
            <C.TabButton
              type="button"
              $active={activeTab === "fiscal"}
              onClick={() => setActiveTab("fiscal")}
            >
              Fiscal
            </C.TabButton>
            <C.TabButton
              type="button"
              $active={activeTab === "mensagens"}
              onClick={() => setActiveTab("mensagens")}
            >
              Mensagens
            </C.TabButton>
          </C.Tabs>

          {activeTab === "cobranca" ? (
            <C.SectionBody>
              <C.CardHeader>
                <C.CardTitle>Gateway de cobrança</C.CardTitle>
                <C.CardText>
                  Conta Asaas usada pela V12 para gerar mensalidades, boletos e Pix dos
                  clientes do sistema. Essa configuração não usa a conta Asaas das filiais.
                </C.CardText>
              </C.CardHeader>

              <C.InfoGrid>
                <C.InfoCard>
                  <C.InfoLabel>Status</C.InfoLabel>
                  <C.InfoValue>{asaasConfig?.ativo ? "Ativa" : "Inativa"}</C.InfoValue>
                </C.InfoCard>
                <C.InfoCard>
                  <C.InfoLabel>Chave atual</C.InfoLabel>
                  <C.InfoValue>{asaasConfig?.api_key_masked || "Não configurada"}</C.InfoValue>
                </C.InfoCard>
              </C.InfoGrid>

              <C.FieldsGrid>
                <C.Field>
                  <C.FieldSpan>Provider</C.FieldSpan>
                  <C.Select value="asaas" disabled>
                    <option value="asaas">Asaas</option>
                  </C.Select>
                </C.Field>

                <C.Field>
                  <C.FieldSpan>Ambiente</C.FieldSpan>
                  <C.Select
                    value={asaasForm.ambiente}
                    onChange={(event) => updateAsaasField("ambiente", event.target.value)}
                    disabled={loading}
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Produção</option>
                  </C.Select>
                </C.Field>

                <C.Field>
                  <C.FieldSpan>API key</C.FieldSpan>
                  <C.Input
                    type="password"
                    value={asaasForm.api_key}
                    onChange={(event) => updateAsaasField("api_key", event.target.value)}
                    placeholder={
                      asaasConfig?.api_key_masked
                        ? `Atual: ${asaasConfig.api_key_masked}`
                        : "Cole a API key da conta Asaas da V12"
                    }
                    disabled={loading}
                  />
                  <C.FieldHint>Deixe em branco para manter a chave já cadastrada.</C.FieldHint>
                </C.Field>
              </C.FieldsGrid>

              <C.ToggleList>
                <C.ToggleRow>
                  <C.Checkbox
                    type="checkbox"
                    checked={asaasForm.ativo}
                    onChange={(event) => updateAsaasField("ativo", event.target.checked)}
                    disabled={loading}
                  />
                  <span>Ativar integração de cobrança da Gestão V12</span>
                </C.ToggleRow>
              </C.ToggleList>

              <C.Actions>
                <C.SecondaryButton type="button" onClick={loadAsaasConfig} disabled={loading}>
                  Recarregar
                </C.SecondaryButton>
                <C.PrimaryButton type="submit" disabled={saving || loading}>
                  {saving ? "Salvando..." : "Salvar configurações"}
                </C.PrimaryButton>
              </C.Actions>
            </C.SectionBody>
          ) : null}

          {activeTab === "fiscal" ? (
            <C.Placeholder>
              Parâmetros fiscais próprios da empresa V12 ficarão aqui quando o módulo de emissão
              fiscal interna for ativado.
            </C.Placeholder>
          ) : null}

          {activeTab === "mensagens" ? (
            <C.Placeholder>
              Configurações de mensagens administrativas da V12 ficarão aqui, separadas das
              conexões WhatsApp das filiais dos clientes.
            </C.Placeholder>
          ) : null}
        </C.Card>
      </C.Stack>
    </GestaoV12Layout>
  );
};
