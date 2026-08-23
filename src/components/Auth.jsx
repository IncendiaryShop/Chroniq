import { useState } from "react";
import { supabase } from "../services/supabase";
import MoltenMetal from "./backgrounds/MoltenMetal";
import chroniqLogo from "../assets/chroniqlogo.svg";

export default function Auth({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (res.error) throw res.error;

      onSignedIn(res.data.user);
    } catch (ex) {
      setError(ex.message || "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-bg" aria-hidden="true">
        <MoltenMetal
          color1="#8eb9fc"
          color2="#4a4e7c"
          color3="#FFFFFF"
          speed={0.35}
          scale={4}
          detail={3}
          glow={1.6}
          coreSize={0.1}
          swirl={1}
          fold={-0.2}
          blackPoint={0.05}
          brightness={1.3}
          colorMode="molten"
          grain
          grainIntensity={0.05}
          opacity={1}
          mouseInteraction={false}
        />
      </div>

      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
  <img src={chroniqLogo} alt="Chroniq" />
</div>
        </div>

        <h2>
          Welcome
        </h2>

        <p className="auth-subtitle">
          Everything about your time, in one place.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="sr-only" htmlFor="loginEmail">
              Email address
            </label>

            <div className="auth-input-wrap">

              <input
                type="email"
                id="loginEmail"
                autoComplete="email"
                placeholder="Email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="sr-only" htmlFor="loginPassword">
              Password
            </label>

            <div className="auth-input-wrap">

              <input
                type={showPassword ? "text" : "password"}
                id="loginPassword"
                autoComplete="current-password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                className="auth-password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((s) => !s)}
              >
                <i
                  className={
                    showPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"
                  }
                  aria-hidden="true"
                ></i>
              </button>
            </div>
          </div>

          <button className="auth-submit" type="submit" disabled={submitting}>
            <span>{submitting ? "Signing in..." : "Sign in"}</span>
          </button>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}