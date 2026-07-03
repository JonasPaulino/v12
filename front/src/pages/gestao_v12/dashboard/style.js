import styled from "styled-components";

const toneColor = ({ theme, $tone }) => {
  if ($tone === "danger") return theme.colors.danger;
  if ($tone === "green") return theme.colors.success;
  if ($tone === "warning") return "#b05a06";
  return theme.colors.primaryStrong;
};

const toneBg = ({ $tone }) => {
  if ($tone === "danger") return "rgba(212, 73, 73, 0.1)";
  if ($tone === "green") return "rgba(31, 157, 106, 0.11)";
  if ($tone === "warning") return "rgba(239, 124, 20, 0.12)";
  return "rgba(11, 95, 255, 0.1)";
};

export const Grid = styled.div`
  display: grid;
  gap: 18px;
  min-height: 100%;
`;

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
`;

export const SectionTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.25rem;
`;

export const RefreshButton = styled.button`
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

export const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const KpiCard = styled.article`
  position: relative;
  display: grid;
  gap: 8px;
  min-height: 138px;
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 5px;
    background: ${toneColor};
  }

  &::after {
    content: "";
    position: absolute;
    right: -42px;
    top: -42px;
    width: 118px;
    height: 118px;
    border-radius: 999px;
    background: ${toneBg};
  }
`;

export const KpiLabel = styled.span`
  position: relative;
  z-index: 1;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

export const KpiValue = styled.strong`
  position: relative;
  z-index: 1;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.5rem, 2.4vw, 2rem);
  line-height: 1.15;
`;

export const KpiHint = styled.span`
  position: relative;
  z-index: 1;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.88rem;
  line-height: 1.4;
`;

export const Panels = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`;

export const Panel = styled.article`
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 14px;
  min-height: 360px;
  padding: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.92);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  grid-column: ${({ $wide }) => ($wide ? "1 / -1" : "auto")};
`;

export const PanelHeader = styled.div`
  display: grid;
  gap: 5px;
`;

export const PanelTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.15rem;
`;

export const PanelText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.92rem;
  line-height: 1.5;
`;

export const List = styled.div`
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 0;
`;

export const ListItem = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 13px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const ItemMain = styled.div`
  display: grid;
  gap: 4px;
  min-width: 0;

  strong {
    color: ${({ theme }) => theme.colors.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span,
  small {
    color: ${({ theme }) => theme.colors.textSoft};
    font-size: 0.87rem;
    line-height: 1.45;
  }
`;

export const ItemAside = styled.div`
  display: grid;
  justify-items: end;
  gap: 6px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.84rem;

  strong {
    color: ${({ theme }) => theme.colors.text};
  }

  @media (max-width: 680px) {
    justify-items: start;
  }
`;

export const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-height: 28px;
  padding: 0 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 0.76rem;
  font-weight: 800;
  color: ${({ theme, $status }) =>
    $status === "vencido" || $status === "bloqueado"
      ? theme.colors.danger
      : $status === "quitado"
      ? theme.colors.success
      : $status === "aguardando"
      ? "#b05a06"
      : theme.colors.primaryStrong};
  background: ${({ $status }) =>
    $status === "vencido" || $status === "bloqueado"
      ? "rgba(212, 73, 73, 0.12)"
      : $status === "quitado"
      ? "rgba(31, 157, 106, 0.12)"
      : $status === "aguardando"
      ? "rgba(239, 124, 20, 0.12)"
      : "rgba(11, 95, 255, 0.1)"};
`;

export const Empty = styled.div`
  min-height: 170px;
  display: grid;
  place-items: center;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.textSoft};
  background: rgba(248, 251, 255, 0.72);
`;
