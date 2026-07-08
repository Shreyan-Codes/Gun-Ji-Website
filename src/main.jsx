import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { SiteDataProvider } from "./context/SiteData.jsx";
import { AuthProvider } from "./context/Auth.jsx";
import { CartProvider } from "./context/Cart.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SiteDataProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </SiteDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
