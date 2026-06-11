import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// GitHub-flavoured markdown styling for the preview pane.
// `github-markdown-css` is imported once at the app root.
import "github-markdown-css/github-markdown.css";

// highlight.js's default theme (github-light feel). We import the CSS
// from the package — the JS side of highlight.js is initialised in
// `src/lib/markdown.ts` only where needed.
import "highlight.js/styles/github.css";

import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
