import type { ReactElement, ReactNode } from "react";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/guidelines", label: "Guidelines" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/test", label: "Test" },
  { href: "/login", label: "Login Preview" }
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
          <div className="brand-title">SAMPLAS M</div>
          <div className="brand-subtitle">Admin + API scaffold for Vercel deployment.</div>
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
