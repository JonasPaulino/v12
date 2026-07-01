import React, { useContext } from "react";
import { MdMenuOpen, MdOutlineMenu } from "react-icons/md";
import { AppContext } from "context";
import BussinsOptions from "./components/bussins";
import HeaderNotifications from "./notifications";
import * as C from "./style";

const Header = () => {
  const { mOpen, abreFechaMenu, pageSelect } = useContext(AppContext);

  return (
    <C.Container>
      <C.ButtonContainer>
        <C.MenuButton onClick={abreFechaMenu}>
          {mOpen ? <MdMenuOpen /> : <MdOutlineMenu />}
        </C.MenuButton>
        <C.PageTitle>{pageSelect}</C.PageTitle>
      </C.ButtonContainer>

      <C.ProfileContainer>
        <HeaderNotifications />
        <BussinsOptions />
      </C.ProfileContainer>
    </C.Container>
  );
};

export default Header;
