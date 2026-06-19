import type { ReactElement } from "react";
import BrandsEditor from "./BrandsEditor";

export default function BrandsPage(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Brands</p>
          <h1>브랜드 관리</h1>
        </div>
        <span className="badge">Editable</span>
      </header>

      <BrandsEditor />
    </>
  );
}
