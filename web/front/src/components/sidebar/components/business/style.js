import styled from "styled-components";

export const Container = styled.div`
  position: relative;
`;

export const Trigger = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
`;

export const TriggerInfo = styled.div`
  text-align: left;
`;

export const TriggerLabel = styled.span`
  display: block;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.66);
`;

export const TriggerValue = styled.strong`
  display: block;
  margin-top: 2px;
  font-size: 0.92rem;
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
  display: grid;
  gap: 8px;
`;

export const Option = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ $active }) => ($active ? "rgba(11, 95, 255, 0.08)" : "#fff")};
  color: ${({ theme }) => theme.colors.text};
`;

export const OptionText = styled.div`
  text-align: left;
`;

export const OptionTitle = styled.strong`
  display: block;
  font-size: 0.92rem;
`;

export const OptionMeta = styled.span`
  display: block;
  margin-top: 3px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.76rem;
`;
