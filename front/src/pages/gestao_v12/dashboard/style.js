import styled from "styled-components";

export const Grid = styled.div`
  display: grid;
  gap: 18px;
`;

export const Hero = styled.section`
  display: grid;
  gap: 10px;
  padding: 26px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background:
    radial-gradient(circle at top right, rgba(11, 95, 255, 0.14), transparent 32%),
    rgba(255, 255, 255, 0.9);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};

  @media (max-width: 640px) {
    padding: 20px;
  }
`;

export const Badge = styled.span`
  width: fit-content;
  padding: 7px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(11, 95, 255, 0.1);
  color: ${({ theme }) => theme.colors.primaryStrong};
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const Title = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.8rem, 2.4vw, 2.8rem);
`;

export const Text = styled.p`
  margin: 0;
  max-width: 880px;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.65;
`;

export const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1120px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const KpiCard = styled.article`
  display: grid;
  gap: 8px;
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
`;

export const KpiLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

export const KpiValue = styled.strong`
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.8rem;
`;

export const KpiHint = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.88rem;
  line-height: 1.4;
`;

export const Panels = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 16px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const Panel = styled.article`
  display: grid;
  gap: 14px;
  padding: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.92);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
`;

export const PanelTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.25rem;
`;

export const TaskList = styled.div`
  display: grid;
  gap: 10px;
`;

export const Task = styled.div`
  display: grid;
  gap: 4px;
  padding: 13px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};

  strong {
    color: ${({ theme }) => theme.colors.text};
  }

  span {
    color: ${({ theme }) => theme.colors.textSoft};
    font-size: 0.88rem;
  }
`;
