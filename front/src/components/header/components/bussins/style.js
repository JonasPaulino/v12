import styled from "styled-components";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";

export const Container = styled.div`
  position: relative;
  min-width: 280px;

  @media (max-width: 900px) {
    min-width: 0;
    width: 100%;
  }
`;

export const ContainerBussins = styled.button`
  width: 100%;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.82);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  color: ${({ theme }) => theme.colors.text};
  text-align: left;

  @media (max-width: 900px) {
    height: auto;
    min-height: 56px;
  }
`;

export const ContainerBussinsText = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-width: 0;
`;

export const BussinsName = styled.div`
  width: 100%;
`;

export const BussinsNameText = styled.span.withConfig({
  shouldForwardProp: (prop) => !["fullName", "shortName"].includes(prop),
})`
  display: block;
  font-size: 0.95rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &::after {
    content: "${(props) => props.fullName}";
  }

  @media (max-width: 768px) {
    &::after {
      content: "${(props) => props.shortName}";
    }
  }
`;

export const BussinsModuleNameText = styled.span.withConfig({
  shouldForwardProp: (prop) => !["fullName", "shortName"].includes(prop),
})`
  display: block;
  margin-top: 3px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.78rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &::after {
    content: "${(props) => props.fullName}";
  }

  @media (max-width: 768px) {
    &::after {
      content: "${(props) => props.shortName}";
    }
  }
`;

export const OptionsContainer = styled.div`
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 320px;
  max-width: calc(100vw - 40px);
  padding: 18px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.colors.shadow};
  z-index: 50;

  @media (max-width: 900px) {
    right: 0;
    left: 0;
    width: auto;
    max-width: none;
  }
`;

export const CurvaOptions = styled.div`
  position: absolute;
  top: -10px;
  right: 22px;
  width: 20px;
  height: 20px;
  background: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  transform: rotate(45deg);

  @media (max-width: 900px) {
    right: 28px;
  }
`;

export const LabelInput = styled.label`
  display: block;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.82rem;
  font-weight: 800;
`;

export const InputSelect = styled.select`
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
`;

export const InputSelectOption = styled.option``;

export const Hint = styled.p`
  margin: 12px 0 0;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.78rem;
  line-height: 1.5;
`;

export const ArrowDown = styled(MdKeyboardArrowDown)`
  font-size: 1.35rem;
  flex-shrink: 0;
`;

export const ArrowUp = styled(MdKeyboardArrowUp)`
  font-size: 1.35rem;
  flex-shrink: 0;
`;
