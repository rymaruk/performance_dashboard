import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { ConfirmProvider } from "./hooks/ConfirmContext";
import { AuthProvider } from "./hooks/AuthContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
