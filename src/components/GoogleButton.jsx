import { useEffect, useRef } from "react";

// Renders the official "Sign in with Google" button via Google Identity
// Services. Loads the GIS script once, then hands the returned ID token
// (JWT credential) to onCredential, which posts it to /api/auth/google.
// Renders nothing unless a client id is configured on the server.

const GIS_SRC = "https://accounts.google.com/gsi/client";
let gisPromise = null;

function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = GIS_SRC;
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Could not load Google sign-in"));
      document.head.appendChild(s);
    });
  }
  return gisPromise;
}

export default function GoogleButton({ clientId, onCredential, onError }) {
  const holder = useRef(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    loadGis()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id || !holder.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => resp?.credential && onCredential(resp.credential),
        });
        holder.current.replaceChildren();
        window.google.accounts.id.renderButton(holder.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: 300,
          logo_alignment: "center",
        });
      })
      .catch(() => onError?.());

    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential, onError]);

  if (!clientId) return null;
  return <div className="google-btn" ref={holder} />;
}
