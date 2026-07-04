import React from "react";
import { useModalProduto } from "./use";
import * as C from "./style";

export const ModalProduto = ({ isOpen, produtoId, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    loadingForm,
    submitting,
    supportData,
    form,
    updateField,
    registerFieldRef,
    handleSubmit,
    tipoProdutoOptions,
  } = useModalProduto({
    isOpen,
    produtoId,
    onClose,
  });

  const renderRequiredLabel = (label) => (
    <C.FieldSpan>
      {label}
      <C.RequiredMark title="Este campo é obrigatório." aria-label="Campo obrigatório">
        *
      </C.RequiredMark>
    </C.FieldSpan>
  );

  if (!isOpen) return null;

  return (
    <C.Overlay>
      <C.Modal>
        <C.Header>
          <C.TitleBlock>
            <C.Title>{produtoId ? "Editar produto" : "Novo produto"}</C.Title>
            <C.Subtitle>Preencha os dados principais do produto e organize as informações por aba.</C.Subtitle>
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
            $active={activeTab === "fiscal"}
            onClick={() => setActiveTab("fiscal")}
          >
            Fiscal
          </C.TabButton>
          <C.TabButton
            type="button"
            $active={activeTab === "comercial"}
            onClick={() => setActiveTab("comercial")}
          >
            Comercial
          </C.TabButton>
          <C.TabButton
            type="button"
            $active={activeTab === "estoque"}
            onClick={() => setActiveTab("estoque")}
          >
            Estoque
          </C.TabButton>
        </C.Tabs>

        <C.Form onSubmit={handleSubmit} noValidate>
          <C.Body>
            {loadingForm ? (
              <C.Hint>Carregando dados do produto...</C.Hint>
            ) : activeTab === "dados" ? (
              <>
                {/* <C.CardHint>
                  O codigo interno e gerado automaticamente pelo sistema usando o ID do produto.
                </C.CardHint> */}

                <C.Field>
                  {renderRequiredLabel("Tipo de produto")}
                  <C.Select
                    ref={registerFieldRef("tipo_produto")}
                    value={form.tipo_produto}
                    onChange={(event) => updateField("tipo_produto", event.target.value)}
                    required
                  >
                    {tipoProdutoOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </C.Select>
                </C.Field>

                <C.Field>
                  {renderRequiredLabel("Descrição interna")}
                  <C.Input
                    ref={registerFieldRef("descricao")}
                    value={form.descricao}
                    onChange={(event) => updateField("descricao", event.target.value)}
                    required
                  />
                </C.Field>

                <C.Field>
                  {renderRequiredLabel("Descrição fiscal / NF-e")}
                  <C.Textarea
                    ref={registerFieldRef("descricao_fiscal")}
                    value={form.descricao_fiscal}
                    onChange={(event) => updateField("descricao_fiscal", event.target.value)}
                    required
                  />
                </C.Field>

                <C.Grid>
                  <C.Field>
                    <C.FieldSpan>GTIN / Código de barras</C.FieldSpan>
                    <C.Input
                      value={form.gtin}
                      onChange={(event) => updateField("gtin", event.target.value)}
                      placeholder="Informe o GTIN ou use SEM GTIN"
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Marca</C.FieldSpan>
                    <C.Input
                      value={form.marca}
                      onChange={(event) => updateField("marca", event.target.value)}
                    />
                  </C.Field>
                </C.Grid>

                <C.CheckboxGrid>
                  <C.CheckboxLine>
                    <input
                      type="checkbox"
                      checked={!!form.controla_estoque}
                      onChange={(event) => updateField("controla_estoque", event.target.checked)}
                    />
                    Controla estoque
                  </C.CheckboxLine>

                  <C.CheckboxLine>
                    <input
                      type="checkbox"
                      checked={!!form.permite_fracionar}
                      onChange={(event) =>
                        updateField("permite_fracionar", event.target.checked)
                      }
                    />
                    Permite fracionar
                  </C.CheckboxLine>

                  <C.CheckboxLine>
                    <input
                      type="checkbox"
                      checked={!!form.ativo}
                      onChange={(event) => updateField("ativo", event.target.checked)}
                    />
                    Produto ativo
                  </C.CheckboxLine>
                </C.CheckboxGrid>
              </>
            ) : activeTab === "fiscal" ? (
              <>
                <C.GridThree>
                  <C.Field>
                    {renderRequiredLabel("NCM")}
                    <C.Input
                      ref={registerFieldRef("ncm")}
                      value={form.ncm}
                      onChange={(event) => updateField("ncm", event.target.value)}
                      maxLength={8}
                      required
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>CEST</C.FieldSpan>
                    <C.Input
                      value={form.cest}
                      onChange={(event) => updateField("cest", event.target.value)}
                      maxLength={7}
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>EXTIPI</C.FieldSpan>
                    <C.Input
                      value={form.extipi}
                      onChange={(event) => updateField("extipi", event.target.value)}
                      maxLength={3}
                    />
                  </C.Field>
                </C.GridThree>

                <C.Grid>
                  <C.Field>
                    {renderRequiredLabel("Regra fiscal")}
                    <C.Select
                      ref={registerFieldRef("regra_tributaria_id")}
                      value={form.regra_tributaria_id}
                      onChange={(event) =>
                        updateField("regra_tributaria_id", event.target.value)
                      }
                      required
                    >
                      <option value="">Selecione</option>
                      {supportData.regrasFiscais.map((regra) => (
                        <option
                          key={regra.regra_tributaria_id}
                          value={regra.regra_tributaria_id}
                        >
                          {regra.descricao}
                        </option>
                      ))}
                    </C.Select>
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Resumo da regra</C.FieldSpan>
                    <C.ReadOnlyBox>
                      {supportData.regrasFiscais.find(
                        (regra) =>
                          Number(regra.regra_tributaria_id) ===
                          Number(form.regra_tributaria_id)
                      )
                        ? (() => {
                            const regra = supportData.regrasFiscais.find(
                              (item) =>
                                Number(item.regra_tributaria_id) ===
                                Number(form.regra_tributaria_id)
                            );
                            return `CFOP ${regra.cfop_venda_interna || "--"} / ${
                              regra.cfop_venda_interestadual || "--"
                            } • Origem ${regra.origem_mercadoria || "0"}`;
                          })()
                        : "Cadastre uma regra fiscal em Configuração > Fiscal."}
                    </C.ReadOnlyBox>
                  </C.Field>
                </C.Grid>
              </>
            ) : activeTab === "comercial" ? (
              <>
                <C.GridCommercial>
                  <C.Field>
                    {renderRequiredLabel("Unidade de medida")}
                    <C.Select
                      ref={registerFieldRef("unidade_comercial_id")}
                      value={form.unidade_comercial_id}
                      onChange={(event) =>
                        updateField("unidade_comercial_id", event.target.value)
                      }
                      required
                    >
                      <option value="">Selecione</option>
                      {supportData.unidades.map((unidade) => (
                        <option
                          key={unidade.unidade_medida_id}
                          value={unidade.unidade_medida_id}
                        >
                          {unidade.sigla} - {unidade.descricao}
                        </option>
                      ))}
                    </C.Select>
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Preço de venda</C.FieldSpan>
                    <C.Input
                      value={form.preco_venda}
                      onChange={(event) => updateField("preco_venda", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Preço de custo</C.FieldSpan>
                    <C.Input
                      value={form.preco_custo}
                      onChange={(event) => updateField("preco_custo", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Margem</C.FieldSpan>
                    <C.Input
                      value={form.margem}
                      onChange={(event) => updateField("margem", event.target.value)}
                    />
                  </C.Field>
                </C.GridCommercial>
              </>
            ) : (
              <>
                <C.GridThree>
                  <C.Field>
                    <C.FieldSpan>Estoque atual</C.FieldSpan>
                    <C.Input
                      value={form.estoque_atual}
                      onChange={(event) => updateField("estoque_atual", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Estoque mínimo</C.FieldSpan>
                    <C.Input
                      value={form.estoque_minimo}
                      onChange={(event) => updateField("estoque_minimo", event.target.value)}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>Estoque reservado</C.FieldSpan>
                    <C.Input
                      value={form.estoque_reservado}
                      onChange={(event) => updateField("estoque_reservado", event.target.value)}
                    />
                  </C.Field>
                </C.GridThree>
              </>
            )}
          </C.Body>

          <C.Footer>
            <C.SecondaryButton type="button" onClick={() => onClose(false)} disabled={submitting}>
              Cancelar
            </C.SecondaryButton>
            <C.PrimaryButton type="submit" disabled={submitting || loadingForm}>
              {submitting
                ? "Salvando..."
                : produtoId
                ? "Salvar alterações"
                : "Cadastrar produto"}
            </C.PrimaryButton>
          </C.Footer>
        </C.Form>
      </C.Modal>
    </C.Overlay>
  );
};
