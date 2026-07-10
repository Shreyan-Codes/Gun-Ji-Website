import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import BottomNav from "./components/BottomNav.jsx";
import Home from "./pages/Home.jsx";
import EditionsPage from "./pages/EditionsPage.jsx";
import TeesPage from "./pages/TeesPage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import CustomPrintPage from "./pages/CustomPrintPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import TrackPage from "./pages/TrackPage.jsx";
import useReveal from "./hooks/useReveal.js";

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useReveal(pathname);

  return (
    <>
      <a className="skip-link" href="#top">Skip to content</a>
      <Header />
      <main id="top">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editions" element={<EditionsPage />} />
          <Route path="/tees" element={<TeesPage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/custom-print" element={<CustomPrintPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order" element={<Navigate to="/tees" replace />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
      <BottomNav />
      <div className="grain" aria-hidden="true" />
    </>
  );
}
