import styled from "styled-components";

export const TabPillGroupBase = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    gap: 8px;
  }
`;

export const TabPillButtonBase = styled.button`
  height: 42px;
  padding: 0 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) =>
    $active ? "rgba(11, 95, 255, 0.1)" : theme.colors.surface};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primaryStrong : theme.colors.textSoft};
  font-weight: 700;
  cursor: pointer;

  @media (max-width: 640px) {
    min-height: 34px;
    height: auto;
    padding: 8px 12px;
    font-size: 0.82rem;
    line-height: 1.2;
  }
`;
