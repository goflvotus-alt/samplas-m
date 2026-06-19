import type { ReactElement } from "react";
import BrandsEditor from "./BrandsEditor";

export default function BrandsPage(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Brand Knowledge Base</p>
          <h1>브랜드 지식</h1>
        </div>
        <span className="badge">Knowledge System</span>
      </header>

      <BrandsEditor />
    </>
  );
}
