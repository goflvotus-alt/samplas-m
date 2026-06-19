import type { ReactElement } from "react";
import GuidelinesEditor from "./GuidelinesEditor";

export default function GuidelinesPage(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">AI Guideline System</p>
          <h1>AI 규칙 운영</h1>
        </div>
        <span className="badge">Editorial Control</span>
      </header>

      <GuidelinesEditor />
    </>
  );
}
