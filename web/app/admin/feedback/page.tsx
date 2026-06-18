import type { ReactElement } from "react";
import feedback from "@/data/feedback.sample.json";

export default function FeedbackPage(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Feedback System</p>
          <h1>피드백 관리 초안</h1>
        </div>
        <span className="badge">Storage scaffold</span>
      </header>

      <section className="table" aria-label="Feedback entries">
        <div className="table-row header">
          <div>Timestamp</div>
          <div>Status</div>
          <div>Feedback</div>
        </div>
        {feedback.map((entry) => (
          <div className="table-row" key={entry.id}>
            <div>{entry.timestamp}</div>
            <div>{entry.status}</div>
            <div>{entry.feedback}</div>
          </div>
        ))}
      </section>

      <section className="section notice">mark useful, mark ignored, delete는 다음 단계에서 연결합니다.</section>
    </>
  );
}
