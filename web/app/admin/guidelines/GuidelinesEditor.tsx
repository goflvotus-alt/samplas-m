"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";

type GuidelineRuleKey =
  | "brandTone"
  | "contentStructures"
  | "bannedExpressions"
  | "goodExamples"
  | "badExamples"
  | "imageRules";

type GuidelineKey = GuidelineRuleKey | "references";
type RuleMap = Record<GuidelineRuleKey, string[]>;
type RuleDrafts = Record<GuidelineRuleKey, string>;
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type ReferenceEntry = {
  id: string;
  title: string;
  url: string;
  note: string;
};

type GuidelineCategory = {
  id: string;
  name: string;
  rules: RuleMap;
  references: ReferenceEntry[];
};

type GuidelineSystem = {
  version: 2;
  activeCategoryId: string;
  categories: GuidelineCategory[];
};

type HistoryEntry = {
  version: string;
  updatedBy: string;
  guidelines: GuidelineSystem;
};

const ruleSections: Array<{ key: GuidelineRuleKey; label: string; description: string }> = [
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
  }
];

const sections: Array<{ key: GuidelineKey; label: string; description: string }> = [
  ...ruleSections,
  {
    key: "references",
    label: "Reference",
    description: "AI가 참고할 URL과 메모"
  }
];

