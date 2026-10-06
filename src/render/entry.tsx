import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import type { QuizModel } from "../parse/schema.js";

function mount() {
  const dataScript = document.getElementById("mdq-data");
  if (!dataScript || !dataScript.textContent) return;

  try {
    const raw = JSON.parse(dataScript.textContent);
    const model: QuizModel = raw.model || raw;
    const noShuffle = Boolean(raw.noShuffle);

    const rootElement = document.getElementById("root");
    if (rootElement) {
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <App model={model} noShuffle={noShuffle} />
        </React.StrictMode>
      );
    }
  } catch (err) {
    console.error("Failed to bootstrap md-questioner application:", err);
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
}
