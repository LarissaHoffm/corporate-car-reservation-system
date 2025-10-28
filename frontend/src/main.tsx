import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import App from "./App";
import "./styles/globals.css";
import "@/lib/i18n";
import { AuthAPI } from "@/lib/http/api";

// garante cookie de CSRF carregado assim que a app sobe
AuthAPI.csrf().catch(() => { /* ignora em dev */ });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
