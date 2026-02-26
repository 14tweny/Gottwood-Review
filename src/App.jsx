import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";
import { GOTTWOOD_LOGO, PEEP_LOGO } from "./logos.js";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FESTIVALS = [
  { id: "gottwood", name: "Gottwood" },
  { id: "peep", name: "Peep Festival" },
  { id: "soysambu", name: "Soysambu" },
];

const ALL_CATEGORIES = [
  "Lighting", "Sound", "Design", "Space & Layout", "Decor",
  "Crowd Flow", "Power & Electrics", "Staging", "Comms & Signage", "Safety",
];

const DEFAULT_AREAS = {
  gottwood: [
    "Main Gate", "Crew Campsite", "General Campsite", "Boutique Campsite",
    "Campsite Traders", "Wellbeing", "Medical & Welfare", "Woods Stage",
    "Top Woods", "Woods Traders", "Treehouse Stage", "The Barn", "Boxford",
    "Captain Cabeza", "Walled Garden", "Boneyard", "The Lawn", "Trigon",
    "Rickies Disco", "The Lighthouse", "Lakeside Traders",
    "Cocktail Bar (old curve)", "The Curve", "Lake", "The Nest", "Site General",
  ],
  peep: ["Main Stage", "Stage 2", "Bar / Social", "Entrance / Gate", "Camping Zone"],
  soysambu: ["Main Stage", "Bar / Social", "Entrance / Gate"],
};

const YEARS = ["2022", "2023", "2024", "2025", "2026"];

const RATINGS = [
  { value: 1, label: "Poor",      color: "#ef4444" },
  { value: 2, label: "Needs Work",color: "#f97316" },
  { value: 3, label: "Average",   color: "#eab308" },
  { value: 4, label: "Good",      color: "#84cc16" },
  { value: 5, label: "Excellent", color: "#22c55e" },
];

