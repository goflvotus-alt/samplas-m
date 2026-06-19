import type { ReactElement } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage(): ReactElement {
  return (
    <main className="login-shell">
      <section className="login-copy">
        <img className="login-logo" src="/samplas-logo.png" alt="SAMPLAS" />
        <p className="eyebrow">Editorial Intelligence System</p>
        <h1>관리자 로그인</h1>
        <p>
          한 번 로그인하면 이 브라우저에서는 관리자 화면과 저장 기능을 비밀번호 재입력 없이 사용할 수 있습니다.
        </p>
      </section>
      <LoginForm />
    </main>
  );
}
