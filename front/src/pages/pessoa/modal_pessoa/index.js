import React from "react";
import { useModalPessoa } from "./use";
import * as C from "./style";

export const ModalPessoa = ({ isOpen, pessoaId, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    loadingForm,
    submitting,
    form,
    updateField,
    updateEnderecoField,
    handleSubmit,
  } = useModalPessoa({
    isOpen,
    pessoaId,
    onClose,
  });

  if (!isOpen) return null;

  return (
    <C.Overlay>
      <C.Modal>
        <C.Header>
          <C.TitleBlock>
            <C.Title>{pessoaId ? "Editar pessoa" : "Nova pessoa"}</C.Title>
            <C.Subtitle>Base central para cliente, fornecedor e demais cadastros.</C.Subtitle>
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
            $active={activeTab === "endereco"}
            onClick={() => setActiveTab("endereco")}
          >
            Endereco
          </C.TabButton>
        </C.Tabs>

        <C.Form onSubmit={handleSubmit}>
          <C.Body>
            {loadingForm ? (
              <C.Hint>Carregando dados da pessoa...</C.Hint>
            ) : activeTab === "dados" ? (
              <>
                <C.Grid>
                  <C.Field>
                    <C.FieldSpan>Tipo de pessoa</C.FieldSpan>
                    <C.Select
                      value={form.pessoa_tipo}
                      onChange={(event) => updateField("pessoa_tipo", event.target.value)}
                    >
                      <option value="F">Pessoa fisica</option>
                      <option value="J">Pessoa juridica</option>
                    </C.Select>
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>
                      {form.pessoa_tipo === "J" ? "Razao social" : "Nome completo"}
                    </C.FieldSpan>
                    <C.Input
                      value={form.pessoa_nome_razao}
                      onChange={(event) =>
                        updateField("pessoa_nome_razao", event.target.value)
                      }
                      required
                    />
                  </C.Field>
                </C.Grid>

                <C.Grid>
                  <C.Field>
                    <C.FieldSpan>
                      {form.pessoa_tipo === "J" ? "Nome fantasia" : "Apelido / nome fantasia"}
                    </C.FieldSpan>
                    <C.Input
                      value={form.pessoa_nome_fantasia}
                      onChange={(event) =>
                        updateField("pessoa_nome_fantasia", event.target.value)
                      }
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>{form.pessoa_tipo === "J" ? "CNPJ" : "CPF"}</C.FieldSpan>
                    <C.Input
                      value={form.pessoa_cpf_cnpj}
                      onChange={(event) =>
                        updateField("pessoa_cpf_cnpj", event.target.value)
                      }
                    />
                  </C.Field>
                </C.Grid>

                <C.GridThree>
                  <C.Field>
                    <C.FieldSpan>
                      {form.pessoa_tipo === "J" ? "Inscricao estadual" : "RG"}
                    </C.FieldSpan>
                    <C.Input
                      value={
                        form.pessoa_tipo === "J"
                          ? form.pessoa_inscricao_estadual
                          : form.pessoa_rg
                      }
                      onChange={(event) =>
                        form.pessoa_tipo === "J"
                          ? updateField("pessoa_inscricao_estadual", event.target.value)
                          : updateField("pessoa_rg", event.target.value)
                      }
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Inscricao municipal</C.FieldSpan>
                    <C.Input
                      value={form.pessoa_inscricao_municipal}
                      onChange={(event) =>
                        updateField("pessoa_inscricao_municipal", event.target.value)
                      }
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Data de nascimento</C.FieldSpan>
                    <C.Input
                      type="date"
                      value={form.pessoa_data_nascimento}
                      onChange={(event) =>
                        updateField("pessoa_data_nascimento", event.target.value)
                      }
                    />
                  </C.Field>
                </C.GridThree>

                <C.Grid>
                  <C.Field>
                    <C.FieldSpan>E-mail</C.FieldSpan>
                    <C.Input
                      type="email"
                      value={form.pessoa_email}
                      onChange={(event) => updateField("pessoa_email", event.target.value)}
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Telefone</C.FieldSpan>
                    <C.Input
                      value={form.pessoa_telefone}
                      onChange={(event) => updateField("pessoa_telefone", event.target.value)}
                    />
                  </C.Field>
                </C.Grid>

                <C.Grid>
                  <C.Field>
                    <C.FieldSpan>WhatsApp</C.FieldSpan>
                    <C.Input
                      value={form.pessoa_whatsapp}
                      onChange={(event) => updateField("pessoa_whatsapp", event.target.value)}
                    />
                  </C.Field>
                </C.Grid>

                <C.CheckboxGrid>
                  <C.CheckboxLine>
                    <input
                      type="checkbox"
                      checked={!!form.pessoa_ativo}
                      onChange={(event) => updateField("pessoa_ativo", event.target.checked)}
                    />
                    Pessoa ativa
                  </C.CheckboxLine>
                </C.CheckboxGrid>

                <C.Field>
                  <C.FieldSpan>Observacao</C.FieldSpan>
                  <C.Textarea
                    value={form.pessoa_observacao}
                    onChange={(event) => updateField("pessoa_observacao", event.target.value)}
                  />
                </C.Field>
              </>
            ) : (
              <>
                <C.GridThree>
                  <C.Field>
                    <C.FieldSpan>CEP</C.FieldSpan>
                    <C.Input
                      value={form.endereco.cep}
                      onChange={(event) => updateEnderecoField("cep", event.target.value)}
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>UF</C.FieldSpan>
                    <C.Input
                      value={form.endereco.uf}
                      onChange={(event) => updateEnderecoField("uf", event.target.value)}
                      maxLength={2}
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Codigo IBGE</C.FieldSpan>
                    <C.Input
                      value={form.endereco.codigo_ibge}
                      onChange={(event) =>
                        updateEnderecoField("codigo_ibge", event.target.value)
                      }
                    />
                  </C.Field>
                </C.GridThree>

                <C.Grid>
                  <C.Field>
                    <C.FieldSpan>Logradouro</C.FieldSpan>
                    <C.Input
                      value={form.endereco.logradouro}
                      onChange={(event) =>
                        updateEnderecoField("logradouro", event.target.value)
                      }
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Numero</C.FieldSpan>
                    <C.Input
                      value={form.endereco.numero}
                      onChange={(event) => updateEnderecoField("numero", event.target.value)}
                    />
                  </C.Field>
                </C.Grid>

                <C.Grid>
                  <C.Field>
                    <C.FieldSpan>Complemento</C.FieldSpan>
                    <C.Input
                      value={form.endereco.complemento}
                      onChange={(event) =>
                        updateEnderecoField("complemento", event.target.value)
                      }
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Bairro</C.FieldSpan>
                    <C.Input
                      value={form.endereco.bairro}
                      onChange={(event) => updateEnderecoField("bairro", event.target.value)}
                    />
                  </C.Field>
                </C.Grid>

                <C.Grid>
                  <C.Field>
                    <C.FieldSpan>Cidade</C.FieldSpan>
                    <C.Input
                      value={form.endereco.cidade}
                      onChange={(event) => updateEnderecoField("cidade", event.target.value)}
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Pais</C.FieldSpan>
                    <C.Input
                      value={form.endereco.pais}
                      onChange={(event) => updateEnderecoField("pais", event.target.value)}
                    />
                  </C.Field>
                </C.Grid>

                <C.Hint>
                  O endereco principal fica associado a filial ativa, mantendo a base pronta
                  para os futuros modulos que reutilizarem esta pessoa.
                </C.Hint>
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
                : pessoaId
                ? "Salvar alteracoes"
                : "Cadastrar pessoa"}
            </C.PrimaryButton>
          </C.Footer>
        </C.Form>
      </C.Modal>
    </C.Overlay>
  );
};
