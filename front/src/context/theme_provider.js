import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  html, body, #root {
    min-height: 100%;
  }

  body {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.body};
    color: ${({ theme }) => theme.colors.text};
    background:
      radial-gradient(circle at top left, rgba(11, 95, 255, 0.14), transparent 28%),
      linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
  }

  button,
  input,
  select {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  a {
    color: inherit;
    text-decoration: none;
  }
`;
