import React from "react";
import { MdExitToApp, MdKeyboardArrowDown } from "react-icons/md";
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
            <MdExitToApp /> Sair
          </C.OptionButton>
        </C.Options>
      )}

      <C.Trigger type="button" $open={open} onClick={toggleOptions} title={user.name || "Usuario"}>
        <C.Avatar>{user.shortName?.slice(0, 2).toUpperCase() || "U"}</C.Avatar>
        <C.UserInfo $open={open}>
          <C.UserName>{user.name || "Usuario"}</C.UserName>
          <C.UserMail>{user.email || "sem email"}</C.UserMail>
        </C.UserInfo>
        <C.TriggerIndicator $open={open} $active={isOpen}>
          <MdKeyboardArrowDown />
        </C.TriggerIndicator>
      </C.Trigger>
    </C.Container>
  );
};

export default ProfileOptions;
