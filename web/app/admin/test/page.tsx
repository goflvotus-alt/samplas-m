import type { ReactElement } from "react";
import TestGenerationForm from "./TestGenerationForm";

export default function TestPage(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Editorial Preview Room</p>
          <h1>AI 생성 검토</h1>
        </div>
        <span className="badge">POST /api/generate-card-news</span>
      </header>

      <TestGenerationForm />
    </>
  );
}