export default function GuidelinesEditor(): ReactElement {
  const [system, setSystem] = useState<GuidelineSystem>(createEmptySystem());
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [status, setStatus] = useState("Loading guidelines...");
  const [storage, setStorage] = useState("unknown");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [brandCount, setBrandCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [referenceMode, setReferenceMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [copiedCategory, setCopiedCategory] = useState<Pick<GuidelineCategory, "name" | "rules" | "references"> | null>(null);
  const [modalStatus, setModalStatus] = useState("");

  const selectedCategory = useMemo(
    () => system.categories.find((category) => category.id === selectedCategoryId),
    [selectedCategoryId, system.categories]
  );
  const selectedDrafts = useMemo(() => rulesToDrafts(selectedCategory?.rules || createEmptyRules()), [selectedCategory]);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll(): Promise<void> {
    setStatus("Loading guidelines...");

    try {
      const [guidelineResponse, brandsResponse, feedbackResponse] = await Promise.all([
        fetch("/api/guidelines", { cache: "no-store" }),
        fetch("/api/brands", { cache: "no-store" }),
        fetch("/api/feedback", { cache: "no-store" })
      ]);
      const nextSystem = normalizeGuidelineSystem(await guidelineResponse.json());
      const brandsJson = await brandsResponse.json();
      const feedbackJson = await feedbackResponse.json();

      setSystem(nextSystem);
      setSelectedCategoryId("");
      setStorage(guidelineResponse.headers.get("X-Samplas-Storage") || "unknown");
      setBrandCount(Array.isArray(brandsJson) ? brandsJson.length : 0);
      setFeedbackCount(Array.isArray(feedbackJson) ? feedbackJson.length : 0);
      setSelectedVersion("");
      setReferenceMode(false);
      setSaveState("idle");
      setStatus(guidelineResponse.ok ? "Loaded" : "Could not load guidelines.");
      await loadHistorySafely();
    } catch (error) {
      console.error("[guidelines] Load failed", error);
      setStatus(error instanceof Error ? error.message : "Could not load guidelines.");
      setSaveState("error");
    }
  }

  async function save(): Promise<void> {
    const nextSystem = normalizeGuidelineSystem({
      ...system,
      activeCategoryId: selectedCategoryId || system.activeCategoryId
    });
    await persistSystem(nextSystem, selectedCategoryId, "Saved");
  }

  async function persistSystem(nextSystem: GuidelineSystem, nextSelectedCategoryId: string, successMessage: string): Promise<boolean> {
    setSaveState("saving");
    setStatus("Saving...");

    try {
      const response = await fetch("/api/guidelines", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          updatedBy: "admin",
          guidelines: nextSystem
        }),
        credentials: "same-origin"
      });

      const json = (await response.json()) as {
        ok?: boolean;
        error?: string;
        version?: string;
        guidelines?: GuidelineSystem;
      };

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

        return false;
      }

      if (json.guidelines) {
        const savedSystem = normalizeGuidelineSystem(json.guidelines);
        setSystem(savedSystem);
        setSelectedCategoryId(
          nextSelectedCategoryId && savedSystem.categories.some((category) => category.id === nextSelectedCategoryId)
            ? nextSelectedCategoryId
            : ""
        );
      }

      await loadFromRedisAfterSave();
      setLastSavedAt(json.version || new Date().toISOString());
      setStatus(successMessage);
      setSaveState("saved");
      window.setTimeout(() => setSaveState((current) => (current === "saved" ? "idle" : current)), 2000);
      return true;
    } catch (error) {
      console.error("[guidelines] Save threw an error", error);
      setStatus(error instanceof Error ? error.message : "Could not save guidelines.");
      setSaveState("error");
      return false;
    }
  }

  async function loadFromRedisAfterSave(): Promise<void> {
    const guidelineResponse = await fetch("/api/guidelines", { cache: "no-store" });
    const savedSystem = normalizeGuidelineSystem(await guidelineResponse.json());

    setSystem(savedSystem);
    setStorage(guidelineResponse.headers.get("X-Samplas-Storage") || storage);
    await loadHistorySafely();
  }

  async function loadHistorySafely(): Promise<void> {
    try {
      const response = await fetch("/api/guidelines/history", { cache: "no-store" });
      const nextHistory = normalizeHistory(await response.json());
      setHistory(nextHistory);
      setLastSavedAt(nextHistory[0]?.version || "");
    } catch (error) {
      console.error("[guidelines] History load failed", error);
    }
  }

  function selectCategory(categoryId: string): void {
    setSelectedCategoryId(categoryId);
    setReferenceMode(false);
  }

  async function addCategory(): Promise<void> {
    const names = Array.from(
      new Set(
        newCategoryName
          .split(/[\n,]/)
          .map((name) => name.trim())
          .filter(Boolean)
      )
    );

    if (names.length === 0) {
      setModalStatus("카테고리 이름을 입력해주세요.");
      return;
    }

    const existingKeys = new Set(system.categories.map((category) => normalizeMatchKey(category.name)));
    const nextCategories = [...system.categories];
    const createdCategories: GuidelineCategory[] = [];

    for (const name of names) {
      const key = normalizeMatchKey(name);

      if (existingKeys.has(key)) {
        continue;
      }

      const category = createCategory(name);
      existingKeys.add(key);
      nextCategories.push(category);
      createdCategories.push(category);
    }

    if (createdCategories.length === 0) {
      setModalStatus("이미 있는 카테고리입니다.");
      return;
    }

    const nextSelectedCategoryId = createdCategories[createdCategories.length - 1].id;
    const nextSystem = normalizeGuidelineSystem({
      ...system,
      activeCategoryId: nextSelectedCategoryId,
      categories: nextCategories
    });

    setSystem(nextSystem);
    setSelectedCategoryId(nextSelectedCategoryId);
    setNewCategoryName("");
    setModalStatus("저장 중...");

    const didSave = await persistSystem(nextSystem, nextSelectedCategoryId, "Category added.");
    setModalStatus(didSave ? `${createdCategories.length}개 카테고리를 추가했습니다.` : "저장하지 못했습니다.");
  }

  function updateRule(key: GuidelineRuleKey, value: string): void {
    updateSelectedCategory((category) => ({
      ...category,
      rules: {
        ...category.rules,
        [key]: toRules(value)
      }
    }));
  }

  function addReference(): void {
    const reference: ReferenceEntry = {
      id: `reference-${Date.now()}`,
      title: "",
      url: "",
      note: ""
    };

    updateSelectedCategory((category) => ({
      ...category,
      references: [reference, ...category.references]
    }));
    setReferenceMode(true);
  }

  function updateReference(id: string, key: keyof Omit<ReferenceEntry, "id">, value: string): void {
    updateSelectedCategory((category) => ({
      ...category,
      references: category.references.map((reference) => (reference.id === id ? { ...reference, [key]: value } : reference))
    }));
  }

  function deleteReference(id: string): void {
    updateSelectedCategory((category) => ({
      ...category,
      references: category.references.filter((reference) => reference.id !== id)
    }));
  }

  function copyCategoryContent(): void {
    if (!selectedCategory) {
      setStatus("Choose a category first.");
      return;
    }

    setCopiedCategory({
      name: selectedCategory.name,
      rules: cloneRules(selectedCategory.rules),
      references: cloneReferences(selectedCategory.references)
    });
    setStatus(`Copied ${selectedCategory.name}.`);
  }

  async function pasteCategoryContent(): Promise<void> {
    if (!selectedCategory || !copiedCategory) {
      setStatus("Choose a category and copy content first.");
      return;
    }

    const nextCategories = system.categories.map((category) =>
      category.id === selectedCategory.id
        ? {
            ...category,
            rules: cloneRules(copiedCategory.rules),
            references: cloneReferences(copiedCategory.references)
          }
        : category
    );
    const nextSystem = normalizeGuidelineSystem({
      ...system,
      activeCategoryId: selectedCategory.id,
      categories: nextCategories
    });

    setSystem(nextSystem);
    await persistSystem(nextSystem, selectedCategory.id, `Pasted ${copiedCategory.name} into ${selectedCategory.name}.`);
  }

  function requestDeleteCategory(): void {
    if (!selectedCategory) {
      setStatus("Choose a category first.");
      return;
    }

    if (system.categories.length <= 1) {
      setStatus("At least one category is required.");
      setSaveState("error");
      return;
    }

    setIsDeleteModalOpen(true);
  }

  async function confirmDeleteCategory(): Promise<void> {
    if (!selectedCategory) {
      setIsDeleteModalOpen(false);
      return;
    }

    const nextCategories = system.categories.filter((category) => category.id !== selectedCategory.id);
    const nextSystem = normalizeGuidelineSystem({
      ...system,
      activeCategoryId: nextCategories[0]?.id || "category",
      categories: nextCategories
    });

    setIsDeleteModalOpen(false);
    setSystem(nextSystem);
    setReferenceMode(false);
    await persistSystem(nextSystem, "", "Category deleted.");
  }

  function updateSelectedCategory(updater: (category: GuidelineCategory) => GuidelineCategory): void {
    if (!selectedCategoryId) {
      return;
    }

    setSystem((current) => ({
      ...current,
      categories: current.categories.map((category) => (category.id === selectedCategoryId ? updater(category) : category))
    }));
    markDirty();
  }

  function markDirty(): void {
    setSaveState("dirty");
    setStatus("Unsaved changes");
  }

  function restoreSelectedVersion(): void {
    const entry = history.find((item) => item.version === selectedVersion);

    if (!entry) {
      setStatus("Choose a previous version first.");
      return;
    }

    const restoredSystem = normalizeGuidelineSystem(entry.guidelines);
    setSystem(restoredSystem);
    setSelectedCategoryId(restoredSystem.activeCategoryId);
    setReferenceMode(false);
    setSaveState("dirty");
    setStatus("Previous version loaded. Click Save to make it active.");
  }

  const saveButtonClassName = `button save-button${saveState === "saved" ? " saved" : ""}${saveState === "error" ? " error" : ""}`;
  const saveButtonLabel = saveState === "saved" ? "✓ Saved" : saveState === "saving" ? "Saving..." : "Save";
  const statusLabel =
    saveState === "dirty" ? "Unsaved Changes" : saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : status;

  return (
    <div className="editorial-workspace">
      <section className="system-strip" aria-label="Operational status">
        <StatusItem label="Storage" value={storage} />
        <StatusItem label="Categories" value={String(system.categories.length)} />
        <StatusItem label="Brands" value={String(brandCount)} />
        <StatusItem label="Feedback" value={String(feedbackCount)} />
        <StatusItem label="Updated" value={formatDateTime(lastSavedAt)} />
      </section>

      <section className="guideline-topline">
        <div className="category-selector-panel">
          <div className="field">
            <label htmlFor="guidelineCategory">Content Category / 콘텐츠 카테고리</label>
            <select id="guidelineCategory" value={selectedCategoryId} onChange={(event) => selectCategory(event.target.value)}>
              <option value="">카테고리 선택</option>
              {system.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <button className="button secondary" onClick={() => setIsAddModalOpen(true)} type="button">
            Add
          </button>
        </div>

        {selectedCategory ? (
          <div className="save-console">
            <div>
              <p className="eyebrow">Save State</p>
              <h2>{statusLabel}</h2>
              <p>Last Saved: {formatDateTime(lastSavedAt)}</p>
            </div>
          </div>
        ) : null}

        {selectedCategory ? (
          <div className="button-row guideline-actions">
            <button className={saveButtonClassName} disabled={saveState === "saving"} onClick={save} type="button">
              {saveButtonLabel}
            </button>
            <button className="button secondary" disabled={saveState === "saving"} onClick={copyCategoryContent} type="button">
              Copy
            </button>
            <button className="button secondary" disabled={saveState === "saving" || !copiedCategory} onClick={pasteCategoryContent} type="button">
              Paste
            </button>
            <button className="button secondary" disabled={saveState === "saving"} onClick={requestDeleteCategory} type="button">
              Delete
            </button>
          </div>
        ) : null}
      </section>

      {selectedCategory ? referenceMode ? (
        <ReferenceTable
          categoryName={selectedCategory?.name || "Category"}
          onAddReference={addReference}
          onBack={() => setReferenceMode(false)}
          onDeleteReference={deleteReference}
          onUpdateReference={updateReference}
          references={selectedCategory?.references || []}
        />
      ) : (
        <section className="guideline-board">
          {sections.map((section, index) => (
            <article className="guideline-row" key={section.key}>
              <div className="guideline-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="guideline-meta">
                <h2>{section.label}</h2>
                <p>{section.description}</p>
              </div>
              {section.key === "references" ? (
                <div className="guideline-insert">
                  <button className="button secondary" onClick={() => setReferenceMode(true)} type="button">
                    Insert
                  </button>
                </div>
              ) : (
                <div className="field guideline-field">
                  <label htmlFor={section.key}>Current Rules</label>
                  <textarea
                    id={section.key}
                    spellCheck={false}
                    value={selectedDrafts[section.key as GuidelineRuleKey]}
                    onChange={(event) => updateRule(section.key as GuidelineRuleKey, event.target.value)}
                  />
                </div>
              )}
            </article>
          ))}
        </section>
      ) : null}

      {selectedCategory ? (
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
            Restore
          </button>
          {status ? <div className={`status-message ${saveState === "error" ? "error" : ""}`}>{status}</div> : null}
        </section>
      ) : null}

      {isAddModalOpen ? (
        <CategoryModal
          disabled={saveState === "saving"}
          modalStatus={modalStatus}
          newCategoryName={newCategoryName}
          onAddCategory={addCategory}
          onChangeName={setNewCategoryName}
          onClose={() => {
            setIsAddModalOpen(false);
            setModalStatus("");
            setNewCategoryName("");
          }}
        />
      ) : null}

      {isDeleteModalOpen ? (
        <ConfirmModal
          disabled={saveState === "saving"}
          message="카테고리 내용을 삭제하시겠습니까?"
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDeleteCategory}
        />
      ) : null}
    </div>
  );
}

