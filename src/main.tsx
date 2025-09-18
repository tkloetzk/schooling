import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./App.css";
import App from "./App";
import { initializeApp } from "./stores";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const root = createRoot(rootElement);

// Initialize the app (database, etc.) before rendering
initializeApp()
  .then(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  })
  .catch((error) => {
    console.error("Failed to initialize app:", error);
    // Still render the app even if initialization fails
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
