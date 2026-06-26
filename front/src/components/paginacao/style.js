import styled from "styled-components";

export const Pagination = styled.nav`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 520px) {
    justify-content: center;
    width: 100%;
  }
`;

export const PageGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

export const PageButton = styled.button`
  min-width: 42px;
  height: 42px;
  padding: 0 14px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $active }) => ($active ? "rgba(11, 95, 255, 0.1)" : "#ffffff")};
  color: ${({ $active, theme }) => ($active ? theme.colors.primaryStrong : theme.colors.text)};
  font-weight: 800;
  cursor: pointer;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 8px 18px rgba(11, 95, 255, 0.12);
    transform: translateY(-1px);
  }
`;

export const NavButton = styled.button`
  height: 42px;
  min-width: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: #ffffff;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 800;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 160ms ease, box-shadow 160ms ease, min-width 180ms ease,
    color 160ms ease;

  &:hover:not(:disabled) {
    min-width: 118px;
    color: ${({ theme }) => theme.colors.primaryStrong};
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 8px 18px rgba(11, 95, 255, 0.12);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 520px) {
    &:hover:not(:disabled) {
      min-width: 42px;
    }
  }
`;

export const IconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 20px;
  opacity: 1;
  font-size: 1.05rem;
  line-height: 1;
  overflow: hidden;
  transition: max-width 180ms ease, opacity 160ms ease;

  ${NavButton}:hover:not(:disabled) & {
    max-width: 0;
    opacity: 0;
  }

  @media (max-width: 520px) {
    ${NavButton}:hover:not(:disabled) & {
      max-width: 20px;
      opacity: 1;
    }
  }
`;

export const HoverLabel = styled.span`
  max-width: 0;
  opacity: 0;
  white-space: nowrap;
  overflow: hidden;
  transition: max-width 180ms ease, opacity 160ms ease;

  ${NavButton}:hover:not(:disabled) & {
    max-width: 80px;
    opacity: 1;
  }

  @media (max-width: 520px) {
    display: none;
  }
`;