function CategoryModal({
  disabled,
  modalStatus,
  newCategoryName,
  onAddCategory,
  onChangeName,
  onClose
}: {
  disabled: boolean;
  modalStatus: string;
  newCategoryName: string;
  onAddCategory: () => Promise<void>;
  onChangeName: (value: string) => void;
  onClose: () => void;
}): ReactElement {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label="Add content category">
        <header>
          <div>
            <p className="eyebrow">Content Category</p>
            <h2>카테고리 추가</h2>
          </div>
          <button className="button secondary" onClick={onClose} type="button">
            X
          </button>
        </header>
        <div className="field">
          <label htmlFor="newCategoryName">Category Name</label>
          <textarea
            id="newCategoryName"
            onChange={(event) => onChangeName(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void onAddCategory();
              }
            }}
            placeholder="한 줄에 하나씩 입력하거나 쉼표로 구분"
            value={newCategoryName}
          />
        </div>
        <div className="button-row split-row">
          <button className="button" disabled={disabled} onClick={() => void onAddCategory()} type="button">
            Add
          </button>
          <span className="status-note">{modalStatus || "추가 후에도 창은 열린 상태로 유지됩니다."}</span>
        </div>
      </section>
    </div>
  );
}

function ConfirmModal({
  disabled,
  message,
  onCancel,
  onConfirm
}: {
  disabled: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}): ReactElement {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel compact" role="dialog" aria-modal="true" aria-label="Confirm category deletion">
        <header>
          <h2>{message}</h2>
          <button className="button secondary" onClick={onCancel} type="button">
            X
          </button>
        </header>
        <div className="button-row">
          <button className="button" disabled={disabled} onClick={() => void onConfirm()} type="button">
            Delete
          </button>
          <button className="button secondary" disabled={disabled} onClick={onCancel} type="button">
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}

