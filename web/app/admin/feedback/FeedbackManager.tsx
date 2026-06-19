"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";

type FeedbackStatus = "new" | "reviewed" | "useful" | "ignored";

type FeedbackEntry = {
  id: string;
  timestamp: string;
  originalInput: unknown;
  generatedOutput: unknown;
  feedback: string;
  status: FeedbackStatus;
};

const statusOptions: FeedbackStatus[] = ["new", "reviewed", "useful", "ignored"];

export default function FeedbackManager(): ReactElement {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [adminPassword, setAdminPassword] = useState("");
  const [storage, setStorage] = useState("unknown");
  const [message, setMessage] = useState("Loading feedback...");
  const [saving, setSaving] = useState(false);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
      const matchesSearch = !query || [entry.feedback, entry.status, entry.timestamp].join(" ").toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [entries, search, statusFilter]);

  const selectedEntry = entries.find((entry) => entry.id === selectedId) || filteredEntries[0] || null;

  useEffect(() => {
    const storedPassword = window.sessionStorage.getItem("samplas-admin-password") || "";
    setAdminPassword(storedPassword);
    void loadFeedback();
  }, []);

  async function loadFeedback(): Promise<void> {
    setMessage("Loading feedback...");

    try {
      const response = await fetch("/api/feedback", { cache: "no-store" });
      const json = (await response.json()) as FeedbackEntry[];
      const nextEntries = normalizeEntries(json);

      setEntries(nextEntries);
      setStorage(response.headers.get("X-Samplas-Storage") || "unknown");
      setSelectedId(nextEntries[0]?.id || "");
      setMessage(response.ok ? "Loaded." : "Could not load feedback.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load feedback.");
    }
  }

  async function updateStatus(id: string, status: FeedbackStatus): Promise<void> {
    setSaving(true);
    setMessage("Updating feedback...");
    window.sessionStorage.setItem("samplas-admin-password", adminPassword);

    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword
        },
        body: JSON.stringify({ status })
      });

      const json = (await response.json()) as { feedback?: FeedbackEntry[]; error?: string };

      if (!response.ok) {
        setMessage(json.error || "Could not update feedback.");
        return;
      }

      setEntries(normalizeEntries(json.feedback || []));
      setMessage("Updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update feedback.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    if (!window.confirm("Delete this feedback?")) {
      return;
    }

    setSaving(true);
    setMessage("Deleting feedback...");
    window.sessionStorage.setItem("samplas-admin-password", adminPassword);

    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-password": adminPassword
        }
      });

      const json = (await response.json()) as { feedback?: FeedbackEntry[]; error?: string };

      if (!response.ok) {
        setMessage(json.error || "Could not delete feedback.");
        return;
      }

      const nextEntries = normalizeEntries(json.feedback || []);
      setEntries(nextEntries);
      setSelectedId(nextEntries[0]?.id || "");
      setMessage("Deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete feedback.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid two">
      <section className="card">
        <div className="button-row split-row">
          <h2>Feedback List</h2>
          <span className="badge">{entries.length} entries</span>
        </div>

        <div className="field section">
          <label htmlFor="feedbackSearch">Search</label>
          <input id="feedbackSearch" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="statusFilter">Status</label>
          <select id="statusFilter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as FeedbackStatus | "all")}>
            <option value="all">all</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="entity-list section">
          {filteredEntries.map((entry) => (
            <button
              className={`entity-button${entry.id === selectedEntry?.id ? " active" : ""}`}
              key={entry.id}
              onClick={() => setSelectedId(entry.id)}
              type="button"
            >
              <strong>{entry.feedback}</strong>
              <span>{entry.status} · {new Date(entry.timestamp).toLocaleString()}</span>
            </button>
          ))}
        </div>

        <section className="section notice">Storage: {storage}</section>
      </section>

      <section className="card">
        {selectedEntry ? (
          <div className="form-grid">
            <div className="button-row split-row">
              <h2>Feedback Detail</h2>
              <span className="badge">{selectedEntry.status}</span>
            </div>

            <p>{selectedEntry.feedback}</p>

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
              <button className="button secondary" disabled={saving} onClick={() => updateStatus(selectedEntry.id, "reviewed")} type="button">
                Mark Reviewed
              </button>
              <button className="button" disabled={saving} onClick={() => updateStatus(selectedEntry.id, "useful")} type="button">
                Mark Useful
              </button>
              <button className="button secondary" disabled={saving} onClick={() => updateStatus(selectedEntry.id, "ignored")} type="button">
                Mark Ignored
              </button>
              <button className="button secondary" disabled={saving} onClick={() => deleteEntry(selectedEntry.id)} type="button">
                Delete
              </button>
            </div>

            <section className="section">
              <h3>Original Input</h3>
              <pre className="result-box">{JSON.stringify(selectedEntry.originalInput, null, 2)}</pre>
            </section>

            <section className="section">
              <h3>Generated Output</h3>
              <pre className="result-box">{JSON.stringify(selectedEntry.generatedOutput, null, 2)}</pre>
            </section>

            {message ? <p>{message}</p> : null}
          </div>
        ) : (
          <p>No feedback selected.</p>
        )}
      </section>
    </div>
  );
}

function normalizeEntries(input: unknown): FeedbackEntry[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((entry) => {
    const source = entry && typeof entry === "object" && !Array.isArray(entry) ? (entry as Record<string, unknown>) : {};

    return {
      id: String(source.id || ""),
      timestamp: String(source.timestamp || ""),
      originalInput: source.originalInput || {},
      generatedOutput: source.generatedOutput || {},
      feedback: String(source.feedback || ""),
      status: statusOptions.includes(source.status as FeedbackStatus) ? (source.status as FeedbackStatus) : "new"
    };
  });
}
