import type { ReactElement, ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, isValidAdminSessionCookieValue } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/admin", label: "홈" },
  { href: "/admin/guidelines", label: "가이드라인" },
  { href: "/admin/brands", label: "브랜드" },
  { href: "/admin/feedback", label: "피드백" },
  { href: "/admin/test", label: "생성 테스트" },
  { href: "/admin/settings", label: "설정" }
];

export default async function AdminLayout({
  children
}: Readonly<{
  children: ReactNode;
}>): Promise<ReactElement> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";

  if (!isValidAdminSessionCookieValue(session)) {
    redirect("/login");
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <img className="brand-logo" src="/samplas-logo.png" alt="SAMPLAS" />
          <div className="brand-subtitle">Editorial Intelligence System</div>
        </div>
        <nav className="nav-list" aria-label="Admin navigation">
          {navItems.map((item) => (
            <a className="nav-link" href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <form action="/api/admin/logout" method="post">
          <button className="nav-link logout-button" type="submit">
            로그아웃
          </button>
        </form>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
