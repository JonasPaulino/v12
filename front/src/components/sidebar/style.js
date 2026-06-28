import styled from "styled-components";

export const Container = styled.aside`
  width: ${({ $open }) => ($open ? "300px" : "108px")};
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px 18px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(8, 59, 154, 0.98) 0%, rgba(10, 27, 64, 0.98) 100%);
  color: #ffffff;
  transition: width 0.25s ease;

  @media (max-width: 900px) {
    width: min(320px, calc(100vw - 56px));
    position: fixed;
    top: 0;
    left: 0;
    z-index: 30;
    transform: translateX(${({ $open }) => ($open ? "0" : "-100%")});
    box-shadow: 24px 0 60px rgba(3, 11, 31, 0.28);
  }
`;

export const TopArea = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export const MobileCloseButton = styled.button`
  display: none;

  @media (max-width: 900px) {
    position: absolute;
    top: 18px;
    right: 18px;
    width: 42px;
    height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
    font-size: 1.3rem;
  }
`;

export const LogoContainer = styled.div`
  padding: ${({ $open }) => ($open ? "12px 10px 6px" : "12px 0 6px")};
  display: flex;
  justify-content: ${({ $open }) => ($open ? "flex-start" : "center")};

  @media (max-width: 900px) {
    padding-right: 52px;
  }
`;

export const Logo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: ${({ $open }) => ($open ? "flex-start" : "center")};
`;

export const Brand = styled.strong`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.6rem;
  letter-spacing: 0.04em;
`;

export const BrandSub = styled.span`
  display: ${({ $open }) => ($open ? "block" : "none")};
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.78rem;
`;

export const MenuContainer = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.32) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.28);
    border-radius: 999px;
  }
`;

export const MenuLabel = styled.span`
  display: ${({ $open }) => ($open ? "block" : "none")};
  margin: 0 12px 12px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const NavList = styled.div`
  display: grid;
  gap: 8px;
`;

export const NavGroup = styled.div`
  display: grid;
  gap: 6px;
`;

export const NavButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: ${({ $open }) => ($open ? "flex-start" : "center")};
  gap: ${({ $open }) => ($open ? "14px" : "0")};
  padding: ${({ $open }) => ($open ? "14px 16px" : "14px 0")};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $active }) =>
    $active ? "rgba(255, 255, 255, 0.14)" : "transparent"};
  color: #ffffff;
  text-align: ${({ $open }) => ($open ? "left" : "center")};
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  svg {
    font-size: 1.25rem;
    flex-shrink: 0;
  }
`;

export const GroupButton = styled(NavButton)`
  justify-content: ${({ $open }) => ($open ? "space-between" : "center")};
`;

export const GroupLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`;

export const GroupChevron = styled.span`
  display: ${({ $open }) => ($open ? "inline-flex" : "none")};
  align-items: center;
  justify-content: center;
  transform: rotate(${({ $expanded }) => ($expanded ? "180deg" : "0deg")});
  transition: transform 0.2s ease;
  color: rgba(255, 255, 255, 0.76);
`;

export const SubNavList = styled.div`
  display: ${({ $expanded }) => ($expanded ? "grid" : "none")};
  gap: 6px;
  padding-left: ${({ $open }) => ($open ? "14px" : "0")};
`;

export const SubNavButton = styled(NavButton)`
  padding: ${({ $open }) => ($open ? "12px 14px" : "12px 0")};
  background: ${({ $active }) =>
    $active ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.04)"};

  svg {
    font-size: 1.12rem;
  }
`;

export const NavText = styled.span`
  display: ${({ $open }) => ($open ? "inline" : "none")};
  white-space: nowrap;
`;

export const BottomArea = styled.div`
  flex-shrink: 0;
  display: grid;
  gap: 14px;
`;
