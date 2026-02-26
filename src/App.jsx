import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";

// ─── Constants ───────────────────────────────────────────────────────────────

const FESTIVALS = [
  { id: "gottwood", name: "Gottwood", capacity: "8,000" },
  { id: "peep", name: "Peep Festival", capacity: "2,000" },
  { id: "soysambu", name: "Soysambu", capacity: "TBC" },
];

const CATEGORIES = [
  { id: "lighting", label: "Lighting", icon: "💡" },
  { id: "sound", label: "Sound", icon: "🔊" },
  { id: "design", label: "Design", icon: "🎨" },
  { id: "space", label: "Space & Layout", icon: "📐" },
  { id: "decor", label: "Decor", icon: "✨" },
  { id: "crowd_flow", label: "Crowd Flow", icon: "🌊" },
  { id: "power", label: "Power & Electrics", icon: "⚡" },
  { id: "staging", label: "Staging", icon: "🎭" },
  { id: "comms", label: "Comms & Signage", icon: "📡" },
  { id: "safety", label: "Safety", icon: "🦺" },
];

const DEFAULT_AREAS = {
  gottwood: [
    { id: "main-gate", name: "Main Gate", emoji: "🚪" },
    { id: "crew-campsite", name: "Crew Campsite", emoji: "🏕️" },
    { id: "general-campsite", name: "General Campsite", emoji: "⛺" },
    { id: "boutique-campsite", name: "Boutique Campsite", emoji: "✨" },
    { id: "campsite-traders", name: "Campsite Traders", emoji: "🛍️" },
    { id: "wellbeing", name: "Wellbeing", emoji: "🧘" },
    { id: "medical-welfare", name: "Medical & Welfare", emoji: "🦺" },
    { id: "woods-stage", name: "Woods Stage", emoji: "🌲" },
    { id: "top-woods", name: "Top Woods", emoji: "🌳" },
    { id: "woods-traders", name: "Woods Traders", emoji: "🛍️" },
    { id: "treehouse-stage", name: "Treehouse Stage", emoji: "🏡" },
    { id: "the-barn", name: "The Barn", emoji: "🎪" },
    { id: "boxford", name: "Boxford", emoji: "🎵" },
    { id: "captain-cabeza", name: "Captain Cabeza", emoji: "💀" },
    { id: "walled-garden", name: "Walled Garden", emoji: "🌿" },
    { id: "boneyard", name: "Boneyard", emoji: "🦴" },
    { id: "the-lawn", name: "The Lawn", emoji: "🟢" },
    { id: "trigon", name: "Trigon", emoji: "🔺" },
    { id: "rickies-disco", name: "Rickies Disco", emoji: "🪩" },
    { id: "the-lighthouse", name: "The Lighthouse", emoji: "🔦" },
    { id: "lakeside-traders", name: "Lakeside Traders", emoji: "🛍️" },
    { id: "cocktail-bar", name: "Cocktail Bar (old curve)", emoji: "🍸" },
    { id: "the-curve", name: "The Curve", emoji: "🌊" },
    { id: "lake", name: "Lake", emoji: "💧" },
    { id: "the-nest", name: "The Nest", emoji: "🪺" },
    { id: "site-general", name: "Site General", emoji: "📍" },
  ],
  peep: [
    { id: "main-stage", name: "Main Stage", emoji: "🎪" },
    { id: "stage-2", name: "Stage 2", emoji: "🎵" },
    { id: "bar-social", name: "Bar / Social", emoji: "🍺" },
    { id: "entrance", name: "Entrance / Gate", emoji: "🚪" },
    { id: "camping", name: "Camping Zone", emoji: "🏕️" },
  ],
  soysambu: [
    { id: "main-stage", name: "Main Stage", emoji: "🎪" },
    { id: "bar-social", name: "Bar / Social", emoji: "🍺" },
    { id: "entrance", name: "Entrance / Gate", emoji: "🚪" },
  ],
};

const CURRENT_YEAR = "2025";
const YEARS = ["2022", "2023", "2024", "2025", "2026"];

