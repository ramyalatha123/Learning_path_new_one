import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./styles/main.css";
import { BrowserRouter } from "react-router-dom"; // <-- 1. IMPORT THIS

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // <BrowserRouter> must wrap <AuthProvider>
  <BrowserRouter> 
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);