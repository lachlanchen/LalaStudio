import { useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  Boxes,
  Check,
  CircleDot,
  GitBranch,
  History,
  Map,
  Plus,
  Save,
  Shirt,
  Sparkles,
  Users,
  Wrench
} from "lucide-react";
import type { StoryDocument, WorldDatabase, WorldStoryPlan } from "../types";

type EntitySection = "overview" | "characters" | "places" | "tools" | "outfits" | "arcs" | "topics" | "episodes" | "media";
type EditableCollection = "characters" | "places" | "tools" | "outfits" | "arcs" | "topics";

const sections: Array<{ id: EntitySection; label: string; icon: typeof Map }> = [
  { id: "overview", label: "Atlas", icon: Map },
  { id: "characters", label: "Cast", icon: Users },
  { id: "places", label: "Places", icon: CircleDot },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "outfits", label: "Clothes", icon: Shirt },
  { id: "arcs", label: "Threads", icon: GitBranch },
  { id: "topics", label: "Topics", icon: BookMarked },
  { id: "episodes", label: "Episodes", icon: Boxes },
  { id: "media", label: "Versions", icon: History }
];

interface Props {
  world: WorldDatabase;
  story: StoryDocument | null;
  saving: boolean;
  onUpdateEntity: (collection: EditableCollection, id: string, patch: Record<string, unknown>) => Promise<void>;
  onAddEntity: (collection: EditableCollection, entity: Record<string, unknown>) => Promise<void>;
  onCreateStory: (plan: WorldStoryPlan) => Promise<void>;
}

function lines(value: unknown): string {
  return Array.isArray(value) ? value.join("\n") : "";
}

function parseLines(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function defaultEntity(section: EditableCollection): Record<string, unknown> {
  const id = `${section.slice(0, -1)}-${Date.now()}`;
  if (section === "characters") return { id, name: "新角色", role: "", personality: "", voice: "", visualRules: [], relationshipNotes: [], defaultOutfitId: "", assetIds: [], status: "active" };
  if (section === "places") return { id, name: "新地点", role: "", summary: "", visualAnchors: [], recurringUses: [], connectedPlaceIds: [], status: "active" };
  if (section === "tools") return { id, name: "新工具", ownerIds: [], purpose: "", rule: "", limitation: "", assetIds: [], status: "active" };
  if (section === "outfits") return { id, name: "新服装", characterIds: [], use: "", visualRules: [], assetIds: [], version: 1, status: "active" };
  if (section === "arcs") return { id, name: "新线索", premise: "", audienceQuestion: "", knownClues: [], nextBeat: "", status: "open" };
  return { id, name: "新主题", promise: "" };
}

function entityName(entity: Record<string, unknown>): string {
  return String(entity.name || entity.id || "Untitled");
}

function EntityEditor({ section, entity, saving, onSave }: {
  section: EditableCollection;
  entity: Record<string, unknown>;
  saving: boolean;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(entity);
  useEffect(() => setDraft(entity), [entity]);
  const field = (key: string, label: string, multiline = false) => (
    <label className="world-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={String(draft[key] || "")} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
      ) : (
        <input value={String(draft[key] || "")} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
      )}
    </label>
  );
  const arrayField = (key: string, label: string) => (
    <label className="world-field">
      <span>{label}<small>one per line</small></span>
      <textarea value={lines(draft[key])} onChange={(event) => setDraft({ ...draft, [key]: parseLines(event.target.value) })} />
    </label>
  );

  return (
    <div className="world-entity-editor" data-testid="world-entity-editor">
      <div className="world-editor-heading">
        <div><span className="eyebrow">Canonical record</span><h2>{entityName(entity)}</h2></div>
        <button className="primary-button" disabled={saving} onClick={() => onSave(draft)}><Save size={15} /> Save version</button>
      </div>
      <div className="world-form-grid">
        {field("name", "Name")}
        {section === "characters" && field("role", "Story role")}
        {section === "characters" && field("personality", "Personality", true)}
        {section === "characters" && field("voice", "Speaking voice", true)}
        {section === "characters" && arrayField("visualRules", "Visual identity rules")}
        {section === "characters" && arrayField("relationshipNotes", "Relationships")}
        {section === "places" && field("role", "Narrative role")}
        {section === "places" && field("summary", "Place description", true)}
        {section === "places" && arrayField("visualAnchors", "Visual anchors")}
        {section === "places" && arrayField("recurringUses", "Recurring uses")}
        {section === "places" && arrayField("connectedPlaceIds", "Connected place IDs")}
        {section === "tools" && field("purpose", "Purpose", true)}
        {section === "tools" && field("rule", "Stable rule", true)}
        {section === "tools" && field("limitation", "Limitation", true)}
        {section === "tools" && arrayField("ownerIds", "Owner character IDs")}
        {section === "outfits" && field("use", "When it is worn", true)}
        {section === "outfits" && arrayField("characterIds", "Character IDs")}
        {section === "outfits" && arrayField("visualRules", "Visual rules")}
        {section === "arcs" && field("premise", "Premise", true)}
        {section === "arcs" && field("audienceQuestion", "Audience question", true)}
        {section === "arcs" && arrayField("knownClues", "Known clues")}
        {section === "arcs" && field("nextBeat", "Next usable beat", true)}
        {section === "topics" && field("promise", "Audience promise", true)}
      </div>
    </div>
  );
}

