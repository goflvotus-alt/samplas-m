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
type GuidelineDrafts = Record<GuidelineKey, string>;
type SaveState = "idle" | "saving" | "saved" | "error";

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

const emptyDrafts = sections.reduce((drafts, section) => {
  drafts[section.key] = "";
  return drafts;
}, {} as GuidelineDrafts);

export default function GuidelinesEditor(): ReactElement {
  const [drafts, setDrafts] = useState<GuidelineDrafts>(emptyDrafts);
  const [selectedKey, setSelectedKey] = useState<GuidelineKey>("brandTone");
  const [adminPassword, setAdminPassword] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [status, setStatus] = useState("Loading guidelines...");
  const [storage, setStorage] = useState("unknown");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const selectedSection = useMemo(
    () => sections.find((section) => section.key === selectedKey) || sections[0],
    [selectedKey]
  );

  const selectedText = drafts[selectedKey];
  const totalRules = sections.reduce((count, section) => count + toRules(drafts[section.key]).length, 0);

  useEffect(() => {
    const storedPassword = window.sessionStorage.getItem("samplas-admin-password") || "";
    setAdminPassword(storedPassword);
    void reloadAll();
  }, []);

  async function reloadAll(): Promise<void> {
    setStatus("Loading guidelines...");

    try {
      const guidelineResponse = await fetch("/api/guidelines", { cache: "no-store" });
      const nextGuidelines = normalizeGuidelines(await guidelineResponse.json());

      setDrafts(guidelinesToDrafts(nextGuidelines));
      setStorage(guidelineResponse.headers.get("X-Samplas-Storage") || "unknown");
      setSelectedVersion("");
      setStatus(guidelineResponse.ok ? "Loaded." : "Could not load guidelines.");
      await reloadHistorySafely();
    } catch (error) {
      console.error("[guidelines] Reload failed", error);
      setStatus(error instanceof Error ? error.message : "Could not load guidelines.");
    }
  }

  async function save(): Promise<void> {
    if (!adminPassword.trim()) {
      const message = "Admin Password를 입력해야 저장됩니다.";
      console.error("[guidelines] Save blocked", { reason: "missing-admin-password" });
      setStatus(message);
      setSaveState("error");
      return;
    }

    const nextGuidelines = draftsToGuidelines(drafts);
    setSaveState("saving");
    setStatus("Saving guidelines...");
    window.sessionStorage.setItem("samplas-admin-password", adminPassword);

    try {
      console.info("[guidelines] Sending save request", {
        keys: Object.keys(nextGuidelines),
        ruleCounts: sections.reduce((counts, section) => {
          counts[section.key] = nextGuidelines[section.key].length;
          return counts;
        }, {} as Record<GuidelineKey, number>)
      });

      const response = await fetch("/api/guidelines", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword
        },
        body: JSON.stringify({
          updatedBy: "admin",
          guidelines: nextGuidelines
        })
      });

      const json = (await response.json()) as { ok?: boolean; error?: string; version?: string; guidelines?: Guidelines };

      if (!response.ok) {
        console.error("[guidelines] Save request failed", {
          status: response.status,
          response: json
        });
        setStatus(json.error || "Could not save guidelines.");
        setSaveState("error");
        return;
      }

      if (json.guidelines) {
        const savedGuidelines = normalizeGuidelines(json.guidelines);
        setDrafts(guidelinesToDrafts(savedGuidelines));
      }

      await reloadFromRedisAfterSave();
      setStatus(json.version ? `Saved. Version: ${json.version}` : "Saved.");
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2000);
    } catch (error) {
      console.error("[guidelines] Save threw an error", error);
      setStatus(error instanceof Error ? error.message : "Could not save guidelines.");
      setSaveState("error");
    } finally {
      window.setTimeout(() => setSaveState((current) => (current === "saving" ? "idle" : current)), 300);
    }
  }

  async function reloadFromRedisAfterSave(): Promise<void> {
    const guidelineResponse = await fetch("/api/guidelines", { cache: "no-store" });
    const savedGuidelines = normalizeGuidelines(await guidelineResponse.json());

    setDrafts(guidelinesToDrafts(savedGuidelines));
    setStorage(guidelineResponse.headers.get("X-Samplas-Storage") || storage);
    await reloadHistorySafely();
  }

  async function reloadHistorySafely(): Promise<void> {
    try {
      const response = await fetch("/api/guidelines/history", { cache: "no-store" });
      setHistory(normalizeHistory(await response.json()));
    } catch (error) {
      console.error("[guidelines] History reload failed", error);
    }
  }

  function updateSelectedText(value: string): void {
    if (saveState === "saved" || saveState === "error") {
      setSaveState("idle");
    }

    setDrafts((current) => ({
      ...current,
      [selectedKey]: value
    }));
  }

  function restoreSelectedVersion(): void {
    const entry = history.find((item) => item.version === selectedVersion);

    if (!entry) {
      setStatus("Choose a previous version first.");
      return;
    }

    const restoredGuidelines = normalizeGuidelines(entry.guidelines);
    setDrafts(guidelinesToDrafts(restoredGuidelines));
    setStatus("Previous version loaded into the editor. Click Save to make it active.");
  }

  const saveButtonClassName = `button save-button${saveState === "saved" ? " saved" : ""}${saveState === "error" ? " error" : ""}`;
  const saveButtonLabel = saveState === "saved" ? "✓ Saved" : saveState === "saving" ? "Saving..." : "Save";

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
              <small>{toRules(drafts[section.key]).length} rules</small>
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
            <button className={saveButtonClassName} disabled={saveState === "saving"} onClick={save} type="button">
              {saveButtonLabel}
            </button>
            <button className="button secondary" disabled={saveState === "saving"} onClick={reloadAll} type="button">
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

          {status ? <div className={`status-message ${saveState === "error" ? "error" : ""}`}>{status}</div> : null}
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

function guidelinesToDrafts(guidelines: Guidelines): GuidelineDrafts {
  return sections.reduce((drafts, section) => {
    drafts[section.key] = guidelines[section.key].join("\n");
    return drafts;
  }, {} as GuidelineDrafts);
}

function draftsToGuidelines(drafts: GuidelineDrafts): Guidelines {
  return sections.reduce((guidelines, section) => {
    guidelines[section.key] = toRules(drafts[section.key]);
    return guidelines;
  }, {} as Guidelines);
}

function toRules(value: string): string[] {
  return Array.from(new Set(value.split("\n").map((rule) => rule.trim()).filter(Boolean)));
}
