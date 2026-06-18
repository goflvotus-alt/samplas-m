import type { ReactElement } from "react";
import GuidelinesEditor from "./GuidelinesEditor";

export default function GuidelinesPage(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Guideline Manager</p>
          <h1>가이드라인 관리</h1>
        </div>
        <span className="badge">Editable</span>
      </header>

      <GuidelinesEditor />
    </>
  );
}
