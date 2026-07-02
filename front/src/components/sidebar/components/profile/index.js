import React from "react";
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineChevronDown,
} from "react-icons/hi2";
import * as C from "./style";
import { useProfileActions, useToggleOptions, useUser } from "./use";

const ProfileOptions = ({ open = true }) => {
  const { isOpen, toggleOptions, optionsContainerRef } = useToggleOptions();
  const { handleLogout } = useProfileActions();
  const user = useUser();

  return (
    <C.Container ref={optionsContainerRef}>
      {isOpen && (
        <C.Options>
          <C.OptionButton onClick={handleLogout}>
            <C.OptionIcon>
              <HiOutlineArrowRightOnRectangle />
            </C.OptionIcon>
            <C.OptionText>
              <strong>Sair</strong>
              <span>Encerrar sessão</span>
            </C.OptionText>
          </C.OptionButton>
        </C.Options>
      )}

      <C.Trigger type="button" $open={open} onClick={toggleOptions} title={user.name || "Usuário"}>
        <C.Avatar>{user.shortName?.slice(0, 2).toUpperCase() || "U"}</C.Avatar>
        <C.UserInfo $open={open}>
          <C.UserName>{user.name || "Usuário"}</C.UserName>
          <C.UserMail>{user.email || "sem e-mail"}</C.UserMail>
        </C.UserInfo>
        <C.TriggerIndicator $open={open} $active={isOpen}>
          <HiOutlineChevronDown />
        </C.TriggerIndicator>
      </C.Trigger>
    </C.Container>
  );
};

export default ProfileOptions;
