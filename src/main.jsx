import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./App.css";

const root = document.getElementById("root");

if (root) {
  root.innerHTML = '<div style="padding:24px;color:#172033;font-family:Segoe UI, Arial, sans-serif;">Loading DaivAI...</div>';
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
