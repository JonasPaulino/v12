import styled, { css } from "styled-components";
import { SlOptions } from "react-icons/sl";
import {
  StickyTableHeadBase,
  TableContainerBase,
  TableFooterBase,
  TableFooterInfoBase,
  TableScrollBase,
} from "styles/tableShared";

export const Container = styled(TableContainerBase)``;

export const Scroll = styled(TableScrollBase)``;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 880px;
`;

export const Head = styled(StickyTableHeadBase)``;

export const Row = styled.tr`
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

export const HeaderCell = styled.th`
  padding: 18px 16px;
  text-align: left;
  font-size: 0.83rem;
  color: ${({ theme }) => theme.colors.textSoft};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: ${({ $sortable }) => ($sortable ? "pointer" : "default")};
  white-space: nowrap;
`;

export const SortFlag = styled.span`
  margin-left: 8px;
  font-size: 0.72rem;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primaryStrong : theme.colors.textSoft};
`;

export const Body = styled.tbody``;

export const Cell = styled.td`
  padding: 16px;
  color: ${({ theme }) => theme.colors.text};
  vertical-align: middle;
  white-space: nowrap;

  ${({ $wrap }) =>
    $wrap &&
    css`
      white-space: normal;
    `}
`;

export const PessoaNome = styled.div`
  font-weight: 700;
`;

export const PessoaMeta = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.9rem;
`;

export const Status = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-weight: 700;
  font-size: 0.82rem;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.success : theme.colors.danger};
  background: ${({ $active }) =>
    $active ? "rgba(31, 157, 106, 0.12)" : "rgba(212, 73, 73, 0.12)"};
`;

export const MenuButton = styled.button`
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

export const MenuIcon = styled(SlOptions)`
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const Empty = styled.div`
  padding: 48px 22px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const Footer = styled(TableFooterBase)`
  background: rgba(248, 251, 255, 0.92);
`;

export const FooterInfo = styled(TableFooterInfoBase)``;
