import React from "react";
import { useModalUsuario } from "./use";
import * as C from "./style";

export const ModalUsuario = ({ isOpen, usuarioId, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    manageableTenants,
    currentTenantId,
    hiddenAssignmentsCount,
    form,
    updateField,
    toggleTenant,
    selectedTenantIds,
    handleSubmit,
    submitting,
    loadingForm,
  } = useModalUsuario({
    isOpen,
    usuarioId,
    onClose,
  });

  if (!isOpen) return null;

  return (
    <C.Overlay>
      <C.Modal>
        <C.Header>
          <C.TitleBlock>
            <C.Title>{usuarioId ? "Editar usuario" : "Novo usuario"}</C.Title>
            <C.Subtitle>
              O usuario e global e pode receber acesso somente as filiais permitidas ao
              usuario logado.
            </C.Subtitle>
          </C.TitleBlock>

          <C.CloseButton type="button" onClick={() => onClose(false)} disabled={submitting}>
            ×
          </C.CloseButton>
        </C.Header>

        <C.Tabs>
          <C.TabButton
            type="button"
            $active={activeTab === "dados"}
            onClick={() => setActiveTab("dados")}
          >
            Dados
          </C.TabButton>
          <C.TabButton
            type="button"
            $active={activeTab === "filiais"}
            onClick={() => setActiveTab("filiais")}
          >
            Filiais
          </C.TabButton>
        </C.Tabs>

        <C.Form onSubmit={handleSubmit}>
          <C.Body>
            {loadingForm ? (
              <C.Hint>Carregando dados do usuario...</C.Hint>
            ) : activeTab === "dados" ? (
              <>
                <C.Grid>
                  <C.Field>
                    <C.FieldSpan>Nome completo</C.FieldSpan>
                    <C.Input
                      value={form.usuario_nome}
                      onChange={(event) => updateField("usuario_nome", event.target.value)}
                      required
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>E-mail</C.FieldSpan>
                    <C.Input
                      type="email"
                      value={form.usuario_email}
                      onChange={(event) => updateField("usuario_email", event.target.value)}
                      required
                    />
                  </C.Field>
                </C.Grid>

                <C.Grid>
                  <C.Field>
                    <C.FieldSpan>Login</C.FieldSpan>
                    <C.Input
                      value={form.usuario_username}
                      onChange={(event) =>
                        updateField("usuario_username", event.target.value)
                      }
                      required
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>
                      {usuarioId ? "Nova senha opcional" : "Senha inicial"}
                    </C.FieldSpan>
                    <C.Input
                      type="password"
                      value={form.usuario_senha}
                      onChange={(event) => updateField("usuario_senha", event.target.value)}
                      required={!usuarioId}
                    />
                  </C.Field>
                </C.Grid>

                <C.CheckboxLine>
                  <input
                    type="checkbox"
                    checked={!!form.usuario_ativo}
                    onChange={(event) =>
                      updateField("usuario_ativo", event.target.checked)
                    }
                  />
                  Usuario ativo
                </C.CheckboxLine>

                <C.Hint>
                  O usuario novo entra com a senha inicial cadastrada e sera obrigado a
                  definir uma nova senha no primeiro acesso.
                </C.Hint>
              </>
            ) : (
              <>
                {hiddenAssignmentsCount > 0 && (
                  <C.AlertBox>
                    Este usuario possui {hiddenAssignmentsCount} filiais adicionais fora do seu
                    escopo atual. Elas serao preservadas, mas nao podem ser gerenciadas nesta
                    sessao.
                  </C.AlertBox>
                )}

                <C.Hint>
                  A filial ativa permanece obrigatoria para garantir que o usuario apareca nesta
                  tela e possa operar na loja corrente.
                </C.Hint>

                <C.TenantList>
                  {manageableTenants.map((tenant) => {
                    const checked = selectedTenantIds.includes(tenant.tenant_id);
                    const disabled = tenant.tenant_id === currentTenantId;

                    return (
                      <C.TenantCard
                        key={tenant.tenant_id}
                        $checked={checked}
                        $disabled={disabled}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleTenant(tenant.tenant_id)}
                        />
                        <C.TenantInfo>
                          <C.TenantName>{tenant.tenant_nome}</C.TenantName>
                          <C.TenantMeta>
                            {tenant.tenant_documento || tenant.tenant_slug || "Filial sem documento"}
                          </C.TenantMeta>
                        </C.TenantInfo>
                      </C.TenantCard>
                    );
                  })}
                </C.TenantList>

                <C.Field>
                  <C.FieldSpan>Filial padrao para o login</C.FieldSpan>
                  <C.Select
                    value={form.tenant_id_default || ""}
                    onChange={(event) =>
                      updateField("tenant_id_default", Number(event.target.value))
                    }
                  >
                    {manageableTenants
                      .filter((tenant) => selectedTenantIds.includes(tenant.tenant_id))
                      .map((tenant) => (
                        <option key={tenant.tenant_id} value={tenant.tenant_id}>
                          {tenant.tenant_nome}
                        </option>
                      ))}
                  </C.Select>
                </C.Field>
              </>
            )}
          </C.Body>

          <C.Footer>
            <C.SecondaryButton type="button" onClick={() => onClose(false)} disabled={submitting}>
              Cancelar
            </C.SecondaryButton>
            <C.PrimaryButton type="submit" disabled={submitting}>
              {submitting
                ? "Salvando..."
                : usuarioId
                ? "Salvar alteracoes"
                : "Cadastrar usuario"}
            </C.PrimaryButton>
          </C.Footer>
        </C.Form>
      </C.Modal>
    </C.Overlay>
  );
};
