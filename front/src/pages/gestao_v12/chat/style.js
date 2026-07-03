import styled from "styled-components";

export const Shell = styled.div`
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 18px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const Card = styled.section`
  min-height: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 24px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

export const SidebarHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: grid;
  gap: 10px;
`;

export const Search = styled.input`
  height: 42px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  padding: 0 14px;
  outline: none;
`;

export const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const FilterButton = styled.button`
  height: 34px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $active }) => ($active ? "rgba(11, 95, 255, 0.1)" : "#fff")};
  color: ${({ $active, theme }) => ($active ? theme.colors.primaryStrong : theme.colors.textSoft)};
  padding: 0 12px;
  font-weight: 800;
  cursor: pointer;
`;

export const List = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
`;

export const Ticket = styled.button`
  width: 100%;
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $active }) => ($active ? "rgba(11, 95, 255, 0.08)" : "transparent")};
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 7px;

  strong {
    color: ${({ theme }) => theme.colors.text};
  }

  span,
  small {
    color: ${({ theme }) => theme.colors.textSoft};
  }
`;

export const TicketMeta = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
`;

export const TicketPreview = styled.small`
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 5px 9px;
  font-size: 0.74rem;
  font-weight: 900;
  background: ${({ $status }) =>
    $status === "aguardando"
      ? "rgba(239, 124, 20, 0.14)"
      : $status === "em_atendimento"
      ? "rgba(11, 95, 255, 0.12)"
      : "rgba(31, 157, 106, 0.12)"};
  color: ${({ $status, theme }) =>
    $status === "aguardando"
      ? "#a65303"
      : $status === "em_atendimento"
      ? theme.colors.primaryStrong
      : theme.colors.success};
`;

export const ChatHeader = styled.div`
  padding: 16px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;

  h2 {
    margin: 0;
    font-size: 1.05rem;
  }

  p {
    margin: 5px 0 0;
    color: ${({ theme }) => theme.colors.textSoft};
  }
`;

export const Actions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

export const ActionButton = styled.button`
  height: 38px;
  border: 1px solid ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $danger }) => ($danger ? "rgba(212, 73, 73, 0.08)" : "#fff")};
  color: ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.text)};
  padding: 0 12px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const Messages = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(238, 244, 255, 0.45);
`;

export const Message = styled.div`
  max-width: 72%;
  align-self: ${({ $mine, $system }) => ($system ? "center" : $mine ? "flex-end" : "flex-start")};
  padding: 10px 12px;
  border-radius: ${({ $mine, $system }) =>
    $system ? "999px" : $mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px"};
  background: ${({ $mine, $system, theme }) =>
    $system ? "rgba(15, 23, 42, 0.07)" : $mine ? theme.colors.primary : "#fff"};
  color: ${({ $mine, $system, theme }) =>
    $mine ? "#fff" : $system ? theme.colors.textSoft : theme.colors.text};
  border: ${({ $mine, $system, theme }) =>
    $mine || $system ? "0" : `1px solid ${theme.colors.border}`};
  white-space: pre-wrap;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;

  a {
    color: inherit;
    font-weight: 800;
    text-decoration: underline;
    overflow-wrap: anywhere;
  }
`;

export const Composer = styled.form`
  padding: 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  gap: 10px;
`;

export const ComposerInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 44px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  padding: 0 14px;
  outline: none;
`;

export const SendButton = styled.button`
  height: 44px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  padding: 0 18px;
  font-weight: 900;
  cursor: pointer;
`;

export const Empty = styled.div`
  flex: 1;
  min-height: 260px;
  display: grid;
  place-items: center;
  padding: 24px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const TransferBar = styled.div`
  padding: 12px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  gap: 10px;
  align-items: center;

  select {
    height: 38px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radius.pill};
    padding: 0 12px;
  }
`;
