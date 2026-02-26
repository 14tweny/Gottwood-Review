import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";
import { GOTTWOOD_LOGO, PEEP_LOGO, FOURTEEN_TWENTY_LOGO } from "./logos.js";

// ─── Default data ─────────────────────────────────────────────────────────────

const INITIAL_FESTIVALS = [
  { id: "gottwood", name: "Gottwood" },
  { id: "peep", name: "Peep Festival" },
  { id: "soysambu", name: "Soysambu" },
];

const INITIAL_YEARS = ["2022", "2023", "2024", "2025", "2026"];

const INITIAL_DEPARTMENTS = [
  { id: "production",        name: "Production" },
  { id: "council-licensing", name: "Council & Licensing" },
  { id: "artists",           name: "Artists" },
  { id: "logistics",         name: "Logistics" },
];

const DEFAULT_DEPT_AREAS = {
  gottwood: {
    "production": ["Woods Stage","Treehouse Stage","The Barn","Boxford","Captain Cabeza","Walled Garden","Boneyard","The Lawn","Trigon","Rickies Disco","The Lighthouse","The Curve","The Nest","Cocktail Bar (old curve)","Power & Electrics","Site General"],
    "council-licensing": ["Premises Licence","SAG Submissions","Noise Management","Medical Provision","Welfare & Safeguarding","Fire Safety","Traffic Management","Environmental Health"],
    "artists": ["Green Room","Artist Hospitality","Backline & Production Riders","Artist Transport","Guest List & Wristbands","Dressing Rooms"],
    "logistics": ["Main Gate","Crew Campsite","General Campsite","Boutique Campsite","Campsite Traders","Wellbeing","Medical & Welfare","Woods Traders","Lakeside Traders","Lake","Crew Catering","Waste & Recycling"],
  },
  peep: {
    "production": ["Main Stage","Stage 2","Bar / Social","Power & Electrics","Site General"],
    "council-licensing": ["Premises Licence","SAG Submissions","Noise Management","Medical Provision","Fire Safety"],
    "artists": ["Green Room","Artist Hospitality","Backline & Riders","Artist Transport"],
    "logistics": ["Entrance / Gate","Camping Zone","Traders","Welfare","Waste & Recycling"],
  },
  soysambu: {
    "production": ["Main Stage","Bar / Social","Power & Electrics","Site General"],
    "council-licensing": ["Permits & Licensing","Noise Management","Medical Provision"],
    "artists": ["Green Room","Artist Hospitality","Artist Transport"],
    "logistics": ["Entrance / Gate","Camping","Traders","Waste & Recycling"],
  },
};

const ALL_CATEGORIES = ["Lighting","Sound","Design","Space & Layout","Decor","Crowd Flow","Power & Electrics","Staging","Comms & Signage","Safety"];

const RATINGS = [
  { value: 1, label: "Poor",       color: "#ef4444" },
  { value: 2, label: "Needs Work", color: "#f97316" },
  { value: 3, label: "Average",    color: "#eab308" },
  { value: 4, label: "Good",       color: "#84cc16" },
  { value: 5, label: "Excellent",  color: "#22c55e" },
];

function slugify(s) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
function getRating(v) { return RATINGS.find(r => r.value === v); }

