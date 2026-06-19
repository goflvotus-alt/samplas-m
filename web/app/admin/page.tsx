import type { ReactElement } from "react";

export default function AdminPage(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">SAMPLAS Operating System</p>
          <h1>에디토리얼 인텔리전스</h1>
        </div>
        <span className="badge">Session Active</span>
      </header>

      <section className="operation-index">
        <div>
          <span>Plugin Routes</span>
          <strong>2</strong>
          <p>/health, /api/generate-card-news</p>
        </div>
        <div>
          <span>Admin Areas</span>
          <strong>4</strong>
          <p>Guidelines, Brands, Feedback, Test</p>
        </div>
        <div>
          <span>Editable Systems</span>
          <strong>3</strong>
          <p>Guidelines, Brands, Feedback</p>
        </div>
      </section>

      <section className="section compact-panel">
        <h2>배포 후 플러그인에 넣을 주소</h2>
        <p>Vercel 배포가 끝나면 플러그인의 Backend API URL에는 기본 주소만 넣습니다.</p>
        <pre className="result-box">https://your-project.vercel.app</pre>
      </section>
    </>
  );
}
