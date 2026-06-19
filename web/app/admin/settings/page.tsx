import type { ReactElement } from "react";
import SettingsPanel from "./SettingsPanel";

export default function SettingsPage(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Access Control</p>
          <h1>관리자 설정</h1>
        </div>
        <span className="badge">Session Based</span>
      </header>

      <SettingsPanel />
    </>
  );
}
