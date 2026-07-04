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
  cursor: pointer;

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
  display: ${({ $open }) => ($open ? "inline-flex" : "none")};
  align-items: center;
  justify-content: center;
  margin-left: auto;
  color: rgba(255, 255, 255, 0.72);
  transform: rotate(${({ $active }) => ($active ? "180deg" : "0deg")});
  transition: transform 0.2s ease, color 0.2s ease, opacity 0.2s ease;
  opacity: ${({ $open }) => ($open ? 1 : 0)};

  svg {
    width: 18px;
    height: 18px;
    stroke-width: 1.8;
  }

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
  background:
    radial-gradient(circle at top right, rgba(11, 95, 255, 0.1), transparent 36%),
    #ffffff;
  box-shadow: 0 22px 60px rgba(3, 11, 31, 0.24);
  border: 1px solid rgba(206, 222, 255, 0.95);
  display: grid;
  gap: 8px;
  z-index: 5;
`;

export const OptionButton = styled.button`
  width: 100%;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;

  &:hover {
    background: rgba(11, 95, 255, 0.08);
    border-color: rgba(11, 95, 255, 0.18);
    transform: translateY(-1px);
  }
`;

export const OptionIcon = styled.span`
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(11, 95, 255, 0.1);
  color: ${({ theme }) => theme.colors.primaryStrong};

  svg {
    width: 20px;
    height: 20px;
    stroke-width: 1.8;
  }
`;

export const OptionText = styled.span`
  display: grid;
  gap: 3px;
  min-width: 0;

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.9rem;
    line-height: 1.2;
  }

  span {
    color: ${({ theme }) => theme.colors.textSoft};
    font-size: 0.74rem;
    line-height: 1.2;
  }
`;
