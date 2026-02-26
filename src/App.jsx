import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";
import { GOTTWOOD_LOGO, PEEP_LOGO, FOURTEEN_TWENTY_LOGO } from "./logos.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_FESTIVALS = [
  { id: "gottwood", name: "Gottwood" },
  { id: "peep",     name: "Peep Festival" },
  { id: "soysambu", name: "Soysambu" },
];

const INITIAL_YEARS = ["2022","2023","2024","2025","2026"];
const CURRENT_YEAR  = "2026"; // years >= this are TRACKER mode

const INITIAL_DEPARTMENTS = [
  { id: "production",        name: "Production" },
  { id: "council-licensing", name: "Council & Licensing" },
  { id: "artists",           name: "Artists" },
  { id: "logistics",         name: "Logistics" },
];

// ── Review categories per department ──────────────────────────────────────────
const DEPT_REVIEW_CATS = {
  "production": [
    "Lighting","Sound","Staging","Power & Electrics","Design",
    "Space & Layout","Decor","Crowd Flow","Comms & Signage","Safety",
  ],
  "council-licensing": [
    "Submission Timelines","Council Responsiveness","Condition Compliance",
    "Noise Monitoring","Medical Provision Sign-off","Crowd Management Plan",
    "Traffic & Parking Plan","Environmental Considerations","Post-Event Reporting",
  ],
  "artists": [
    "Hospitality Rider Fulfilment","Catering Quality","Room Setup & Comfort",
    "WiFi & Comms","Security & Privacy","Changeover Management",
    "Transport Punctuality","Guest List Accuracy","Backline Accuracy","Overall Artist Experience",
  ],
  "logistics": [
    "Crew Briefing","Signage & Wayfinding","Vehicle Access","Waste Management",
    "Welfare Provision","Communication (Radios/Comms)","Staffing Levels",
    "Trader Management","Timeline Adherence",
  ],
};

// ── Default tracker tasks per dept + area keyword matching ────────────────────
const DEPT_DEFAULT_TASKS = {
  "production": {
    _default: ["Site survey complete","Power spec agreed","Supplier confirmed","Crew call sheet drafted","Safety briefing scheduled"],
    "stage":   ["Stage plan submitted to SAG","Lighting rig design signed off","Sound spec confirmed","Backline list finalised","Changeover schedule agreed","Power distribution planned","Structural sign-off obtained"],
    "power":   ["Generator hire confirmed","Distribution layout designed","Cable runs planned","Load calculation complete","Electrical safety check booked"],
    "gate":    ["Barrier layout agreed","Wristband stock ordered","Scanning equipment confirmed","Crew briefing scheduled","Signage designed"],
  },
  "council-licensing": {
    _default: ["Initial correspondence sent","Deadline noted in calendar","Document drafted","Reviewed by team","Submitted"],
    "licence": ["Premises licence variation submitted","TENs applications submitted","DPS briefed","Licence conditions reviewed","Compliance schedule created"],
    "sag":     ["SAG meeting date confirmed","EMP first draft complete","EMP final version submitted","Medical plan approved","Crowd management plan approved","Traffic management plan approved"],
    "noise":   ["Noise consultant appointed","Noise management plan drafted","Monitoring points agreed","Complaint procedure in place","Post-event noise report scheduled"],
    "medical": ["Medical provider contracted","Medical plan submitted to SAG","Ambulance cover confirmed","First aid posts mapped","Medical briefing scheduled"],
  },
  "artists": {
    _default: ["Initial contact made","Rider received and reviewed","Hospitality confirmed","Travel/transport arranged","Day-of-show briefing sent"],
    "green":  ["Room allocated and prepped","Rider items sourced","Catering confirmed","WiFi access provided","Security briefed","Changeover schedule shared"],
    "transport": ["Pickup times confirmed","Driver briefed","Vehicle booked","Meet & greet arranged","Emergency contact shared"],
    "backline": ["Backline list received","Hire items confirmed","Stage plot reviewed","Sound check time agreed","Tech spec shared with crew"],
    "guest":  ["Guest list deadline set","List received from artist","Wristbands allocated","Entry point briefed","Final numbers confirmed"],
  },
  "logistics": {
    _default: ["Responsibility assigned","Timeline agreed","Resource confirmed","Briefing scheduled","Sign-off obtained"],
    "campsite": ["Pitch layout designed","Welfare patrol schedule set","Quiet hours communicated","Facilities mapped","Security coverage agreed"],
    "traders": ["Trader contracts signed","Pitch layout agreed","Power supply confirmed","Waste responsibilities briefed","Health & safety checks scheduled"],
    "waste":  ["Waste contractor confirmed","Collection schedule agreed","Recycling stations mapped","Crew briefed","Post-event report planned"],
    "welfare": ["Welfare provider contracted","Welfare tent location agreed","Staff briefed","Referral pathway in place","Safeguarding lead identified"],
  },
};

