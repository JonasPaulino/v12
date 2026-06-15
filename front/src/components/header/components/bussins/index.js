import React from "react";
import * as C from "./style";
import { useBusinessOptions, useToggleOptions } from "./use";

const BussinsOptions = () => {
  const { isOpen, toggleOptions, optionsContainerRef, setIsOpen } = useToggleOptions();
  const { business, businesses, handleSwitch } = useBusinessOptions();

  return (
    <C.Container>
      <C.ContainerBussins type="button" onClick={toggleOptions}>
        <C.ContainerBussinsText>
          <C.BussinsName>
            <C.BussinsNameText
              fullName={business?.tenant_nome || "Filial ativa"}
              shortName={business?.tenant_slug || "Filial"}
            />
          </C.BussinsName>
        </C.ContainerBussinsText>
        {isOpen ? <C.ArrowUp /> : <C.ArrowDown />}
      </C.ContainerBussins>

      {isOpen && (
        <C.OptionsContainer ref={optionsContainerRef}>
          <C.CurvaOptions />
          <C.LabelInput>Filial</C.LabelInput>
          <C.InputSelect
            value={business?.tenant_id || ""}
            onChange={(event) => handleSwitch(Number(event.target.value), setIsOpen)}
          >
            <C.InputSelectOption disabled value="">
              Selecione uma filial
            </C.InputSelectOption>
            {businesses.map((tenant) => (
              <C.InputSelectOption key={tenant.tenant_id} value={tenant.tenant_id}>
                {tenant.tenant_nome}
              </C.InputSelectOption>
            ))}
          </C.InputSelect>
          <C.Hint>
            A autenticação entra direto com a filial padrão. Se precisar, altere a filial ativa aqui.
          </C.Hint>
        </C.OptionsContainer>
      )}
    </C.Container>
  );
};

export default BussinsOptions;
