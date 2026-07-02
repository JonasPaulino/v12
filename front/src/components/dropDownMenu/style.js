import styled, { css } from "styled-components";

export const Menu = styled.div`
  position: ${({ $strategy }) => ($strategy === "absolute" ? "absolute" : "fixed")};
  background:
    radial-gradient(circle at top right, rgba(11, 95, 255, 0.1), transparent 36%),
    #ffffff;
  border: 1px solid rgba(206, 222, 255, 0.95);
  border-radius: 18px;
  box-shadow: 0 22px 60px rgba(3, 11, 31, 0.22);
  min-width: min(${({ $minWidth }) => $minWidth || 140}px, calc(100vw - 16px));
  max-width: min(360px, calc(100vw - 16px));
  padding: 8px;
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
  font-size: 0.9rem;
  padding: 10px 12px;
  border-radius: 14px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.text)};
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

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }
`;

export const ItemIcon = styled.span`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  background: ${({ $danger }) =>
    $danger ? "rgba(212, 73, 73, 0.1)" : "rgba(11, 95, 255, 0.1)"};
  color: ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.primaryStrong)};

  svg {
    width: 19px;
    height: 19px;
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
  margin: 6px 8px;
  background: ${({ theme }) => theme.colors.border};
`;

export const ClickAway = styled.div`
  position: fixed;
  inset: 0;
  background: transparent;
  z-index: ${({ $zIndex }) => ($zIndex ? $zIndex - 1 : 999998)};
`;