const DEFAULT_DEPT_AREAS = {
  gottwood: {
    "production":        ["Woods Stage","Treehouse Stage","The Barn","Boxford","Captain Cabeza","Walled Garden","Boneyard","The Lawn","Trigon","Rickies Disco","The Lighthouse","The Curve","The Nest","Cocktail Bar (old curve)","Power & Electrics","Site General"],
    "council-licensing": ["Premises Licence","SAG Submissions","Noise Management","Medical Provision","Welfare & Safeguarding","Fire Safety","Traffic Management","Environmental Health"],
    "artists":           ["Green Room","Artist Hospitality","Backline & Production Riders","Artist Transport","Guest List & Wristbands","Dressing Rooms"],
    "logistics":         ["Main Gate","Crew Campsite","General Campsite","Boutique Campsite","Campsite Traders","Wellbeing","Medical & Welfare","Woods Traders","Lakeside Traders","Lake","Crew Catering","Waste & Recycling"],
  },
  peep: {
    "production":        ["Main Stage","Stage 2","Bar / Social","Power & Electrics","Site General"],
    "council-licensing": ["Premises Licence","SAG Submissions","Noise Management","Medical Provision","Fire Safety"],
    "artists":           ["Green Room","Artist Hospitality","Backline & Riders","Artist Transport"],
    "logistics":         ["Entrance / Gate","Camping Zone","Traders","Welfare","Waste & Recycling"],
  },
  soysambu: {
    "production":        ["Main Stage","Bar / Social","Power & Electrics","Site General"],
    "council-licensing": ["Permits & Licensing","Noise Management","Medical Provision"],
    "artists":           ["Green Room","Artist Hospitality","Artist Transport"],
    "logistics":         ["Entrance / Gate","Camping","Traders","Waste & Recycling"],
  },
};

const TASK_STATUSES = [
  { id: "not-started", label: "Not Started", color: "#3a3a3e" },
  { id: "in-progress", label: "In Progress", color: "#eab308" },
  { id: "done",        label: "Done",        color: "#22c55e" },
  { id: "blocked",     label: "Blocked",     color: "#ef4444" },
];

const REVIEW_RATINGS = [
  { value: 1, label: "Poor",       color: "#ef4444" },
  { value: 2, label: "Needs Work", color: "#f97316" },
  { value: 3, label: "Average",    color: "#eab308" },
  { value: 4, label: "Good",       color: "#84cc16" },
  { value: 5, label: "Excellent",  color: "#22c55e" },
];

function slugify(s) { return s.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""); }
function getRating(v) { return REVIEW_RATINGS.find(r => r.value === v); }
function isTrackerYear(y) { return y >= CURRENT_YEAR; }

function getDefaultTasks(dept, areaName) {
  const pool = DEPT_DEFAULT_TASKS[dept] ?? {};
  const slug = slugify(areaName);
  const matched = Object.entries(pool).find(([key]) => key !== "_default" && slug.includes(key));
  return (matched ? matched[1] : pool._default ?? []).map((label, i) => ({
    id: `task-${Date.now()}-${i}`,
    label,
    status: "not-started",
    owner: "",
    notes: "",
    due: "",
  }));
}

