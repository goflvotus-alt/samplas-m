"use client";

import type { ReactElement } from "react";
import { useState } from "react";

type GenerateResult = {
  postCaption?: string;
  cards?: Array<{
    format: string;
    title: string;
    body: string;
    caption: string;
    category: string;
    backgroundColor: string;
    overlayOpacity: number;
  }>;
  error?: string;
  details?: string;
};

export default function TestGenerationForm(): ReactElement {
  const [topic, setTopic] = useState("뉴 시즌 에디토리얼 카드뉴스");
  const [mood, setMood] = useState("차분하고 편집적인 톤");
  const [format, setFormat] = useState("cover");
  const [slideCount, setSlideCount] = useState(3);
  const [brand, setBrand] = useState("Sample Brand");
  const [draftText, setDraftText] = useState("제품, 사진, 전시, 브랜드 맥락을 바탕으로 카드뉴스를 구성한다.");
  const [feedback, setFeedback] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate(): Promise<void> {
    setLoading(true);
    setStatus("Generating...");
    setResult(null);

    try {
      const feedbackNote = feedback.trim() ? `\n\nFeedback to apply: ${feedback.trim()}` : "";
      const pages = Array.from({ length: slideCount }, (_, index) => ({
        pageNumber: index + 1,
        format,
        category: brand,
        title: topic,
        text: `${draftText}${feedbackNote}`.trim(),
        imageFocus: "center",
        hasImage: false,
        imageName: ""
      }));

      const response = await fetch("/api/generate-card-news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          postCaption: topic,
          mood,
          pages
        })
      });

      const json = (await response.json()) as GenerateResult;
      setResult(json);
      setStatus(response.ok ? "Generated." : "Generation failed.");
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : "Request failed."
      });
      setStatus("Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveFeedback(): Promise<void> {
    setStatus("Saving feedback...");

    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        originalInput: { topic, mood, format, slideCount, brand, draftText },
        generatedOutput: result,
        feedback,
        status: "new"
      })
    });

    setStatus(response.ok ? "Feedback saved." : "Feedback storage is not connected yet.");
  }

  return (
    <div className="grid two">
      <section className="card">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="topic">Topic</label>
            <input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="mood">Mood</label>
            <input id="mood" value={mood} onChange={(event) => setMood(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="format">Format</label>
            <select id="format" value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="cover">cover</option>
              <option value="story">story</option>
              <option value="information">information</option>
              <option value="quote">quote</option>
              <option value="closing">closing</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="slideCount">Number of Slides</label>
            <input
              id="slideCount"
              max={10}
              min={1}
              type="number"
              value={slideCount}
              onChange={(event) => setSlideCount(Math.max(1, Math.min(10, Number(event.target.value) || 1)))}
            />
          </div>
          <div className="field">
            <label htmlFor="brand">Brand</label>
            <input id="brand" value={brand} onChange={(event) => setBrand(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="draftText">Draft Text</label>
            <textarea id="draftText" value={draftText} onChange={(event) => setDraftText(event.target.value)} />
          </div>
          <button className="button" disabled={loading} onClick={generate} type="button">
            Generate Test
          </button>
          {status ? <p>{status}</p> : null}
        </div>
      </section>

      <section className="card">
        <h2>Result</h2>
        {result?.postCaption ? (
          <section className="section">
            <h3>Post Caption</h3>
            <p>{result.postCaption}</p>
          </section>
        ) : null}
        {result?.cards ? (
          <section className="section">
            <h3>Card List</h3>
            <ul className="rule-list">
              {result.cards.map((card, index) => (
                <li key={`${card.title}-${index}`}>
                  {index + 1}. {card.title}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section className="section">
          <h3>Raw JSON</h3>
          <pre className="result-box">{result ? JSON.stringify(result, null, 2) : "No result yet."}</pre>
        </section>
        <section className="section">
          <h3>생성 결과는 어땠나요?</h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="feedback">Feedback</label>
              <textarea id="feedback" value={feedback} onChange={(event) => setFeedback(event.target.value)} />
            </div>
            <div className="button-row">
              <button className="button secondary" disabled={!result || !feedback} onClick={saveFeedback} type="button">
                Save Feedback
              </button>
              <button className="button secondary" disabled={loading} onClick={generate} type="button">
                Regenerate With Feedback
              </button>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
