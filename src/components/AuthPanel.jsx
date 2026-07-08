import { useCallback, useState } from "react";
import { useAuth } from "../context/Auth.jsx";
import GoogleButton from "./GoogleButton.jsx";

// Logged-out state of the account portal: Log in / Create account tabs plus
// "Sign in with Google". On success the auth context fills in the customer and
// the parent page swaps to the dashboard.
export default function AuthPanel() {
  const { googleClientId, login, signup, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState("login"); // login | signup
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [googleHint, setGoogleHint] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setFieldErrors({});
  };

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      if (mode === "signup") {
        await signup({ name: form.name, email: form.email, password: form.password });
      } else {
        await login({ email: form.email, password: form.password });
      }
      // success → context updates → AccountPage shows the dashboard
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setFieldErrors(err.errors || {});
    } finally {
      setBusy(false);
    }
  }

  const onGoogle = useCallback(
    async (credential) => {
      setError("");
      try {
        await loginWithGoogle(credential);
      } catch (err) {
        setError(err.message || "Google sign-in failed.");
      }
    },
    [loginWithGoogle]
  );

  return (
    <div className="auth-card reveal">
      <div className="auth-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className={`auth-tab ${mode === "login" ? "on" : ""}`}
          onClick={() => switchMode("login")}
        >
          Log in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={`auth-tab ${mode === "signup" ? "on" : ""}`}
          onClick={() => switchMode("signup")}
        >
          Create account
        </button>
      </div>

      <form className="auth-form" onSubmit={submit} noValidate>
        {mode === "signup" && (
          <label className="auth-field">
            <span className="auth-label">Name</span>
            <input
              type="text"
              required
              maxLength={80}
              autoComplete="name"
              value={form.name}
              onChange={set("name")}
            />
            {fieldErrors.name && <span className="auth-error">{fieldErrors.name}</span>}
          </label>
        )}

        <label className="auth-field">
          <span className="auth-label">Email</span>
          <input
            type="email"
            required
            maxLength={160}
            autoComplete="email"
            value={form.email}
            onChange={set("email")}
          />
          {fieldErrors.email && <span className="auth-error">{fieldErrors.email}</span>}
        </label>

        <label className="auth-field">
          <span className="auth-label">Password</span>
          <input
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            maxLength={200}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={form.password}
            onChange={set("password")}
          />
          {fieldErrors.password && <span className="auth-error">{fieldErrors.password}</span>}
          {mode === "signup" && !fieldErrors.password && (
            <span className="auth-hint">At least 8 characters.</span>
          )}
        </label>

        {error && (
          <p className="auth-error auth-error-main" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn-solid auth-submit" type="submit" disabled={busy}>
          {busy ? "One sec…" : mode === "signup" ? "Create account" : "Log in"}
          <span className="arr" aria-hidden="true">→</span>
        </button>
      </form>

      <div className="auth-or"><span>or</span></div>

      {googleClientId ? (
        <GoogleButton clientId={googleClientId} onCredential={onGoogle} onError={() => setError("Couldn't load Google sign-in.")} />
      ) : (
        <>
          <button
            type="button"
            className="google-btn-placeholder"
            onClick={() => setGoogleHint(true)}
          >
            <span className="g-mark" aria-hidden="true">G</span> Continue with Google
          </button>
          {googleHint && (
            <p className="auth-hint auth-hint-center">
              Google sign-in isn’t switched on yet — add your <code>GOOGLE_CLIENT_ID</code> in{" "}
              <code>.env</code> to enable it.
            </p>
          )}
        </>
      )}

      <p className="auth-fine">
        We only use your details to confirm and deliver your order.
      </p>
    </div>
  );
}
