import styled from "styled-components";

export const ModalTitleBlockBase = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;
`;

export const ModalTitleBase = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.12rem, 1.4vw, 1.4rem);
  line-height: 1.15;
  color: ${({ theme }) => theme.colors.text};
  overflow-wrap: anywhere;
`;

export const ModalSubtitleBase = styled.p`
  margin: 0;
  max-width: 62ch;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.88rem;
  line-height: 1.4;

  @media (max-width: 640px) {
    font-size: 0.82rem;
  }
`;
