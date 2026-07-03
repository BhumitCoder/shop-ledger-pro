import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SnackbarProvider } from "notistack";
import App from "./App";
import { ThemeModeProvider } from "./theme/ThemeModeProvider";
import { AuthProvider } from "./providers/AuthProvider";
import "./index.css";

const qc = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } },
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <QueryClientProvider client={qc}>
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </SnackbarProvider>
      </QueryClientProvider>
    </ThemeModeProvider>
  </React.StrictMode>,
);
