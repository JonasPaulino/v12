import styled from "styled-components";

export const Container = styled.div`
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  background: linear-gradient(120deg, #06162d 0%, #0b5fff 100%);

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const Hero = styled.section`
  position: relative;
  overflow: hidden;
  padding: 56px;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  &::before,
  &::after {
    content: "";
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
  }

  &::before {
    width: 420px;
    height: 420px;
    top: -120px;
    left: -80px;
  }

  &::after {
    width: 280px;
    height: 280px;
    bottom: -60px;
    right: 40px;
  }

  @media (max-width: 980px) {
    display: none;
  }
`;

export const HeroTop = styled.div`
  position: relative;
  z-index: 1;
`;

export const Brand = styled.h1`
  margin: 0 0 14px;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 3rem;
`;

export const HeroTitle = styled.h2`
  max-width: 560px;
  margin: 0;
  font-size: clamp(2rem, 3vw, 3.4rem);
  line-height: 1.05;
`;

export const HeroText = styled.p`
  max-width: 520px;
  margin: 18px 0 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 1.05rem;
  line-height: 1.65;
`;

export const HeroCard = styled.div`
  position: relative;
  z-index: 1;
  max-width: 360px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
`;

export const HeroCardLabel = styled.span`
  color: rgba(255, 255, 255, 0.66);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
`;

export const HeroCardValue = styled.strong`
  display: block;
  margin-top: 10px;
  font-size: 1.35rem;
`;

export const FormArea = styled.section`
  padding: 36px;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 640px) {
    padding: 20px;
  }
`;

export const FormCard = styled.div`
  width: 100%;
  max-width: 480px;
  padding: 38px 34px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.96);
  box-shadow: ${({ theme }) => theme.colors.shadow};

  @media (max-width: 640px) {
    padding: 28px 22px;
  }
`;

export const Step = styled.span`
  display: inline-block;
  margin-bottom: 14px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(11, 95, 255, 0.1);
  color: ${({ theme }) => theme.colors.primaryStrong};
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
`;

export const Title = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 2rem;
`;

export const Subtitle = styled.p`
  margin: 10px 0 28px;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.6;
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 0.84rem;
  font-weight: 700;
`;

export const Input = styled.input`
  width: 100%;
  margin-bottom: 18px;
  padding: 15px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.1);
  }
`;

export const Actions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

export const Button = styled.button`
  flex: ${({ $secondary }) => ($secondary ? "0 0 auto" : "1")};
  padding: 15px 20px;
  border: ${({ $secondary, theme }) =>
    $secondary ? `1px solid ${theme.colors.border}` : "0"};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $secondary, theme }) =>
    $secondary ? theme.colors.surface : theme.colors.primary};
  color: ${({ $secondary, theme }) =>
    $secondary ? theme.colors.text : "#fff"};
  font-weight: 800;
`;

export const PreviewCard = styled.div`
  margin-top: 18px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

export const PreviewTitle = styled.strong`
  display: block;
  margin-bottom: 4px;
`;

export const PreviewText = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.84rem;
`;