function useDebounce(fn, delay) {
  const t = useRef(null);
  return useCallback((...args) => { clearTimeout(t.current); t.current = setTimeout(() => fn(...args), delay); }, [fn, delay]);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{height:100%}
  body{background:#0a0a0a;color:#f0ede8;font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased}
  ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px}
  button{font-family:inherit}textarea,input{font-family:inherit}
  .screen{animation:fadeUp 0.25s cubic-bezier(0.16,1,0.3,1) both}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .row-btn{transition:background 0.12s,border-color 0.12s}
  .row-btn:hover{background:#1a1a1e!important;border-color:#333!important}
  .del-btn{transition:all 0.12s}
  .del-btn:hover{border-color:#ef444466!important;color:#ef4444!important;background:#1a1010!important}
  .add-row{transition:border-color 0.12s,color 0.12s}
  .add-row:hover{border-color:#444!important;color:#888!important}
  .rating-btn{transition:all 0.18s cubic-bezier(0.34,1.56,0.64,1)}
  .rating-btn:hover{transform:scale(1.06)}
  .back-link{transition:color 0.12s}
  .back-link:hover{color:#f0ede8!important}
  .save-pulse{animation:sp 0.4s ease}
  @keyframes sp{0%,100%{opacity:1}50%{opacity:0.3}}
  .task-row{transition:background 0.12s}
  .task-row:hover{background:#161618!important}
  textarea{resize:vertical;min-height:64px}
  textarea:focus,input:focus{outline:none;border-color:#444!important}
  select{font-family:inherit;cursor:pointer}
  select:focus{outline:none}
`;

// ─── Shared UI ────────────────────────────────────────────────────────────────

function FestivalLogo({ festival, size = 42, opacity = 1 }) {
  if (festival.id === "gottwood") return <img src={GOTTWOOD_LOGO} style={{ height: size, opacity, display: "block", objectFit: "contain" }} alt="Gottwood" />;
  if (festival.id === "peep")     return <img src={PEEP_LOGO}     style={{ height: size, opacity, display: "block", objectFit: "contain" }} alt="Peep" />;
  return <span style={{ opacity, fontSize: size * 0.46, fontWeight: 700, letterSpacing: "0.06em" }}>{festival.name.toUpperCase()}</span>;
}

function PageHeader({ children }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#0a0a0aee", backdropFilter: "blur(12px)", borderBottom: "1px solid #1a1a1e", padding: "0 20px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", height: 56, display: "flex", alignItems: "center", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function BackBtn({ onClick }) {
  return <button className="back-link" onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 20, paddingRight: 4, lineHeight: 1, flexShrink: 0 }}>←</button>;
}

function Pill({ label, color, bg }) {
  return <span style={{ fontSize: 10, fontWeight: 700, color, background: bg ?? color + "18", border: `1px solid ${color}44`, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{label.toUpperCase()}</span>;
}

function ModeBadge({ tracker }) {
  return tracker
    ? <span style={{ fontSize: 9, fontWeight: 700, color: "#22c55e", background: "#22c55e18", border: "1px solid #22c55e33", padding: "2px 8px", borderRadius: 20, letterSpacing: "0.1em" }}>TRACKER</span>
    : <span style={{ fontSize: 9, fontWeight: 700, color: "#888", background: "#88888818", border: "1px solid #88888833", padding: "2px 8px", borderRadius: 20, letterSpacing: "0.1em" }}>REVIEW</span>;
}

function AddRow({ placeholder, onAdd }) {
  const [active, setActive] = useState(false);
  const [val, setVal] = useState("");
  const submit = () => { if (val.trim()) { onAdd(val.trim()); setVal(""); setActive(false); } };
  if (!active) return (
    <button className="add-row" onClick={() => setActive(true)} style={{ width: "100%", padding: "13px 18px", background: "transparent", border: "1px dashed #252528", borderRadius: 12, color: "#444", fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>+ ADD</button>
  );
  return (
    <div style={{ display: "flex", gap: 8, padding: "8px 0" }}>
      <input autoFocus value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key==="Enter") submit(); if (e.key==="Escape") setActive(false); }} placeholder={placeholder} style={{ flex: 1, background: "#111113", border: "1px solid #333", borderRadius: 8, color: "#f0ede8", padding: "9px 12px", fontSize: 13 }} />
      <button onClick={submit} style={{ background: "#f0ede8", color: "#0a0a0a", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>ADD</button>
      <button onClick={() => setActive(false)} style={{ background: "transparent", color: "#555", border: "1px solid #252528", borderRadius: 8, padding: "9px 12px", fontSize: 12, cursor: "pointer" }}>✕</button>
    </div>
  );
}

// ─── Review mode components ───────────────────────────────────────────────────

function RatingBar({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {REVIEW_RATINGS.map(r => {
        const active = value === r.value;
        return (
          <button key={r.value} className="rating-btn" onClick={() => onChange(active ? null : r.value)} style={{ flex: 1, height: 40, borderRadius: 8, border: `1.5px solid ${active ? r.color : "#252528"}`, background: active ? r.color+"22" : "#131315", color: active ? r.color : "#555", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>{r.value}</span>
            <span style={{ fontSize: 9, opacity: active ? 1 : 0.5, letterSpacing: "0.06em" }}>{r.label.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}

const lbSt = { fontSize: 10, fontWeight: 600, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" };
const taSt = (bg) => ({ width: "100%", background: bg, border: "1px solid #222", borderRadius: 8, color: "#c8c4bf", fontSize: 13, padding: "10px 12px", lineHeight: 1.6, boxSizing: "border-box" });

function ReviewSection({ catName, data, onSave, saveKey, saveStatuses }) {
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
        <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: rating ? rating.color : "#252528", boxShadow: rating ? `0 0 6px ${rating.color}66` : "none" }} />
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.05em", flex: 1, color: rating || hasContent ? "#e8e4df" : "#555" }}>{catName.toUpperCase()}</span>
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
              <textarea value={local.worked_well} onChange={e => update({ worked_well: e.target.value })} placeholder="What went well..." style={taSt("#0a1a12")} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={lbSt}>↑ Needs improvement</label>
              <textarea value={local.needs_improvement} onChange={e => update({ needs_improvement: e.target.value })} placeholder="What to fix..." style={taSt("#1a0e0e")} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={lbSt}>↗ Notes, suppliers & ideas</label>
            <textarea value={local.notes} onChange={e => update({ notes: e.target.value })} placeholder="Contacts, costs, specs..." style={{ ...taSt("#0e0e1a"), minHeight: 52 }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tracker mode components ──────────────────────────────────────────────────

function StatusSelect({ value, onChange }) {
  const st = TASK_STATUSES.find(s => s.id === value) ?? TASK_STATUSES[0];
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ background: "#0a0a0a", border: `1px solid ${st.color}66`, borderRadius: 6, color: st.color, fontSize: 11, fontWeight: 700, padding: "4px 8px", letterSpacing: "0.06em", flexShrink: 0 }}>
      {TASK_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label.toUpperCase()}</option>)}
    </select>
  );
}

function TaskRow({ task, onChange, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const st = TASK_STATUSES.find(s => s.id === task.status) ?? TASK_STATUSES[0];
  return (
    <div className="task-row" style={{ background: "#111113", borderRadius: 10, border: `1px solid ${expanded ? "#2a2a30" : "#1e1e22"}`, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px" }}>
        {/* Status dot */}
        <div style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: st.color, boxShadow: task.status !== "not-started" ? `0 0 6px ${st.color}66` : "none" }} />
        {/* Label */}
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: task.status === "done" ? "#555" : "#d0ccc8", textDecoration: task.status === "done" ? "line-through" : "none", cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
          {task.label}
        </span>
        {/* Owner badge */}
        {task.owner && <span style={{ fontSize: 10, color: "#888", background: "#1e1e22", padding: "2px 8px", borderRadius: 20, letterSpacing: "0.04em", flexShrink: 0 }}>{task.owner}</span>}
        {/* Status select */}
        <StatusSelect value={task.status} onChange={v => onChange({ ...task, status: v })} />
        {/* Expand / delete */}
        <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", color: "#333", fontSize: 11, cursor: "pointer", padding: "0 2px", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</button>
        <button className="del-btn" onClick={onDelete} style={{ background: "none", border: "none", color: "#333", fontSize: 13, cursor: "pointer", padding: "0 2px", flexShrink: 0 }}>✕</button>
      </div>
      {expanded && (
        <div style={{ padding: "0 14px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, borderTop: "1px solid #1a1a1e" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 12 }}>
            <label style={lbSt}>Owner</label>
            <input value={task.owner} onChange={e => onChange({ ...task, owner: e.target.value })} placeholder="e.g. Angus" style={{ background: "#0a0a0a", border: "1px solid #252528", borderRadius: 7, color: "#f0ede8", padding: "7px 10px", fontSize: 12 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 12 }}>
            <label style={lbSt}>Due date</label>
            <input type="date" value={task.due} onChange={e => onChange({ ...task, due: e.target.value })} style={{ background: "#0a0a0a", border: "1px solid #252528", borderRadius: 7, color: task.due ? "#f0ede8" : "#555", padding: "7px 10px", fontSize: 12 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 12 }}>
            <label style={lbSt}>Notes</label>
            <input value={task.notes} onChange={e => onChange({ ...task, notes: e.target.value })} placeholder="Add a note..." style={{ background: "#0a0a0a", border: "1px solid #252528", borderRadius: 7, color: "#f0ede8", padding: "7px 10px", fontSize: 12 }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exportToPDF({ festival, year, areas, reviewData, getCats }) {
  if (!window.jspdf) { await new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W=210,H=297,m=16,cW=W-m*2; let y=m;
  const RC={1:[239,68,68],2:[249,115,22],3:[234,179,8],4:[132,204,18],5:[34,197,94]};
  const chk=(n=10)=>{ if(y+n>H-m){doc.addPage();y=m;} };
  doc.setFillColor(10,10,10); doc.rect(0,0,W,36,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(240,237,232);
  doc.text("PRODUCTION REVIEW",m,16);
  doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(100,100,110);
  doc.text(`${festival.name.toUpperCase()}  ·  ${year}`,m,25);
  doc.setFontSize(8); doc.text(`Generated ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}`,W-m,25,{align:"right"});
  y=46;
  for (const areaName of areas) {
    const aId=slugify(areaName), cats=getCats(areaName);
    const hasData=cats.some(c=>{const d=reviewData[`${aId}__${slugify(c)}`];return d?.rating||d?.worked_well||d?.needs_improvement||d?.notes;});
    if(!hasData) continue;
    chk(20);
    doc.setFillColor(20,20,24); doc.roundedRect(m,y,cW,10,2,2,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(240,237,232);
    doc.text(areaName.toUpperCase(),m+4,y+6.8); y+=14;
    for (const cat of cats) {
      const d=reviewData[`${aId}__${slugify(cat)}`];
      if(!d?.rating&&!d?.worked_well&&!d?.needs_improvement&&!d?.notes) continue;
      chk(14);
      doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(180,176,170);
      doc.text(cat,m+2,y+4);
      if(d?.rating){const rl=REVIEW_RATINGS.find(r=>r.value===d.rating)?.label??"";const rc=RC[d.rating]??[100,100,100];doc.setFillColor(...rc.map(c=>Math.round(c*0.15+10)));doc.setDrawColor(...rc);doc.setLineWidth(0.3);const bW=doc.getTextWidth(rl)+6;doc.roundedRect(W-m-bW-2,y,bW,6,1,1,"FD");doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(...rc);doc.text(rl.toUpperCase(),W-m-bW/2-2,y+4,{align:"center"});}
      y+=8;
      for(const[key,prefix,col]of[["worked_well","✓ ",[60,120,80]],["needs_improvement","↑ ",[140,60,60]],["notes","↗ ",[60,80,140]]]){const txt=d?.[key];if(!txt?.trim())continue;chk(8);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(...col);const lines=doc.splitTextToSize(prefix+txt,cW-6);doc.text(lines,m+4,y+3);y+=lines.length*4.5+2;}
      doc.setDrawColor(30,30,34);doc.setLineWidth(0.15);doc.line(m+2,y,W-m-2,y);y+=4;
    }
    y+=4;
  }
  const tp=doc.getNumberOfPages();
  for(let i=1;i<=tp;i++){doc.setPage(i);doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(60,60,70);doc.text(`${festival.name} · ${year} · 14twenty Production Review`,m,H-8);doc.text(`${i}/${tp}`,W-m,H-8,{align:"right"});}
  doc.save(`${festival.name.replace(/\s+/g,"-")}-${year}-production-review.pdf`);
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen]             = useState("festivals");
  const [activeFestival, setActiveFestival] = useState(null);
  const [activeYear, setActiveYear]     = useState(null);
  const [activeDept, setActiveDept]     = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);

  const [festivals, setFestivals]       = useState(INITIAL_FESTIVALS);
  const [years, setYears]               = useState(INITIAL_YEARS);
  const [departments, setDepartments]   = useState(INITIAL_DEPARTMENTS);
  const [areas, setAreas]               = useState({});
  const [areaCategories, setAreaCategories] = useState({});

  // Review data
  const [reviewData, setReviewData]     = useState({});
  const [saveStatuses, setSaveStatuses] = useState({});
  // Tracker data — keyed by deptAreaKey → task[]
  const [trackerData, setTrackerData]   = useState({});

  const [loading, setLoading]           = useState(false);
  const [editingCats, setEditingCats]   = useState(false);
  const [newCatName, setNewCatName]     = useState("");

  const tracker  = isTrackerYear(activeYear);
  const deptKey  = `${activeFestival}__${activeDept}`;
  const festival = festivals.find(f => f.id === activeFestival);
  const dept     = departments.find(d => d.id === activeDept);
  const festivalAreas = areas[deptKey] ?? [];

  // Load areas + review data
  useEffect(() => {
    if (!activeFestival || !activeDept) return;
    setAreas(prev => {
      if (prev[deptKey]) return prev;
      return { ...prev, [deptKey]: DEFAULT_DEPT_AREAS[activeFestival]?.[activeDept] ?? [] };
    });
    if (!activeYear || tracker) { setLoading(false); return; }
    setLoading(true);
    supabase.from("reviews").select("*").eq("festival",activeFestival).eq("year",activeYear)
      .then(({ data, error }) => {
        if (!error && data) {
          const deptData = data.filter(r => r.area_emoji === activeDept);
          const map = {};
          deptData.forEach(row => { const aId=row.area_id.replace(`${activeDept}__`,""); map[`${aId}__${row.category_id}`]={ rating:row.rating, worked_well:row.worked_well, needs_improvement:row.needs_improvement, notes:row.notes }; });
          setReviewData(map);
          const dbAreas=[...new Map(deptData.map(r=>[r.area_id.replace(`${activeDept}__`,""),r.area_name])).entries()];
          setAreas(prev=>{const existing=prev[deptKey]??DEFAULT_DEPT_AREAS[activeFestival]?.[activeDept]??[];const existingIds=new Set(existing.map(slugify));const extras=dbAreas.filter(([id])=>!existingIds.has(id)).map(([,name])=>name);return{...prev,[deptKey]:[...existing,...extras]};});
        }
        setLoading(false);
      });
  }, [activeFestival, activeYear, activeDept]);

  // Tracker helpers
  function getTrackerKey(areaName) { return `${activeFestival}__${activeYear}__${activeDept}__${slugify(areaName)}`; }
  function getAreaTasks(areaName) {
    const key = getTrackerKey(areaName);
    if (trackerData[key]) return trackerData[key];
    return getDefaultTasks(activeDept, areaName);
  }
  function setAreaTasks(areaName, tasks) {
    setTrackerData(prev => ({ ...prev, [getTrackerKey(areaName)]: tasks }));
  }

  // Review helpers
  const getCats = useCallback((areaName) => {
    return areaCategories[`${activeFestival}__${activeDept}__${slugify(areaName)}`] ?? (DEPT_REVIEW_CATS[activeDept] ?? []);
  }, [activeFestival, activeDept, areaCategories]);

  const setCats = useCallback((areaName, cats) => {
    setAreaCategories(prev => ({ ...prev, [`${activeFestival}__${activeDept}__${slugify(areaName)}`]: cats }));
  }, [activeFestival, activeDept]);

  const handleSave = useCallback(async (areaName, catName, patch) => {
    const areaId=slugify(areaName), catId=slugify(catName), key=`${areaId}__${catId}`;
    setSaveStatuses(s=>({...s,[key]:"saving"}));
    const{error}=await supabase.from("reviews").upsert({ festival:activeFestival, year:activeYear, area_id:`${activeDept}__${areaId}`, area_name:areaName, area_emoji:activeDept, category_id:catId, rating:patch.rating, worked_well:patch.worked_well??"", needs_improvement:patch.needs_improvement??"", notes:patch.notes??"", updated_at:new Date().toISOString() },{onConflict:"festival,year,area_id,category_id"});
    setSaveStatuses(s=>({...s,[key]:error?"error":"saved"}));
    if(!error) setReviewData(prev=>({...prev,[key]:patch}));
    setTimeout(()=>setSaveStatuses(s=>({...s,[key]:"idle"})),2500);
  }, [activeFestival, activeYear, activeDept]);

  // Tracker area stats
  function areaTaskStats(areaName) {
    const tasks = getAreaTasks(areaName);
    const done = tasks.filter(t => t.status === "done").length;
    const blocked = tasks.filter(t => t.status === "blocked").length;
    const inProgress = tasks.filter(t => t.status === "in-progress").length;
    return { total: tasks.length, done, blocked, inProgress };
  }

  function areaRAGColor(areaName) {
    const { total, done, blocked, inProgress } = areaTaskStats(areaName);
    if (!total) return null;
    if (blocked > 0) return "#ef4444";
    const pct = done / total;
    if (pct === 1) return "#22c55e";
    if (pct >= 0.5 || inProgress > 0) return "#eab308";
    return "#f97316";
  }

  // Review area stats
  function areaReviewScore(areaName) {
    const cats = getCats(areaName), aId = slugify(areaName);
    const rated = cats.filter(c => reviewData[`${aId}__${slugify(c)}`]?.rating);
    return { rated: rated.length, total: cats.length };
  }
  function areaReviewColor(areaName) {
    const cats = getCats(areaName), aId = slugify(areaName);
    const vals = cats.map(c => reviewData[`${aId}__${slugify(c)}`]?.rating).filter(Boolean);
    if (!vals.length) return null;
    const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
    return avg >= 4 ? "#22c55e" : avg >= 3 ? "#eab308" : "#f97316";
  }

  // ── Shared list screen ────────────────────────────────────────────────────
  function ListScreen({ title, subtitle, children, onBack }) {
    return (
      <>
        <style>{css}</style>
        <div className="screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "#0a0a0a" }}>
          <div style={{ width: "100%", maxWidth: 560 }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              {subtitle && <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", color: "#444", marginBottom: 14 }}>{subtitle}</div>}
              {title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
            {onBack && <button className="back-link" onClick={onBack} style={{ marginTop: 28, background: "none", border: "none", cursor: "pointer", color: "#444", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6, padding: 0 }}>← BACK</button>}
          </div>
        </div>
      </>
    );
  }

  function ListRow({ label, logoNode, yearLabel, onClick, onDelete, deleteConfirm, rightBadge }) {
    return (
      <div style={{ display: "flex", gap: 6 }}>
        <button className="row-btn" onClick={onClick} style={{ flex: 1, padding: logoNode ? "22px 24px" : "18px 24px", background: "#111113", border: "1px solid #1e1e22", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: logoNode ? "center" : "space-between", position: "relative", gap: 12 }}>
          {logoNode ?? <span style={{ fontWeight: 700, fontSize: 17, color: "#f0ede8", letterSpacing: "0.04em", flex: 1, textAlign: "left" }}>{label}</span>}
          {rightBadge && <span style={{ marginLeft: "auto" }}>{rightBadge}</span>}
          {!logoNode && <span style={{ color: "#2a2a2e", fontSize: 16, flexShrink: 0 }}>→</span>}
          {logoNode && <span style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#2a2a2e", fontSize: 16 }}>→</span>}
        </button>
        {onDelete && (
          <button className="del-btn" onClick={() => { if (window.confirm(deleteConfirm ?? "Remove this item?")) onDelete(); }} style={{ background: "#111113", border: "1px solid #1e1e22", borderRadius: 12, color: "#333", cursor: "pointer", padding: "0 14px", fontSize: 15, flexShrink: 0 }}>✕</button>
        )}
      </div>
    );
  }

  // ── SCREEN: Festivals ─────────────────────────────────────────────────────
  if (screen === "festivals") return (
    <ListScreen subtitle="PRODUCTION REVIEW SYSTEM" title={
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <img src={FOURTEEN_TWENTY_LOGO} style={{ height: 96, objectFit: "contain" }} alt="14twenty" />
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.1em", color: "#555" }}>SELECT A FESTIVAL</div>
      </div>
    }>
      {festivals.map(f => (
        <ListRow key={f.id} onClick={() => { setActiveFestival(f.id); setScreen("year"); }}
          logoNode={
            f.id==="gottwood" ? <img src={GOTTWOOD_LOGO} style={{ height: 52, objectFit: "contain" }} alt="Gottwood" /> :
            f.id==="peep"     ? <img src={PEEP_LOGO}     style={{ height: 52, objectFit: "contain" }} alt="Peep" /> :
            <span style={{ fontWeight: 800, fontSize: 24, color: "#f0ede8", letterSpacing: "0.1em" }}>{f.name.toUpperCase()}</span>
          }
          onDelete={() => setFestivals(prev => prev.filter(x => x.id !== f.id))}
          deleteConfirm={`Remove "${f.name}" from the list?`}
        />
      ))}
      <AddRow placeholder="Festival name..." onAdd={name => setFestivals(prev => [...prev, { id: slugify(name), name }])} />
    </ListScreen>
  );

  // ── SCREEN: Year ──────────────────────────────────────────────────────────
  if (screen === "year") return (
    <ListScreen subtitle="SELECT A YEAR"
      title={<div style={{ display: "flex", justifyContent: "center" }}><FestivalLogo festival={festival} size={52} /></div>}
      onBack={() => setScreen("festivals")}
    >
      {[...years].reverse().map(y => (
        <ListRow key={y} label={y} onClick={() => { setActiveYear(y); setScreen("departments"); }}
          rightBadge={<ModeBadge tracker={isTrackerYear(y)} />}
          onDelete={() => setYears(prev => prev.filter(x => x !== y))}
          deleteConfirm={`Remove ${y} from the year list?`}
        />
      ))}
      <AddRow placeholder="e.g. 2027" onAdd={y => { if (!years.includes(y)) setYears(prev => [...prev, y].sort()); }} />
    </ListScreen>
  );

  // ── SCREEN: Departments ───────────────────────────────────────────────────
  if (screen === "departments") return (
    <ListScreen
      title={<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <FestivalLogo festival={festival} size={52} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.06em", color: "#666" }}>{activeYear}</span>
          <ModeBadge tracker={tracker} />
        </div>
      </div>}
      subtitle="SELECT A DEPARTMENT"
      onBack={() => setScreen("year")}
    >
      {departments.map(d => (
        <ListRow key={d.id} label={d.name} onClick={() => { setActiveDept(d.id); setScreen("areas"); }}
          onDelete={() => setDepartments(prev => prev.filter(x => x.id !== d.id))}
          deleteConfirm={`Remove "${d.name}" department?`}
        />
      ))}
      <AddRow placeholder="Department name..." onAdd={name => setDepartments(prev => [...prev, { id: slugify(name), name }])} />
    </ListScreen>
  );

  // ── SCREEN: Areas ─────────────────────────────────────────────────────────
  if (screen === "areas") return (
    <>
      <style>{css}</style>
      <div className="screen" style={{ minHeight: "100vh", background: "#0a0a0a" }}>
        <PageHeader>
          <BackBtn onClick={() => setScreen("departments")} />
          <FestivalLogo festival={festival} size={42} />
          <div style={{ flex: 1 }} />
          <ModeBadge tracker={tracker} />
          <button onClick={() => setScreen("year")} style={{ background: "#1a1a1e", border: "1px solid #252528", borderRadius: 8, color: "#ccc", fontWeight: 700, fontSize: 12, padding: "6px 12px", cursor: "pointer", letterSpacing: "0.06em" }}>{activeYear} ▾</button>
        </PageHeader>

        <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 60px" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 26, color: "#f0ede8", marginBottom: 4 }}>{dept?.name}</div>
            <div style={{ fontSize: 13, color: "#555" }}>{festivalAreas.length} areas · {activeYear} · {tracker ? "Progress Tracker" : "Review"}</div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#444", fontSize: 12, letterSpacing: "0.1em" }}>LOADING…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {festivalAreas.map(areaName => {
                const color = tracker ? areaRAGColor(areaName) : areaReviewColor(areaName);
                const hasActivity = tracker
                  ? (() => { const s = areaTaskStats(areaName); return s.done > 0 || s.inProgress > 0 || s.blocked > 0; })()
                  : areaReviewScore(areaName).rated > 0;

                return (
                  <div key={areaName} style={{ display: "flex", gap: 6 }}>
                    <button className="row-btn" onClick={() => { setSelectedArea(areaName); setScreen("area-detail"); setEditingCats(false); }}
                      style={{ flex: 1, background: "#111113", border: "1px solid #1e1e22", borderRadius: 12, cursor: "pointer", textAlign: "left", padding: "15px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: hasActivity ? (color ?? "#555") : "#252528", boxShadow: hasActivity && color ? `0 0 6px ${color}66` : "none" }} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: hasActivity ? "#e8e4df" : "#666", flex: 1 }}>{areaName}</span>

                      {tracker ? (() => {
                        const { total, done, blocked } = areaTaskStats(areaName);
                        return <>
                          {blocked > 0 && <Pill label={`${blocked} blocked`} color="#ef4444" />}
                          <div style={{ width: 70, height: 3, background: "#1e1e22", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                            <div style={{ height: "100%", width: `${total>0?(done/total)*100:0}%`, background: color ?? "#333", borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 600, color: hasActivity ? (color ?? "#888") : "#2a2a2e", letterSpacing: "0.06em", minWidth: 40, textAlign: "right" }}>{done}/{total}</span>
                        </>;
                      })() : (() => {
                        const { rated, total } = areaReviewScore(areaName);
                        return <>
                          <div style={{ width: 70, height: 3, background: "#1e1e22", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                            <div style={{ height: "100%", width: `${total>0?(rated/total)*100:0}%`, background: color ?? "#333", borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 600, color: hasActivity ? (color ?? "#888") : "#2a2a2e", letterSpacing: "0.06em", minWidth: 40, textAlign: "right" }}>{rated > 0 ? `${rated}/${total}` : "—"}</span>
                        </>;
                      })()}
                      <span style={{ color: "#2a2a2e", fontSize: 14 }}>→</span>
                    </button>
                    <button className="del-btn" onClick={() => { if (window.confirm(`Remove "${areaName}"?`)) setAreas(prev => ({ ...prev, [deptKey]: prev[deptKey].filter(a => a !== areaName) })); }}
                      style={{ background: "#111113", border: "1px solid #1e1e22", borderRadius: 12, color: "#333", cursor: "pointer", padding: "0 14px", fontSize: 15, flexShrink: 0 }}>✕</button>
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

  // ── SCREEN: Area detail ───────────────────────────────────────────────────
  const cats = getCats(selectedArea);
  const areaId = slugify(selectedArea);
  const areaTasks = getAreaTasks(selectedArea);

  return (
    <>
      <style>{css}</style>
      <div className="screen" style={{ minHeight: "100vh", background: "#0a0a0a" }}>
        <PageHeader>
          <BackBtn onClick={() => setScreen("areas")} />
          <FestivalLogo festival={festival} size={42} />
          <span style={{ color: "#2a2a2e", fontSize: 14 }}>·</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#888" }}>{dept?.name}</span>
          <span style={{ color: "#2a2a2e", fontSize: 14 }}>·</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#555" }}>{activeYear}</span>
          <div style={{ flex: 1 }} />
          <ModeBadge tracker={tracker} />
          {!tracker && (
            <button onClick={() => setEditingCats(!editingCats)} style={{ background: editingCats ? "#f0ede811" : "transparent", border: `1px solid ${editingCats ? "#555" : "#252528"}`, borderRadius: 8, color: editingCats ? "#f0ede8" : "#555", fontWeight: 700, fontSize: 10, letterSpacing: "0.08em", padding: "5px 12px", cursor: "pointer" }}>
              {editingCats ? "DONE" : "EDIT SECTIONS"}
            </button>
          )}
        </PageHeader>

        <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 80px" }}>

          {/* Area title */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontWeight: 800, fontSize: 30, color: "#f0ede8", lineHeight: 1.1, marginBottom: 10 }}>{selectedArea}</div>

            {tracker ? (() => {
              const { total, done, blocked, inProgress } = areaTaskStats(selectedArea);
              const color = areaRAGColor(selectedArea);
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, height: 3, background: "#1e1e22", borderRadius: 2, overflow: "hidden", minWidth: 80 }}>
                    <div style={{ height: "100%", width: `${total>0?(done/total)*100:0}%`, background: color ?? "#333", transition: "width 0.4s", borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{done}/{total} DONE</span>
                  {inProgress > 0 && <Pill label={`${inProgress} in progress`} color="#eab308" />}
                  {blocked > 0  && <Pill label={`${blocked} blocked`}     color="#ef4444" />}
                </div>
              );
            })() : (() => {
              const { rated, total } = areaReviewScore(selectedArea);
              const color = areaReviewColor(selectedArea);
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 3, background: "#1e1e22", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${total>0?(rated/total)*100:0}%`, background: color ?? "#333", transition: "width 0.4s", borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{rated}/{total} RATED</span>
                </div>
              );
            })()}
          </div>

          {/* ── TRACKER MODE ── */}
          {tracker && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Group by status */}
              {[
                { id: "blocked",     label: "Blocked" },
                { id: "in-progress", label: "In Progress" },
                { id: "not-started", label: "Not Started" },
                { id: "done",        label: "Done" },
              ].map(group => {
                const grouped = areaTasks.filter(t => t.status === group.id);
                if (!grouped.length) return null;
                const st = TASK_STATUSES.find(s => s.id === group.id);
                return (
                  <div key={group.id}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: st.color, letterSpacing: "0.1em", marginBottom: 6, marginTop: 4 }}>{group.label.toUpperCase()} — {grouped.length}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {grouped.map(task => (
                        <TaskRow key={task.id} task={task}
                          onChange={updated => setAreaTasks(selectedArea, areaTasks.map(t => t.id === task.id ? updated : t))}
                          onDelete={() => setAreaTasks(selectedArea, areaTasks.filter(t => t.id !== task.id))}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Add task */}
              <div style={{ marginTop: 8 }}>
                <AddRow placeholder="Add a task..." onAdd={label => setAreaTasks(selectedArea, [...areaTasks, { id: `task-${Date.now()}`, label, status: "not-started", owner: "", notes: "", due: "" }])} />
              </div>
            </div>
          )}

          {/* ── REVIEW MODE ── */}
          {!tracker && (
            <>
              {/* Edit sections */}
              {editingCats && (
                <div style={{ background: "#111113", border: "1px solid #1e1e22", borderRadius: 14, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: "#666", letterSpacing: "0.1em", marginBottom: 14 }}>SECTIONS FOR THIS AREA</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                    {(DEPT_REVIEW_CATS[activeDept] ?? []).map(cat => {
                      const active = cats.includes(cat);
                      return (
                        <button key={cat} onClick={() => active ? setCats(selectedArea, cats.filter(c=>c!==cat)) : setCats(selectedArea, [...cats, cat])}
                          style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${active?"#f0ede8":"#252528"}`, background: active?"#f0ede811":"transparent", color: active?"#f0ede8":"#555", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                          {active ? "✓ " : ""}{cat}
                        </button>
                      );
                    })}
                    {cats.filter(c => !(DEPT_REVIEW_CATS[activeDept]??[]).includes(c)).map(cat => (
                      <button key={cat} onClick={() => setCats(selectedArea, cats.filter(c2=>c2!==cat))}
                        style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid #f0ede8", background: "#f0ede811", color: "#f0ede8", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                        ✓ {cat} ✕
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => { if(e.key==="Enter"&&newCatName.trim()){setCats(selectedArea,[...cats,newCatName.trim()]);setNewCatName("");} }}
                      placeholder="Add custom section..." style={{ flex: 1, background: "#0a0a0a", border: "1px solid #252528", borderRadius: 8, color: "#f0ede8", padding: "8px 12px", fontSize: 13 }} />
                    <button onClick={() => { if(newCatName.trim()){setCats(selectedArea,[...cats,newCatName.trim()]);setNewCatName("");} }}
                      style={{ background: "#f0ede8", color: "#0a0a0a", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>ADD</button>
                  </div>
                </div>
              )}

              {cats.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#444", fontSize: 12, letterSpacing: "0.1em" }}>NO SECTIONS — TAP "EDIT SECTIONS" TO ADD SOME</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {cats.map(cat => {
                    const key = `${areaId}__${slugify(cat)}`;
                    return <ReviewSection key={key} catName={cat} data={reviewData[key]} saveKey={key} saveStatuses={saveStatuses} onSave={patch => handleSave(selectedArea, cat, patch)} />;
                  })}
                </div>
              )}

              <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #1a1a1e" }}>
                <button onClick={() => exportToPDF({ festival, year: activeYear, areas: festivalAreas, reviewData, getCats })}
                  style={{ width: "100%", padding: "16px 24px", background: "#111113", border: "1px solid #252528", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontWeight: 600, fontSize: 13, color: "#888", letterSpacing: "0.04em", transition: "all 0.15s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#444";e.currentTarget.style.color="#f0ede8";e.currentTarget.style.background="#161618";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#252528";e.currentTarget.style.color="#888";e.currentTarget.style.background="#111113";}}>
                  <span style={{ fontSize: 16 }}>↓</span> EXPORT ALL AREAS TO PDF — {activeYear}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
