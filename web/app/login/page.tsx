import type { ReactElement } from "react";

export default function LoginPage(): ReactElement {
  return (
    <main className="content" style={{ maxWidth: 520 }}>
      <p className="eyebrow">Login Preview</p>
      <h1>관리자 로그인</h1>
      <section className="section card">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="password">Admin Password</label>
            <input id="password" type="password" placeholder="ADMIN_PASSWORD" disabled />
          </div>
          <button className="button" disabled>
            Login
          </button>
          <p>실제 쿠키 세션 로그인은 다음 구현 단계에서 ADMIN_PASSWORD와 연결합니다.</p>
        </div>
      </section>
    </main>
  );
}