function useDebounce(fn, delay) {
  const t = useRef(null);
  return useCallback((...args) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { background: #0a0a0a; color: #f0ede8; font-family: 'Geist', sans-serif; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
  button { font-family: inherit; } textarea, input { font-family: inherit; }
  .screen { animation: fadeUp 0.25s cubic-bezier(0.16,1,0.3,1) both; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  .row-btn { transition: background 0.12s, border-color 0.12s, transform 0.12s; }
  .row-btn:hover { background: #1a1a1e !important; border-color: #333 !important; }
  .del-btn { transition: all 0.12s; }
  .del-btn:hover { border-color: #ef444466 !important; color: #ef4444 !important; background: #1a1010 !important; }
  .add-row { transition: border-color 0.12s, color 0.12s; }
  .add-row:hover { border-color: #444 !important; color: #888 !important; }
  .rating-btn { transition: all 0.18s cubic-bezier(0.34,1.56,0.64,1); }
  .rating-btn:hover { transform: scale(1.06); }
  .back-link { transition: color 0.12s; }
  .back-link:hover { color: #f0ede8 !important; }
  .save-pulse { animation: sp 0.4s ease; }
  @keyframes sp { 0%,100%{opacity:1}50%{opacity:0.3} }
  textarea { resize: vertical; min-height: 72px; }
  textarea:focus, input:focus { outline: none; border-color: #444 !important; }
`;

// ─── Shared UI ────────────────────────────────────────────────────────────────

function FestivalLogo({ festival, size = 42, opacity = 1 }) {
  if (festival.id === "gottwood") return <img src={GOTTWOOD_LOGO} style={{ height: size, opacity, display: "block", objectFit: "contain" }} alt="Gottwood" />;
  if (festival.id === "peep")     return <img src={PEEP_LOGO}     style={{ height: size, opacity, display: "block", objectFit: "contain" }} alt="Peep" />;
  return <span style={{ opacity, fontSize: size * 0.48, fontWeight: 700, letterSpacing: "0.06em" }}>{festival.name.toUpperCase()}</span>;
}

function AddRow({ placeholder, onAdd, buttonLabel = "ADD" }) {
  const [active, setActive] = useState(false);
  const [val, setVal] = useState("");
  const submit = () => { if (val.trim()) { onAdd(val.trim()); setVal(""); setActive(false); } };
  if (!active) return (
    <button className="add-row" onClick={() => setActive(true)} style={{ width: "100%", padding: "13px 18px", background: "transparent", border: "1px dashed #252528", borderRadius: 12, color: "#444", fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
      + ADD
    </button>
  );
  return (
    <div style={{ display: "flex", gap: 8, padding: "12px 0" }}>
      <input autoFocus value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") setActive(false); }} placeholder={placeholder} style={{ flex: 1, background: "#111113", border: "1px solid #333", borderRadius: 8, color: "#f0ede8", padding: "9px 12px", fontSize: 13 }} />
      <button onClick={submit} style={{ background: "#f0ede8", color: "#0a0a0a", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{buttonLabel}</button>
      <button onClick={() => setActive(false)} style={{ background: "transparent", color: "#555", border: "1px solid #252528", borderRadius: 8, padding: "9px 12px", fontSize: 12, cursor: "pointer" }}>✕</button>
    </div>
  );
}

function PageHeader({ children, maxWidth = 640 }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#0a0a0aee", backdropFilter: "blur(12px)", borderBottom: "1px solid #1a1a1e", padding: "0 20px" }}>
      <div style={{ maxWidth, margin: "0 auto", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function BackBtn({ onClick }) {
  return <button className="back-link" onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 20, paddingRight: 4, lineHeight: 1 }}>←</button>;
}

function Crumb({ text, dim }) {
  return <span style={{ fontWeight: 700, fontSize: 13, color: dim ? "#555" : "#888", letterSpacing: "0.04em" }}>{text}</span>;
}

function Dot() {
  return <span style={{ color: "#2a2a2e", fontSize: 14 }}>·</span>;
}

// ─── Rating components ────────────────────────────────────────────────────────

function RatingBar({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {RATINGS.map(r => {
        const active = value === r.value;
        return (
          <button key={r.value} className="rating-btn" onClick={() => onChange(active ? null : r.value)} title={r.label} style={{ flex: 1, height: 40, borderRadius: 8, border: `1.5px solid ${active ? r.color : "#252528"}`, background: active ? r.color + "22" : "#131315", color: active ? r.color : "#555", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
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
  const [local, setLocal] = useState({ rating: data?.rating ?? null, worked_well: data?.worked_well ?? "", needs_improvement: data?.needs_improvement ?? "", notes: data?.notes ?? "" });
  useEffect(() => { setLocal({ rating: data?.rating ?? null, worked_well: data?.worked_well ?? "", needs_improvement: data?.needs_improvement ?? "", notes: data?.notes ?? "" }); }, [data]);
  const debouncedSave = useDebounce(onSave, 900);
  const update = (patch) => { const next = { ...local, ...patch }; setLocal(next); debouncedSave(next); };
  const rating = getRating(local.rating);
  const hasContent = local.worked_well || local.needs_improvement || local.notes;
  return (
    <div style={{ background: "#111113", borderRadius: 12, border: `1px solid ${open ? "#2a2a30" : "#1e1e22"}`, overflow: "hidden", transition: "border-color 0.2s" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: rating ? rating.color : "#252528", boxShadow: rating ? `0 0 6px ${rating.color}66` : "none", transition: "background 0.2s" }} />
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.06em", flex: 1, color: rating || hasContent ? "#e8e4df" : "#555" }}>{catName.toUpperCase()}</span>
        {status === "saving" && <span style={{ fontSize: 10, color: "#555" }}>SAVING…</span>}
        {status === "saved" && <span className="save-pulse" style={{ fontSize: 10, color: "#22c55e" }}>SAVED</span>}
        {rating && !open && <span style={{ fontSize: 10, fontWeight: 700, color: rating.color, letterSpacing: "0.06em" }}>{rating.label.toUpperCase()}</span>}
        {hasContent && !open && !rating && <span style={{ fontSize: 10, color: "#444", letterSpacing: "0.06em" }}>NOTES</span>}
        <span style={{ color: "#333", fontSize: 12, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "inline-block", marginLeft: 4 }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid #1a1a1e" }}>
          <div style={{ paddingTop: 16 }}><RatingBar value={local.rating} onChange={v => update({ rating: v })} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={lbSt}>✓ What worked well</label>
              <textarea value={local.worked_well} onChange={e => update({ worked_well: e.target.value })} placeholder="What went well this year..." style={taSt("#0a1a12")} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={lbSt}>↑ Needs improvement</label>
              <textarea value={local.needs_improvement} onChange={e => update({ needs_improvement: e.target.value })} placeholder="What to fix next year..." style={taSt("#1a0e0e")} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={lbSt}>↗ Notes, suppliers & ideas</label>
            <textarea value={local.notes} onChange={e => update({ notes: e.target.value })} placeholder="Supplier contacts, costs, specs, ideas..." style={{ ...taSt("#0e0e1a"), minHeight: 52 }} />
          </div>
        </div>
      )}
    </div>
  );
}

const lbSt = { fontSize: 10, fontWeight: 600, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" };
const taSt = (bg) => ({ width: "100%", background: bg, border: "1px solid #222", borderRadius: 8, color: "#c8c4bf", fontSize: 13, padding: "10px 12px", lineHeight: 1.6, boxSizing: "border-box" });

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exportToPDF({ festival, year, areas, reviewData, getCats }) {
  if (!window.jspdf) {
    await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, m = 16, cW = W - m * 2;
  let y = m;
  const RC = { 1:[239,68,68], 2:[249,115,22], 3:[234,179,8], 4:[132,204,18], 5:[34,197,94] };
  const chk = (n=10) => { if (y + n > H - m) { doc.addPage(); y = m; } };
  doc.setFillColor(10,10,10); doc.rect(0,0,W,36,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(240,237,232);
  doc.text("PRODUCTION REVIEW", m, 16);
  doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(100,100,110);
  doc.text(`${festival.name.toUpperCase()}  ·  ${year}`, m, 25);
  doc.setFontSize(8); doc.text(`Generated ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}`, W-m, 25, {align:"right"});
  y = 46;
  for (const areaName of areas) {
    const aId = slugify(areaName);
    const cats = getCats(areaName);
    const hasData = cats.some(c => { const d = reviewData[`${aId}__${slugify(c)}`]; return d?.rating||d?.worked_well||d?.needs_improvement||d?.notes; });
    if (!hasData) continue;
    chk(20);
    doc.setFillColor(20,20,24); doc.roundedRect(m,y,cW,10,2,2,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(240,237,232);
    doc.text(areaName.toUpperCase(), m+4, y+6.8); y += 14;
    for (const cat of cats) {
      const d = reviewData[`${aId}__${slugify(cat)}`];
      if (!d?.rating&&!d?.worked_well&&!d?.needs_improvement&&!d?.notes) continue;
      chk(14);
      doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(180,176,170);
      doc.text(cat, m+2, y+4);
      if (d?.rating) {
        const rl = RATINGS.find(r=>r.value===d.rating)?.label??""; const rc = RC[d.rating]??[100,100,100];
        doc.setFillColor(...rc.map(c=>Math.round(c*0.15+10))); doc.setDrawColor(...rc); doc.setLineWidth(0.3);
        const bW = doc.getTextWidth(rl)+6; doc.roundedRect(W-m-bW-2,y,bW,6,1,1,"FD");
        doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(...rc);
        doc.text(rl.toUpperCase(), W-m-bW/2-2, y+4, {align:"center"});
      }
      y += 8;
      for (const [key,prefix,col] of [["worked_well","✓ ",[60,120,80]],["needs_improvement","↑ ",[140,60,60]],["notes","↗ ",[60,80,140]]]) {
        const txt = d?.[key]; if (!txt?.trim()) continue; chk(8);
        doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...col);
        const lines = doc.splitTextToSize(prefix+txt, cW-6); doc.text(lines, m+4, y+3);
        y += lines.length*4.5+2;
      }
      doc.setDrawColor(30,30,34); doc.setLineWidth(0.15); doc.line(m+2,y,W-m-2,y); y += 4;
    }
    y += 4;
  }
  const tp = doc.getNumberOfPages();
  for (let i=1;i<=tp;i++) { doc.setPage(i); doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(60,60,70); doc.text(`${festival.name} · ${year} · 14twenty Production Review`,m,H-8); doc.text(`${i}/${tp}`,W-m,H-8,{align:"right"}); }
  doc.save(`${festival.name.replace(/\s+/g,"-")}-${year}-production-review.pdf`);
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("festivals");
  const [activeFestival, setActiveFestival] = useState(null);
  const [activeYear, setActiveYear] = useState(null);
  const [activeDept, setActiveDept] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);

  // Editable lists
  const [festivals, setFestivals] = useState(INITIAL_FESTIVALS);
  const [years, setYears] = useState(INITIAL_YEARS);
  const [departments, setDepartments] = useState(INITIAL_DEPARTMENTS);
  const [areas, setAreas] = useState({});
  const [areaCategories, setAreaCategories] = useState({});

  // Review data
  const [reviewData, setReviewData] = useState({});
  const [saveStatuses, setSaveStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingCats, setEditingCats] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const deptKey = `${activeFestival}__${activeDept}`;

  // Load data when festival/year/dept changes
  useEffect(() => {
    if (!activeFestival || !activeDept) return;
    setAreas(prev => {
      if (prev[deptKey]) return prev;
      return { ...prev, [deptKey]: DEFAULT_DEPT_AREAS[activeFestival]?.[activeDept] ?? [] };
    });
    if (!activeYear) return;
    setLoading(true);
    supabase.from("reviews").select("*").eq("festival", activeFestival).eq("year", activeYear)
      .then(({ data, error }) => {
        if (!error && data) {
          const deptData = data.filter(r => r.area_emoji === activeDept);
          const map = {};
          deptData.forEach(row => {
            const aId = row.area_id.replace(`${activeDept}__`, "");
            map[`${aId}__${row.category_id}`] = { rating: row.rating, worked_well: row.worked_well, needs_improvement: row.needs_improvement, notes: row.notes };
          });
          setReviewData(map);
          const dbAreas = [...new Map(deptData.map(r => [r.area_id.replace(`${activeDept}__`,""), r.area_name])).entries()];
          setAreas(prev => {
            const existing = prev[deptKey] ?? DEFAULT_DEPT_AREAS[activeFestival]?.[activeDept] ?? [];
            const existingIds = new Set(existing.map(slugify));
            const extras = dbAreas.filter(([id]) => !existingIds.has(id)).map(([,name]) => name);
            return { ...prev, [deptKey]: [...existing, ...extras] };
          });
        }
        setLoading(false);
      });
  }, [activeFestival, activeYear, activeDept]);

  const getCats = useCallback((areaName) => {
    return areaCategories[`${activeFestival}__${activeDept}__${slugify(areaName)}`] ?? ALL_CATEGORIES;
  }, [activeFestival, activeDept, areaCategories]);

  const setCats = useCallback((areaName, cats) => {
    setAreaCategories(prev => ({ ...prev, [`${activeFestival}__${activeDept}__${slugify(areaName)}`]: cats }));
  }, [activeFestival, activeDept]);

  const handleSave = useCallback(async (areaName, catName, patch) => {
    const areaId = slugify(areaName), catId = slugify(catName), key = `${areaId}__${catId}`;
    setSaveStatuses(s => ({ ...s, [key]: "saving" }));
    const { error } = await supabase.from("reviews").upsert({
      festival: activeFestival, year: activeYear,
      area_id: `${activeDept}__${areaId}`, area_name: areaName, area_emoji: activeDept,
      category_id: catId, rating: patch.rating,
      worked_well: patch.worked_well ?? "", needs_improvement: patch.needs_improvement ?? "", notes: patch.notes ?? "",
      updated_at: new Date().toISOString(),
    }, { onConflict: "festival,year,area_id,category_id" });
    setSaveStatuses(s => ({ ...s, [key]: error ? "error" : "saved" }));
    if (!error) setReviewData(prev => ({ ...prev, [key]: patch }));
    setTimeout(() => setSaveStatuses(s => ({ ...s, [key]: "idle" })), 2500);
  }, [activeFestival, activeYear, activeDept]);

  function areaScore(areaName) {
    const cats = getCats(areaName), aId = slugify(areaName);
    const rated = cats.filter(c => reviewData[`${aId}__${slugify(c)}`]?.rating);
    return { rated: rated.length, total: cats.length };
  }

  function areaAvgColor(areaName) {
    const cats = getCats(areaName), aId = slugify(areaName);
    const vals = cats.map(c => reviewData[`${aId}__${slugify(c)}`]?.rating).filter(Boolean);
    if (!vals.length) return null;
    const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
    return avg >= 4 ? "#22c55e" : avg >= 3 ? "#eab308" : "#f97316";
  }

  const festival = festivals.find(f => f.id === activeFestival);
  const dept = departments.find(d => d.id === activeDept);
  const festivalAreas = areas[deptKey] ?? [];

  // ── Shared list screen layout ──
  function ListScreen({ title, subtitle, children, onBack, actions }) {
    return (
      <>
        <style>{css}</style>
        <div className="screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "#0a0a0a" }}>
          <div style={{ width: "100%", maxWidth: 560 }}>
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              {subtitle && <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", color: "#444", marginBottom: 14 }}>{subtitle}</div>}
              {title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {children}
            </div>
            {onBack && <button className="back-link" onClick={onBack} style={{ marginTop: 28, background: "none", border: "none", cursor: "pointer", color: "#444", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6, padding: 0 }}>← BACK</button>}
          </div>
        </div>
      </>
    );
  }

  function ListRow({ label, logoNode, onClick, onDelete, deleteConfirm }) {
    return (
      <div style={{ display: "flex", gap: 6 }}>
        <button className="row-btn" onClick={onClick} style={{ flex: 1, padding: "20px 24px", background: "#111113", border: "1px solid #1e1e22", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: logoNode ? "center" : "space-between", position: "relative" }}>
          {logoNode ?? <span style={{ fontWeight: 700, fontSize: 17, color: "#f0ede8", letterSpacing: "0.04em" }}>{label}</span>}
          {!logoNode && <span style={{ color: "#2a2a2e", fontSize: 16 }}>→</span>}
          {logoNode && <span style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#2a2a2e", fontSize: 16 }}>→</span>}
        </button>
        {onDelete && (
          <button className="del-btn" onClick={() => { if (window.confirm(deleteConfirm ?? "Remove this item?")) onDelete(); }} style={{ background: "#111113", border: "1px solid #1e1e22", borderRadius: 12, color: "#333", cursor: "pointer", padding: "0 14px", fontSize: 15, flexShrink: 0 }}>✕</button>
        )}
      </div>
    );
  }

  // ── SCREEN: Festivals ──
  if (screen === "festivals") {
    return (
      <ListScreen
        subtitle="PRODUCTION REVIEW SYSTEM"
        title={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <img src={FOURTEEN_TWENTY_LOGO} style={{ height: 96, objectFit: "contain" }} alt="14twenty" />
            <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.1em", color: "#555" }}>SELECT A FESTIVAL</div>
          </div>
        }
      >
        {festivals.map(f => (
          <ListRow
            key={f.id}
            onClick={() => { setActiveFestival(f.id); setScreen("year"); }}
            logoNode={
              f.id === "gottwood" ? <img src={GOTTWOOD_LOGO} style={{ height: 52, objectFit: "contain" }} alt="Gottwood" /> :
              f.id === "peep"     ? <img src={PEEP_LOGO}     style={{ height: 52, objectFit: "contain" }} alt="Peep" /> :
              <span style={{ fontWeight: 800, fontSize: 24, color: "#f0ede8", letterSpacing: "0.1em" }}>{f.name.toUpperCase()}</span>
            }
            onDelete={() => setFestivals(prev => prev.filter(x => x.id !== f.id))}
            deleteConfirm={`Remove "${f.name}" from the list?`}
          />
        ))}
        <AddRow placeholder="Festival name..." onAdd={name => setFestivals(prev => [...prev, { id: slugify(name), name }])} />
      </ListScreen>
    );
  }

  // ── SCREEN: Year ──
  if (screen === "year") {
    return (
      <ListScreen
        title={<div style={{ display: "flex", justifyContent: "center" }}><FestivalLogo festival={festival} size={52} /></div>}
        subtitle="SELECT A YEAR"
        onBack={() => setScreen("festivals")}
      >
        {[...years].reverse().map(y => (
          <ListRow
            key={y}
            label={y}
            onClick={() => { setActiveYear(y); setScreen("departments"); }}
            onDelete={() => setYears(prev => prev.filter(x => x !== y))}
            deleteConfirm={`Remove ${y} from the year list?`}
          />
        ))}
        <AddRow placeholder="e.g. 2027" onAdd={y => { if (!years.includes(y)) setYears(prev => [...prev, y].sort()); }} />
      </ListScreen>
    );
  }

  // ── SCREEN: Departments ──
  if (screen === "departments") {
    return (
      <ListScreen
        title={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <FestivalLogo festival={festival} size={52} />
            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: "#555" }}>{activeYear} · SELECT A DEPARTMENT</div>
          </div>
        }
        onBack={() => setScreen("year")}
      >
        {departments.map(d => (
          <ListRow
            key={d.id}
            label={d.name}
            onClick={() => { setActiveDept(d.id); setScreen("areas"); }}
            onDelete={() => setDepartments(prev => prev.filter(x => x.id !== d.id))}
            deleteConfirm={`Remove "${d.name}" department?`}
          />
        ))}
        <AddRow placeholder="Department name..." onAdd={name => setDepartments(prev => [...prev, { id: slugify(name), name }])} />
      </ListScreen>
    );
  }

  // ── SCREEN: Areas ──
  if (screen === "areas") {
    return (
      <>
        <style>{css}</style>
        <div className="screen" style={{ minHeight: "100vh", background: "#0a0a0a" }}>
          <PageHeader>
            <BackBtn onClick={() => setScreen("departments")} />
            <FestivalLogo festival={festival} size={42} />
            <div style={{ flex: 1 }} />
            <button onClick={() => setScreen("year")} style={{ background: "#1a1a1e", border: "1px solid #252528", borderRadius: 8, color: "#ccc", fontWeight: 700, fontSize: 12, padding: "6px 12px", cursor: "pointer", letterSpacing: "0.06em" }}>{activeYear} ▾</button>
          </PageHeader>

          <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px 60px" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 26, color: "#f0ede8", marginBottom: 4 }}>{dept?.name}</div>
              <div style={{ fontSize: 13, color: "#555" }}>{festivalAreas.length} areas · {activeYear}</div>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: "#444", fontSize: 12, letterSpacing: "0.1em" }}>LOADING…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {festivalAreas.map(areaName => {
                  const { rated, total } = areaScore(areaName);
                  const color = areaAvgColor(areaName);
                  return (
                    <div key={areaName} style={{ display: "flex", gap: 6 }}>
                      <button className="row-btn" onClick={() => { setSelectedArea(areaName); setScreen("area-detail"); setEditingCats(false); }} style={{ flex: 1, background: "#111113", border: "1px solid #1e1e22", borderRadius: 12, cursor: "pointer", textAlign: "left", padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: rated > 0 ? (color ?? "#555") : "#252528", boxShadow: rated > 0 && color ? `0 0 6px ${color}66` : "none" }} />
                        <span style={{ fontWeight: 700, fontSize: 14, color: rated > 0 ? "#e8e4df" : "#666", flex: 1 }}>{areaName}</span>
                        <div style={{ width: 70, height: 3, background: "#1e1e22", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                          <div style={{ height: "100%", width: `${total > 0 ? (rated/total)*100 : 0}%`, background: color ?? "#333", borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: rated > 0 ? (color ?? "#888") : "#2a2a2e", letterSpacing: "0.06em", minWidth: 40, textAlign: "right" }}>{rated > 0 ? `${rated}/${total}` : "—"}</span>
                        <span style={{ color: "#2a2a2e", fontSize: 14 }}>→</span>
                      </button>
                      <button className="del-btn" onClick={() => { if (window.confirm(`Remove "${areaName}"?`)) setAreas(prev => ({ ...prev, [deptKey]: prev[deptKey].filter(a => a !== areaName) })); }} style={{ background: "#111113", border: "1px solid #1e1e22", borderRadius: 12, color: "#333", cursor: "pointer", padding: "0 14px", fontSize: 15, flexShrink: 0 }}>✕</button>
                    </div>
                  );
                })}
                <AddRow placeholder="Area name..." onAdd={name => setAreas(prev => ({ ...prev, [deptKey]: [...(prev[deptKey] ?? []), name] }))} />
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
        <PageHeader>
          <BackBtn onClick={() => setScreen("areas")} />
          <FestivalLogo festival={festival} size={42} />
          <Dot /><Crumb text={dept?.name} />
          <Dot /><Crumb text={activeYear} dim />
          <div style={{ flex: 1 }} />
          <button onClick={() => setEditingCats(!editingCats)} style={{ background: editingCats ? "#f0ede811" : "transparent", border: `1px solid ${editingCats ? "#555" : "#252528"}`, borderRadius: 8, color: editingCats ? "#f0ede8" : "#555", fontWeight: 700, fontSize: 10, letterSpacing: "0.08em", padding: "5px 12px", cursor: "pointer" }}>
            {editingCats ? "DONE" : "EDIT SECTIONS"}
          </button>
        </PageHeader>

        <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px 80px" }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontWeight: 800, fontSize: 30, color: "#f0ede8", lineHeight: 1.1, marginBottom: 10 }}>{selectedArea}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 3, background: "#1e1e22", borderRadius: 2, overflow: "hidden" }}>
                {(() => { const { rated, total } = areaScore(selectedArea); const color = areaAvgColor(selectedArea); return <div style={{ height: "100%", width: `${total>0?(rated/total)*100:0}%`, background: color ?? "#333", transition: "width 0.4s", borderRadius: 2 }} />; })()}
              </div>
              {(() => { const { rated, total } = areaScore(selectedArea); return <span style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{rated}/{total} RATED</span>; })()}
            </div>
          </div>

          {/* Edit sections */}
          {editingCats && (
            <div style={{ background: "#111113", border: "1px solid #1e1e22", borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: "#666", letterSpacing: "0.1em", marginBottom: 14 }}>SECTIONS FOR THIS AREA</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {ALL_CATEGORIES.map(cat => {
                  const active = cats.includes(cat);
                  return (
                    <button key={cat} onClick={() => active ? setCats(selectedArea, cats.filter(c=>c!==cat)) : setCats(selectedArea, [...cats, cat])} style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${active ? "#f0ede8" : "#252528"}`, background: active ? "#f0ede811" : "transparent", color: active ? "#f0ede8" : "#555", fontWeight: 600, fontSize: 12, cursor: "pointer", letterSpacing: "0.04em" }}>
                      {active ? "✓ " : ""}{cat}
                    </button>
                  );
                })}
                {cats.filter(c => !ALL_CATEGORIES.includes(c)).map(cat => (
                  <button key={cat} onClick={() => setCats(selectedArea, cats.filter(c2=>c2!==cat))} style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid #f0ede8", background: "#f0ede811", color: "#f0ede8", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>✓ {cat} ✕</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => { if (e.key==="Enter"&&newCatName.trim()) { setCats(selectedArea,[...cats,newCatName.trim()]); setNewCatName(""); } }} placeholder="Add custom section (e.g. Fencing)..." style={{ flex: 1, background: "#0a0a0a", border: "1px solid #252528", borderRadius: 8, color: "#f0ede8", padding: "8px 12px", fontSize: 13 }} />
                <button onClick={() => { if (newCatName.trim()) { setCats(selectedArea,[...cats,newCatName.trim()]); setNewCatName(""); } }} style={{ background: "#f0ede8", color: "#0a0a0a", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>ADD</button>
              </div>
            </div>
          )}

          {cats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#444", fontSize: 12, letterSpacing: "0.1em" }}>NO SECTIONS — TAP "EDIT SECTIONS" TO ADD SOME</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cats.map(cat => {
                const key = `${areaId}__${slugify(cat)}`;
                return <CategorySection key={key} catName={cat} data={reviewData[key]} saveKey={key} saveStatuses={saveStatuses} onSave={patch => handleSave(selectedArea, cat, patch)} />;
              })}
            </div>
          )}

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #1a1a1e" }}>
            <button
              onClick={() => exportToPDF({ festival, year: activeYear, areas: festivalAreas, reviewData, getCats })}
              style={{ width: "100%", padding: "16px 24px", background: "#111113", border: "1px solid #252528", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontWeight: 600, fontSize: 13, color: "#888", letterSpacing: "0.04em", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="#444"; e.currentTarget.style.color="#f0ede8"; e.currentTarget.style.background="#161618"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="#252528"; e.currentTarget.style.color="#888"; e.currentTarget.style.background="#111113"; }}
            >
              <span style={{ fontSize: 16 }}>↓</span> EXPORT ALL AREAS TO PDF — {activeYear}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
