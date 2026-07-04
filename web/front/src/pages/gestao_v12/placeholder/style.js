import styled from "styled-components";

export const Card = styled.section`
  display: grid;
  gap: 12px;
  padding: 26px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.92);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
`;

export const Kicker = styled.span`
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
  font-size: 1.8rem;
`;

export const Text = styled.p`
  margin: 0;
  max-width: 760px;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.65;
`;
