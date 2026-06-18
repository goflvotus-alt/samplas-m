import type { ReactElement } from "react";

export default function AdminPage(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Vercel Preview</p>
          <h1>관리자 시스템 초안</h1>
        </div>
        <span className="badge">API compatible</span>
      </header>

      <div className="grid three">
        <section className="card">
          <div className="metric">2</div>
          <h2>Plugin Routes</h2>
          <p>/health와 /api/generate-card-news를 유지합니다.</p>
        </section>
        <section className="card">
          <div className="metric">4</div>
          <h2>Admin Areas</h2>
          <p>Guidelines, Brands, Feedback, Test 화면의 뼈대가 있습니다.</p>
        </section>
        <section className="card">
          <div className="metric">0</div>
          <h2>Database</h2>
          <p>아직 DB 저장은 연결하지 않았습니다. 샘플 데이터만 보여줍니다.</p>
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
