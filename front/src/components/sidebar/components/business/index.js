import React from "react";
import { HiOutlineBuildingStorefront } from "react-icons/hi2";
import { IoChevronUpOutline, IoChevronDownOutline } from "react-icons/io5";
import * as C from "./style";
import { useBusinessSwitcher } from "./use";

const BusinessSwitcher = () => {
  const { currentTenantId, tenantOptions, isOpen, toggle, handleSwitch } =
    useBusinessSwitcher();
  const current = tenantOptions.find((item) => item.tenant_id === currentTenantId);

  return (
    <C.Container>
      {isOpen && (
        <C.Options>
          {tenantOptions.map((tenant) => (
            <C.Option
              key={tenant.tenant_id}
              $active={tenant.tenant_id === currentTenantId}
              onClick={() => handleSwitch(tenant.tenant_id)}
            >
              <C.OptionText>
                <C.OptionTitle>{tenant.tenant_nome}</C.OptionTitle>
              <C.OptionMeta>{tenant.perfil || "usuário"}</C.OptionMeta>
              </C.OptionText>
              <HiOutlineBuildingStorefront />
            </C.Option>
          ))}
        </C.Options>
      )}

      <C.Trigger onClick={toggle}>
        <C.TriggerInfo>
          <C.TriggerLabel>Filial ativa</C.TriggerLabel>
          <C.TriggerValue>{current?.tenant_nome || "Selecionar filial"}</C.TriggerValue>
        </C.TriggerInfo>
        {isOpen ? <IoChevronDownOutline /> : <IoChevronUpOutline />}
      </C.Trigger>
    </C.Container>
  );
};

export default BusinessSwitcher;
