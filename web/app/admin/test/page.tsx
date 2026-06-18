import type { ReactElement } from "react";
import TestGenerationForm from "./TestGenerationForm";

export default function TestPage(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Test Generation</p>
          <h1>AI 생성 테스트</h1>
        </div>
        <span className="badge">POST /api/generate-card-news</span>
      </header>

      <TestGenerationForm />
    </>
  );
}
