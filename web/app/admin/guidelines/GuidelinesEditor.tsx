"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";

type GuidelineKey =
  | "brandTone"
  | "contentStructures"
  | "bannedExpressions"
  | "goodExamples"
  | "badExamples"
  | "imageRules"
  | "ctaRules"
  | "hashtagRules";

type Guidelines = Record<GuidelineKey, string[]>;

type HistoryEntry = {
  version: string;
  updatedBy: string;
  guidelines: Guidelines;
};

const sections: Array<{ key: GuidelineKey; label: string; description: string }> = [
  {
    key: "brandTone",
    label: "Brand Tone",
    description: "전체 문체, 말투, 에디토리얼 감도"
  },
  {
    key: "contentStructures",
    label: "Content Structure Types",
    description: "커버, 본문, 마무리 등 슬라이드 구조"
  },
  {
    key: "bannedExpressions",
    label: "Banned Expressions",
    description: "사용하지 않을 표현"
  },
  {
    key: "goodExamples",
    label: "Good Examples",
    description: "좋은 결과 예시"
  },
  {
    key: "badExamples",
    label: "Bad Examples",
    description: "피해야 할 결과 예시"
  },
  {
    key: "imageRules",
    label: "Image Usage Rules",
    description: "이미지 설명, 크롭, 초점 관련 규칙"
  },
  {
    key: "ctaRules",
    label: "CTA Rules",
    description: "콜투액션 사용 방식"
  },
  {
    key: "hashtagRules",
    label: "Hashtag Rules",
    description: "해시태그 작성 방식"
  }
];

const emptyGuidelines = sections.reduce((guidelines, section) => {
  guidelines[section.key] = [];
  return guidelines;
}, {} as Guidelines);

