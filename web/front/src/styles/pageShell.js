import styled from "styled-components";

export const PageShell = styled.div`
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  display: flex;
  overflow: hidden;
`;

export const MobileOverlay = styled.div`
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

export const PageContent = styled.main`
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const PageBodyBase = styled.section`
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 0 18px 18px;
  scrollbar-gutter: stable;

  @media (max-width: 640px) {
    padding: 0 14px 22px;
    scrollbar-gutter: auto;
  }
`;
