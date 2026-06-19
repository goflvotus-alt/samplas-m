"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";

type PasswordStatus = {
  storage: "redis" | "env";
  canChangePassword: boolean;
  hasCustomPassword: boolean;
  hasFallbackPassword: boolean;
  error?: string;
};

export default function SettingsPanel(): ReactElement {
  const [status, setStatus] = useState<PasswordStatus | null>(null);
  const [message, setMessage] = useState("Loading settings...");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus(): Promise<void> {
    setMessage("Loading settings...");

    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const json = (await response.json()) as PasswordStatus;
      setStatus(json);
      setMessage(response.ok ? "Settings loaded." : json.error || "Could not load settings.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load settings.");
    }
  }

  async function savePassword(): Promise<void> {
    if (nextPassword !== confirmPassword) {
      setMessage("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    setMessage("Updating password...");

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nextPassword
        }),
        credentials: "same-origin"
      });

      const json = (await response.json()) as PasswordStatus;

      if (!response.ok) {
        setMessage(json.error || "Could not update password.");

        if (response.status === 401) {
          window.location.href = "/login";
        }

        return;
      }

      setNextPassword("");
      setConfirmPassword("");
      setStatus(json);
      setMessage("Password updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid two">
      <section className="card">
        <h2>Admin Password</h2>
        <p>
          로그인 세션으로 관리자 권한을 확인합니다. Redis 저장소가 연결되어 있으면 여기서 새 비밀번호로 바꿀 수
          있습니다.
        </p>

        <div className="status-list section">
          <div>
            <span>Storage</span>
            <strong>{status?.storage || "-"}</strong>
          </div>
          <div>
            <span>Editable</span>
            <strong>{status?.canChangePassword ? "Yes" : "No"}</strong>
          </div>
          <div>
            <span>Custom Password</span>
            <strong>{status?.hasCustomPassword ? "Set" : "Not set"}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="nextPassword">New Password</label>
            <input
              id="nextPassword"
              minLength={8}
              type="password"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              minLength={8}
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          <div className="button-row">
            <button className="button" disabled={saving || !nextPassword || !confirmPassword} onClick={savePassword} type="button">
              Save Password
            </button>
            <button className="button secondary" disabled={saving} onClick={loadStatus} type="button">
              Reload
            </button>
          </div>

          {message ? <p>{message}</p> : null}
        </div>
      </section>
    </div>
  );
}
