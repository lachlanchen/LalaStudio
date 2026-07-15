import { FilePlus2, Search, Sparkles } from "lucide-react";
import type { StorySummary } from "../types";

interface Props {
  stories: StorySummary[];
  selectedId: string | null;
  query: string;
  onQuery: (query: string) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

const statusLabel = { draft: "Draft", prompted: "Prompted", generated: "Video" };

export function LibraryPanel({ stories, selectedId, query, onQuery, onSelect, onCreate }: Props) {
  const filtered = stories.filter((story) =>
    `${story.title} ${story.summary} ${story.id}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <aside className="library-panel" aria-label="Story library" data-testid="story-library">
      <div className="library-heading">
        <div>
          <span className="eyebrow">Library</span>
          <h2>Stories</h2>
        </div>
        <button className="icon-button" onClick={onCreate} title="Create story" aria-label="Create story">
          <FilePlus2 size={18} />
        </button>
      </div>
      <label className="search-field">
        <Search size={16} />
        <input data-testid="story-search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search stories" />
      </label>
      <div className="library-count">
        <span>{filtered.length} documents</span>
        <button className="text-button compact" onClick={onCreate}>
          <Sparkles size={14} /> New idea
        </button>
      </div>
      <div className="story-list">
        {filtered.map((story) => (
          <button
            key={story.id}
            data-testid="story-row"
            data-story-id={story.id}
            data-story-title={story.title}
            className={`story-row ${story.id === selectedId ? "selected" : ""}`}
            onClick={() => onSelect(story.id)}
          >
            <div className="story-row-top">
              <span className={`status-dot ${story.status}`} />
              <strong>{story.title}</strong>
              <span className="quality-mini">{story.qualityScore}</span>
            </div>
            <p>{story.summary}</p>
            <div className="story-meta">
              <span>{statusLabel[story.status]}</span>
              <span>{story.duration ? `${story.duration}s` : "Flexible"}</span>
              <span>{new Date(story.updatedAt).toLocaleDateString()}</span>
            </div>
          </button>
        ))}
        {!filtered.length && <div className="empty-list">No stories match this search.</div>}
      </div>
    </aside>
  );
}
