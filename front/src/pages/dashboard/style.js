import styled, { css } from "styled-components";

export const Shell = styled.div`
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  display: flex;
  overflow: hidden;
`;

export const Overlay = styled.div`
  display: none;

  @media (max-width: 900px) {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(7, 16, 34, 0.34);
    z-index: 20;
    backdrop-filter: blur(2px);
  }
`;

export const Content = styled.main`
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const Body = styled.section`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 24px 18px;
  scrollbar-gutter: stable;

  @media (max-width: 640px) {
    padding: 0 14px 22px;
    scrollbar-gutter: auto;
  }
`;

export const Intro = styled.div`
  display: grid;
  gap: 18px;
  padding: 30px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background:
    radial-gradient(circle at top right, rgba(11, 95, 255, 0.12), transparent 32%),
    rgba(255, 255, 255, 0.88);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};

  @media (max-width: 640px) {
    padding: 20px 18px;
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

export const IntroBadge = styled.span`
  width: fit-content;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(11, 95, 255, 0.1);
  color: ${({ theme }) => theme.colors.primaryStrong};
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

export const IntroTitle = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.8rem, 2.2vw, 2.8rem);

  @media (max-width: 640px) {
    font-size: 1.95rem;
    line-height: 1.05;
    word-break: break-word;
  }
`;

export const IntroText = styled.p`
  margin: 0;
  max-width: 860px;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.7;
`;

export const KpiGrid = styled.div`
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1160px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const accentStyles = {
  primary: css`
    background:
      linear-gradient(135deg, rgba(11, 95, 255, 0.14), rgba(11, 95, 255, 0.03)),
      ${({ theme }) => theme.colors.surface};
  `,
  secondary: css`
    background:
      linear-gradient(135deg, rgba(16, 32, 58, 0.1), rgba(16, 32, 58, 0.03)),
      ${({ theme }) => theme.colors.surface};
  `,
  success: css`
    background:
      linear-gradient(135deg, rgba(31, 157, 106, 0.12), rgba(31, 157, 106, 0.03)),
      ${({ theme }) => theme.colors.surface};
  `,
  danger: css`
    background:
      linear-gradient(135deg, rgba(212, 73, 73, 0.12), rgba(212, 73, 73, 0.03)),
      ${({ theme }) => theme.colors.surface};
  `,
  neutral: css`
    background:
      linear-gradient(135deg, rgba(95, 111, 143, 0.08), rgba(95, 111, 143, 0.03)),
      ${({ theme }) => theme.colors.surface};
  `,
};

export const KpiCard = styled.article`
  padding: 16px 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  ${({ $accent }) => accentStyles[$accent] || accentStyles.neutral};

  @media (max-width: 640px) {
    padding: 16px;
  }
`;

export const KpiLabel = styled.span`
  display: block;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const KpiValue = styled.strong`
  display: block;
  font-size: 1.55rem;
  font-family: ${({ theme }) => theme.fonts.heading};
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.1;

  @media (max-width: 640px) {
    font-size: 1.45rem;
  }
`;

export const KpiHint = styled.p`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.4;
  font-size: 0.8rem;
`;

export const QuickStats = styled.div`
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 1160px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const QuickStat = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.7);
`;

export const QuickStatValue = styled.strong`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const QuickStatLabel = styled.span`
  font-size: 0.82rem;
  color: ${({ theme }) => theme.colors.textSoft};
  text-align: right;
`;

export const AnalyticsGrid = styled.div`
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  flex: 1;
  min-height: 0;

  @media (max-width: 1160px) {
    grid-template-columns: 1fr;
    flex: none;
  }
`;

export const BottomRow = styled.div`
  margin-top: 14px;
  flex: 1;
  min-height: 0;

  @media (max-width: 1160px) {
    flex: none;
  }
`;

export const Panel = styled.article`
  padding: 16px 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.84);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;

  @media (max-width: 640px) {
    padding: 16px;
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

export const PanelContent = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

export const PanelTitle = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1rem;
`;

export const PanelText = styled.p`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.55;
  font-size: 0.92rem;
`;

export const PanelBadge = styled.span`
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.primaryStrong};
  font-size: 0.72rem;
  font-weight: 700;
`;

export const ReceivablesList = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 10px;
`;

export const ReceivableItem = styled.div`
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

export const ReceivableTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const ReceivableName = styled.strong`
  color: ${({ theme }) => theme.colors.text};
`;

export const ReceivableValue = styled.strong`
  color: ${({ theme }) => theme.colors.primaryStrong};
`;

export const ReceivableMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.88rem;
`;

export const EmptyArea = styled.div`
  flex: 1;
  margin-top: 10px;
  padding: 14px 16px;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.58);
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.5;
  font-size: 0.88rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
`;
