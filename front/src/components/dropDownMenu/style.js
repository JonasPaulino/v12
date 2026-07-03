import styled, { css } from "styled-components";

export const Menu = styled.div`
  position: ${({ $strategy }) => ($strategy === "absolute" ? "absolute" : "fixed")};
  background:
    radial-gradient(circle at top right, rgba(11, 95, 255, 0.1), transparent 36%),
    #ffffff;
  border: 1px solid rgba(206, 222, 255, 0.95);
  border-radius: 14px;
  box-shadow: 0 14px 34px rgba(3, 11, 31, 0.16);
  min-width: min(${({ $minWidth }) => $minWidth || 140}px, calc(100vw - 16px));
  max-width: min(360px, calc(100vw - 16px));
  padding: 6px;
  z-index: ${({ $zIndex }) => $zIndex || 999999};
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
  transition: opacity 0.12s ease, transform 0.12s ease;

  &.open {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  &.measuring {
    visibility: hidden;
    top: -10000px !important;
    left: -10000px !important;
    opacity: 0 !important;
    transform: none !important;
  }
`;

export const Item = styled.button`
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  text-align: left;
  font-size: 0.86rem;
  padding: 8px 10px;
  border-radius: 11px;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: ${({ $danger, $success, theme }) =>
    $danger ? theme.colors.danger : $success ? theme.colors.success : theme.colors.text};
  transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;

  &:hover {
    background: rgba(11, 95, 255, 0.08);
    border-color: rgba(11, 95, 255, 0.18);
    transform: translateY(-1px);
  }

  ${({ $danger }) =>
    $danger &&
    css`
      &:hover {
        background: rgba(212, 73, 73, 0.1);
        border-color: rgba(212, 73, 73, 0.18);
      }
    `}

  ${({ $success }) =>
    $success &&
    css`
      &:hover {
        background: rgba(31, 157, 106, 0.1);
        border-color: rgba(31, 157, 106, 0.18);
      }
    `}

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }
`;

export const ItemIcon = styled.span`
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: ${({ $danger, $success }) =>
    $danger
      ? "rgba(212, 73, 73, 0.1)"
      : $success
        ? "rgba(31, 157, 106, 0.12)"
        : "rgba(11, 95, 255, 0.1)"};
  color: ${({ $danger, $success, theme }) =>
    $danger ? theme.colors.danger : $success ? theme.colors.success : theme.colors.primaryStrong};

  svg {
    width: 17px;
    height: 17px;
    stroke-width: 1.8;
  }
`;

export const ItemLabel = styled.span`
  min-width: 0;
  color: inherit;
  font-weight: 700;
  line-height: 1.2;
`;

export const Divider = styled.div`
  height: 1px;
  margin: 5px 7px;
  background: ${({ theme }) => theme.colors.border};
`;

export const ClickAway = styled.div`
  position: fixed;
  inset: 0;
  background: transparent;
  z-index: ${({ $zIndex }) => ($zIndex ? $zIndex - 1 : 999998)};
`;
