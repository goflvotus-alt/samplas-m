import type { ReactElement } from "react";
import brands from "@/data/brands.sample.json";

export default function BrandsPage(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Brand Knowledge Base</p>
          <h1>브랜드 데이터 초안</h1>
        </div>
        <span className="badge">Sample data</span>
      </header>

      <div className="grid">
        {brands.map((brand) => (
          <section className="card" key={brand.brandName}>
            <h2>{brand.brandName}</h2>
            <p>Designer: {brand.designer || "Not set"}</p>
            <p>Keywords: {brand.keywords.join(", ") || "Not set"}</p>
            <p>{brand.description}</p>
          </section>
        ))}
      </div>

      <section className="section notice">Add, Edit, Delete, Search는 다음 단계에서 저장소와 연결합니다.</section>
    </>
  );
}