function slugify(s) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function getRating(v) { return RATINGS.find(r => r.value === v); }

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useDebounce(fn, delay) {
  const t = useRef(null);
  return useCallback((...args) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Sans:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { background: #0c0c0e; color: #f0ede8; font-family: 'Instrument Sans', sans-serif; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
  button { font-family: inherit; } textarea, input { font-family: inherit; }

  .screen { animation: fadeUp 0.28s cubic-bezier(0.16,1,0.3,1) both; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

  .area-card { transition: background 0.15s, border-color 0.15s, transform 0.15s; }
  .area-card:hover { background: #1a1a1e !important; border-color: #333 !important; transform: translateY(-1px); }
  .area-card:active { transform: translateY(0); }

  .fest-btn { transition: all 0.15s; }
  .fest-btn:hover { border-color: #444 !important; }

  .rating-btn { transition: all 0.18s cubic-bezier(0.34,1.56,0.64,1); }
  .rating-btn:hover { transform: scale(1.08); }
  .rating-btn:active { transform: scale(0.95); }

  .cat-section { transition: background 0.15s; }
  .cat-section:hover { background: #161618 !important; }

  .back-btn { transition: all 0.15s; }
  .back-btn:hover { color: #f0ede8 !important; }

  .tag-btn { transition: all 0.15s; }
  .tag-btn:hover { border-color: #555 !important; color: #ccc !important; }

  .save-pulse { animation: savePulse 0.4s ease; }
  @keyframes savePulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }

  textarea { resize: vertical; min-height: 72px; }
  textarea:focus { outline: none; border-color: #444 !important; }
  input:focus { outline: none; border-color: #444 !important; }
`;

// ─── Components ──────────────────────────────────────────────────────────────

function FestivalLogo({ festival, active }) {
  const opacity = active ? 1 : 0.4;
  if (festival.id === "gottwood") return <img src={GOTTWOOD_LOGO} style={{ height: 14, opacity, display: "block" }} alt="Gottwood" />;
  if (festival.id === "peep") return <img src={PEEP_LOGO} style={{ height: 14, opacity, display: "block" }} alt="Peep" />;
  return <span style={{ opacity, fontSize: 11, fontFamily: "'Syne', sans-serif", fontWeight: 700, letterSpacing: "0.08em" }}>{festival.name.toUpperCase()}</span>;
}

function RatingBar({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {RATINGS.map(r => {
        const active = value === r.value;
        return (
          <button
            key={r.value}
            className="rating-btn"
            onClick={() => onChange(active ? null : r.value)}
            title={r.label}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 8,
              border: `1.5px solid ${active ? r.color : "#252528"}`,
              background: active ? r.color + "22" : "#131315",
              color: active ? r.color : "#555",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'Syne', sans-serif",
              letterSpacing: "0.04em",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{r.value}</span>
            <span style={{ fontSize: 9, opacity: active ? 1 : 0.5, letterSpacing: "0.06em" }}>{r.label.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}

function CategorySection({ catName, data, onSave, saveKey, saveStatuses }) {
  const status = saveStatuses[saveKey] ?? "idle";
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState({
    rating: data?.rating ?? null,
    worked_well: data?.worked_well ?? "",
    needs_improvement: data?.needs_improvement ?? "",
    notes: data?.notes ?? "",
  });

  useEffect(() => {
    setLocal({
      rating: data?.rating ?? null,
      worked_well: data?.worked_well ?? "",
      needs_improvement: data?.needs_improvement ?? "",
      notes: data?.notes ?? "",
    });
  }, [data]);

  const debouncedSave = useDebounce(onSave, 900);

  const update = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    debouncedSave(next);
  };

  const rating = getRating(local.rating);
  const hasContent = local.worked_well || local.needs_improvement || local.notes;

  return (
    <div style={{
      background: "#111113",
      borderRadius: 12,
      border: `1px solid ${open ? "#2a2a30" : "#1e1e22"}`,
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      {/* Collapsed header — always visible, tap to open */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "16px 18px", background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        {/* Rating dot indicator */}
        <div style={{
          width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
          background: rating ? rating.color : "#252528",
          boxShadow: rating ? `0 0 6px ${rating.color}66` : "none",
          transition: "background 0.2s, box-shadow 0.2s",
        }} />

        <span style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13,
          letterSpacing: "0.06em", flex: 1,
          color: rating || hasContent ? "#e8e4df" : "#555",
        }}>
          {catName.toUpperCase()}
        </span>

        {/* Status indicators */}
        {status === "saving" && <span style={{ fontSize: 10, color: "#555", fontFamily: "'Syne', sans-serif" }}>SAVING…</span>}
        {status === "saved" && <span className="save-pulse" style={{ fontSize: 10, color: "#22c55e", fontFamily: "'Syne', sans-serif" }}>SAVED</span>}

        {rating && !open && (
          <span style={{
            fontSize: 10, fontWeight: 700, fontFamily: "'Syne', sans-serif",
            color: rating.color, letterSpacing: "0.06em",
          }}>
            {rating.label.toUpperCase()}
          </span>
        )}

        {hasContent && !open && !rating && (
          <span style={{ fontSize: 10, color: "#444", fontFamily: "'Syne', sans-serif", letterSpacing: "0.06em" }}>NOTES</span>
        )}

        <span style={{
          color: "#333", fontSize: 12, fontFamily: "'Syne', sans-serif",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
          display: "inline-block", marginLeft: 4,
        }}>▼</span>
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid #1a1a1e" }}>
          <div style={{ paddingTop: 16 }}>
            <RatingBar value={local.rating} onChange={(v) => update({ rating: v })} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelSt}>✓ What worked well</label>
              <textarea
                value={local.worked_well}
                onChange={e => update({ worked_well: e.target.value })}
                placeholder="What went well this year..."
                style={taSt("#0a1a12")}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelSt}>↑ Needs improvement</label>
              <textarea
                value={local.needs_improvement}
                onChange={e => update({ needs_improvement: e.target.value })}
                placeholder="What to fix next year..."
                style={taSt("#1a0e0e")}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelSt}>↗ Notes, suppliers & ideas</label>
            <textarea
              value={local.notes}
              onChange={e => update({ notes: e.target.value })}
              placeholder="Supplier contacts, costs, specs, ideas..."
              style={{ ...taSt("#0e0e1a"), minHeight: 52 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const labelSt = {
  fontSize: 10, fontWeight: 600, fontFamily: "'Syne', sans-serif",
  color: "#555", letterSpacing: "0.1em", textTransform: "uppercase",
};

const taSt = (bg) => ({
  width: "100%", background: bg, border: "1px solid #222",
  borderRadius: 8, color: "#c8c4bf", fontFamily: "'Instrument Sans', sans-serif",
  fontSize: 13, padding: "10px 12px", lineHeight: 1.6, boxSizing: "border-box",
});

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  // Navigation: "festivals" | "areas" | "area-detail"
  const [screen, setScreen] = useState("festivals");
  const [activeFestival, setActiveFestival] = useState(null);
  const [activeYear, setActiveYear] = useState("2025");
  const [selectedArea, setSelectedArea] = useState(null);

  // Data
  const [areas, setAreas] = useState({});
  const [areaCategories, setAreaCategories] = useState({});
  const [reviewData, setReviewData] = useState({});
  const [saveStatuses, setSaveStatuses] = useState({});
  const [loading, setLoading] = useState(false);

  // UI state
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [addingArea, setAddingArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [editingCats, setEditingCats] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  // Load areas & reviews when festival/year changes
  useEffect(() => {
    if (!activeFestival) return;

    // Set default areas if not loaded yet
    setAreas(prev => {
      if (prev[activeFestival]) return prev;
      return { ...prev, [activeFestival]: DEFAULT_AREAS[activeFestival] ?? [] };
    });

    // Load reviews from Supabase
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("reviews").select("*")
        .eq("festival", activeFestival).eq("year", activeYear);

      if (!error && data) {
        const map = {};
        const catMap = {};
        data.forEach(row => {
          const key = `${row.area_id}__${row.category_id}`;
          map[key] = {
            rating: row.rating,
            worked_well: row.worked_well,
            needs_improvement: row.needs_improvement,
            notes: row.notes,
          };
          // Rebuild per-area category lists from saved data
          if (!catMap[row.area_id]) catMap[row.area_id] = new Set();
          catMap[row.area_id].add(row.category_id);
        });
        setReviewData(map);

        // Merge DB areas into local list
        const dbAreaNames = [...new Map(data.map(r => [r.area_id, r.area_name])).entries()];
        setAreas(prev => {
          const existing = prev[activeFestival] ?? DEFAULT_AREAS[activeFestival] ?? [];
          const existingIds = new Set(existing.map(a => slugify(a)));
          const extras = dbAreaNames.filter(([id]) => !existingIds.has(id)).map(([, name]) => name);
          return { ...prev, [activeFestival]: [...existing, ...extras] };
        });
      }
      setLoading(false);
    }
    load();
  }, [activeFestival, activeYear]);

  // Get categories for current area
  const getCats = useCallback((areaName) => {
    const key = `${activeFestival}__${slugify(areaName)}`;
    return areaCategories[key] ?? ALL_CATEGORIES;
  }, [activeFestival, areaCategories]);

  const setCats = useCallback((areaName, cats) => {
    const key = `${activeFestival}__${slugify(areaName)}`;
    setAreaCategories(prev => ({ ...prev, [key]: cats }));
  }, [activeFestival]);

  // Save a category review
  const handleSave = useCallback(async (areaName, catName, patch) => {
    const areaId = slugify(areaName);
    const catId = slugify(catName);
    const key = `${areaId}__${catId}`;
    setSaveStatuses(s => ({ ...s, [key]: "saving" }));
    const { error } = await supabase.from("reviews").upsert({
      festival: activeFestival, year: activeYear,
      area_id: areaId, area_name: areaName, area_emoji: "",
      category_id: catId, rating: patch.rating,
      worked_well: patch.worked_well ?? "",
      needs_improvement: patch.needs_improvement ?? "",
      notes: patch.notes ?? "",
      updated_at: new Date().toISOString(),
    }, { onConflict: "festival,year,area_id,category_id" });
    setSaveStatuses(s => ({ ...s, [key]: error ? "error" : "saved" }));
    if (!error) setReviewData(prev => ({ ...prev, [key]: patch }));
    setTimeout(() => setSaveStatuses(s => ({ ...s, [key]: "idle" })), 2500);
  }, [activeFestival, activeYear]);

  // Add area
  const addArea = () => {
    if (!newAreaName.trim()) return;
    setAreas(prev => ({ ...prev, [activeFestival]: [...(prev[activeFestival] ?? []), newAreaName.trim()] }));
    setNewAreaName("");
    setAddingArea(false);
  };

  // Area completion score
  function areaScore(areaName) {
    const cats = getCats(areaName);
    const aId = slugify(areaName);
    const rated = cats.filter(c => reviewData[`${aId}__${slugify(c)}`]?.rating);
    return { rated: rated.length, total: cats.length };
  }

  function areaAvgColor(areaName) {
    const cats = getCats(areaName);
    const aId = slugify(areaName);
    const vals = cats.map(c => reviewData[`${aId}__${slugify(c)}`]?.rating).filter(Boolean);
    if (!vals.length) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return avg >= 4 ? "#22c55e" : avg >= 3 ? "#eab308" : "#f97316";
  }

  // ── SCREEN: Festival picker ──
  if (screen === "festivals") {
    return (
      <>
        <style>{css}</style>
        <div className="screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "#0c0c0e" }}>
          <div style={{ width: "100%", maxWidth: 560 }}>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: "0.22em", color: "#333", marginBottom: 6 }}>PRODUCTION REVIEW SYSTEM</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "0.1em", color: "#555" }}>SELECT A FESTIVAL</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FESTIVALS.map(f => (
                <button
                  key={f.id}
                  className="fest-btn"
                  onClick={() => { setActiveFestival(f.id); setScreen("areas"); }}
                  style={{
                    width: "100%", padding: "36px 28px",
                    background: "#111113", border: "1px solid #1e1e22",
                    borderRadius: 16, cursor: "pointer", color: "#f0ede8",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    position: "relative",
                  }}
                >
                  {f.id === "gottwood" && (
                    <img src={GOTTWOOD_LOGO} style={{ height: 52, display: "block", objectFit: "contain" }} alt="Gottwood" />
                  )}
                  {f.id === "peep" && (
                    <img src={PEEP_LOGO} style={{ height: 52, display: "block", objectFit: "contain" }} alt="Peep Festival" />
                  )}
                  {f.id === "soysambu" && (
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: "0.12em", color: "#f0ede8" }}>SOYSAMBU</span>
                  )}
                  <span style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", color: "#2a2a2e", fontSize: 18 }}>→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  const festival = FESTIVALS.find(f => f.id === activeFestival);
  const festivalAreas = areas[activeFestival] ?? [];

  // ── SCREEN: Areas list ──
  if (screen === "areas") {
    return (
      <>
        <style>{css}</style>
        <div className="screen" style={{ minHeight: "100vh", background: "#0c0c0e" }}>

          {/* Header */}
          <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#0c0c0eee", backdropFilter: "blur(12px)", borderBottom: "1px solid #1a1a1e", padding: "0 20px" }}>
            <div style={{ maxWidth: 700, margin: "0 auto", height: 56, display: "flex", alignItems: "center", gap: 14 }}>
              <button className="back-btn" onClick={() => setScreen("festivals")} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 20, display: "flex", alignItems: "center", paddingRight: 4 }}>←</button>
              <FestivalLogo festival={festival} active={true} />
              <div style={{ flex: 1 }} />
              {/* Year picker */}
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowYearPicker(!showYearPicker)} style={{
                  background: "#161618", border: "1px solid #252528", borderRadius: 8,
                  color: "#ccc", fontFamily: "'Syne', sans-serif", fontWeight: 700,
                  fontSize: 12, padding: "6px 12px", cursor: "pointer", letterSpacing: "0.06em",
                }}>
                  {activeYear} ▾
                </button>
                {showYearPicker && (
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#161618", border: "1px solid #252528", borderRadius: 10, overflow: "hidden", zIndex: 20, minWidth: 80 }}>
                    {YEARS.map(y => (
                      <button key={y} onClick={() => { setActiveYear(y); setShowYearPicker(false); }} style={{
                        display: "block", width: "100%", padding: "10px 16px", background: y === activeYear ? "#222" : "transparent",
                        border: "none", color: y === activeYear ? "#fff" : "#888", fontFamily: "'Syne', sans-serif",
                        fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: "0.06em", textAlign: "left",
                      }}>{y}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ maxWidth: 700, margin: "0 auto", padding: "28px 20px 60px" }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: "#f0ede8", marginBottom: 4 }}>Areas</div>
              <div style={{ fontSize: 13, color: "#555" }}>{festivalAreas.length} areas · {activeYear}</div>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: "#444", fontFamily: "'Syne', sans-serif", fontSize: 12, letterSpacing: "0.1em" }}>LOADING…</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {festivalAreas.map(areaName => {
                  const { rated, total } = areaScore(areaName);
                  const color = areaAvgColor(areaName);
                  const pct = total > 0 ? (rated / total) * 100 : 0;
                  return (
                    <button
                      key={areaName}
                      className="area-card"
                      onClick={() => { setSelectedArea(areaName); setScreen("area-detail"); setEditingCats(false); }}
                      style={{
                        background: "#111113", border: "1px solid #1e1e22",
                        borderRadius: 12, cursor: "pointer", textAlign: "left",
                        padding: "18px 18px 14px", display: "flex", flexDirection: "column", gap: 12,
                      }}
                    >
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: "#e8e4df", lineHeight: 1.3 }}>{areaName}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ height: 3, background: "#1e1e22", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: color ?? "#333", borderRadius: 2, transition: "width 0.4s" }} />
                        </div>
                        <div style={{ fontSize: 10, fontFamily: "'Syne', sans-serif", fontWeight: 600, color: rated > 0 ? (color ?? "#888") : "#333", letterSpacing: "0.06em" }}>
                          {rated > 0 ? `${rated}/${total} RATED` : "NOT STARTED"}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Add area card */}
                {addingArea ? (
                  <div style={{ background: "#111113", border: "1px dashed #333", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      autoFocus value={newAreaName} onChange={e => setNewAreaName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addArea(); if (e.key === "Escape") setAddingArea(false); }}
                      placeholder="Area name..."
                      style={{ background: "#0c0c0e", border: "1px solid #333", borderRadius: 7, color: "#f0ede8", padding: "8px 10px", fontSize: 13, width: "100%" }}
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={addArea} style={{ flex: 1, background: "#f0ede8", color: "#0c0c0e", border: "none", borderRadius: 7, padding: "7px", fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}>ADD</button>
                      <button onClick={() => setAddingArea(false)} style={{ flex: 1, background: "transparent", color: "#555", border: "1px solid #252528", borderRadius: 7, padding: "7px", fontSize: 12, cursor: "pointer" }}>CANCEL</button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="area-card"
                    onClick={() => setAddingArea(true)}
                    style={{ background: "transparent", border: "1px dashed #252528", borderRadius: 12, cursor: "pointer", padding: "18px", color: "#444", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 80 }}
                  >
                    + ADD AREA
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── SCREEN: Area detail ──
  const cats = getCats(selectedArea);
  const areaId = slugify(selectedArea);

  return (
    <>
      <style>{css}</style>
      <div className="screen" style={{ minHeight: "100vh", background: "#0c0c0e" }}>

        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#0c0c0eee", backdropFilter: "blur(12px)", borderBottom: "1px solid #1a1a1e", padding: "0 20px" }}>
          <div style={{ maxWidth: 700, margin: "0 auto", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
            <button className="back-btn" onClick={() => setScreen("areas")} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 20, display: "flex", alignItems: "center", paddingRight: 4 }}>←</button>
            <FestivalLogo festival={festival} active={true} />
            <span style={{ color: "#2a2a2e", fontSize: 14 }}>·</span>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: "#888", letterSpacing: "0.04em" }}>{activeYear}</span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setEditingCats(!editingCats)}
              style={{
                background: editingCats ? "#f0ede822" : "transparent",
                border: `1px solid ${editingCats ? "#555" : "#252528"}`,
                borderRadius: 8, color: editingCats ? "#f0ede8" : "#555",
                fontFamily: "'Syne', sans-serif", fontWeight: 700,
                fontSize: 10, letterSpacing: "0.08em", padding: "5px 12px", cursor: "pointer",
              }}
            >
              {editingCats ? "DONE" : "EDIT SECTIONS"}
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 700, margin: "0 auto", padding: "28px 20px 80px" }}>

          {/* Area title & progress */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32, color: "#f0ede8", lineHeight: 1.1, marginBottom: 10 }}>{selectedArea}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 3, background: "#1e1e22", borderRadius: 2, overflow: "hidden" }}>
                {(() => { const { rated, total } = areaScore(selectedArea); const color = areaAvgColor(selectedArea); return <div style={{ height: "100%", width: `${total > 0 ? (rated/total)*100 : 0}%`, background: color ?? "#333", transition: "width 0.4s", borderRadius: 2 }} />; })()}
              </div>
              {(() => { const { rated, total } = areaScore(selectedArea); return <span style={{ fontSize: 11, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "#555", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{rated}/{total} RATED</span>; })()}
            </div>
          </div>

          {/* Edit categories mode */}
          {editingCats ? (
            <div style={{ background: "#111113", border: "1px solid #1e1e22", borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13, color: "#888", letterSpacing: "0.1em", marginBottom: 16 }}>SECTIONS FOR THIS AREA</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {ALL_CATEGORIES.map(cat => {
                  const active = cats.includes(cat);
                  return (
                    <button
                      key={cat}
                      className="tag-btn"
                      onClick={() => {
                        if (active) setCats(selectedArea, cats.filter(c => c !== cat));
                        else setCats(selectedArea, [...cats, cat]);
                      }}
                      style={{
                        padding: "7px 14px", borderRadius: 20,
                        border: `1px solid ${active ? "#f0ede8" : "#252528"}`,
                        background: active ? "#f0ede811" : "transparent",
                        color: active ? "#f0ede8" : "#555",
                        fontFamily: "'Syne', sans-serif", fontWeight: 600,
                        fontSize: 12, cursor: "pointer", letterSpacing: "0.04em",
                      }}
                    >
                      {active ? "✓ " : ""}{cat}
                    </button>
                  );
                })}
                {/* Custom categories */}
                {cats.filter(c => !ALL_CATEGORIES.includes(c)).map(cat => (
                  <button
                    key={cat}
                    className="tag-btn"
                    onClick={() => setCats(selectedArea, cats.filter(c2 => c2 !== cat))}
                    style={{
                      padding: "7px 14px", borderRadius: 20,
                      border: "1px solid #f0ede8",
                      background: "#f0ede811",
                      color: "#f0ede8",
                      fontFamily: "'Syne', sans-serif", fontWeight: 600,
                      fontSize: 12, cursor: "pointer", letterSpacing: "0.04em",
                    }}
                  >
                    ✓ {cat} ✕
                  </button>
                ))}
              </div>
              {/* Add custom category */}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newCatName.trim()) {
                      setCats(selectedArea, [...cats, newCatName.trim()]);
                      setNewCatName("");
                    }
                  }}
                  placeholder="Add custom section (e.g. Fencing)..."
                  style={{ flex: 1, background: "#0c0c0e", border: "1px solid #252528", borderRadius: 8, color: "#f0ede8", padding: "8px 12px", fontSize: 13 }}
                />
                <button
                  onClick={() => { if (newCatName.trim()) { setCats(selectedArea, [...cats, newCatName.trim()]); setNewCatName(""); } }}
                  style={{ background: "#f0ede8", color: "#0c0c0e", border: "none", borderRadius: 8, padding: "8px 16px", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                >
                  ADD
                </button>
              </div>
            </div>
          ) : null}

          {/* Category sections */}
          {cats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#444", fontFamily: "'Syne', sans-serif", fontSize: 12, letterSpacing: "0.1em" }}>
              NO SECTIONS — TAP "EDIT SECTIONS" TO ADD SOME
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cats.map(cat => {
                const catId = slugify(cat);
                const key = `${areaId}__${catId}`;
                return (
                  <CategorySection
                    key={key}
                    catName={cat}
                    data={reviewData[key]}
                    saveKey={key}
                    saveStatuses={saveStatuses}
                    onSave={(patch) => handleSave(selectedArea, cat, patch)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
