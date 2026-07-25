import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.jsx";
import { SiteDataProvider } from "./context/SiteData.jsx";
import { AuthProvider } from "./context/Auth.jsx";
import { CartProvider } from "./context/Cart.jsx";
import { WishlistProvider } from "./context/Wishlist.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SiteDataProvider>
          <CartProvider>
            <WishlistProvider>
              <App />
              <Analytics />
            </WishlistProvider>
          </CartProvider>
        </SiteDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
