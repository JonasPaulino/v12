import styled from "styled-components";

export const Shell = styled.div`
  min-height: 100vh;
  display: flex;
  overflow-x: clip;
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
`;

export const Body = styled.section`
  padding: 0 32px 32px;

  @media (max-width: 640px) {
    padding: 0 14px 22px;
  }
`;

export const Intro = styled.div`
  display: grid;
  gap: 22px;
  padding: 28px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.82);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};

  @media (max-width: 640px) {
    gap: 16px;
    padding: 20px 18px;
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

export const IntroTitle = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.8rem, 2.2vw, 2.6rem);

  @media (max-width: 640px) {
    font-size: 1.95rem;
    line-height: 1.05;
    word-break: break-word;
  }
`;

export const IntroText = styled.p`
  margin: 0;
  max-width: 760px;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.7;
`;

export const Grid = styled.div`
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const Card = styled.article`
  padding: 22px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};

  @media (max-width: 640px) {
    padding: 18px;
  }
`;

export const CardLabel = styled.span`
  display: block;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const CardValue = styled.strong`
  display: block;
  font-size: 1.8rem;
  font-family: ${({ theme }) => theme.fonts.heading};

  @media (max-width: 640px) {
    font-size: 1.45rem;
    line-height: 1.1;
    word-break: break-word;
  }
`;

export const EmptyArea = styled.div`
  margin-top: 24px;
  padding: 34px 28px;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.56);

  @media (max-width: 640px) {
    padding: 22px 18px;
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

export const EmptyTitle = styled.h3`
  margin: 0 0 8px;
`;

export const EmptyText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.6;
`;
