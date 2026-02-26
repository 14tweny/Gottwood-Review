import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";
import { GOTTWOOD_LOGO, PEEP_LOGO, FOURTEEN_TWENTY_LOGO } from "./logos.js";

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

const DEPARTMENTS = [
  { id: "production",          name: "Production" },
  { id: "council-licensing",   name: "Council & Licensing" },
  { id: "artists",             name: "Artists" },
  { id: "logistics",           name: "Logistics" },
];

const DEFAULT_DEPT_AREAS = {
  gottwood: {
    "production": [
      "Woods Stage", "Treehouse Stage", "The Barn", "Boxford", "Captain Cabeza",
      "Walled Garden", "Boneyard", "The Lawn", "Trigon", "Rickies Disco",
      "The Lighthouse", "The Curve", "The Nest", "Cocktail Bar (old curve)",
      "Power & Electrics", "Site General",
    ],
    "council-licensing": [
      "Premises Licence", "SAG Submissions", "Noise Management", "Medical Provision",
      "Welfare & Safeguarding", "Fire Safety", "Traffic Management", "Environmental Health",
    ],
    "artists": [
      "Green Room", "Artist Hospitality", "Backline & Production Riders",
      "Artist Transport", "Guest List & Wristbands", "Dressing Rooms",
    ],
    "logistics": [
      "Main Gate", "Crew Campsite", "General Campsite", "Boutique Campsite",
      "Campsite Traders", "Wellbeing", "Medical & Welfare", "Woods Traders",
      "Lakeside Traders", "Lake", "Crew Catering", "Waste & Recycling",
    ],
  },
  peep: {
    "production": [
      "Main Stage", "Stage 2", "Bar / Social", "Power & Electrics", "Site General",
    ],
    "council-licensing": [
      "Premises Licence", "SAG Submissions", "Noise Management",
      "Medical Provision", "Fire Safety",
    ],
    "artists": [
      "Green Room", "Artist Hospitality", "Backline & Riders", "Artist Transport",
    ],
    "logistics": [
      "Entrance / Gate", "Camping Zone", "Traders", "Welfare", "Waste & Recycling",
    ],
  },
  soysambu: {
    "production": ["Main Stage", "Bar / Social", "Power & Electrics", "Site General"],
    "council-licensing": ["Permits & Licensing", "Noise Management", "Medical Provision"],
    "artists": ["Green Room", "Artist Hospitality", "Artist Transport"],
    "logistics": ["Entrance / Gate", "Camping", "Traders", "Waste & Recycling"],
  },
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
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { background: #0a0a0a; color: #f0ede8; font-family: 'Geist', sans-serif; -webkit-font-smoothing: antialiased; }
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
  if (festival.id === "gottwood") return <img src={GOTTWOOD_LOGO} style={{ height: 42, opacity, display: "block" }} alt="Gottwood" />;
  if (festival.id === "peep") return <img src={PEEP_LOGO} style={{ height: 42, opacity, display: "block" }} alt="Peep" />;
  return <span style={{ opacity, fontSize: 20, fontFamily: "'Geist', sans-serif", fontWeight: 700, letterSpacing: "0.08em" }}>{festival.name.toUpperCase()}</span>;
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
              fontFamily: "'Geist', sans-serif",
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
          fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 13,
          letterSpacing: "0.06em", flex: 1,
          color: rating || hasContent ? "#e8e4df" : "#555",
        }}>
          {catName.toUpperCase()}
        </span>

        {/* Status indicators */}
        {status === "saving" && <span style={{ fontSize: 10, color: "#555", fontFamily: "'Geist', sans-serif" }}>SAVING…</span>}
        {status === "saved" && <span className="save-pulse" style={{ fontSize: 10, color: "#22c55e", fontFamily: "'Geist', sans-serif" }}>SAVED</span>}

        {rating && !open && (
          <span style={{
            fontSize: 10, fontWeight: 700, fontFamily: "'Geist', sans-serif",
            color: rating.color, letterSpacing: "0.06em",
          }}>
            {rating.label.toUpperCase()}
          </span>
        )}

        {hasContent && !open && !rating && (
          <span style={{ fontSize: 10, color: "#444", fontFamily: "'Geist', sans-serif", letterSpacing: "0.06em" }}>NOTES</span>
        )}

        <span style={{
          color: "#333", fontSize: 12, fontFamily: "'Geist', sans-serif",
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
  fontSize: 10, fontWeight: 600, fontFamily: "'Geist', sans-serif",
  color: "#555", letterSpacing: "0.1em", textTransform: "uppercase",
};

const taSt = (bg) => ({
  width: "100%", background: bg, border: "1px solid #222",
  borderRadius: 8, color: "#c8c4bf", fontFamily: "'Geist', sans-serif",
  fontSize: 13, padding: "10px 12px", lineHeight: 1.6, boxSizing: "border-box",
});

// ─── PDF Export ──────────────────────────────────────────────────────────────

async function exportToPDF({ festival, year, areas, reviewData, getCats, getAllReviewData }) {
  // Dynamically load jsPDF
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = margin;

  const RATINGS = [
    { value: 1, label: "Poor" },
    { value: 2, label: "Needs Work" },
    { value: 3, label: "Average" },
    { value: 4, label: "Good" },
    { value: 5, label: "Excellent" },
  ];

  const RATING_COLORS = {
    1: [239, 68, 68],
    2: [249, 115, 22],
    3: [234, 179, 8],
    4: [132, 204, 18],
    5: [34, 197, 94],
  };

  function checkPage(needed = 10) {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function drawLine(color = [30, 30, 34]) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 3;
  }

  // ── Cover header ──
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pageW, 36, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(240, 237, 232);
  doc.text("PRODUCTION REVIEW", margin, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 110);
  doc.text(`${festival.name.toUpperCase()}  ·  ${year}`, margin, 25);
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, pageW - margin, 25, { align: "right" });
  y = 46;

  // ── Areas ──
  for (const areaName of areas) {
    const areaId = areaName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const cats = getCats(areaName);
    const hasAnyData = cats.some(c => {
      const catId = c.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const d = reviewData[`${areaId}__${catId}`];
      return d?.rating || d?.worked_well || d?.needs_improvement || d?.notes;
    });
    if (!hasAnyData) continue;

    checkPage(20);

    // Area heading
    doc.setFillColor(20, 20, 24);
    doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(240, 237, 232);
    doc.text(areaName.toUpperCase(), margin + 4, y + 6.8);
    y += 14;

    for (const catName of cats) {
      const catId = catName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const d = reviewData[`${areaId}__${catId}`];
      if (!d?.rating && !d?.worked_well && !d?.needs_improvement && !d?.notes) continue;

      checkPage(14);

      // Category row
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(180, 176, 170);
      doc.text(catName, margin + 2, y + 4);

      // Rating badge
      if (d?.rating) {
        const rLabel = RATINGS.find(r => r.value === d.rating)?.label ?? "";
        const rColor = RATING_COLORS[d.rating] ?? [100,100,100];
        doc.setFillColor(...rColor.map(c => Math.round(c * 0.15 + 10)));
        doc.setDrawColor(...rColor);
        doc.setLineWidth(0.3);
        const badgeW = doc.getTextWidth(rLabel) + 6;
        doc.roundedRect(pageW - margin - badgeW - 2, y, badgeW, 6, 1, 1, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...rColor);
        doc.text(rLabel.toUpperCase(), pageW - margin - badgeW / 2 - 2, y + 4, { align: "center" });
      }
      y += 8;

      // Text fields
      const fields = [
        { key: "worked_well", prefix: "✓ ", color: [60, 120, 80] },
        { key: "needs_improvement", prefix: "↑ ", color: [140, 60, 60] },
        { key: "notes", prefix: "↗ ", color: [60, 80, 140] },
      ];

      for (const { key, prefix, color } of fields) {
        const text = d?.[key];
        if (!text?.trim()) continue;
        checkPage(8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(prefix + text, contentW - 6);
        doc.text(lines, margin + 4, y + 3);
        y += lines.length * 4.5 + 2;
      }

      // Thin separator
      doc.setDrawColor(30, 30, 34);
      doc.setLineWidth(0.15);
      doc.line(margin + 2, y, pageW - margin - 2, y);
      y += 4;
    }
    y += 4;
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 70);
    doc.text(`${festival.name} · ${year} · 14twenty Production Review`, margin, pageH - 8);
    doc.text(`${i} / ${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
  }

  doc.save(`${festival.name.replace(/\s+/g, "-")}-${year}-production-review.pdf`);
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  // Navigation: "festivals" | "year" | "departments" | "areas" | "area-detail"
  const [screen, setScreen] = useState("festivals");
  const [activeFestival, setActiveFestival] = useState(null);
  const [activeYear, setActiveYear] = useState(null);
  const [activeDept, setActiveDept] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);

  // Data
  const [areas, setAreas] = useState({});  // keyed as "festivalId__deptId"
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
    if (activeDept) {
      const deptKey = `${activeFestival}__${activeDept}`;
      setAreas(prev => {
        if (prev[deptKey]) return prev;
        return { ...prev, [deptKey]: DEFAULT_DEPT_AREAS[activeFestival]?.[activeDept] ?? [] };
      });
    }

    // Load reviews from Supabase
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("reviews").select("*")
        .eq("festival", activeFestival).eq("year", activeYear);

      if (!error && data) {
        // Filter to current dept only
        const deptData = data.filter(row => row.area_emoji === activeDept);
        const map = {};
        const catMap = {};
        deptData.forEach(row => {
          const cleanAreaId = row.area_id.replace(`${activeDept}__`, "");
          const key = `${cleanAreaId}__${row.category_id}`;
          map[key] = {
            rating: row.rating,
            worked_well: row.worked_well,
            needs_improvement: row.needs_improvement,
            notes: row.notes,
          };
          if (!catMap[cleanAreaId]) catMap[cleanAreaId] = new Set();
          catMap[cleanAreaId].add(row.category_id);
        });
        setReviewData(map);

        // Merge DB areas into local list
        const deptKey = `${activeFestival}__${activeDept}`;
        const dbAreaNames = [...new Map(deptData.map(r => [r.area_id.replace(`${activeDept}__`, ""), r.area_name])).entries()];
        setAreas(prev => {
          const existing = prev[deptKey] ?? DEFAULT_DEPT_AREAS[activeFestival]?.[activeDept] ?? [];
          const existingIds = new Set(existing.map(a => slugify(a)));
          const extras = dbAreaNames.filter(([id]) => !existingIds.has(id)).map(([, name]) => name);
          return { ...prev, [deptKey]: [...existing, ...extras] };
        });
      }
      setLoading(false);
    }
    load();
  }, [activeFestival, activeYear, activeDept]);

  // Get categories for current area
  const getCats = useCallback((areaName) => {
    const key = `${activeFestival}__${activeDept}__${slugify(areaName)}`;
    return areaCategories[key] ?? ALL_CATEGORIES;
  }, [activeFestival, activeDept, areaCategories]);

  const setCats = useCallback((areaName, cats) => {
    const key = `${activeFestival}__${activeDept}__${slugify(areaName)}`;
    setAreaCategories(prev => ({ ...prev, [key]: cats }));
  }, [activeFestival, activeDept]);

  // Save a category review
  const handleSave = useCallback(async (areaName, catName, patch) => {
    const areaId = slugify(areaName);
    const catId = slugify(catName);
    const key = `${areaId}__${catId}`;
    setSaveStatuses(s => ({ ...s, [key]: "saving" }));
    const { error } = await supabase.from("reviews").upsert({
      festival: activeFestival, year: activeYear,
      area_id: `${activeDept}__${areaId}`, area_name: areaName, area_emoji: activeDept,
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
    setAreas(prev => ({ ...prev, [deptKey]: [...(prev[deptKey] ?? []), newAreaName.trim()] }));
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
        <div className="screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "#0a0a0a" }}>
          <div style={{ width: "100%", maxWidth: 560 }}>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <div style={{ marginBottom: 24, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <img src={FOURTEEN_TWENTY_LOGO} style={{ height: 96, objectFit: "contain", display: "block" }} alt="14twenty" />
              </div>
              <div style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: "0.22em", color: "#444", marginBottom: 6 }}>PRODUCTION REVIEW SYSTEM</div>
              <div style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "0.1em", color: "#555" }}>SELECT A FESTIVAL</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FESTIVALS.map(f => (
                <button
                  key={f.id}
                  className="fest-btn"
                  onClick={() => { setActiveFestival(f.id); setScreen("year"); }}
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
                    <span style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: "0.12em", color: "#f0ede8" }}>SOYSAMBU</span>
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
  const deptKey = `${activeFestival}__${activeDept}`;
  const festivalAreas = areas[deptKey] ?? [];

  // ── SCREEN: Year picker ──
  if (screen === "year") {
    return (
      <>
        <style>{css}</style>
        <div className="screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "#0a0a0a" }}>
          <div style={{ width: "100%", maxWidth: 560 }}>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <div style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: "0.22em", color: "#333", marginBottom: 16 }}>PRODUCTION REVIEW SYSTEM</div>
              <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
                <FestivalLogo festival={festival} active={true} />
              </div>
              <div style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "0.1em", color: "#555" }}>SELECT A YEAR</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {YEARS.slice().reverse().map(y => (
                <button
                  key={y}
                  className="fest-btn"
                  onClick={() => { setActiveYear(y); setScreen("departments"); }}
                  style={{
                    width: "100%", padding: "20px 28px",
                    background: "#111113", border: "1px solid #1e1e22",
                    borderRadius: 14, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    position: "relative",
                  }}
                >
                  <span style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: 24, color: "#f0ede8", letterSpacing: "0.06em" }}>{y}</span>
                  <span style={{ color: "#2a2a2e", fontSize: 18 }}>→</span>
                </button>
              ))}
            </div>

            <button className="back-btn" onClick={() => setScreen("festivals")} style={{ marginTop: 28, background: "none", border: "none", cursor: "pointer", color: "#444", fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
              ← BACK
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── SCREEN: Departments ──
  if (screen === "departments") {
    const festival = FESTIVALS.find(f => f.id === activeFestival);
    return (
      <>
        <style>{css}</style>
        <div className="screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "#0a0a0a" }}>
          <div style={{ width: "100%", maxWidth: 560 }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
                <FestivalLogo festival={festival} active={true} />
              </div>
              <div style={{ fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.18em", color: "#444", marginBottom: 4 }}>{activeYear}</div>
              <div style={{ fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: "#555" }}>SELECT A DEPARTMENT</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DEPARTMENTS.map(dept => (
                <button
                  key={dept.id}
                  className="fest-btn"
                  onClick={() => { setActiveDept(dept.id); setScreen("areas"); }}
                  style={{
                    width: "100%", padding: "22px 28px",
                    background: "#111113", border: "1px solid #1e1e22",
                    borderRadius: 14, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 18, color: "#f0ede8", letterSpacing: "0.04em" }}>
                    {dept.name}
                  </span>
                  <span style={{ color: "#2a2a2e", fontSize: 18 }}>→</span>
                </button>
              ))}
            </div>

            <button className="back-btn" onClick={() => setScreen("year")} style={{ marginTop: 28, background: "none", border: "none", cursor: "pointer", color: "#444", fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
              ← BACK
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── SCREEN: Areas list ──
  if (screen === "areas") {
    return (
      <>
        <style>{css}</style>
        <div className="screen" style={{ minHeight: "100vh", background: "#0a0a0a" }}>

          {/* Header */}
          <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#0a0a0aee", backdropFilter: "blur(12px)", borderBottom: "1px solid #1a1a1e", padding: "0 20px" }}>
            <div style={{ maxWidth: 700, margin: "0 auto", height: 56, display: "flex", alignItems: "center", gap: 14 }}>
              <button className="back-btn" onClick={() => setScreen("departments")} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 20, display: "flex", alignItems: "center", paddingRight: 4 }}>←</button>
              <FestivalLogo festival={festival} active={true} />
              <div style={{ flex: 1 }} />
              {/* Year display — click to go back and change */}
              <button onClick={() => setScreen("year")} style={{
                background: "#1e1e22", border: "1px solid #252528", borderRadius: 8,
                color: "#ccc", fontFamily: "'Geist', sans-serif", fontWeight: 700,
                fontSize: 12, padding: "6px 12px", cursor: "pointer", letterSpacing: "0.06em",
              }}>
                {activeYear} ▾
              </button>
            </div>
          </div>

          <div style={{ maxWidth: 700, margin: "0 auto", padding: "28px 20px 60px" }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: 26, color: "#f0ede8", marginBottom: 4 }}>{DEPARTMENTS.find(d => d.id === activeDept)?.name}</div>
              <div style={{ fontSize: 13, color: "#555" }}>{festivalAreas.length} areas · {activeYear}</div>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: "#444", fontFamily: "'Geist', sans-serif", fontSize: 12, letterSpacing: "0.1em" }}>LOADING…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {festivalAreas.map(areaName => {
                  const { rated, total } = areaScore(areaName);
                  const color = areaAvgColor(areaName);
                  const pct = total > 0 ? (rated / total) * 100 : 0;
                  return (
                    <div key={areaName} style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                      <button
                        className="area-card"
                        onClick={() => { setSelectedArea(areaName); setScreen("area-detail"); setEditingCats(false); }}
                        style={{
                          flex: 1, background: "#111113", border: "1px solid #1e1e22",
                          borderRadius: 12, cursor: "pointer", textAlign: "left",
                          padding: "16px 18px", display: "flex", alignItems: "center", gap: 16,
                        }}
                      >
                        {/* Progress dot */}
                        <div style={{
                          width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                          background: rated > 0 ? (color ?? "#555") : "#252528",
                          boxShadow: rated > 0 && color ? `0 0 6px ${color}66` : "none",
                        }} />

                        {/* Name */}
                        <span style={{ fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 14, color: rated > 0 ? "#e8e4df" : "#666", flex: 1 }}>
                          {areaName}
                        </span>

                        {/* Progress bar */}
                        <div style={{ width: 80, height: 3, background: "#1e1e22", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: color ?? "#333", borderRadius: 2, transition: "width 0.4s" }} />
                        </div>

                        {/* Label */}
                        <span style={{ fontSize: 10, fontFamily: "'Geist', sans-serif", fontWeight: 600, color: rated > 0 ? (color ?? "#888") : "#2a2a2e", letterSpacing: "0.06em", minWidth: 60, textAlign: "right" }}>
                          {rated > 0 ? `${rated}/${total}` : "—"}
                        </span>

                        <span style={{ color: "#2a2a2e", fontSize: 14 }}>→</span>
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete "${areaName}"? This won't remove saved data from the database.`)) {
                            setAreas(prev => ({ ...prev, [deptKey]: prev[deptKey].filter(a => a !== areaName) }));
                          }
                        }}
                        title="Delete area"
                        style={{
                          background: "#111113", border: "1px solid #1e1e22", borderRadius: 12,
                          color: "#333", cursor: "pointer", padding: "0 14px", fontSize: 16,
                          transition: "all 0.15s", flexShrink: 0,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#ef444444"; e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "#1a1010"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e1e22"; e.currentTarget.style.color = "#333"; e.currentTarget.style.background = "#111113"; }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}

                {/* Add area */}
                {addingArea ? (
                  <div style={{ background: "#111113", border: "1px dashed #333", borderRadius: 12, padding: 16, display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      autoFocus value={newAreaName} onChange={e => setNewAreaName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addArea(); if (e.key === "Escape") setAddingArea(false); }}
                      placeholder="Area name..."
                      style={{ flex: 1, background: "#0a0a0a", border: "1px solid #333", borderRadius: 7, color: "#f0ede8", padding: "8px 10px", fontSize: 13 }}
                    />
                    <button onClick={addArea} style={{ background: "#f0ede8", color: "#0a0a0a", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 12, fontWeight: 700, fontFamily: "'Geist', sans-serif", cursor: "pointer" }}>ADD</button>
                    <button onClick={() => setAddingArea(false)} style={{ background: "transparent", color: "#555", border: "1px solid #252528", borderRadius: 7, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}>✕</button>
                  </div>
                ) : (
                  <button
                    className="area-card"
                    onClick={() => setAddingArea(true)}
                    style={{ background: "transparent", border: "1px dashed #252528", borderRadius: 12, cursor: "pointer", padding: "14px 18px", color: "#444", fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
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
      <div className="screen" style={{ minHeight: "100vh", background: "#0a0a0a" }}>

        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#0a0a0aee", backdropFilter: "blur(12px)", borderBottom: "1px solid #1a1a1e", padding: "0 20px" }}>
          <div style={{ maxWidth: 700, margin: "0 auto", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
            <button className="back-btn" onClick={() => setScreen("areas")} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 20, display: "flex", alignItems: "center", paddingRight: 4 }}>←</button>
            <FestivalLogo festival={festival} active={true} />
            <span style={{ color: "#2a2a2e", fontSize: 14 }}>·</span>
            <span style={{ fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 13, color: "#888", letterSpacing: "0.04em" }}>{DEPARTMENTS.find(d => d.id === activeDept)?.name}</span>
            <span style={{ color: "#2a2a2e", fontSize: 14 }}>·</span>
            <span style={{ fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 13, color: "#555", letterSpacing: "0.04em" }}>{activeYear}</span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setEditingCats(!editingCats)}
              style={{
                background: editingCats ? "#f0ede822" : "transparent",
                border: `1px solid ${editingCats ? "#555" : "#252528"}`,
                borderRadius: 8, color: editingCats ? "#f0ede8" : "#555",
                fontFamily: "'Geist', sans-serif", fontWeight: 700,
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
            <div style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: 32, color: "#f0ede8", lineHeight: 1.1, marginBottom: 10 }}>{selectedArea}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 3, background: "#1e1e22", borderRadius: 2, overflow: "hidden" }}>
                {(() => { const { rated, total } = areaScore(selectedArea); const color = areaAvgColor(selectedArea); return <div style={{ height: "100%", width: `${total > 0 ? (rated/total)*100 : 0}%`, background: color ?? "#333", transition: "width 0.4s", borderRadius: 2 }} />; })()}
              </div>
              {(() => { const { rated, total } = areaScore(selectedArea); return <span style={{ fontSize: 11, fontFamily: "'Geist', sans-serif", fontWeight: 700, color: "#555", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{rated}/{total} RATED</span>; })()}
            </div>
          </div>

          {/* Edit categories mode */}
          {editingCats ? (
            <div style={{ background: "#111113", border: "1px solid #1e1e22", borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: 13, color: "#888", letterSpacing: "0.1em", marginBottom: 16 }}>SECTIONS FOR THIS AREA</div>
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
                        fontFamily: "'Geist', sans-serif", fontWeight: 600,
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
                      fontFamily: "'Geist', sans-serif", fontWeight: 600,
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
                  style={{ flex: 1, background: "#0a0a0a", border: "1px solid #252528", borderRadius: 8, color: "#f0ede8", padding: "8px 12px", fontSize: 13 }}
                />
                <button
                  onClick={() => { if (newCatName.trim()) { setCats(selectedArea, [...cats, newCatName.trim()]); setNewCatName(""); } }}
                  style={{ background: "#f0ede8", color: "#0a0a0a", border: "none", borderRadius: 8, padding: "8px 16px", fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                >
                  ADD
                </button>
              </div>
            </div>
          ) : null}

          {/* Category sections */}
          {cats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#444", fontFamily: "'Geist', sans-serif", fontSize: 12, letterSpacing: "0.1em" }}>
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

          {/* Export to PDF */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #1a1a1e" }}>
            <button
              onClick={() => {
                const allAreas = areas[activeFestival] ?? [];
                exportToPDF({
                  festival: FESTIVALS.find(f => f.id === activeFestival),
                  year: activeYear,
                  areas: allAreas,
                  reviewData,
                  getCats,
                });
              }}
              style={{
                width: "100%", padding: "16px 24px",
                background: "#111113", border: "1px solid #252528",
                borderRadius: 12, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                fontFamily: "'Geist', sans-serif", fontWeight: 600, fontSize: 13,
                color: "#888", letterSpacing: "0.04em",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#444"; e.currentTarget.style.color = "#f0ede8"; e.currentTarget.style.background = "#161618"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#252528"; e.currentTarget.style.color = "#888"; e.currentTarget.style.background = "#111113"; }}
            >
              <span style={{ fontSize: 16 }}>↓</span>
              EXPORT ALL AREAS TO PDF — {activeYear}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
