"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";

type BrandEntry = {
  brandName: string;
  designer: string;
  keywords: string[];
  description: string;
  comparableBrands: string[];
  notes: string[];
  brandImage: string;
};

const emptyBrand: BrandEntry = {
  brandName: "",
  designer: "",
  keywords: [],
  description: "",
  comparableBrands: [],
  notes: [],
  brandImage: ""
};

type ImportedBrand = {
  brandName: string;
  brandImage: string;
  description: string;
};

const LEGACY_BRAND_IMAGE_NOTE_PREFIX = "Brand Image:";

export default function BrandsEditor(): ReactElement {
  const [brands, setBrands] = useState<BrandEntry[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [draft, setDraft] = useState<BrandEntry>(emptyBrand);
  const [search, setSearch] = useState("");
  const [storage, setStorage] = useState("unknown");
  const [status, setStatus] = useState("Loading brands...");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const filteredBrands = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return brands;
    }

    return brands.filter((brand) =>
      [brand.brandName, brand.designer, brand.description, brand.brandImage, ...brand.keywords, ...brand.comparableBrands, ...brand.notes]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [brands, search]);

  useEffect(() => {
    void loadBrands();
  }, []);

  async function loadBrands(): Promise<void> {
    setStatus("Loading brands...");

    try {
      const response = await fetch("/api/brands", { cache: "no-store" });
      const json = (await response.json()) as BrandEntry[];
      const nextBrands = normalizeBrands(json);

      setBrands(nextBrands);
      setStorage(response.headers.get("X-Samplas-Storage") || "unknown");

      if (!selectedName && nextBrands[0]) {
        selectBrand(nextBrands[0]);
      }

      setStatus(response.ok ? "Loaded." : "Could not load brands.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load brands.");
    }
  }

  async function saveBrand(): Promise<void> {
    setSaving(true);
    setStatus("Saving brand...");

    try {
      const method = selectedName ? "PUT" : "POST";
      const endpoint = selectedName ? `/api/brands/${encodeURIComponent(selectedName)}` : "/api/brands";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(draft),
        credentials: "same-origin"
      });

      const json = (await response.json()) as { brands?: BrandEntry[]; error?: string };

      if (!response.ok) {
        setStatus(json.error || "Could not save brand.");

        if (response.status === 401) {
          window.location.href = "/login";
        }

        return;
      }

      const nextBrands = normalizeBrands(json.brands || []);
      setBrands(nextBrands);
      setSelectedName(draft.brandName);
      setStatus("Saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save brand.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelectedBrand(): Promise<void> {
    if (!selectedName) {
      setStatus("Choose a brand first.");
      return;
    }

    if (!window.confirm(`Delete ${selectedName}?`)) {
      return;
    }

    setSaving(true);
    setStatus("Deleting brand...");

    try {
      const response = await fetch(`/api/brands/${encodeURIComponent(selectedName)}`, {
        method: "DELETE",
        credentials: "same-origin"
      });

      const json = (await response.json()) as { brands?: BrandEntry[]; error?: string };

      if (!response.ok) {
        setStatus(json.error || "Could not delete brand.");

        if (response.status === 401) {
          window.location.href = "/login";
        }

        return;
      }

      const nextBrands = normalizeBrands(json.brands || []);
      setBrands(nextBrands);
      setSelectedName("");
      setDraft(emptyBrand);
      setStatus("Deleted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not delete brand.");
    } finally {
      setSaving(false);
    }
  }

  function selectBrand(brand: BrandEntry): void {
    setSelectedName(brand.brandName);
    setDraft(brand);
  }

  function createNewBrand(): void {
    setSelectedName("");
    setDraft(emptyBrand);
    setStatus("New brand.");
  }

  function updateDraft(key: keyof BrandEntry, value: string): void {
    setDraft((current) => ({
      ...current,
      brandName: key === "brandName" ? value : current.brandName,
      designer: key === "designer" ? value : current.designer,
      keywords: key === "keywords" ? toList(value) : current.keywords,
      description: key === "description" ? value : current.description,
      comparableBrands: key === "comparableBrands" ? toList(value) : current.comparableBrands,
      notes: key === "notes" ? toList(value) : current.notes,
      brandImage: key === "brandImage" ? value : current.brandImage
    }));
  }

  async function importSamplasBrands(): Promise<void> {
    setImporting(true);
    setStatus("SAMPLAS 브랜드를 불러오는 중...");

    try {
      const response = await fetch("/api/admin/import-samplas-brands", {
        cache: "no-store",
        credentials: "same-origin"
      });
      const json = (await response.json()) as { brands?: ImportedBrand[]; error?: string };

      if (!response.ok) {
        setStatus(json.error || "Could not import SAMPLAS brands.");

        if (response.status === 401) {
          window.location.href = "/login";
        }

        return;
      }

      const importedBrands = normalizeImportedBrands(json.brands || []);
      const existingKeys = new Set(brands.map((brand) => normalizeKey(brand.brandName)));
      const duplicateBrands = importedBrands.filter((brand) => existingKeys.has(normalizeKey(brand.brandName)));
      const shouldOverwrite =
        duplicateBrands.length > 0
          ? window.confirm(`이미 저장된 브랜드 ${duplicateBrands.length}개가 있습니다. 설명과 이미지 정보를 덮어쓸까요?`)
          : false;
      const brandsToSave = importedBrands.filter((brand) => shouldOverwrite || !existingKeys.has(normalizeKey(brand.brandName)));

      if (brandsToSave.length === 0) {
        setStatus("새로 저장할 브랜드가 없습니다.");
        return;
      }

      let nextBrands = brands;

      for (const importedBrand of brandsToSave) {
        const existingBrand = nextBrands.find((brand) => normalizeKey(brand.brandName) === normalizeKey(importedBrand.brandName));
        const responseForBrand = await fetch("/api/brands", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(
            {
              brandName: importedBrand.brandName,
              designer: existingBrand?.designer || "",
              keywords: existingBrand?.keywords || [],
              description: importedBrand.description || existingBrand?.description || "",
              comparableBrands: existingBrand?.comparableBrands || [],
              notes: existingBrand?.notes || [],
              brandImage: importedBrand.brandImage || existingBrand?.brandImage || ""
            }
          ),
          credentials: "same-origin"
        });
        const brandJson = (await responseForBrand.json()) as { brands?: BrandEntry[]; error?: string };

        if (!responseForBrand.ok) {
          setStatus(brandJson.error || `Could not save ${importedBrand.brandName}.`);

          if (responseForBrand.status === 401) {
            window.location.href = "/login";
          }

          return;
        }

        nextBrands = normalizeBrands(brandJson.brands || []);
      }

      setBrands(nextBrands);
      setStatus(`${brandsToSave.length}개 브랜드를 불러와 저장했습니다.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not import SAMPLAS brands.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="knowledge-layout">
      <section className="system-strip" aria-label="Brand status">
        <StatusItem label="Storage" value={storage} />
        <StatusItem label="Brands" value={String(brands.length)} />
        <StatusItem label="Visible" value={String(filteredBrands.length)} />
        <StatusItem label="Selected" value={selectedName || "-"} />
      </section>

      <div className="knowledge-grid">
        <section className="knowledge-index">
          <div className="button-row split-row">
            <div>
              <p className="eyebrow">Brand Knowledge Base</p>
              <h2>브랜드 인덱스</h2>
            </div>
            <div className="button-row">
              <button className="button secondary" disabled={saving || importing} onClick={importSamplasBrands} type="button">
                불러오기
              </button>
              <button className="button secondary" disabled={saving || importing} onClick={createNewBrand} type="button">
                New
              </button>
            </div>
          </div>

          <div className="field section">
            <label htmlFor="brandSelector">Brand Selector</label>
            <select
              id="brandSelector"
              value={selectedName}
              onChange={(event) => {
                const brand = brands.find((item) => item.brandName === event.target.value);

                if (brand) {
                  selectBrand(brand);
                } else {
                  createNewBrand();
                }
              }}
            >
              <option value="">브랜드 선택</option>
              {brands.map((brand) => (
                <option key={brand.brandName} value={brand.brandName}>
                  {brand.brandName}
                </option>
              ))}
            </select>
          </div>

          <div className="field section">
            <label htmlFor="brandSearch">Search</label>
            <input id="brandSearch" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          <div className="entity-list section">
            {filteredBrands.map((brand) => (
              <button
                className={`entity-button${brand.brandName === selectedName ? " active" : ""}`}
                key={brand.brandName}
                onClick={() => selectBrand(brand)}
                type="button"
              >
                <strong>{brand.brandName}</strong>
                <span>{brand.keywords.slice(0, 4).join(", ") || brand.designer || "No keywords"}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="knowledge-editor">
          <div className="button-row split-row">
            <div>
              <p className="eyebrow">{selectedName ? "Editing Brand" : "New Brand"}</p>
              <h2>{draft.brandName || "Untitled Brand"}</h2>
            </div>
            <span className="badge">{status}</span>
          </div>

          <div className="editorial-form">
            <div className="field">
              <label htmlFor="brandName">Brand Name</label>
              <input id="brandName" value={draft.brandName} onChange={(event) => updateDraft("brandName", event.target.value)} />
            </div>

            <div className="field">
              <label htmlFor="designer">Designer</label>
              <input id="designer" value={draft.designer} onChange={(event) => updateDraft("designer", event.target.value)} />
            </div>

            <div className="field field-wide brand-image-field">
              <label htmlFor="brandImage">Brand Image</label>
              <input id="brandImage" value={draft.brandImage} onChange={(event) => updateDraft("brandImage", event.target.value)} />
              {draft.brandImage ? <img src={draft.brandImage} alt={draft.brandName || "Brand image"} /> : null}
            </div>

            <div className="field field-wide">
              <label htmlFor="description">Description</label>
              <textarea id="description" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} />
            </div>

            <div className="field">
              <label htmlFor="keywords">Keywords</label>
              <textarea id="keywords" value={draft.keywords.join("\n")} onChange={(event) => updateDraft("keywords", event.target.value)} />
            </div>

            <div className="field">
              <label htmlFor="comparableBrands">Comparable Brands</label>
              <textarea
                id="comparableBrands"
                value={draft.comparableBrands.join("\n")}
                onChange={(event) => updateDraft("comparableBrands", event.target.value)}
              />
            </div>

            <div className="field field-wide">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" value={draft.notes.join("\n")} onChange={(event) => updateDraft("notes", event.target.value)} />
            </div>
          </div>

          <div className="button-row section">
            <button className="button" disabled={saving || !draft.brandName} onClick={saveBrand} type="button">
              Save Brand
            </button>
            <button className="button secondary" disabled={saving || !selectedName} onClick={deleteSelectedBrand} type="button">
              Delete
            </button>
            <button className="button secondary" disabled={saving} onClick={loadBrands} type="button">
              Reload
            </button>
          </div>
        </section>
      </div>
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

function normalizeBrands(input: unknown): BrandEntry[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((brand) => {
    const source = brand && typeof brand === "object" && !Array.isArray(brand) ? (brand as Record<string, unknown>) : {};
    const rawNotes = Array.isArray(source.notes) ? source.notes.map(String) : [];

    return {
      brandName: String(source.brandName || ""),
      designer: String(source.designer || ""),
      keywords: Array.isArray(source.keywords) ? source.keywords.map(String) : [],
      description: String(source.description || ""),
      comparableBrands: Array.isArray(source.comparableBrands) ? source.comparableBrands.map(String) : [],
      notes: rawNotes.filter((note) => !note.startsWith(LEGACY_BRAND_IMAGE_NOTE_PREFIX)),
      brandImage: String(source.brandImage || "").trim() || extractLegacyBrandImage(rawNotes)
    };
  });
}

function normalizeImportedBrands(input: unknown): ImportedBrand[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const seen = new Set<string>();
  const brands: ImportedBrand[] = [];

  for (const item of input) {
    const source = item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
    const brandName = String(source.brandName || "").trim();
    const key = normalizeKey(brandName);

    if (!brandName || seen.has(key)) {
      continue;
    }

    seen.add(key);
    brands.push({
      brandName,
      brandImage: String(source.brandImage || "").trim(),
      description: String(source.description || "").trim()
    });
  }

  return brands;
}

function extractLegacyBrandImage(notes: string[]): string {
  const imageNote = notes.find((note) => note.startsWith(LEGACY_BRAND_IMAGE_NOTE_PREFIX));

  return imageNote ? imageNote.slice(LEGACY_BRAND_IMAGE_NOTE_PREFIX.length).trim() : "";
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function toList(value: string): string[] {
  return Array.from(new Set(value.split("\n").map((item) => item.trim()).filter(Boolean)));
}