export function WorldWorkspace({ world, story, saving, onUpdateEntity, onAddEntity, onCreateStory }: Props) {
  const [section, setSection] = useState<EntitySection>("overview");
  const [selectedId, setSelectedId] = useState("");
  const [plan, setPlan] = useState<WorldStoryPlan>(() => ({
    title: "蓝尾纸鸟借走的路",
    duration: 15,
    idea: "在云港小屋，蓝尾纸鸟从拼皮笔记本里叼走一页地图。四个伙伴追到星桥，才发现它想用那页纸帮助一只困在断桥边的小云兽。伙伴们一起把路修好，纸鸟归还地图；页面却多出一座从未见过的蓝色灯塔。",
    characterIds: world.characters.filter((item) => item.status === "active").map((item) => item.id),
    placeIds: ["cloud-harbor-home", "star-bridge-market"],
    toolIds: ["patchwork-notebook", "zhuangzi-toolbay", "sasa-bamboo"],
    outfitIds: ["daily-raraxia-v1", "daily-ayachan-v1", "daily-sasakun-v1", "zhuangzi-shell-v1"],
    arcIds: ["fading-journey-marks"],
    topicIds: ["friendship", "craft", "mystery", "rara-aya"],
    hook: "归还的地图页上出现一座从未见过的无窗蓝灯塔。"
  }));

  const collection = section !== "overview" && section !== "episodes" && section !== "media" ? section as EditableCollection : null;
  const entities = collection ? world[collection] as unknown as Array<Record<string, unknown> & { id: string }> : [];
  useEffect(() => {
    if (collection && !entities.some((entity) => entity.id === selectedId)) setSelectedId(entities[0]?.id || "");
  }, [collection, entities, selectedId]);
  const selectedEntity = entities.find((entity) => entity.id === selectedId) || null;
  const currentEpisode = story ? world.episodes.find((episode) => episode.storyId === story.id) : null;
  const recentMedia = useMemo(() => [...world.media].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40), [world.media]);

  const toggle = (key: keyof Pick<WorldStoryPlan, "toolIds" | "topicIds">, id: string) => {
    const current = plan[key];
    setPlan({ ...plan, [key]: current.includes(id) ? current.filter((item) => item !== id) : [...current, id] });
  };

  return (
    <main className="world-workspace" data-testid="world-workspace">
      <section className="world-main">
        <header className="workspace-heading world-heading">
          <div><span className="eyebrow">Series bible · revision {world.revision}</span><h1>{world.name}</h1><p>{world.tagline}</p></div>
          <div className="world-current-story"><span>Current document</span><strong>{story?.title || "None"}</strong>{currentEpisode && <small>connected to {currentEpisode.arcIds.length} thread(s)</small>}</div>
        </header>
        <div className="world-tabs" role="tablist">
          {sections.map(({ id, label, icon: Icon }) => <button key={id} className={section === id ? "active" : ""} onClick={() => setSection(id)}><Icon size={15} />{label}</button>)}
        </div>

        <div className="world-content">
          {section === "overview" && (
            <div className="world-overview">
              <div className="world-premise"><span className="eyebrow">Series premise</span><p>{world.premise}</p></div>
              <div className="world-metrics">
                <div><strong>{world.characters.length}</strong><span>core cast</span></div>
                <div><strong>{world.places.length}</strong><span>recurring places</span></div>
                <div><strong>{world.arcs.filter((item) => item.status === "open").length}</strong><span>open threads</span></div>
                <div><strong>{world.media.length}</strong><span>versioned media</span></div>
              </div>
              <section className="world-band">
                <div className="world-band-heading"><div><span className="eyebrow">Connected atlas</span><h2>Places that feel familiar</h2></div><Map size={20} /></div>
                <div className="place-map">
                  {world.places.filter((item) => item.status === "active").map((place) => (
                    <article key={place.id}>
                      <div><strong>{place.name}</strong><span>{place.role}</span></div>
                      <p>{place.summary}</p>
                      <small>{place.connectedPlaceIds.map((id) => world.places.find((item) => item.id === id)?.name).filter(Boolean).join(" · ")}</small>
                    </article>
                  ))}
                </div>
              </section>
              <section className="world-band story-engine-band">
                <div className="world-band-heading"><div><span className="eyebrow">Connection engine</span><h2>Why another episode matters</h2></div><GitBranch size={20} /></div>
                <dl>
                  <div><dt>Episode</dt><dd>{world.storyEngine.episodePromise}</dd></div>
                  <div><dt>Continuity</dt><dd>{world.storyEngine.connectionRule}</dd></div>
                  <div><dt>Next question</dt><dd>{world.storyEngine.hookRule}</dd></div>
                </dl>
              </section>
            </div>
          )}

          {collection && (
            <div className="world-records">
              <aside className="world-record-list">
                <div className="world-list-heading"><span>{entities.length} records</span><button className="icon-button" title="Add record" onClick={() => onAddEntity(collection, defaultEntity(collection))}><Plus size={15} /></button></div>
                {entities.map((entity) => <button key={entity.id} className={selectedId === entity.id ? "selected" : ""} onClick={() => setSelectedId(entity.id)}><strong>{entityName(entity)}</strong><small>{entity.id}</small></button>)}
              </aside>
              {selectedEntity && <EntityEditor section={collection} entity={selectedEntity} saving={saving} onSave={(patch) => onUpdateEntity(collection, selectedEntity.id, patch)} />}
            </div>
          )}

          {section === "episodes" && (
            <div className="world-ledger">
              {world.episodes.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((episode) => (
                <article key={episode.storyId}>
                  <div className="ledger-status"><span className={`status-dot ${episode.status === "generated" ? "generated" : episode.status === "written" ? "prompted" : ""}`} /><strong>{episode.title}</strong><em>{episode.duration}s</em></div>
                  <p>{episode.continuityNote || episode.hook || "Self-contained episode"}</p>
                  <small>{activeNames(episode.placeIds, world.places).join(" · ")} {episode.arcIds.length ? `| ${activeNames(episode.arcIds, world.arcs).join(" · ")}` : ""}</small>
                </article>
              ))}
            </div>
          )}

          {section === "media" && (
            <div className="world-media-ledger">
              <div className="media-ledger-head"><span>Version</span><span>Role</span><span>Path</span><span>SHA-256</span></div>
              {recentMedia.map((media) => (
                <div key={media.id}>
                  <strong>v{media.version}</strong><span>{media.label}</span><code>{media.relativePath}</code><code>{media.sha256.slice(0, 12)}</code>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside className="world-planner">
        <div className="world-planner-heading"><div className="writer-icon"><Sparkles size={18} /></div><div><span className="eyebrow">Connected episode</span><h2>Plan today’s story</h2></div></div>
        <p className="planner-note">Resolve one visible problem. Reuse familiar canon. Leave only one small question for next time.</p>
        <label className="world-field"><span>Working title</span><input data-testid="world-plan-title" value={plan.title} onChange={(event) => setPlan({ ...plan, title: event.target.value })} /></label>
        <label className="world-field"><span>Core idea</span><textarea data-testid="world-plan-idea" className="large" value={plan.idea} onChange={(event) => setPlan({ ...plan, idea: event.target.value })} /></label>
        <label className="world-field"><span>Places</span><select data-testid="world-plan-place" multiple value={plan.placeIds} onChange={(event) => setPlan({ ...plan, placeIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>{world.places.filter((item) => item.status === "active").map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
        <label className="world-field"><span>Continuing thread</span><select data-testid="world-plan-arc" value={plan.arcIds[0] || ""} onChange={(event) => { const arc = world.arcs.find((item) => item.id === event.target.value); setPlan({ ...plan, arcIds: event.target.value ? [event.target.value] : [], hook: arc?.nextBeat || plan.hook }); }}><option value="">Self-contained</option>{world.arcs.filter((item) => item.status === "open").map((arc) => <option key={arc.id} value={arc.id}>{arc.name}</option>)}</select></label>
        <label className="world-field"><span>Last image / question</span><textarea data-testid="world-plan-hook" value={plan.hook} onChange={(event) => setPlan({ ...plan, hook: event.target.value })} /></label>
        <div className="world-choice-group"><span>Tools</span><div>{world.tools.filter((item) => item.status === "active").map((tool) => <label key={tool.id}><input type="checkbox" checked={plan.toolIds.includes(tool.id)} onChange={() => toggle("toolIds", tool.id)} />{tool.name}</label>)}</div></div>
        <div className="world-choice-group"><span>Topics</span><div>{world.topics.map((topic) => <label key={topic.id}><input type="checkbox" checked={plan.topicIds.includes(topic.id)} onChange={() => toggle("topicIds", topic.id)} />{topic.name}</label>)}</div></div>
        <div className="world-duration"><span>Duration</span><div className="segmented full">{[15, 30, 60].map((duration) => <button key={duration} data-testid={`world-plan-duration-${duration}`} className={plan.duration === duration ? "active" : ""} onClick={() => setPlan({ ...plan, duration })}>{duration}s</button>)}</div></div>
        <button className="primary-button full world-create" data-testid="world-create-story" disabled={saving || !plan.title.trim() || !plan.idea.trim() || !plan.placeIds.length} onClick={() => onCreateStory(plan)}>{saving ? <Check size={16} /> : <Plus size={16} />} Create connected story</button>
      </aside>
    </main>
  );
}

function activeNames<T extends { id: string; name: string }>(ids: string[], items: T[]): string[] {
  return ids.map((id) => items.find((item) => item.id === id)?.name).filter((name): name is string => Boolean(name));
}
