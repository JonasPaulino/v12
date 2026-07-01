import styled, { css } from "styled-components";

export const Menu = styled.div`
  position: ${({ $strategy }) => ($strategy === "absolute" ? "absolute" : "fixed")};
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  min-width: min(${({ $minWidth }) => $minWidth || 140}px, calc(100vw - 16px));
  max-width: min(360px, calc(100vw - 16px));
  padding: 4px;
  z-index: ${({ $zIndex }) => $zIndex || 999999};
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.12s ease, transform 0.12s ease;

  &.open {
    opacity: 1;
    transform: translateY(0);
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
  border: 0;
  background: transparent;
  text-align: left;
  font-size: 0.92rem;
  padding: 8px 10px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  &:hover {
    background: #f4f5f6;
  }

  ${({ $danger }) =>
    $danger &&
    css`
      color: #c62828;

      &:hover {
        background: #ffebee;
      }
    `}

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const Divider = styled.div`
  height: 1px;
  margin: 4px 6px;
  background: #ececec;
`;

export const ClickAway = styled.div`
  position: fixed;
  inset: 0;
  background: transparent;
  z-index: ${({ $zIndex }) => ($zIndex ? $zIndex - 1 : 999998)};
`;
