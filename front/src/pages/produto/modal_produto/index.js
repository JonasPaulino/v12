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
    origemOptions,
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
                    {renderRequiredLabel("Origem da mercadoria")}
                    <C.Select
                      ref={registerFieldRef("origem_mercadoria")}
                      value={form.origem_mercadoria}
                      onChange={(event) =>
                        updateField("origem_mercadoria", event.target.value)
                      }
                      required
                    >
                      {origemOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </C.Select>
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Código de benefício fiscal</C.FieldSpan>
                    <C.Input
                      value={form.cbenef}
                      onChange={(event) => updateField("cbenef", event.target.value)}
                    />
                  </C.Field>
                </C.Grid>

                <C.Grid>
                  <C.Field>
                    <C.FieldSpan>FCI</C.FieldSpan>
                    <C.Input
                      value={form.fci}
                      onChange={(event) => updateField("fci", event.target.value)}
                    />
                  </C.Field>

                  <C.Field>
                    <C.FieldSpan>Indicador de escala</C.FieldSpan>
                    <C.Select
                      value={form.ind_escala}
                      onChange={(event) => updateField("ind_escala", event.target.value)}
                    >
                      <option value="">Não informado</option>
                      <option value="S">S - Produção relevante</option>
                      <option value="N">N - Produção não relevante</option>
                    </C.Select>
                  </C.Field>
                </C.Grid>

                <C.GridThree>
                  <C.Field>
                    <C.FieldSpan>CFOP venda dentro da UF</C.FieldSpan>
                    <C.Input
                      value={form.cfop_venda_interna}
                      onChange={(event) =>
                        updateField("cfop_venda_interna", event.target.value)
                      }
                      maxLength={4}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>CFOP venda fora da UF</C.FieldSpan>
                    <C.Input
                      value={form.cfop_venda_interestadual}
                      onChange={(event) =>
                        updateField("cfop_venda_interestadual", event.target.value)
                      }
                      maxLength={4}
                    />
                  </C.Field>
                  <C.Field>
                    <C.FieldSpan>CFOP compra</C.FieldSpan>
                    <C.Input
                      value={form.cfop_compra}
                      onChange={(event) => updateField("cfop_compra", event.target.value)}
                      maxLength={4}
                    />
                  </C.Field>
                </C.GridThree>

                <C.Grid>
                  <C.Field>
                    <C.FieldSpan>CNPJ do fabricante</C.FieldSpan>
                    <C.Input
                      value={form.cnpj_fabricante}
                      onChange={(event) =>
                        updateField("cnpj_fabricante", event.target.value)
                      }
                    />
                  </C.Field>
                </C.Grid>

                <C.CheckboxGrid>
                  <C.CheckboxLine>
                    <input
                      type="checkbox"
                      checked={!!form.exige_lote}
                      onChange={(event) => updateField("exige_lote", event.target.checked)}
                    />
                    Exige lote
                  </C.CheckboxLine>

                  <C.CheckboxLine>
                    <input
                      type="checkbox"
                      checked={!!form.exige_validade}
                      onChange={(event) =>
                        updateField("exige_validade", event.target.checked)
                      }
                    />
                    Exige validade
                  </C.CheckboxLine>
                </C.CheckboxGrid>
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
                <C.CardHint>
                  O saldo será gravado no depósito padrão{" "}
                  <strong>{supportData.depositoPadrao?.nome || "não configurado"}</strong>.
                </C.CardHint>

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
