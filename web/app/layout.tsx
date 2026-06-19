import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAMPLAS M Admin",
  description: "SAMPLAS M Admin and API"
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
