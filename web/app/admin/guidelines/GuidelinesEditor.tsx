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
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

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
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [status, setStatus] = useState("Loading guidelines...");
  const [storage, setStorage] = useState("unknown");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [brandCount, setBrandCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState("");

  const totalRules = useMemo(
    () => sections.reduce((count, section) => count + toRules(drafts[section.key]).length, 0),
    [drafts]
  );

  useEffect(() => {
    void reloadAll();
  }, []);

  async function reloadAll(): Promise<void> {
    setStatus("Loading guidelines...");

    try {
      const [guidelineResponse, brandsResponse, feedbackResponse] = await Promise.all([
        fetch("/api/guidelines", { cache: "no-store" }),
        fetch("/api/brands", { cache: "no-store" }),
        fetch("/api/feedback", { cache: "no-store" })
      ]);
      const nextGuidelines = normalizeGuidelines(await guidelineResponse.json());
      const brandsJson = await brandsResponse.json();
      const feedbackJson = await feedbackResponse.json();

      setDrafts(guidelinesToDrafts(nextGuidelines));
      setStorage(guidelineResponse.headers.get("X-Samplas-Storage") || "unknown");
      setBrandCount(Array.isArray(brandsJson) ? brandsJson.length : 0);
      setFeedbackCount(Array.isArray(feedbackJson) ? feedbackJson.length : 0);
      setSelectedVersion("");
      setSaveState("idle");
      setStatus(guidelineResponse.ok ? "Loaded." : "Could not load guidelines.");
      await reloadHistorySafely();
    } catch (error) {
      console.error("[guidelines] Reload failed", error);
      setStatus(error instanceof Error ? error.message : "Could not load guidelines.");
      setSaveState("error");
    }
  }

  async function save(): Promise<void> {
    const nextGuidelines = draftsToGuidelines(drafts);
    setSaveState("saving");
    setStatus("Saving guidelines...");

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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          updatedBy: "admin",
          guidelines: nextGuidelines
        }),
        credentials: "same-origin"
      });

      const json = (await response.json()) as { ok?: boolean; error?: string; version?: string; guidelines?: Guidelines };

      if (!response.ok) {
        console.error("[guidelines] Save request failed", {
          status: response.status,
          response: json
        });
        setStatus(json.error || "Could not save guidelines.");
        setSaveState("error");

        if (response.status === 401) {
          window.location.href = "/login";
        }

        return;
      }

      if (json.guidelines) {
        const savedGuidelines = normalizeGuidelines(json.guidelines);
        setDrafts(guidelinesToDrafts(savedGuidelines));
      }

      await reloadFromRedisAfterSave();
      const savedAt = json.version || new Date().toISOString();
      setLastSavedAt(savedAt);
      setStatus("Saved.");
      setSaveState("saved");
      window.setTimeout(() => setSaveState((current) => (current === "saved" ? "idle" : current)), 2000);
    } catch (error) {
      console.error("[guidelines] Save threw an error", error);
      setStatus(error instanceof Error ? error.message : "Could not save guidelines.");
      setSaveState("error");
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
      const nextHistory = normalizeHistory(await response.json());
      setHistory(nextHistory);
      setLastSavedAt(nextHistory[0]?.version || "");
    } catch (error) {
      console.error("[guidelines] History reload failed", error);
    }
  }

  function updateDraft(key: GuidelineKey, value: string): void {
    setDrafts((current) => ({
      ...current,
      [key]: value
    }));
    setSaveState("dirty");
    setStatus("Unsaved changes.");
  }

  function restoreSelectedVersion(): void {
    const entry = history.find((item) => item.version === selectedVersion);

    if (!entry) {
      setStatus("Choose a previous version first.");
      return;
    }

    const restoredGuidelines = normalizeGuidelines(entry.guidelines);
    setDrafts(guidelinesToDrafts(restoredGuidelines));
    setSaveState("dirty");
    setStatus("Previous version loaded into the editor. Click Save to make it active.");
  }

  const saveButtonClassName = `button save-button${saveState === "saved" ? " saved" : ""}${saveState === "error" ? " error" : ""}`;
  const saveButtonLabel = saveState === "saved" ? "✓ Saved" : saveState === "saving" ? "Saving..." : "Save System";
  const statusLabel =
    saveState === "dirty" ? "Unsaved Changes" : saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : status;

  return (
    <div className="editorial-workspace">
      <section className="system-strip" aria-label="Operational status">
        <StatusItem label="Storage" value={storage} />
        <StatusItem label="Guidelines" value={String(totalRules)} />
        <StatusItem label="Brands" value={String(brandCount)} />
        <StatusItem label="Feedback Entries" value={String(feedbackCount)} />
        <StatusItem label="Last Updated" value={formatDateTime(lastSavedAt)} />
      </section>

      <section className="save-console">
        <div>
          <p className="eyebrow">Save State</p>
          <h2>{statusLabel}</h2>
          <p>Last Saved: {formatDateTime(lastSavedAt)}</p>
        </div>
        <div className="button-row">
          <button className={saveButtonClassName} disabled={saveState === "saving"} onClick={save} type="button">
            {saveButtonLabel}
          </button>
          <button className="button secondary" disabled={saveState === "saving"} onClick={reloadAll} type="button">
            Reload
          </button>
        </div>
      </section>

      <section className="guideline-board">
        {sections.map((section, index) => (
          <article className="guideline-row" key={section.key}>
            <div className="guideline-index">{String(index + 1).padStart(2, "0")}</div>
            <div className="guideline-meta">
              <h2>{section.label}</h2>
              <p>{section.description}</p>
              <span>{toRules(drafts[section.key]).length} active rules</span>
            </div>
            <div className="field guideline-field">
              <label htmlFor={section.key}>Current Rules</label>
              <textarea
                id={section.key}
                spellCheck={false}
                value={drafts[section.key]}
                onChange={(event) => updateDraft(section.key, event.target.value)}
              />
            </div>
          </article>
        ))}
      </section>

      <section className="archive-console">
        <div>
          <p className="eyebrow">Version Archive</p>
          <h2>Restore Previous Rules</h2>
        </div>
        <div className="field">
          <label htmlFor="history">Previous Version</label>
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
      </section>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
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

function formatDateTime(value: string): string {
  if (!value || value === "sample") {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
