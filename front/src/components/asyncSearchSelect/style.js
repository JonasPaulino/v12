import styled from "styled-components";

export const Wrapper = styled.div`
  position: relative;
`;

export const Input = styled.input`
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.12);
  }
`;

export const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 120;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.colors.shadow};
  overflow: hidden;
`;

export const Status = styled.div`
  padding: 12px 14px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.94rem;
`;

export const Options = styled.div`
  max-height: 240px;
  overflow: auto;
`;

export const OptionButton = styled.button`
  width: 100%;
  display: grid;
  gap: 2px;
  padding: 12px 14px;
  border: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $active }) => ($active ? "rgba(11, 95, 255, 0.08)" : "transparent")};
  text-align: left;
  cursor: pointer;

  &:first-child {
    border-top: 0;
  }

  &:hover {
    background: rgba(11, 95, 255, 0.08);
  }
`;

export const OptionLabel = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
`;

export const OptionMeta = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.88rem;
`;
