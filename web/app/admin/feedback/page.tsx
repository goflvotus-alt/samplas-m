import type { ReactElement } from "react";
import FeedbackManager from "./FeedbackManager";

export default function FeedbackPage(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Feedback Intelligence</p>
          <h1>피드백 검토</h1>
        </div>
        <span className="badge">Learning Loop</span>
      </header>

      <FeedbackManager />
    </>
  );
}
