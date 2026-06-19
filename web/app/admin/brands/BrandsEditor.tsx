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
};

const emptyBrand: BrandEntry = {
  brandName: "",
  designer: "",
  keywords: [],
  description: "",
  comparableBrands: [],
  notes: []
};

export default function BrandsEditor(): ReactElement {
  const [brands, setBrands] = useState<BrandEntry[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [draft, setDraft] = useState<BrandEntry>(emptyBrand);
  const [search, setSearch] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [storage, setStorage] = useState("unknown");
  const [status, setStatus] = useState("Loading brands...");
  const [saving, setSaving] = useState(false);

  const filteredBrands = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return brands;
    }

    return brands.filter((brand) =>
      [brand.brandName, brand.designer, brand.description, ...brand.keywords]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [brands, search]);

  useEffect(() => {
    const storedPassword = window.sessionStorage.getItem("samplas-admin-password") || "";
    setAdminPassword(storedPassword);
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
    window.sessionStorage.setItem("samplas-admin-password", adminPassword);

    try {
      const method = selectedName ? "PUT" : "POST";
      const endpoint = selectedName ? `/api/brands/${encodeURIComponent(selectedName)}` : "/api/brands";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword
        },
        body: JSON.stringify(draft)
      });

      const json = (await response.json()) as { brands?: BrandEntry[]; error?: string };

      if (!response.ok) {
        setStatus(json.error || "Could not save brand.");
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
    window.sessionStorage.setItem("samplas-admin-password", adminPassword);

    try {
      const response = await fetch(`/api/brands/${encodeURIComponent(selectedName)}`, {
        method: "DELETE",
        headers: {
          "x-admin-password": adminPassword
        }
      });

      const json = (await response.json()) as { brands?: BrandEntry[]; error?: string };

      if (!response.ok) {
        setStatus(json.error || "Could not delete brand.");
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
      notes: key === "notes" ? toList(value) : current.notes
    }));
  }

  return (
    <div className="grid two">
      <section className="card">
        <div className="button-row split-row">
          <h2>Brand List</h2>
          <span className="badge">{brands.length} brands</span>
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
              <span>{brand.designer || "Designer not set"}</span>
            </button>
          ))}
        </div>

        <section className="section notice">Storage: {storage}</section>
      </section>

      <section className="card">
        <div className="form-grid">
          <div className="button-row split-row">
            <h2>{selectedName ? "Edit Brand" : "Add Brand"}</h2>
            <button className="button secondary" disabled={saving} onClick={createNewBrand} type="button">
              New
            </button>
          </div>

          <div className="field">
            <label htmlFor="brandName">Brand Name</label>
            <input id="brandName" value={draft.brandName} onChange={(event) => updateDraft("brandName", event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="designer">Designer</label>
            <input id="designer" value={draft.designer} onChange={(event) => updateDraft("designer", event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="keywords">Keywords</label>
            <textarea id="keywords" value={draft.keywords.join("\n")} onChange={(event) => updateDraft("keywords", event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="comparableBrands">Comparable Brands</label>
            <textarea
              id="comparableBrands"
              value={draft.comparableBrands.join("\n")}
              onChange={(event) => updateDraft("comparableBrands", event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" value={draft.notes.join("\n")} onChange={(event) => updateDraft("notes", event.target.value)} />
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
            <button className="button" disabled={saving || !draft.brandName} onClick={saveBrand} type="button">
              Save
            </button>
            <button className="button secondary" disabled={saving || !selectedName} onClick={deleteSelectedBrand} type="button">
              Delete
            </button>
            <button className="button secondary" disabled={saving} onClick={loadBrands} type="button">
              Reload
            </button>
          </div>

          {status ? <p>{status}</p> : null}
        </div>
      </section>
    </div>
  );
}

function normalizeBrands(input: unknown): BrandEntry[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((brand) => {
    const source = brand && typeof brand === "object" && !Array.isArray(brand) ? (brand as Record<string, unknown>) : {};

    return {
      brandName: String(source.brandName || ""),
      designer: String(source.designer || ""),
      keywords: Array.isArray(source.keywords) ? source.keywords.map(String) : [],
      description: String(source.description || ""),
      comparableBrands: Array.isArray(source.comparableBrands) ? source.comparableBrands.map(String) : [],
      notes: Array.isArray(source.notes) ? source.notes.map(String) : []
    };
  });
}

function toList(value: string): string[] {
  return Array.from(new Set(value.split("\n").map((item) => item.trim()).filter(Boolean)));
}
