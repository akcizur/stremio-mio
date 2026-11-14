import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("MIO root element was not found.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const appBase = import.meta.env.BASE_URL;
    void navigator.serviceWorker.register(`${appBase}sw.js`, { scope: appBase }).catch((error: unknown) => {
      console.warn("MIO offline shell registration failed:", error);
    });
  });
}
