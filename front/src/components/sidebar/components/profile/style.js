import styled from "styled-components";

export const Container = styled.div`
  position: relative;
`;

export const Trigger = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: ${({ $open }) => ($open ? "flex-start" : "center")};
  gap: ${({ $open }) => ($open ? "14px" : "0")};
  padding: ${({ $open }) => ($open ? "14px 16px" : "14px 0")};
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.11);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

export const Avatar = styled.div`
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  font-weight: 800;
`;

export const UserInfo = styled.div`
  display: ${({ $open }) => ($open ? "block" : "none")};
  flex: 1;
  text-align: left;
`;

export const TriggerIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  color: rgba(255, 255, 255, 0.72);
  font-size: 1.2rem;
  transform: rotate(${({ $active }) => ($active ? "180deg" : "0deg")});
  transition: transform 0.2s ease, color 0.2s ease, opacity 0.2s ease;
  opacity: ${({ $open }) => ($open ? 1 : 0)};

  ${Trigger}:hover & {
    color: #ffffff;
  }
`;

export const UserName = styled.strong`
  display: block;
  font-size: 0.92rem;
`;

export const UserMail = styled.span`
  display: block;
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.76rem;
`;

export const Options = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 10px);
  padding: 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: #ffffff;
  box-shadow: ${({ theme }) => theme.colors.shadow};
`;

export const OptionButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
`;
