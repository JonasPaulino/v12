import styled from "styled-components";

export const Shell = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  background:
    radial-gradient(circle at top right, rgba(11, 95, 255, 0.12), transparent 34%),
    linear-gradient(135deg, #eef4ff 0%, #f8fbff 48%, #edf6f2 100%);
`;

export const Sidebar = styled.aside`
  width: ${({ $open }) => ($open ? "292px" : "96px")};
  height: 100vh;
  height: 100dvh;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 16px 22px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(11, 37, 78, 0.98), rgba(5, 17, 39, 0.98));
  color: #fff;
  transition: width 0.24s ease;

  @media (max-width: 900px) {
    width: min(320px, calc(100vw - 56px));
    position: fixed;
    left: 0;
    z-index: 35;
    transform: translateX(${({ $open }) => ($open ? "0" : "-100%")});
    box-shadow: 24px 0 60px rgba(3, 11, 31, 0.28);
  }
`;

export const Brand = styled.button`
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: ${({ $open }) => ($open ? "flex-start" : "center")};
  gap: 12px;
  padding: ${({ $open }) => ($open ? "0 10px" : "0")};
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
`;

export const BrandMark = styled.span`
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, #0b5fff, #00a7a7);
  color: #fff;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.04em;
`;

export const BrandText = styled.span`
  display: ${({ $open }) => ($open ? "grid" : "none")};
  gap: 2px;

  strong {
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.05rem;
  }

  small {
    color: rgba(255, 255, 255, 0.64);
    font-size: 0.78rem;
  }
`;

export const MenuArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.28) transparent;
`;

export const MenuLabel = styled.span`
  display: ${({ $open }) => ($open ? "block" : "none")};
  margin: 0 10px 12px;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const NavList = styled.nav`
  display: grid;
  gap: 8px;
`;

export const NavButton = styled.button`
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: ${({ $open }) => ($open ? "flex-start" : "center")};
  gap: ${({ $open }) => ($open ? "12px" : "0")};
  padding: ${({ $open }) => ($open ? "0 14px" : "0")};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $active }) => ($active ? "rgba(255, 255, 255, 0.16)" : "transparent")};
  color: #fff;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  svg {
    font-size: 1.22rem;
    flex-shrink: 0;
  }
`;

export const NavText = styled.span`
  display: ${({ $open }) => ($open ? "inline" : "none")};
  white-space: nowrap;
`;

export const Content = styled.main`
  flex: 1;
  min-width: 0;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
`;

export const Header = styled.header`
  height: 74px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(255, 255, 255, 0.76);
  backdrop-filter: blur(16px);

  @media (max-width: 640px) {
    padding: 0 14px;
  }
`;

export const HeaderLeft = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const MenuButton = styled.button`
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.25rem;
  cursor: pointer;
`;

export const TitleBlock = styled.div`
  min-width: 0;
  display: grid;
  gap: 2px;
`;

export const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.35rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Subtitle = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.84rem;

  @media (max-width: 640px) {
    display: none;
  }
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const HeaderUser = styled.div`
  display: grid;
  gap: 2px;
  min-width: 168px;
  max-width: 250px;
  height: 42px;
  justify-content: center;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.78);
  text-align: left;

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.9rem;
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: ${({ theme }) => theme.colors.textSoft};
    font-size: 0.76rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 760px) {
    display: none;
  }
`;

export const ActionButton = styled.button`
  height: 42px;
  min-width: ${({ $iconOnly }) => ($iconOnly ? "42px" : "auto")};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: ${({ $iconOnly }) => ($iconOnly ? "0" : "0 14px")};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primaryStrong};
    background: rgba(255, 255, 255, 0.9);
  }

  svg {
    font-size: 1.1rem;
  }

  @media (max-width: 640px) {
    span {
      display: none;
    }
  }
`;

export const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 24px;

  @media (max-width: 640px) {
    padding: 14px;
  }
`;

export const Overlay = styled.div`
  display: none;

  @media (max-width: 900px) {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: block;
    background: rgba(7, 16, 34, 0.44);
  }
`;