const RATING_OPTIONS = [
  { value: 5, label: "Excellent", color: "#00ff9d" },
  { value: 4, label: "Good", color: "#7fff7f" },
  { value: 3, label: "Average", color: "#ffd700" },
  { value: 2, label: "Needs Work", color: "#ff8c42" },
  { value: 1, label: "Poor", color: "#ff4444" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRatingColor(rating) {
  return RATING_OPTIONS.find(r => r.value === rating)?.color ?? "#555";
}

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SaveIndicator({ status }) {
  const configs = {
    idle: { text: "", color: "transparent" },
    saving: { text: "● saving...", color: "#888" },
    saved: { text: "✓ saved", color: "#00ff9d" },
    error: { text: "✗ error saving", color: "#ff4444" },
  };
  const cfg = configs[status] || configs.idle;
  return (
    <span style={{
      fontFamily: "'DM Mono', monospace",
      fontSize: 10,
      color: cfg.color,
      letterSpacing: "0.06em",
      transition: "color 0.3s",
    }}>
      {cfg.text}
    </span>
  );
}

function RatingDots({ rating, onChange }) {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {RATING_OPTIONS.map(r => (
        <button
          key={r.value}
          onClick={(e) => { e.stopPropagation(); onChange(r.value === rating ? null : r.value); }}
          title={r.label}
          style={{
            width: 13,
            height: 13,
            borderRadius: "50%",
            border: `2px solid ${rating === r.value ? r.color : "#3a3a3a"}`,
            background: rating === r.value ? r.color : "transparent",
            cursor: "pointer",
            transition: "all 0.15s",
            padding: 0,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

function CategoryCard({ cat, data, onSave, saveStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [local, setLocal] = useState({
    rating: data?.rating ?? null,
    worked_well: data?.worked_well ?? "",
    needs_improvement: data?.needs_improvement ?? "",
    notes: data?.notes ?? "",
  });

  // Sync if data changes from above (e.g. loaded from DB)
  useEffect(() => {
    setLocal({
      rating: data?.rating ?? null,
      worked_well: data?.worked_well ?? "",
      needs_improvement: data?.needs_improvement ?? "",
      notes: data?.notes ?? "",
    });
  }, [data]);

  const debouncedSave = useDebounce((patch) => onSave(patch), 800);

  const update = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    debouncedSave(next);
  };

  const ratingColor = local.rating ? getRatingColor(local.rating) : "#444";
  const hasContent = local.rating || local.worked_well || local.needs_improvement || local.notes;

  return (
    <div style={{
      background: "#161616",
      border: `1px solid ${expanded ? "#2a2a2a" : hasContent ? "#1e1e1e" : "#181818"}`,
      borderRadius: 8,
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 14px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#fff",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 15 }}>{cat.icon}</span>
        <span style={{
          flex: 1,
          fontFamily: "'DM Mono', monospace",
          fontSize: 12,
          letterSpacing: "0.05em",
          color: hasContent ? "#ccc" : "#555",
        }}>
          {cat.label}
        </span>

        <RatingDots rating={local.rating} onChange={(v) => update({ rating: v })} />

        {local.rating && (
          <span style={{
            fontSize: 10,
            color: ratingColor,
            fontFamily: "'DM Mono', monospace",
            minWidth: 65,
            textAlign: "right",
            marginLeft: 6,
          }}>
            {RATING_OPTIONS.find(r => r.value === local.rating)?.label}
          </span>
        )}

        <span style={{ color: "#333", fontSize: 10, marginLeft: 6 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: "0 14px 14px", display: "grid", gap: 10 }}>
          {saveStatus === "saving" || saveStatus === "saved" || saveStatus === "error" ? (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <SaveIndicator status={saveStatus} />
            </div>
          ) : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>✅ What Worked Well</label>
              <textarea
                value={local.worked_well}
                onChange={e => update({ worked_well: e.target.value })}
                placeholder="e.g. Great throw distance on wash lights..."
                style={taStyle("#0d2218")}
                rows={4}
              />
            </div>
            <div>
              <label style={labelStyle}>🔧 Needs Improvement</label>
              <textarea
                value={local.needs_improvement}
                onChange={e => update({ needs_improvement: e.target.value })}
                placeholder="e.g. Sub bass muddy after 3am..."
                style={taStyle("#2a1010")}
                rows={4}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>📝 Notes — Suppliers / Contacts / Ideas</label>
            <textarea
              value={local.notes}
              onChange={e => update({ notes: e.target.value })}
              placeholder="Supplier names, hire costs, measurements, ideas for next year..."
              style={taStyle("#101520")}
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontFamily: "'DM Mono', monospace",
  fontSize: 10,
  color: "#555",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 5,
};

const taStyle = (bg) => ({
  width: "100%",
  background: bg,
  border: "1px solid #222",
  borderRadius: 5,
  color: "#bbb",
  fontFamily: "'DM Mono', monospace",
  fontSize: 12,
  padding: "8px 10px",
  resize: "vertical",
  outline: "none",
  lineHeight: 1.6,
  boxSizing: "border-box",
});

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeFestival, setActiveFestival] = useState("peep");
  const [activeYear, setActiveYear] = useState(CURRENT_YEAR);
  const [areas, setAreas] = useState(DEFAULT_AREAS);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [reviewData, setReviewData] = useState({});
  const [saveStatuses, setSaveStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [newAreaName, setNewAreaName] = useState("");
  const [addingArea, setAddingArea] = useState(false);
  const [globalSave, setGlobalSave] = useState("idle");

  const festivalAreas = areas[activeFestival] ?? [];

  // Set default selected area when festival/year changes
  useEffect(() => {
    const fas = areas[activeFestival] ?? [];
    if (fas.length > 0) setSelectedAreaId(fas[0].id);
  }, [activeFestival]);

  // Load all reviews for this festival+year
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("festival", activeFestival)
        .eq("year", activeYear);

      if (!error && data) {
        const map = {};
        data.forEach(row => {
          if (!map[row.area_id]) map[row.area_id] = {};
          map[row.area_id][row.category_id] = {
            rating: row.rating,
            worked_well: row.worked_well,
            needs_improvement: row.needs_improvement,
            notes: row.notes,
          };
        });
        setReviewData(map);

        // Also sync any areas from DB not in local list
        const dbAreas = [...new Map(data.map(r => [r.area_id, { id: r.area_id, name: r.area_name, emoji: r.area_emoji || "📍" }])).values()];
        if (dbAreas.length > 0) {
          setAreas(prev => {
            const existing = prev[activeFestival] ?? DEFAULT_AREAS[activeFestival] ?? [];
            const existingIds = new Set(existing.map(a => a.id));
            const merged = [...existing, ...dbAreas.filter(a => !existingIds.has(a.id))];
            return { ...prev, [activeFestival]: merged };
          });
        }
      }
      setLoading(false);
    }
    load();
  }, [activeFestival, activeYear]);

  const handleSave = useCallback(async (areaId, catId, patch) => {
    const key = `${areaId}-${catId}`;
    setSaveStatuses(s => ({ ...s, [key]: "saving" }));
    setGlobalSave("saving");

    const area = (areas[activeFestival] ?? []).find(a => a.id === areaId);

    const { error } = await supabase.from("reviews").upsert({
      festival: activeFestival,
      year: activeYear,
      area_id: areaId,
      area_name: area?.name ?? areaId,
      area_emoji: area?.emoji ?? "📍",
      category_id: catId,
      rating: patch.rating,
      worked_well: patch.worked_well,
      needs_improvement: patch.needs_improvement,
      notes: patch.notes,
      updated_at: new Date().toISOString(),
    }, { onConflict: "festival,year,area_id,category_id" });

    const status = error ? "error" : "saved";
    setSaveStatuses(s => ({ ...s, [key]: status }));
    setGlobalSave(status);

    // Update local cache
    if (!error) {
      setReviewData(prev => ({
        ...prev,
        [areaId]: {
          ...(prev[areaId] ?? {}),
          [catId]: patch,
        },
      }));
    }

    setTimeout(() => {
      setSaveStatuses(s => ({ ...s, [key]: "idle" }));
      setGlobalSave("idle");
    }, 2000);
  }, [activeFestival, activeYear, areas]);

  const addArea = async () => {
    if (!newAreaName.trim()) return;
    const id = newAreaName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const newArea = { id, name: newAreaName.trim(), emoji: "📍" };
    setAreas(prev => ({
      ...prev,
      [activeFestival]: [...(prev[activeFestival] ?? []), newArea],
    }));
    setSelectedAreaId(id);
    setNewAreaName("");
    setAddingArea(false);
  };

  const selectedArea = festivalAreas.find(a => a.id === selectedAreaId);
  const areaReviews = reviewData[selectedAreaId] ?? {};
  const completedCats = CATEGORIES.filter(c => areaReviews[c.id]?.rating).length;

  // Area sidebar score
  function areaAvg(aId) {
    const r = reviewData[aId] ?? {};
    const rated = Object.values(r).filter(x => x?.rating);
    if (!rated.length) return null;
    return (rated.reduce((s, x) => s + x.rating, 0) / rated.length).toFixed(1);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", color: "#fff", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <header style={{
        borderBottom: "1px solid #1a1a1a",
        padding: "0 24px",
        height: 58,
        display: "flex",
        alignItems: "center",
        gap: 20,
        background: "#0a0a0a",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: "0.14em", lineHeight: 1 }}>
            FESTIVAL PRODUCTION REVIEW
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#3a3a3a", letterSpacing: "0.12em", marginTop: 2 }}>
            TECHNICAL DEBRIEF SYSTEM
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <SaveIndicator status={globalSave} />

        {/* Festival tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {FESTIVALS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFestival(f.id)}
              style={{
                padding: "5px 14px",
                borderRadius: 5,
                border: `1px solid ${activeFestival === f.id ? "#444" : "#1e1e1e"}`,
                background: activeFestival === f.id ? "#1e1e1e" : "transparent",
                color: activeFestival === f.id ? "#fff" : "#555",
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                cursor: "pointer",
                letterSpacing: "0.05em",
                transition: "all 0.15s",
              }}
            >
{f.id === "gottwood" 
  ? <img src="/Gottwood_Logo_White_TYPE.png" style={{height: 18, opacity: activeFestival === "gottwood" ? 1 : 0.4}} />
  : f.name
}            </button>
          ))}
        </div>

        {/* Year tabs */}
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#3a3a3a", letterSpacing: "0.1em", marginRight: 4 }}>YEAR</span>
          {YEARS.map(y => (
            <button key={y} onClick={() => setActiveYear(y)} style={{
              padding: "4px 10px",
              borderRadius: 4,
              border: `1px solid ${activeYear === y ? "#555" : "#1e1e1e"}`,
              background: activeYear === y ? "#222" : "transparent",
              color: activeYear === y ? "#fff" : "#444",
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              cursor: "pointer",
              transition: "all 0.15s",
            }}>{y}</button>
          ))}
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: 210,
          background: "#0f0f0f",
          borderRight: "1px solid #1a1a1a",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          flexShrink: 0,
        }}>
          <div style={{ padding: "14px 14px 6px", fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#3a3a3a", letterSpacing: "0.12em" }}>
            {activeFestival.toUpperCase()} · AREAS
          </div>

          {festivalAreas.map(area => {
            const avg = areaAvg(area.id);
            const avgColor = avg ? (avg >= 4 ? "#00ff9d" : avg >= 3 ? "#ffd700" : "#ff8c42") : null;
            const selected = selectedAreaId === area.id;
            return (
              <button
                key={area.id}
                onClick={() => setSelectedAreaId(area.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  background: selected ? "#191919" : "transparent",
                  border: "none",
                  borderLeft: `2px solid ${selected ? "#ffffff" : "transparent"}`,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  color: selected ? "#fff" : "#555",
                  transition: "all 0.12s",
                }}
              >
                <span style={{ fontSize: 13 }}>{area.emoji}</span>
                <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: selected ? 500 : 400 }}>{area.name}</span>
                {avg && <span style={{ fontSize: 10, color: avgColor, fontFamily: "'DM Mono', monospace" }}>{avg}</span>}
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          {addingArea ? (
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                autoFocus
                value={newAreaName}
                onChange={e => setNewAreaName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addArea(); if (e.key === "Escape") setAddingArea(false); }}
                placeholder="Area name..."
                style={{
                  background: "#1a1a1a", border: "1px solid #333", borderRadius: 4,
                  color: "#fff", padding: "6px 8px", fontFamily: "'DM Mono', monospace",
                  fontSize: 11, outline: "none", width: "100%", boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 5 }}>
                <button onClick={addArea} style={{ flex: 1, background: "#2a2a2a", border: "none", color: "#fff", borderRadius: 4, padding: "5px", fontSize: 11, cursor: "pointer" }}>Add</button>
                <button onClick={() => setAddingArea(false)} style={{ flex: 1, background: "transparent", border: "1px solid #2a2a2a", color: "#555", borderRadius: 4, padding: "5px", fontSize: 11, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingArea(true)}
              style={{
                margin: "8px 14px 14px",
                padding: "7px 10px",
                background: "transparent",
                border: "1px dashed #222",
                borderRadius: 6,
                color: "#3a3a3a",
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                cursor: "pointer",
                letterSpacing: "0.08em",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={e => { e.target.style.borderColor = "#444"; e.target.style.color = "#777"; }}
              onMouseLeave={e => { e.target.style.borderColor = "#222"; e.target.style.color = "#3a3a3a"; }}
            >
              + ADD AREA
            </button>
          )}
        </aside>

        {/* ── Main content ── */}
        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#333" }}>
              loading...
            </div>
          ) : selectedArea ? (
            <>
              {/* Area header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                <span style={{ fontSize: 22 }}>{selectedArea.emoji}</span>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, letterSpacing: "0.1em", margin: 0 }}>
                  {selectedArea.name}
                </h2>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#333" }}>
                  · {FESTIVALS.find(f => f.id === activeFestival)?.name} · {activeYear}
                </span>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#444" }}>
                    {completedCats}/{CATEGORIES.length}
                  </span>
                  <div style={{ height: 3, width: 80, background: "#1e1e1e", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${(completedCats / CATEGORIES.length) * 100}%`,
                      background: completedCats === CATEGORIES.length ? "#00ff9d" : "#fff",
                      transition: "width 0.4s",
                    }} />
                  </div>
                </div>
              </div>

              {/* Category cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {CATEGORIES.map(cat => (
                  <CategoryCard
                    key={`${selectedAreaId}-${cat.id}`}
                    cat={cat}
                    data={areaReviews[cat.id]}
                    onSave={(patch) => handleSave(selectedAreaId, cat.id, patch)}
                    saveStatus={saveStatuses[`${selectedAreaId}-${cat.id}`] ?? "idle"}
                  />
                ))}
              </div>

              {/* Snapshot strip */}
              <div style={{
                marginTop: 24, padding: "14px 16px",
                background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 8,
              }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#3a3a3a", letterSpacing: "0.12em", marginBottom: 12 }}>
                  AREA SNAPSHOT
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {CATEGORIES.map(cat => {
                    const r = areaReviews[cat.id];
                    const color = r?.rating ? getRatingColor(r.rating) : null;
                    return (
                      <div key={cat.id} style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "4px 10px",
                        background: "#141414",
                        border: `1px solid ${color ? color + "33" : "#1e1e1e"}`,
                        borderRadius: 4,
                      }}>
                        <span style={{ fontSize: 11 }}>{cat.icon}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: color ? "#bbb" : "#3a3a3a" }}>
                          {cat.label}
                        </span>
                        {color && <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#333" }}>
              select an area
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
