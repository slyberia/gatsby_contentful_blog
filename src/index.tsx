import React from "react";
import { render } from "react-dom";
import App from "./App";
import { StoreProvider } from "./state";

const root = document.getElementById("root");

render(
  <React.StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </React.StrictMode>,
  root
);
