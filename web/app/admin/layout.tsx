import type { ReactElement, ReactNode } from "react";

const navItems = [
  { href: "/admin", label: "홈" },
  { href: "/admin/guidelines", label: "가이드라인" },
  { href: "/admin/brands", label: "브랜드" },
  { href: "/admin/feedback", label: "피드백" },
  { href: "/admin/test", label: "생성 테스트" },
  { href: "/admin/settings", label: "설정" }
];

export default function AdminLayout({
  children
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <img className="brand-logo" src="/samplas-logo.png" alt="SAMPLAS" />
          <div className="brand-subtitle">AI card-news admin</div>
        </div>
        <nav className="nav-list" aria-label="Admin navigation">
          {navItems.map((item) => (
            <a className="nav-link" href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
