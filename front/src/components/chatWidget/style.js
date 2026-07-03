import styled, { keyframes } from "styled-components";

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(11, 95, 255, 0.24); }
  70% { box-shadow: 0 0 0 12px rgba(11, 95, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(11, 95, 255, 0); }
`;

export const Wrapper = styled.div`
  position: fixed;
  right: ${({ $panelOpen }) => ($panelOpen ? "0" : "24px")};
  bottom: ${({ $panelOpen }) => ($panelOpen ? "0" : "24px")};
  top: ${({ $panelOpen }) => ($panelOpen ? "0" : "auto")};
  left: ${({ $panelOpen }) => ($panelOpen ? "0" : "auto")};
  z-index: 80;
  display: flex;
  align-items: ${({ $expanded }) => ($expanded ? "center" : "flex-end")};
  justify-content: flex-end;
  padding: ${({ $panelOpen }) => ($panelOpen ? "24px" : "0")};
  pointer-events: auto;

  @media (max-width: 640px) {
    right: ${({ $panelOpen }) => ($panelOpen ? "0" : "14px")};
    bottom: ${({ $panelOpen }) => ($panelOpen ? "0" : "14px")};
    padding: ${({ $panelOpen }) => ($panelOpen ? "14px" : "0")};
  }
`;

export const Backdrop = styled.button`
  position: fixed;
  inset: 0;
  border: 0;
  padding: 0;
  background: ${({ $expanded }) => ($expanded ? "rgba(6, 18, 38, 0.48)" : "transparent")};
  cursor: ${({ $expanded }) => ($expanded ? "default" : "pointer")};
`;

export const Toggle = styled.button`
  width: 58px;
  height: 58px;
  border: 0;
  border-radius: 22px;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, #143f9f);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 18px 38px rgba(10, 31, 68, 0.22);
  opacity: 0.88;
  animation: ${({ $unread }) => ($unread ? pulse : "none")} 1.5s infinite;
  pointer-events: auto;
  display: ${({ $hidden }) => ($hidden ? "none" : "inline-flex")};

  svg {
    width: 26px;
    height: 26px;
  }

  &:hover {
    opacity: 1;
    transform: translateY(-1px);
  }
`;

export const Panel = styled.div`
  position: relative;
  z-index: 1;
  width: ${({ $expanded }) => ($expanded ? "min(720px, calc(100vw - 42px))" : "380px")};
  max-width: calc(100vw - 28px);
  height: ${({ $expanded }) =>
    $expanded ? "min(680px, calc(100dvh - 56px))" : "min(560px, calc(100dvh - 104px))"};
  max-height: calc(100dvh - 56px);
  margin-bottom: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 28px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 26px 60px rgba(10, 31, 68, 0.24);
  overflow: hidden;
  display: flex;
  flex-direction: column;

  @media (max-width: 640px) {
    width: calc(100vw - 28px);
    height: ${({ $expanded }) =>
      $expanded ? "calc(100dvh - 28px)" : "min(540px, calc(100dvh - 92px))"};
    margin-bottom: 0;
  }
`;

export const Header = styled.div`
  padding: 18px 18px 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  background:
    radial-gradient(circle at 12% 10%, rgba(255,255,255,0.22), transparent 28%),
    linear-gradient(135deg, #082f75, ${({ theme }) => theme.colors.primary});
  color: #fff;
`;

export const HeaderText = styled.div`
  display: grid;
  gap: 4px;

  strong {
    font-size: 1rem;
  }

  span {
    color: rgba(255, 255, 255, 0.78);
    font-size: 0.84rem;
  }
`;

export const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
`;

export const IconButton = styled.button`
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.12);
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  svg {
    width: 18px;
    height: 18px;
  }
`;

export const Body = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export const Form = styled.form`
  flex: 1;
  min-height: 0;
  padding: 18px;
  display: grid;
  gap: 12px;
  grid-template-rows: ${({ $logged }) =>
    $logged
      ? "repeat(2, auto) minmax(140px, 1fr) auto"
      : "repeat(4, minmax(0, auto)) minmax(140px, 1fr) auto"};
`;

export const Field = styled.label`
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto;
  gap: 6px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.84rem;
  font-weight: 700;
`;

export const FillField = styled(Field)`
  align-content: start;
  grid-template-rows: auto minmax(0, 1fr);

  textarea {
    height: 100%;
  }
`;

export const Input = styled.input`
  height: 44px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  padding: 0 12px;
  color: ${({ theme }) => theme.colors.text};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.1);
  }
`;

export const Select = styled.select`
  height: 44px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  padding: 0 12px;
  color: ${({ theme }) => theme.colors.text};
  outline: none;
`;

export const TextArea = styled.textarea`
  min-height: 96px;
  height: auto;
  resize: vertical;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  padding: 12px;
  color: ${({ theme }) => theme.colors.text};
  outline: none;
`;

export const Button = styled.button`
  height: 44px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const Notice = styled.div`
  margin: 14px 18px 0;
  padding: 12px;
  border-radius: 16px;
  background: rgba(11, 95, 255, 0.08);
  color: ${({ theme }) => theme.colors.primaryStrong};
  font-size: 0.88rem;
`;

export const Messages = styled.div`
  flex: 1;
  min-height: 0;
  padding: 16px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: linear-gradient(180deg, rgba(238, 244, 255, 0.7), rgba(255,255,255,0));
`;

export const Message = styled.div`
  max-width: 84%;
  align-self: ${({ $mine, $system }) => ($system ? "center" : $mine ? "flex-end" : "flex-start")};
  padding: ${({ $system }) => ($system ? "8px 12px" : "10px 12px")};
  border-radius: ${({ $mine, $system }) =>
    $system ? "999px" : $mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px"};
  background: ${({ $mine, $system, theme }) =>
    $system ? "rgba(15, 23, 42, 0.06)" : $mine ? theme.colors.primary : theme.colors.surface};
  border: ${({ $mine, $system, theme }) =>
    $mine || $system ? "0" : `1px solid ${theme.colors.border}`};
  color: ${({ $mine, $system, theme }) =>
    $mine ? "#fff" : $system ? theme.colors.textSoft : theme.colors.text};
  font-size: ${({ $system }) => ($system ? "0.78rem" : "0.9rem")};
  line-height: 1.45;
  white-space: pre-wrap;
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
  padding: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  gap: 8px;
`;

export const ComposerInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 42px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  padding: 0 14px;
  outline: none;
`;

export const ComposerButton = styled.button`
  width: 44px;
  height: 42px;
  border: 0;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

export const Rating = styled.div`
  padding: 16px;
  display: grid;
  gap: 12px;
`;

export const Stars = styled.div`
  display: flex;
  gap: 8px;

  button {
    width: 38px;
    height: 38px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 14px;
    background: #fff;
    cursor: pointer;
    font-weight: 900;
    color: ${({ theme }) => theme.colors.primaryStrong};
  }
`;
