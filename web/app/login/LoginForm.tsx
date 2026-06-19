"use client";

import type { ReactElement } from "react";
import { useState } from "react";

export default function LoginForm(): ReactElement {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(): Promise<void> {
    setLoading(true);
    setMessage("Checking password...");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password }),
        credentials: "same-origin"
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        setMessage(json.error || "Login failed.");
        return;
      }

      setMessage("Logged in.");
      window.location.href = "/admin";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="login-panel">
      <div className="field">
        <label htmlFor="password">Admin Password</label>
        <input
          autoComplete="current-password"
          autoFocus
          id="password"
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && password && !loading) {
              void login();
            }
          }}
          type="password"
          value={password}
        />
      </div>
      <button className="button editorial-button" disabled={!password || loading} onClick={login} type="button">
        {loading ? "Checking..." : "Enter Admin"}
      </button>
      {message ? <div className="status-message">{message}</div> : null}
    </section>
  );
}
