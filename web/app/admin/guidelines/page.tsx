import type { ReactElement } from "react";
import guidelines from "@/data/guidelines.sample.json";

const sections = [
  ["Brand Tone", guidelines.brandTone],
  ["Content Structure Types", guidelines.contentStructures],
  ["Banned Expressions", guidelines.bannedExpressions],
  ["Good Examples", guidelines.goodExamples],
  ["Bad Examples", guidelines.badExamples],
  ["Image Usage Rules", guidelines.imageRules],
  ["CTA Rules", guidelines.ctaRules],
  ["Hashtag Rules", guidelines.hashtagRules]
] as const;

export default function GuidelinesPage(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Guideline Manager</p>
          <h1>가이드라인 관리 초안</h1>
        </div>
        <span className="badge">Read-only sample</span>
      </header>

      <div className="grid two">
        <section className="card">
          <h2>Guideline Category</h2>
          <ul className="rule-list">
            {sections.map(([title]) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Current Active Rules</h2>
          <div className="grid">
            {sections.map(([title, rules]) => (
              <div key={title}>
                <h3>{title}</h3>
                <ul className="rule-list">
                  {rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="section notice">Save, Reload, Restore Previous Version은 다음 단계에서 DB와 연결합니다.</section>
    </>
  );
}
