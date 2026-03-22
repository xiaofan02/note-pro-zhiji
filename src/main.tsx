import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initTauriDeepLinkListener } from "./lib/tauriAuth";

// Initialize Tauri deep link listener for desktop OAuth
initTauriDeepLinkListener();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
