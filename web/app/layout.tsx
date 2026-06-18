import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAMPLAS M Admin",
  description: "Vercel-ready Admin and API scaffold for SAMPLAS M"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
