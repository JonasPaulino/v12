import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "styled-components";
import { AppProvider } from "context";
import { GlobalStyle } from "context/theme_provider";
import theme from "context/theme";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <AppProvider>
        <App />
      </AppProvider>
    </ThemeProvider>
  </React.StrictMode>
);