function ReferenceTable({
  categoryName,
  onAddReference,
  onBack,
  onDeleteReference,
  onUpdateReference,
  references
}: {
  categoryName: string;
  onAddReference: () => void;
  onBack: () => void;
  onDeleteReference: (id: string) => void;
  onUpdateReference: (id: string, key: keyof Omit<ReferenceEntry, "id">, value: string) => void;
  references: ReferenceEntry[];
}): ReactElement {
  return (
    <section className="reference-frame">
      <header>
        <div>
          <p className="eyebrow">Reference / {categoryName}</p>
          <h2>Reference Table</h2>
        </div>
        <div className="button-row">
          <button className="button secondary" onClick={onBack} type="button">
            Back
          </button>
          <button className="button" onClick={onAddReference} type="button">
            Add Reference
          </button>
        </div>
      </header>

      <div className="reference-table">
        {references.length ? (
          references.map((reference, index) => (
            <article className="reference-row" key={reference.id}>
              <strong>{references.length - index}</strong>
              <div className="reference-meta-fields">
                <input
                  aria-label="Reference title"
                  onChange={(event) => onUpdateReference(reference.id, "title", event.target.value)}
                  placeholder="Title"
                  value={reference.title}
                />
                <input
                  aria-label="Reference URL"
                  onChange={(event) => onUpdateReference(reference.id, "url", event.target.value)}
                  placeholder="URL"
                  value={reference.url}
                />
              </div>
              <textarea
                aria-label="Reference note"
                onChange={(event) => onUpdateReference(reference.id, "note", event.target.value)}
                placeholder="Reference note"
                value={reference.note}
              />
              <button className="button secondary" onClick={() => onDeleteReference(reference.id)} type="button">
                Delete
              </button>
            </article>
          ))
        ) : (
          <div className="reference-empty">No references yet. Add one to connect source material to this content category.</div>
        )}
      </div>
    </section>
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

function normalizeGuidelineSystem(input: unknown): GuidelineSystem {
  const source = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const rawCategories = Array.isArray(source.categories) ? source.categories : [];
  const categories = rawCategories.length
    ? normalizeCategories(rawCategories)
    : [createCategory(String(source.activeCategory || source.categoryName || "Category"), normalizeRuleMap(source), [])];
  const normalizedCategories = categories.length ? categories : [createCategory("Category")];
  const activeCategoryId =
    typeof source.activeCategoryId === "string" && normalizedCategories.some((category) => category.id === source.activeCategoryId)
      ? source.activeCategoryId
      : normalizedCategories[0].id;

  return {
    version: 2,
    activeCategoryId,
    categories: normalizedCategories
  };
}

function normalizeCategories(input: unknown[]): GuidelineCategory[] {
  const seen = new Set<string>();
  const categories: GuidelineCategory[] = [];

  for (const item of input) {
    const category = normalizeCategory(item);
    const key = normalizeMatchKey(category.name);

    if (!category.name || seen.has(key)) {
      continue;
    }

    seen.add(key);
    categories.push(category);
  }

  return categories;
}

function normalizeCategory(input: unknown): GuidelineCategory {
  const source = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const name = String(source.name || source.categoryName || "Category").trim() || "Category";

  return {
    id: String(source.id || toCategoryId(name)).trim() || toCategoryId(name),
    name,
    rules: normalizeRuleMap(source.rules || source),
    references: normalizeReferences(source.references)
  };
}

function createCategory(name = "Category", rules = createEmptyRules(), references: ReferenceEntry[] = []): GuidelineCategory {
  const categoryName = name.trim() || "Category";

  return {
    id: toCategoryId(categoryName),
    name: categoryName,
    rules: normalizeRuleMap(rules),
    references: normalizeReferences(references)
  };
}

function createEmptySystem(): GuidelineSystem {
  return {
    version: 2,
    activeCategoryId: "category",
    categories: [createCategory("Category")]
  };
}

function createEmptyRules(): RuleMap {
  return ruleSections.reduce((rules, section) => {
    rules[section.key] = [];
    return rules;
  }, {} as RuleMap);
}

function normalizeRuleMap(input: unknown): RuleMap {
  const source = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};

  return ruleSections.reduce((rules, section) => {
    rules[section.key] = Array.isArray(source[section.key])
      ? (source[section.key] as unknown[]).map((item) => String(item).trim()).filter(Boolean)
      : [];
    return rules;
  }, {} as RuleMap);
}

function normalizeReferences(input: unknown): ReferenceEntry[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item, index) => {
      const source = item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : {};

      return {
        id: String(source.id || `reference-${index + 1}`),
        title: String(source.title || ""),
        url: String(source.url || ""),
        note: String(source.note || source.text || "")
      };
    })
    .filter((reference) => reference.title || reference.url || reference.note);
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
        guidelines: normalizeGuidelineSystem(source.guidelines)
      };
    })
    .filter((item): item is HistoryEntry => Boolean(item));
}

function rulesToDrafts(rules: RuleMap): RuleDrafts {
  return ruleSections.reduce((drafts, section) => {
    drafts[section.key] = rules[section.key].join("\n");
    return drafts;
  }, {} as RuleDrafts);
}

function cloneRules(rules: RuleMap): RuleMap {
  return ruleSections.reduce((drafts, section) => {
    drafts[section.key] = [...(rules[section.key] || [])];
    return drafts;
  }, {} as RuleMap);
}

function cloneReferences(references: ReferenceEntry[]): ReferenceEntry[] {
  return references.map((reference, index) => ({
    ...reference,
    id: `reference-${Date.now()}-${index}`
  }));
}

function toRules(value: string): string[] {
  return Array.from(new Set(value.split("\n").map((rule) => rule.trim()).filter(Boolean)));
}

function toCategoryId(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9가-힣-]+/gi, "")
      .replace(/^-+|-+$/g, "") || "category"
  );
}

function normalizeMatchKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/[^a-z0-9가-힣]+/gi, "");
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
