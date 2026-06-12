import styled from "styled-components";
import { BsThreeDotsVertical } from "react-icons/bs";

export const Container = styled.div`
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
  min-width: 1080px;
  border-collapse: collapse;
`;

export const Head = styled.thead`
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(238, 244, 255, 0.96);
`;

export const Body = styled.tbody``;

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
  cursor: ${({ $sortable }) => ($sortable ? "pointer" : "default")};
  white-space: nowrap;
`;

export const SortFlag = styled.span`
  margin-left: 8px;
  color: ${({ $active, theme }) => ($active ? theme.colors.primaryStrong : theme.colors.textSoft)};
`;

export const Cell = styled.td`
  padding: 16px 14px;
  color: ${({ theme }) => theme.colors.text};
  vertical-align: middle;
  white-space: ${({ $wrap }) => ($wrap ? "normal" : "nowrap")};
`;

export const PersonName = styled.strong`
  display: block;
  font-size: 0.98rem;
`;

export const PersonMeta = styled.span`
  display: block;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.88rem;
`;

export const TypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $type }) =>
    $type === "pagar" ? "rgba(212, 73, 73, 0.1)" : "rgba(11, 95, 255, 0.1)"};
  color: ${({ $type, theme }) =>
    $type === "pagar" ? theme.colors.danger : theme.colors.primaryStrong};
  font-weight: 700;
  font-size: 0.84rem;
`;

export const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-weight: 700;
  font-size: 0.82rem;
  color: ${({ $status, theme }) =>
    $status === "quitado"
      ? theme.colors.success
      : $status === "cancelado"
      ? theme.colors.danger
      : $status === "vencido"
      ? "#b05a06"
      : theme.colors.primaryStrong};
  background: ${({ $status }) =>
    $status === "quitado"
      ? "rgba(31, 157, 106, 0.12)"
      : $status === "cancelado"
      ? "rgba(212, 73, 73, 0.12)"
      : $status === "vencido"
      ? "rgba(239, 124, 20, 0.12)"
      : "rgba(11, 95, 255, 0.1)"};
`;

export const OriginTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(15, 23, 42, 0.06);
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.82rem;
  font-weight: 700;
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

export const Empty = styled.div`
  padding: 36px 18px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSoft};
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

export const Pagination = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const PaginationButton = styled.button`
  min-width: 42px;
  height: 42px;
  padding: 0 14px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $active }) => ($active ? "rgba(11, 95, 255, 0.1)" : "#ffffff")};
  color: ${({ $active, theme }) => ($active ? theme.colors.primaryStrong : theme.colors.text)};
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
