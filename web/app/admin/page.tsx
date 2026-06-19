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

      <div className="grid three editorial-summary">
        <section className="card">
          <div className="metric">2</div>
          <h2>Plugin Routes</h2>
          <p>/health와 /api/generate-card-news를 유지합니다.</p>
        </section>
        <section className="card">
          <div className="metric">4</div>
          <h2>Admin Areas</h2>
          <p>Guidelines, Brands, Feedback, Test 화면을 관리합니다.</p>
        </section>
        <section className="card">
          <div className="metric">1</div>
          <h2>Editable Area</h2>
          <p>Guidelines는 저장소 연결 후 바로 편집할 수 있습니다.</p>
        </section>
      </div>

      <section className="section card">
        <h2>배포 후 플러그인에 넣을 주소</h2>
        <p>Vercel 배포가 끝나면 플러그인의 Backend API URL에는 기본 주소만 넣습니다.</p>
        <pre className="result-box">https://your-project.vercel.app</pre>
      </section>
    </>
  );
}
