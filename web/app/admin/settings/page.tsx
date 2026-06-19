import type { ReactElement } from "react";
import SettingsPanel from "./SettingsPanel";

export default function SettingsPage(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>관리 설정</h1>
        </div>
        <span className="badge">Admin</span>
      </header>

      <SettingsPanel />
    </>
  );
}
