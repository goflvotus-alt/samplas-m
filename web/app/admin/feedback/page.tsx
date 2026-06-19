import type { ReactElement } from "react";
import FeedbackManager from "./FeedbackManager";

export default function FeedbackPage(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Feedback</p>
          <h1>피드백 관리</h1>
        </div>
        <span className="badge">Editable</span>
      </header>

      <FeedbackManager />
    </>
  );
}
