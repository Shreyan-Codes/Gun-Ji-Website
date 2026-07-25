import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import BottomNav from "./components/BottomNav.jsx";
import Home from "./pages/Home.jsx";
import TeesPage from "./pages/TeesPage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import CustomPrintPage from "./pages/CustomPrintPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import TrackPage from "./pages/TrackPage.jsx";
import SizeGuidePage from "./pages/SizeGuidePage.jsx";
import PolicyPage from "./pages/PolicyPage.jsx";
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
          {/* /editions was retired — vercel.json 301s it in prod; this covers
              dev and any host without the redirect rule. */}
          <Route path="/editions" element={<Navigate to="/tees" replace />} />
          <Route path="/tees" element={<TeesPage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/custom-print" element={<CustomPrintPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order" element={<Navigate to="/tees" replace />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/size-guide" element={<SizeGuidePage />} />
          <Route path="/policies/:slug" element={<PolicyPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
      <BottomNav />
      <div className="grain" aria-hidden="true" />
    </>
  );
}
