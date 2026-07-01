import styled from "styled-components";
import { BsThreeDotsVertical } from "react-icons/bs";

export * from "../compra/style";

export const TableWrap = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

export const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
`;

export const Table = styled.table`
  width: 100%;
  min-width: 1040px;
  border-collapse: collapse;
`;

export const Head = styled.thead`
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(238, 244, 255, 0.96);
`;

export const Row = styled.tr`
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

export const HeaderCell = styled.th`
  padding: 16px 14px;
  text-align: left;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
`;

export const Cell = styled.td`
  padding: 16px 14px;
  color: ${({ theme }) => theme.colors.text};
  vertical-align: middle;
  white-space: ${({ $wrap }) => ($wrap ? "normal" : "nowrap")};
`;

export const Strong = styled.strong`
  display: block;
  font-size: 0.96rem;
`;

export const Meta = styled.span`
  display: block;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.84rem;
`;

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 96px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-weight: 800;
  font-size: 0.8rem;
  color: ${({ $tone, theme }) =>
    $tone === "success"
      ? theme.colors.success
      : $tone === "danger"
      ? theme.colors.danger
      : theme.colors.primaryStrong};
  background: ${({ $tone }) =>
    $tone === "success"
      ? "rgba(31, 157, 106, 0.12)"
      : $tone === "danger"
      ? "rgba(212, 73, 73, 0.12)"
      : "rgba(11, 95, 255, 0.1)"};
`;

export const MenuButton = styled.button`
  width: 40px;
  height: 40px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSoft};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primaryStrong};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const MenuIcon = styled(BsThreeDotsVertical)`
  font-size: 1rem;
`;

export const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const FooterInfo = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const Empty = styled.div`
  padding: 36px 18px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSoft};
`;