export default function GuidelinesEditor(): ReactElement {
  const [guidelines, setGuidelines] = useState<Guidelines>(emptyGuidelines);
  const [selectedKey, setSelectedKey] = useState<GuidelineKey>("brandTone");
  const [adminPassword, setAdminPassword] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [status, setStatus] = useState("Loading guidelines...");
  const [storage, setStorage] = useState("unknown");
  const [saving, setSaving] = useState(false);

  const selectedSection = useMemo(
    () => sections.find((section) => section.key === selectedKey) || sections[0],
    [selectedKey]
  );

  const selectedText = guidelines[selectedKey].join("\n");
  const totalRules = sections.reduce((count, section) => count + guidelines[section.key].length, 0);

  useEffect(() => {
    const storedPassword = window.sessionStorage.getItem("samplas-admin-password") || "";
    setAdminPassword(storedPassword);
    void reloadAll();
  }, []);

  async function reloadAll(): Promise<void> {
    setStatus("Loading guidelines...");

    try {
      const [guidelineResponse, historyResponse] = await Promise.all([
        fetch("/api/guidelines", { cache: "no-store" }),
        fetch("/api/guidelines/history", { cache: "no-store" })
      ]);

      const nextGuidelines = normalizeGuidelines(await guidelineResponse.json());
      const nextHistory = normalizeHistory(await historyResponse.json());

      setGuidelines(nextGuidelines);
      setHistory(nextHistory);
      setStorage(guidelineResponse.headers.get("X-Samplas-Storage") || "unknown");
      setSelectedVersion("");
      setStatus(guidelineResponse.ok ? "Loaded." : "Could not load guidelines.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load guidelines.");
    }
  }

  async function save(): Promise<void> {
    setSaving(true);
    setStatus("Saving guidelines...");
    window.sessionStorage.setItem("samplas-admin-password", adminPassword);

    try {
      const response = await fetch("/api/guidelines", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword
        },
        body: JSON.stringify({
          updatedBy: "admin",
          guidelines
        })
      });

      const json = (await response.json()) as { ok?: boolean; error?: string; version?: string; guidelines?: Guidelines };

      if (!response.ok) {
        setStatus(json.error || "Could not save guidelines.");
        return;
      }

      if (json.guidelines) {
        setGuidelines(normalizeGuidelines(json.guidelines));
      }

      setStatus(json.version ? `Saved. Version: ${json.version}` : "Saved.");
      await reloadHistoryOnly();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save guidelines.");
    } finally {
      setSaving(false);
    }
  }

  async function reloadHistoryOnly(): Promise<void> {
    const response = await fetch("/api/guidelines/history", { cache: "no-store" });
    setHistory(normalizeHistory(await response.json()));
  }

  function updateSelectedText(value: string): void {
    setGuidelines((current) => ({
      ...current,
      [selectedKey]: normalizeRules(value)
    }));
  }

  function restoreSelectedVersion(): void {
    const entry = history.find((item) => item.version === selectedVersion);

    if (!entry) {
      setStatus("Choose a previous version first.");
      return;
    }

    setGuidelines(normalizeGuidelines(entry.guidelines));
    setStatus("Previous version loaded into the editor. Click Save to make it active.");
  }

  return (
    <div className="grid two">
      <section className="card">
        <div className="button-row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
          <h2>Guideline Category</h2>
          <span className="badge">{totalRules} rules</span>
        </div>

        <div className="category-list">
          {sections.map((section) => (
            <button
              className={`category-button${section.key === selectedKey ? " active" : ""}`}
              key={section.key}
              onClick={() => setSelectedKey(section.key)}
              type="button"
            >
              <span>{section.label}</span>
              <small>{guidelines[section.key].length} rules</small>
            </button>
          ))}
        </div>

        <section className="section notice">
          Storage: {storage}
          <br />
          저장이 안 되면 Vercel 환경변수에 UPSTASH_REDIS_REST_URL과 UPSTASH_REDIS_REST_TOKEN을 추가해야 합니다.
        </section>
      </section>

      <section className="card">
        <div className="form-grid">
          <div>
            <h2>{selectedSection.label}</h2>
            <p>{selectedSection.description}</p>
          </div>

          <div className="field">
            <label htmlFor="rules">Current Active Rules</label>
            <textarea
              id="rules"
              spellCheck={false}
              value={selectedText}
              onChange={(event) => updateSelectedText(event.target.value)}
            />
            <p>한 줄에 규칙 하나씩 입력합니다.</p>
          </div>

          <div className="field">
            <label htmlFor="adminPassword">Admin Password</label>
            <input
              id="adminPassword"
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
            />
          </div>

          <div className="button-row">
            <button className="button" disabled={saving} onClick={save} type="button">
              Save
            </button>
            <button className="button secondary" disabled={saving} onClick={reloadAll} type="button">
              Reload
            </button>
          </div>

          <div className="field">
            <label htmlFor="history">Restore Previous Version</label>
            <select id="history" value={selectedVersion} onChange={(event) => setSelectedVersion(event.target.value)}>
              <option value="">Choose version</option>
              {history.map((entry) => (
                <option key={entry.version} value={entry.version}>
                  {entry.version} by {entry.updatedBy}
                </option>
              ))}
            </select>
          </div>

          <button className="button secondary" onClick={restoreSelectedVersion} type="button">
            Restore Into Editor
          </button>

          {status ? <p>{status}</p> : null}
        </div>
      </section>
    </div>
  );
}

function normalizeGuidelines(input: unknown): Guidelines {
  const source = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};

  return sections.reduce((guidelines, section) => {
    guidelines[section.key] = Array.isArray(source[section.key])
      ? (source[section.key] as unknown[]).map((item) => String(item).trim()).filter(Boolean)
      : [];
    return guidelines;
  }, {} as Guidelines);
}

function normalizeHistory(input: unknown): HistoryEntry[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      const source = item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
      const version = typeof source.version === "string" ? source.version : "";

      if (!version) {
        return null;
      }

      return {
        version,
        updatedBy: typeof source.updatedBy === "string" ? source.updatedBy : "admin",
        guidelines: normalizeGuidelines(source.guidelines)
      };
    })
    .filter((item): item is HistoryEntry => Boolean(item));
}

function normalizeRules(value: string): string[] {
  return Array.from(new Set(value.split("\n").map((rule) => rule.trim()).filter(Boolean)));
}
