import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";
import { GOTTWOOD_LOGO, PEEP_LOGO, FOURTEEN_TWENTY_LOGO } from "./logos.js";

// ─── SiteMap (inline stub — replace with real component if needed) ─────────────
function SiteMap({ festival, areas, tracker, getAreaColor, onAreaTap }) {
  return (
    <div style={{ background:"#111113", border:"1px solid #1e1e22", borderRadius:14, padding:32, textAlign:"center" }}>
      <div style={{ fontSize:12, color:"#444", letterSpacing:"0.1em", marginBottom:16 }}>SITE MAP</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" }}>
        {areas.map(a => {
          const color = getAreaColor(a);
          return (
            <button key={a} onClick={() => onAreaTap(a)}
              style={{ background:color ? color+"18" : "transparent", border:`1px solid ${color || "#252528"}`, borderRadius:8, color:color || "#555", fontSize:12, fontWeight:600, padding:"6px 14px", cursor:"pointer" }}>
              {a}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Global style injection (runs immediately on module load) ─────────────────
// Sets body background before React renders to prevent white flash
if (typeof document !== "undefined") {
  document.documentElement.style.background = "#0a0a0a";
  document.body.style.background = "#0a0a0a";
  document.body.style.color = "#f0ede8";
  document.body.style.margin = "0";
  document.body.style.fontFamily = "system-ui, sans-serif";
  // Inject a <meta> color-scheme tag if not already present
  if (!document.querySelector('meta[name="color-scheme"]')) {
    const m = document.createElement("meta");
    m.name = "color-scheme"; m.content = "dark";
    document.head.appendChild(m);
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FESTIVALS = [
  { id: "gottwood", name: "Gottwood",      password: "Anglesey" },
  { id: "peep",     name: "Peep Festival", password: "Devon"    },
  { id: "soysambu", name: "Soysambu",      password: "Kenya"    },
];

const CURRENT_YEAR = "2026";

const DEFAULT_YEARS = {
  gottwood: ["2022","2023","2024","2025","2026"],
  peep:     ["2024","2025","2026"],
  soysambu: ["2026"],
};

const DEFAULT_DEPTS = [
  { id: "production",        name: "Production" },
  { id: "council-licensing", name: "Council & Licensing" },
  { id: "artists",           name: "Artists" },
  { id: "logistics",         name: "Logistics" },
];

const DEPT_REVIEW_CATS = {
  "production":        ["Lighting","Sound","Staging","Power & Electrics","Design","Space & Layout","Decor","Crowd Flow","Comms & Signage","Safety"],
  "council-licensing": ["Submission Timelines","Council Responsiveness","Condition Compliance","Noise Monitoring","Medical Provision Sign-off","Crowd Management Plan","Traffic & Parking Plan","Environmental Considerations","Post-Event Reporting"],
  "artists":           ["Hospitality Rider Fulfilment","Catering Quality","Room Setup & Comfort","WiFi & Comms","Security & Privacy","Changeover Management","Transport Punctuality","Guest List Accuracy","Backline Accuracy","Overall Artist Experience"],
  "logistics":         ["Crew Briefing","Signage & Wayfinding","Vehicle Access","Waste Management","Welfare Provision","Communication (Radios/Comms)","Staffing Levels","Trader Management","Timeline Adherence"],
};

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

const TAG_PALETTE = ["#a78bfa","#22d3ee","#fb7185","#fbbf24","#34d399","#60a5fa","#fb923c","#f472b6","#2dd4bf","#a3e635"];
function tagColor(tag) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0x7fffffff;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

// Smart task sort: in-progress → top, done → bottom, manual order preserved within groups
function smartSortTasks(tasks) {
  const rank = { "in-progress": 0, "not-started": 1, "blocked": 1, "done": 2 };
  return [...tasks].sort((a, b) => (rank[a.status] ?? 1) - (rank[b.status] ?? 1));
}

const REVIEW_RATINGS = [
  { value: 1, label: "Poor",       color: "#ef4444" },
  { value: 2, label: "Needs Work", color: "#f97316" },
  { value: 3, label: "Average",    color: "#eab308" },
  { value: 4, label: "Good",       color: "#84cc16" },
  { value: 5, label: "Excellent",  color: "#22c55e" },
];

// Curated palette — visually distinct, all work on dark backgrounds.
// Stored as hsl so we can derive bg/border from the same value.
const TEAM_COLORS = [
  { id: "violet",   hex: "#a78bfa", bg: "#a78bfa18", border: "#a78bfa40" },
  { id: "cyan",     hex: "#22d3ee", bg: "#22d3ee18", border: "#22d3ee40" },
  { id: "rose",     hex: "#fb7185", bg: "#fb718518", border: "#fb718540" },
  { id: "amber",    hex: "#fbbf24", bg: "#fbbf2418", border: "#fbbf2440" },
  { id: "emerald",  hex: "#34d399", bg: "#34d39918", border: "#34d39940" },
  { id: "sky",      hex: "#60a5fa", bg: "#60a5fa18", border: "#60a5fa40" },
  { id: "orange",   hex: "#fb923c", bg: "#fb923c18", border: "#fb923c40" },
  { id: "pink",     hex: "#f472b6", bg: "#f472b618", border: "#f472b640" },
  { id: "teal",     hex: "#2dd4bf", bg: "#2dd4bf18", border: "#2dd4bf40" },
  { id: "lime",     hex: "#a3e635", bg: "#a3e63518", border: "#a3e63540" },
  { id: "indigo",   hex: "#818cf8", bg: "#818cf818", border: "#818cf840" },
  { id: "fuchsia",  hex: "#e879f9", bg: "#e879f918", border: "#e879f940" },
  { id: "red",      hex: "#f87171", bg: "#f8717118", border: "#f8717140" },
  { id: "yellow",   hex: "#facc15", bg: "#facc1518", border: "#facc1540" },
  { id: "green",    hex: "#4ade80", bg: "#4ade8018", border: "#4ade8040" },
  { id: "blue",     hex: "#38bdf8", bg: "#38bdf818", border: "#38bdf840" },
];

// Pick the next colour not already used by existing roster members
function pickNextColor(roster) {
  const usedIds = new Set(roster.map(m => m.colorId));
  const free = TEAM_COLORS.find(c => !usedIds.has(c.id));
  return free ?? TEAM_COLORS[roster.length % TEAM_COLORS.length];
}

// ─── Key helpers ──────────────────────────────────────────────────────────────

const keys = {
  tracker:  (fid, yr, did, aName) => `${fid}__${yr}__${did}__${slugify(aName)}`,
  dept:     (fid, did)            => `${fid}__${did}`,
  review:   (aName, cat)          => `${slugify(aName)}__${slugify(cat)}`,
  cats:     (fid, did, aName)     => `${fid}__${did}__${slugify(aName)}`,
  desc:     (fid, yr, did, aName) => `${fid}__${yr}__${did}__${slugify(aName)}`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(s) { return s.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""); }
function getRating(v) { return REVIEW_RATINGS.find(r => r.value === v); }
function isTrackerYear(y) { return y >= CURRENT_YEAR; }
function lsGet(key, fb) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch(e) { return fb; } }
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }
function parseReviewNotes(raw) {
  if (!raw) return { tags: [], text: "" };
  if (raw.startsWith("__notesmeta__")) {
    try { const d = JSON.parse(raw.slice(13)); return { tags: Array.isArray(d.tags) ? d.tags : [], text: d.text ?? "" }; } catch(e) {}
  }
  return { tags: [], text: raw };
}

function makeTask(label, i = 0) {
  return { id: `task-${Date.now()}-${i}`, label, status: "not-started", owner: "", assignees: [], notes: "", due: "", tags: [] };
}

function getDefaultTasks(dept, areaName, festivalId) {
  if (festivalId) {
    const presetAreas = (DEFAULT_DEPT_AREAS[festivalId]?.[dept] ?? []).map(a => slugify(a));
    if (!presetAreas.includes(slugify(areaName))) return [];
  }
  const pool = DEPT_DEFAULT_TASKS[dept] ?? {};
  const slug = slugify(areaName);
  const matched = Object.entries(pool).find(([k]) => k !== "_default" && slug.includes(k));
  return (matched ? matched[1] : pool._default ?? []).map((label, i) => makeTask(label, i));
}

function useDebounce(fn, delay) {
  const t = useRef(null);
  return useCallback((...args) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

function parseSupplierToken() {
  const p = new URLSearchParams(window.location.search);
  if (!p.get("access")) return null;
  return { festivalId: p.get("access"), year: p.get("year"), dept: p.get("dept"), filter: p.get("filter") };
}

function parseComments(raw) {
  if (!raw) return [];
  if (typeof raw === "string") return raw.trim() ? [{ text: raw.trim(), author: null, ts: null }] : [];
  if (Array.isArray(raw)) return raw;
  return [];
}

// ─── Supabase helper ──────────────────────────────────────────────────────────

async function upsertReview(festival, year, dept, areaId, areaName, categoryId, payload) {
  return supabase.from("reviews").upsert({
    festival, year,
    area_id:          `${dept}__${areaId}`,
    area_name:        areaName,
    area_emoji:       dept,
    category_id:      categoryId,
    rating:           null,
    worked_well:      "",
    needs_improvement:"",
    updated_at:       new Date().toISOString(),
    ...payload,
  }, { onConflict: "festival,year,area_id,category_id" });
}

// ─── AI suggestion ────────────────────────────────────────────────────────────

async function getAISuggestion({ areaName, catName, workedWell, needsImprovement, notes }) {
  const text = [workedWell, needsImprovement, notes].filter(Boolean).join(" | ");
  if (text.trim().length < 20) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 150,
        system: "You are a festival production assistant. Based on a post-event review note, generate exactly ONE clear actionable task for next year's production tracker. Reply with ONLY the task label — no explanation, no bullet point, no quotes, no markdown. 5-15 words, starting with an action verb.",
        messages: [{ role: "user", content: `Area: ${areaName}\nSection: ${catName}\nReview: ${text}` }],
      }),
    });
    const data = await res.json();
    const raw = data.content?.[0]?.text?.trim();
    return raw && raw.length > 4 ? raw : null;
  } catch(e) { return null; }
}

// ─── PDF exports ──────────────────────────────────────────────────────────────

async function loadJsPDF() {
  if (window.jspdf) return;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

async function exportReviewPDF({ festival, year, areas, reviewData, getCats }) {
  await loadJsPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W=210,H=297,m=16,cW=W-m*2; let y=m;
  const RC={1:[239,68,68],2:[249,115,22],3:[234,179,8],4:[132,204,18],5:[34,197,94]};
  const chk=(n=10)=>{ if(y+n>H-m){doc.addPage();y=m;} };
  doc.setFillColor(10,10,10); doc.rect(0,0,W,36,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(240,237,232); doc.text("PRODUCTION REVIEW",m,16);
  doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(100,100,110); doc.text(`${festival.name.toUpperCase()}  ·  ${year}`,m,25);
  doc.setFontSize(8); doc.text(`Generated ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}`,W-m,25,{align:"right"});
  y=46;
  for (const areaName of areas) {
    const aId=slugify(areaName), cats=getCats(areaName);
    const hasData=cats.some(c=>{ const d=reviewData[keys.review(areaName,c)]; return d&&(Object.keys(d.votes??{}).length||d.worked_well||d.needs_improvement||d.notes); });
    if(!hasData) continue;
    chk(20); doc.setFillColor(20,20,24); doc.roundedRect(m,y,cW,10,2,2,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(240,237,232); doc.text(areaName.toUpperCase(),m+4,y+6.8); y+=14;
    for (const cat of cats) {
      const d=reviewData[keys.review(areaName,cat)]; if(!d) continue;
      const voteVals=Object.values(d.votes??{});
      chk(14); doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(180,176,170); doc.text(cat,m+2,y+4);
      if(voteVals.length>0){
        const mV=[1,2,3,4,5].map(v=>({v,c:voteVals.filter(x=>x===v).length})).reduce((a,b)=>b.c>a.c?b:a).v;
        const rl=REVIEW_RATINGS.find(r=>r.value===mV)?.label??""; const rc=RC[mV]??[100,100,100];
        doc.setFillColor(...rc.map(c=>Math.round(c*0.15+10))); doc.setDrawColor(...rc); doc.setLineWidth(0.3);
        const bW=doc.getTextWidth(`${rl} (${voteVals.length}v)`)+6;
        doc.roundedRect(W-m-bW-2,y,bW,6,1,1,"FD"); doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(...rc);
        doc.text(`${rl.toUpperCase()} (${voteVals.length}v)`,W-m-bW/2-2,y+4,{align:"center"});
      }
      y+=8;
      for(const[key,prefix,col] of [["worked_well","+ ",[60,120,80]],["needs_improvement","^ ",[140,60,60]],["notes","# ",[60,80,140]]]){
        const val=d[key]; if(!val) continue;
        const txt=Array.isArray(val)?val.map(e=>`[${e.author??"Team"}] ${e.text}`).join("\n"):val;
        if(!txt?.trim()) continue;
        chk(8); doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...col);
        const lines=doc.splitTextToSize(prefix+txt,cW-6); doc.text(lines,m+4,y+3); y+=lines.length*4.5+2;
      }
      doc.setDrawColor(30,30,34); doc.setLineWidth(0.15); doc.line(m+2,y,W-m-2,y); y+=4;
    }
    y+=4;
  }
  const tp=doc.getNumberOfPages();
  for(let i=1;i<=tp;i++){doc.setPage(i);doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(60,60,70);doc.text(`${festival.name} · ${year} · 14twenty Review`,m,H-8);doc.text(`${i}/${tp}`,W-m,H-8,{align:"right"});}
  doc.save(`${slugify(festival.name)}-${year}-review.pdf`);
}

async function exportTagReviewPDF({ festival, year, dept, tag, tagAreaGroups, reviewData }) {
  await loadJsPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W=210,H=297,m=16,cW=W-m*2; let y=m;
  const RC={1:[239,68,68],2:[249,115,22],3:[234,179,8],4:[132,204,18],5:[34,197,94]};
  const chk=(n=10)=>{ if(y+n>H-m){doc.addPage();y=m;} };
  doc.setFillColor(10,10,10); doc.rect(0,0,W,36,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(240,237,232); doc.text("PRODUCTION REVIEW",m,16);
  doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(100,100,110);
  doc.text(`${festival.name.toUpperCase()}  ·  ${year}  ·  #${tag}`,m,25);
  doc.setFontSize(8); doc.text(`Generated ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}`,W-m,25,{align:"right"});
  if (dept) { doc.setFontSize(8); doc.setTextColor(80,80,90); doc.text(dept.name.toUpperCase(),W-m,16,{align:"right"}); }
  y=46;
  for (const { areaName, sections } of tagAreaGroups) {
    if (!sections.length) continue;
    chk(20); doc.setFillColor(20,20,24); doc.roundedRect(m,y,cW,10,2,2,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(240,237,232); doc.text(areaName.toUpperCase(),m+4,y+6.8); y+=14;
    for (const { cat, data: d } of sections) {
      if (!d) continue;
      const voteVals=Object.values(d.votes??{});
      chk(14); doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(180,176,170); doc.text(cat,m+2,y+4);
      if(voteVals.length>0){
        const mV=[1,2,3,4,5].map(v=>({v,c:voteVals.filter(x=>x===v).length})).reduce((a,b)=>b.c>a.c?b:a).v;
        const rl=REVIEW_RATINGS.find(r=>r.value===mV)?.label??""; const rc=RC[mV]??[100,100,100];
        doc.setFillColor(...rc.map(c=>Math.round(c*0.15+10))); doc.setDrawColor(...rc); doc.setLineWidth(0.3);
        const bW=doc.getTextWidth(`${rl} (${voteVals.length}v)`)+6;
        doc.roundedRect(W-m-bW-2,y,bW,6,1,1,"FD"); doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(...rc);
        doc.text(`${rl.toUpperCase()} (${voteVals.length}v)`,W-m-bW/2-2,y+4,{align:"center"});
      }
      y+=8;
      for(const[key,prefix,col] of [["worked_well","+ ",[60,120,80]],["needs_improvement","^ ",[140,60,60]],["notes","# ",[60,80,140]]]){
        const val=d[key]; if(!val) continue;
        const txt=Array.isArray(val)?val.map(e=>`[${e.author??"Team"}] ${e.text}`).join("\n"):val;
        if(!txt?.trim()) continue;
        chk(8); doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...col);
        const lines=doc.splitTextToSize(prefix+txt,cW-6); doc.text(lines,m+4,y+3); y+=lines.length*4.5+2;
      }
      doc.setDrawColor(30,30,34); doc.setLineWidth(0.15); doc.line(m+2,y,W-m-2,y); y+=4;
    }
    y+=4;
  }
  const tp=doc.getNumberOfPages();
  for(let i=1;i<=tp;i++){doc.setPage(i);doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(60,60,70);doc.text(`${festival.name} · ${year} · #${tag}`,m,H-8);doc.text(`${i}/${tp}`,W-m,H-8,{align:"right"});}
  doc.save(`${slugify(festival.name)}-${year}-${slugify(tag)}-review.pdf`);
}

async function exportTrackerPDF({ festival, year, depts, allAreas, getAreaTasks }) {
  await loadJsPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W=210,H=297,m=16,cW=W-m*2; let y=m;
  const chk=(n=10)=>{ if(y+n>H-m){doc.addPage();y=m;} };
  const RAG={ done:[34,197,94], "in-progress":[234,179,8], blocked:[239,68,68], "not-started":[60,60,70] };
  doc.setFillColor(10,10,10); doc.rect(0,0,W,36,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(16); doc.setTextColor(240,237,232); doc.text("PRODUCTION TRACKER — PROGRESS REPORT",m,16);
  doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(100,100,110); doc.text(`${festival.name.toUpperCase()}  ·  ${year}`,m,25);
  doc.setFontSize(8); doc.text(`Generated ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}`,W-m,25,{align:"right"});
  y=46;
  for (const dept of depts) {
    const fas=allAreas[keys.dept(festival.id,dept.id)]??[]; if(!fas.length) continue;
    chk(16); doc.setFillColor(22,22,28); doc.roundedRect(m,y,cW,12,2,2,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(13); doc.setTextColor(240,237,232); doc.text(dept.name.toUpperCase(),m+5,y+8.5);
    let dT=0,dD=0,dB=0;
    fas.forEach(a=>{const ts=getAreaTasks(dept.id,a);dT+=ts.length;dD+=ts.filter(t=>t.status==="done").length;dB+=ts.filter(t=>t.status==="blocked").length;});
    const pct=dT>0?Math.round((dD/dT)*100):0;
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(150,150,160);
    doc.text(`${dD}/${dT} complete · ${pct}%${dB>0?` · ${dB} BLOCKED`:""}`,W-m,y+8.5,{align:"right"}); y+=18;
    for (const areaName of fas) {
      const tasks=getAreaTasks(dept.id,areaName); if(!tasks.length) continue;
      const done=tasks.filter(t=>t.status==="done").length, blocked=tasks.filter(t=>t.status==="blocked").length, inProg=tasks.filter(t=>t.status==="in-progress").length;
      const pct2=tasks.length>0?done/tasks.length:0;
      const ragC=blocked>0?RAG.blocked:pct2===1?RAG.done:inProg>0||pct2>0?RAG["in-progress"]:RAG["not-started"];
      chk(14); doc.setFillColor(...ragC); doc.circle(m+3,y+4,2,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(220,217,212); doc.text(areaName,m+8,y+5.5);
      doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(120,120,130); doc.text(`${done}/${tasks.length}${blocked>0?`  ·  ${blocked} blocked`:""}`,W-m,y+5.5,{align:"right"});
      doc.setFillColor(25,25,30); doc.roundedRect(m+8,y+8,cW-8,2,1,1,"F");
      if(pct2>0){doc.setFillColor(...ragC); doc.roundedRect(m+8,y+8,(cW-8)*pct2,2,1,1,"F");}
      y+=14;
      tasks.filter(t=>t.status==="blocked").forEach(t=>{ chk(7); doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(239,68,68); const lines=doc.splitTextToSize(`BLOCKED: ${t.label}${t.notes?` — ${t.notes}`:""}`,cW-12); doc.text(lines,m+12,y+3); y+=lines.length*4+2; });
    }
    y+=6;
  }
  const tp=doc.getNumberOfPages();
  for(let i=1;i<=tp;i++){doc.setPage(i);doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(60,60,70);doc.text(`${festival.name} · ${year} · 14twenty Tracker`,m,H-8);doc.text(`${i}/${tp}`,W-m,H-8,{align:"right"});}
  doc.save(`${slugify(festival.name)}-${year}-tracker.pdf`);
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html{height:100%;overscroll-behavior:none}
  body{
    height:100%;background:#0a0a0a;color:#f0ede8;
    font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased;
    -webkit-text-size-adjust:100%;overscroll-behavior:none;
  }
  #root{
    min-height:100%;
    padding-top:env(safe-area-inset-top);
    padding-bottom:env(safe-area-inset-bottom);
    padding-left:env(safe-area-inset-left);
    padding-right:env(safe-area-inset-right);
  }
  ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px}
  button,select{font-family:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
  textarea,input{font-family:inherit;-webkit-tap-highlight-color:transparent}
  input,textarea,select{font-size:16px!important}
  button{min-height:44px}
  .screen{animation:fadeUp 0.22s cubic-bezier(0.16,1,0.3,1) both}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .row-btn{transition:background 0.12s,border-color 0.12s;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
  .row-btn:hover{background:#1a1a1e!important;border-color:#2e2e36!important}
  .row-btn:active{background:#1a1a1e!important;border-color:#2e2e36!important}
  .del-btn{transition:all 0.12s;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
  .del-btn:hover{border-color:#ef444466!important;color:#ef4444!important;background:#1a1010!important}
  .del-btn:active{border-color:#ef444466!important;color:#ef4444!important;background:#1a1010!important}
  .add-row:hover{border-color:#444!important;color:#888!important}
  .add-row:active{border-color:#444!important;color:#888!important}
  .rating-btn{transition:transform 0.18s cubic-bezier(0.34,1.56,0.64,1);-webkit-tap-highlight-color:transparent;touch-action:manipulation;min-height:44px}
  .rating-btn:hover{transform:scale(1.06)}
  .rating-btn:active{transform:scale(0.96)!important}
  .back-link{-webkit-tap-highlight-color:transparent;touch-action:manipulation;min-height:44px;min-width:44px}
  .back-link:hover{color:#f0ede8!important}
  .back-link:active{color:#f0ede8!important}
  .save-pulse{animation:sp 0.4s ease}
  @keyframes sp{0%,100%{opacity:1}50%{opacity:0.3}}
  .task-row{transition:background 0.1s;-webkit-tap-highlight-color:transparent}
  .task-row:hover{background:#141416!important}
  .task-row:active{background:#141416!important}
  .fest-card{transition:background 0.12s,border-color 0.12s,transform 0.12s;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
  .fest-card:hover{background:#1a1a1e!important;border-color:#333!important;transform:translateY(-2px)}
  .fest-card:active{background:#1a1a1e!important;border-color:#333!important;transform:scale(0.98)!important}
  textarea{resize:vertical;min-height:88px;-webkit-overflow-scrolling:touch}
  textarea:focus,input:focus,select:focus{outline:none;border-color:#444!important}
  .ai-pulse{animation:aiIn 0.3s ease}
  @keyframes aiIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
  .checkbox-task{transition:background 0.1s,border-color 0.1s}
  .checkbox-task:hover{background:#1a1a1e!important}
`;

// ─── Shared UI ─────────────────────────────────────────────────────────────────

function FestivalLogo({ festival, size = 42, opacity = 1 }) {
  // Use image if logo data is available, otherwise fall back to styled text
  const logoSrc = festival.id === "gottwood" ? GOTTWOOD_LOGO
    : festival.id === "peep" ? PEEP_LOGO
    : null;
  if (logoSrc) return <img src={logoSrc} style={{ height: size, opacity, display: "block", objectFit: "contain" }} alt={festival.name} />;
  // Text wordmark fallback — clean and intentional
  const fs = Math.max(10, size * 0.36);
  return (
    <span style={{ opacity, fontSize: fs, fontWeight: 800, letterSpacing: "0.12em", color: "#f0ede8", whiteSpace: "nowrap", lineHeight: 1 }}>
      {festival.name.toUpperCase()}
    </span>
  );
}

function PageHeader({ children }) {
  return (
    <div style={{ position:"sticky", top:0, zIndex:10, background:"#0a0a0aee", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", borderBottom:"1px solid #1a1a1e", padding:"0 20px" }}>
      <div style={{ maxWidth:700, margin:"0 auto", height:56, display:"flex", alignItems:"center", gap:10 }}>{children}</div>
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button className="back-link" onClick={onClick} style={{ background:"none", border:"none", cursor:"pointer", color:"#555", fontSize:20, paddingRight:4, lineHeight:1, flexShrink:0, transition:"color 0.12s" }}>←</button>
  );
}

function Pill({ label, color }) {
  return (
    <span style={{ fontSize:10, fontWeight:700, color, background:color+"18", border:`1px solid ${color}44`, padding:"2px 8px", borderRadius:20, letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{label.toUpperCase()}</span>
  );
}

function ModeBadge({ tracker }) {
  return tracker
    ? <span style={{ fontSize:9, fontWeight:700, color:"#22c55e", background:"#22c55e18", border:"1px solid #22c55e33", padding:"2px 8px", borderRadius:20, letterSpacing:"0.1em", flexShrink:0 }}>TRACKER</span>
    : <span style={{ fontSize:9, fontWeight:700, color:"#888", background:"#88888818", border:"1px solid #88888833", padding:"2px 8px", borderRadius:20, letterSpacing:"0.1em", flexShrink:0 }}>REVIEW</span>;
}

function AddRow({ placeholder, onAdd }) {
  const [active, setActive] = useState(false);
  const [val, setVal] = useState("");
  const submit = () => { if (val.trim()) { onAdd(val.trim()); setVal(""); setActive(false); } };
  if (!active) return (
    <button className="add-row" onClick={() => setActive(true)} style={{ width:"100%", padding:"13px 18px", background:"transparent", border:"1px dashed #252528", borderRadius:12, color:"#444", fontWeight:700, fontSize:12, letterSpacing:"0.08em", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>+ ADD</button>
  );
  return (
    <div style={{ display:"flex", gap:8, padding:"8px 0" }}>
      <input autoFocus value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key==="Enter") submit(); if (e.key==="Escape") setActive(false); }} placeholder={placeholder} style={{ flex:1, background:"#111113", border:"1px solid #333", borderRadius:8, color:"#f0ede8", padding:"9px 12px", fontSize:13 }} />
      <button onClick={submit} style={{ background:"#f0ede8", color:"#0a0a0a", border:"none", borderRadius:8, padding:"9px 18px", fontWeight:700, fontSize:12, cursor:"pointer" }}>ADD</button>
      <button onClick={() => setActive(false)} style={{ background:"transparent", color:"#555", border:"1px solid #252528", borderRadius:8, padding:"9px 12px", fontSize:12, cursor:"pointer" }}>×</button>
    </div>
  );
}

function Overlay({ children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#0a0a0acc", backdropFilter:"blur(10px)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:"#111113", border:"1px solid #252528", borderRadius:18, padding:36, maxWidth:420, width:"100%", animation:"fadeUp 0.2s cubic-bezier(0.16,1,0.3,1) both" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Drag & Drop list ─────────────────────────────────────────────────────────

function DragList({ items, onReorder, renderItem, gap = 5 }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const itemsRef              = useRef([]);
  const containerRef          = useRef(null);

  function handlePointerDown(e, idx) {
    if (!e.target.closest("[data-drag]")) return;
    e.preventDefault();
    setDragIdx(idx);
    setOverIdx(idx);
    containerRef.current?.setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e) {
    if (dragIdx === null) return;
    const els = itemsRef.current;
    for (let i = 0; i < els.length; i++) {
      if (!els[i]) continue;
      const rect = els[i].getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        if (i !== overIdx) setOverIdx(i);
        break;
      }
    }
  }

  function handlePointerUp() {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const next = [...items];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(overIdx, 0, moved);
      onReorder(next);
    }
    setDragIdx(null);
    setOverIdx(null);
  }

  const preview = dragIdx !== null ? (() => {
    const next = [...items];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(overIdx, 0, moved);
    return next;
  })() : items;

  return (
    <div ref={containerRef} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} style={{ display:"flex", flexDirection:"column", gap }}>
      {preview.map((item, i) => {
        const origIdx = dragIdx !== null ? items.indexOf(item) : i;
        const isDragging = origIdx === dragIdx;
        return (
          <div key={item.id ?? item} ref={el => itemsRef.current[i] = el} onPointerDown={e => handlePointerDown(e, items.indexOf(item))}
            style={{ opacity: isDragging ? 0.4 : 1, transition:"opacity 0.15s", outline: i===overIdx&&dragIdx!==null&&dragIdx!==overIdx?"1px solid #333":"none", borderRadius:10 }}>
            {renderItem(item, isDragging)}
          </div>
        );
      })}
    </div>
  );
}

// ─── Assignee components ──────────────────────────────────────────────────────

// Resolve colour for a name from a roster array.
// Exact match first, then first-name match, then hash fallback.
function resolveColor(name, rosterArr = []) {
  if (!name) return { hex:"#888", bg:"#88888818", border:"#88888833" };
  const lower = name.toLowerCase().trim();
  // Exact
  let member = rosterArr.find(m => m.name.toLowerCase() === lower);
  if (!member) {
    // First-name match
    const firstName = lower.split(/\s+/)[0];
    member = rosterArr.find(m => m.name.toLowerCase().split(/\s+/)[0] === firstName);
  }
  if (!member) {
    // Last-name match
    const parts = lower.split(/\s+/);
    if (parts.length > 1) {
      const lastName = parts[parts.length - 1];
      member = rosterArr.find(m => {
        const mp = m.name.toLowerCase().split(/\s+/);
        return mp[mp.length - 1] === lastName;
      });
    }
  }
  if (member) {
    const tc = TEAM_COLORS.find(c => c.id === member.colorId);
    if (tc) return { hex: tc.hex, bg: tc.bg, border: tc.border };
  }
  // Fallback: hue derived from name
  const hue = name.split("").reduce((a,c)=>a+c.charCodeAt(0),0) % 360;
  return { hex:`hsl(${hue},55%,65%)`, bg:`hsl(${hue},55%,12%)`, border:`hsl(${hue},55%,25%)` };
}

function AssigneeTag({ name, onRemove, onTap, roster = [] }) {
  const initials = name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  const { hex, bg, border } = resolveColor(name, roster);
  return (
    <span onClick={e=>{ e.stopPropagation(); if(onTap) onTap(); }}
      style={{ display:"inline-flex", alignItems:"center", gap:4, background:bg, border:`1px solid ${border}`, borderRadius:20, padding:"2px 8px 2px 6px", fontSize:11, color:hex, fontWeight:600, flexShrink:0, cursor:onTap?"pointer":"default", transition:"filter 0.15s" }}
      onMouseEnter={e=>{ if(onTap) e.currentTarget.style.filter="brightness(1.3)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.filter="none"; }}>
      <span style={{ width:16, height:16, borderRadius:"50%", background:border, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:hex }}>{initials}</span>
      {name}
      {onRemove && <span onClick={e=>{e.stopPropagation();onRemove();}} style={{ cursor:"pointer", opacity:0.6, fontSize:12, lineHeight:1, marginLeft:2 }}>×</span>}
    </span>
  );
}

function AssigneeInput({ assignees = [], onChange, roster = [] }) {
  const [input, setInput] = useState("");
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);

  useEffect(() => {
    function handleClick(e) { if(ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Suggestions: roster members first, then any ad-hoc names already in use
  const rosterNames   = roster.map(m => m.name);
  const suggestions   = rosterNames.filter(n => !assignees.includes(n) && n.toLowerCase().includes(input.toLowerCase()));

  function add(name) {
    const n = name.trim();
    if (!n || assignees.includes(n)) return;
    onChange([...assignees, n]);
    setInput(""); setOpen(false);
  }

  function remove(name) { onChange(assignees.filter(a => a !== name)); }

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <label style={{ fontSize:10, fontWeight:600, color:"#555", letterSpacing:"0.1em", textTransform:"uppercase" }}>Assigned to</label>
      <div style={{ display:"flex", flexWrap:"wrap", gap:5, background:"#0a0a0a", border:"1px solid #252528", borderRadius:7, padding:"6px 8px", minHeight:34, cursor:"text" }}
        onClick={() => { setOpen(true); ref.current?.querySelector("input")?.focus(); }}>
        {assignees.map(n => <AssigneeTag key={n} name={n} roster={roster} onRemove={() => remove(n)} />)}
        <input value={input} onChange={e => { setInput(e.target.value); setOpen(true); }}
          onKeyDown={e => {
            if (e.key==="Enter" && input.trim()) { e.preventDefault(); add(input); }
            if (e.key==="Backspace" && !input && assignees.length) remove(assignees[assignees.length-1]);
          }}
          onFocus={() => setOpen(true)} placeholder={assignees.length ? "" : "Add person…"}
          style={{ flex:1, minWidth:80, background:"transparent", border:"none", outline:"none", color:"#f0ede8", fontSize:12, padding:"1px 2px" }}
        />
      </div>
      {open && (suggestions.length > 0 || input.trim()) && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#18181c", border:"1px solid #2a2a30", borderRadius:8, zIndex:50, marginTop:3, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,0.4)" }}>
          {suggestions.map(n => {
            const { hex, bg, border } = resolveColor(n, roster);
            return (
              <div key={n} onClick={() => add(n)} style={{ padding:"9px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}
                onMouseEnter={e => e.currentTarget.style.background="#222226"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                {/* Colour swatch */}
                <span style={{ width:10, height:10, borderRadius:"50%", background:hex, flexShrink:0, boxShadow:`0 0 5px ${hex}88` }} />
                <span style={{ fontSize:13, color:"#d0ccc8", flex:1 }}>{n}</span>
              </div>
            );
          })}
          {input.trim() && !assignees.includes(input.trim()) && (
            <div onClick={() => add(input)} style={{ padding:"9px 12px", cursor:"pointer", fontSize:13, color:"#888", borderTop: suggestions.length?"1px solid #1e1e22":"none" }}
              onMouseEnter={e => e.currentTarget.style.background="#222226"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              + Add "{input.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tag components ───────────────────────────────────────────────────────────

function TagBadge({ tag, onRemove, onTap }) {
  const c = tagColor(tag);
  return (
    <span onClick={e => { e.stopPropagation(); if (onTap) onTap(); }}
      style={{ display:"inline-flex", alignItems:"center", gap:3, background:c+"18", border:`1px solid ${c}44`, borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700, color:c, letterSpacing:"0.04em", flexShrink:0, cursor:onTap?"pointer":"default", transition:"filter 0.15s" }}
      onMouseEnter={e => { if (onTap) e.currentTarget.style.filter="brightness(1.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.filter="none"; }}>
      {tag}
      {onRemove && <span onClick={e => { e.stopPropagation(); onRemove(); }} style={{ cursor:"pointer", opacity:0.6, fontSize:12, lineHeight:1, marginLeft:2 }}>×</span>}
    </span>
  );
}

function TagInput({ tags = [], onChange, allTags = [] }) {
  const [input, setInput] = useState("");
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const suggestions = allTags.filter(t => !tags.includes(t) && t.toLowerCase().includes(input.toLowerCase()));

  function add(tag) {
    const t = tag.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    onChange([...tags, t]);
    setInput(""); setOpen(false);
  }

  function remove(tag) { onChange(tags.filter(t => t !== tag)); }

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <label style={{ fontSize:10, fontWeight:600, color:"#555", letterSpacing:"0.1em", textTransform:"uppercase" }}>Tags</label>
      <div style={{ display:"flex", flexWrap:"wrap", gap:5, background:"#0a0a0a", border:"1px solid #252528", borderRadius:7, padding:"6px 8px", minHeight:34, cursor:"text" }}
        onClick={() => { setOpen(true); ref.current?.querySelector("input")?.focus(); }}>
        {tags.map(t => <TagBadge key={t} tag={t} onRemove={() => remove(t)} />)}
        <input value={input} onChange={e => { setInput(e.target.value); setOpen(true); }}
          onKeyDown={e => {
            if ((e.key === "Enter" || e.key === ",") && input.trim()) { e.preventDefault(); add(input); }
            if (e.key === "Backspace" && !input && tags.length) remove(tags[tags.length - 1]);
          }}
          onFocus={() => setOpen(true)} placeholder={tags.length ? "" : "Add tag…"}
          style={{ flex:1, minWidth:80, background:"transparent", border:"none", outline:"none", color:"#f0ede8", fontSize:12, padding:"1px 2px" }}
        />
      </div>
      {open && (suggestions.length > 0 || input.trim()) && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#18181c", border:"1px solid #2a2a30", borderRadius:8, zIndex:50, marginTop:3, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,0.4)" }}>
          {suggestions.map(t => {
            const c = tagColor(t);
            return (
              <div key={t} onClick={() => add(t)} style={{ padding:"9px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}
                onMouseEnter={e => e.currentTarget.style.background="#222226"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:c, flexShrink:0 }} />
                <span style={{ fontSize:13, color:"#d0ccc8", flex:1 }}>{t}</span>
              </div>
            );
          })}
          {input.trim() && !tags.includes(input.trim().toLowerCase()) && (
            <div onClick={() => add(input)} style={{ padding:"9px 12px", cursor:"pointer", fontSize:13, color:"#888", borderTop: suggestions.length?"1px solid #1e1e22":"none" }}
              onMouseEnter={e => e.currentTarget.style.background="#222226"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              + Add "{input.trim().toLowerCase()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Status select ────────────────────────────────────────────────────────────

function StatusSelect({ value, onChange }) {
  const st = TASK_STATUSES.find(s => s.id === value) ?? TASK_STATUSES[0];
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ background:"#0a0a0a", border:`1px solid ${st.color}55`, borderRadius:6, color:st.color, fontSize:11, fontWeight:700, padding:"4px 8px", letterSpacing:"0.05em", flexShrink:0 }}>
      {TASK_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label.toUpperCase()}</option>)}
    </select>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onChange, onDelete, userName, allNames = [], roster = [], onPersonTap, onTagTap, allTags = [], selected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const st       = TASK_STATUSES.find(s => s.id === task.status) ?? TASK_STATUSES[0];
  const assignees = task.assignees?.length ? task.assignees : (task.owner ? [task.owner] : []);
  const tags      = task.tags ?? [];

  return (
    <div className="task-row" style={{ background:"#111113", borderRadius:10, border:`1px solid ${expanded?"#2a2a30":"#1e1e22"}`, overflow:"hidden", transition:"border-color 0.2s" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px" }}>
        {/* Drag handle */}
        <div data-drag="true" title="Drag to reorder" style={{ cursor:"grab", color:"#2a2a2e", fontSize:14, flexShrink:0, lineHeight:1, padding:"0 2px", userSelect:"none" }}>⠿</div>

        {/* Bulk select checkbox */}
        {onSelect && (
          <div onClick={e => { e.stopPropagation(); onSelect(); }}
            style={{ width:18, height:18, borderRadius:4, border:`1.5px solid ${selected?"#a78bfa":"#333"}`, background:selected?"#a78bfa22":"transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, transition:"all 0.15s" }}>
            {selected && <span style={{ fontSize:11, color:"#a78bfa", fontWeight:700, lineHeight:1 }}>✓</span>}
          </div>
        )}

        {/* Status dot */}
        <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background:st.color, boxShadow:task.status!=="not-started"?`0 0 5px ${st.color}66`:"none" }} />

        {/* Label */}
        <span onClick={() => setExpanded(!expanded)} style={{ flex:1, fontSize:13, fontWeight:500, color:task.status==="done"?"#444":"#d0ccc8", textDecoration:task.status==="done"?"line-through":"none", cursor:"pointer", lineHeight:1.4 }}>
          {task.label}
        </span>

        {/* Tag badges */}
        {tags.length > 0 && (
          <div style={{ display:"flex", gap:3, flexWrap:"wrap", maxWidth:120 }}>
            {tags.map(t => <TagBadge key={t} tag={t} onTap={onTagTap ? () => onTagTap(t) : undefined} />)}
          </div>
        )}

        {/* Assignee tags */}
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", maxWidth:160 }}>
          {assignees.map(n => (
            <AssigneeTag key={n} name={n} roster={roster} onTap={onPersonTap ? () => onPersonTap(n) : undefined} />
          ))}
        </div>

        {/* Due date */}
        {task.due && (() => {
          const ov = new Date(task.due) < new Date() && task.status !== "done";
          return <span style={{ fontSize:10, color:ov?"#ef4444":"#555", flexShrink:0 }}>{new Date(task.due).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span>;
        })()}

        <StatusSelect value={task.status} onChange={v => onChange({ ...task, status:v, updated_by:userName })} />

        <button onClick={() => setExpanded(!expanded)} style={{ background:"none", border:"none", color:"#333", fontSize:10, cursor:"pointer", padding:"0 2px", transform:expanded?"rotate(180deg)":"none", transition:"transform 0.2s", flexShrink:0 }}>▼</button>
        <button className="del-btn" onClick={onDelete} style={{ background:"none", border:"none", color:"#2a2a2e", fontSize:14, cursor:"pointer", padding:"0 2px", flexShrink:0, transition:"color 0.12s" }}>✕</button>
      </div>

      {expanded && (
        <div style={{ padding:"12px 14px 16px", display:"flex", flexDirection:"column", gap:10, borderTop:"1px solid #1a1a1e" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <AssigneeInput assignees={assignees} onChange={a => onChange({...task, assignees:a, owner:a[0]??""})} roster={roster} />
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:10, fontWeight:600, color:"#555", letterSpacing:"0.1em", textTransform:"uppercase" }}>Due date</label>
              <input type="date" value={task.due} onChange={e => onChange({ ...task, due:e.target.value })} style={{ background:"#0a0a0a", border:"1px solid #252528", borderRadius:7, color:task.due?"#f0ede8":"#555", padding:"7px 10px", fontSize:12 }} />
            </div>
          </div>
          <TagInput tags={tags} onChange={newTags => onChange({ ...task, tags: newTags })} allTags={allTags} />
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={{ fontSize:10, fontWeight:600, color:"#555", letterSpacing:"0.1em", textTransform:"uppercase" }}>Notes & Commentary</label>
            <textarea value={task.notes} onChange={e => onChange({ ...task, notes:e.target.value })} placeholder="Add detailed notes, context, links, supplier info..." rows={3} style={{ background:"#0a0a0a", border:"1px solid #252528", borderRadius:7, color:"#c8c4bf", padding:"9px 11px", fontSize:13, lineHeight:1.6, resize:"vertical", minHeight:72 }} />
          </div>
          {task.updated_by && <div style={{ fontSize:10, color:"#3a3a3e", letterSpacing:"0.06em" }}>LAST UPDATED BY {task.updated_by.toUpperCase()}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Area description ─────────────────────────────────────────────────────────

function AreaDescription({ value, onChange, readOnly }) {
  const [editing, setEditing] = useState(false);
  const taRef = useRef(null);

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.selectionStart = taRef.current.value.length;
    }
  }, [editing]);

  if (readOnly) {
    if (!value) return null;
    return <p style={{ fontSize:14, color:"#666", lineHeight:1.6, marginBottom:12 }}>{value}</p>;
  }

  if (editing) {
    return (
      <textarea ref={taRef} value={value} onChange={e => onChange(e.target.value)} onBlur={() => setEditing(false)} placeholder="Add a description for this area…" rows={2}
        style={{ width:"100%", background:"transparent", border:"none", borderBottom:"1px solid #2a2a2e", borderRadius:0, color:"#888", fontSize:14, padding:"4px 0 8px", lineHeight:1.6, resize:"none", marginBottom:12, outline:"none", minHeight:"auto" }}
      />
    );
  }

  return (
    <div onClick={() => setEditing(true)} style={{ marginBottom:12, cursor:"text", minHeight:24 }}>
      {value
        ? <p style={{ fontSize:14, color:"#666", lineHeight:1.6 }}>{value}</p>
        : <p style={{ fontSize:13, color:"#2a2a2e", fontStyle:"italic" }}>Add description…</p>
      }
    </div>
  );
}


// ─── Voting bar ───────────────────────────────────────────────────────────────

function VotingBar({ votes, userName, onChange }) {
  // Find the current user's existing vote — tolerates old "Name · Company" keys
  const myVoteEntry = Object.entries(votes).find(([k]) =>
    k === userName || k.split(" ·")[0].trim() === userName.trim()
  );
  const myVote    = myVoteEntry?.[1] ?? null;
  const myVoteKey = myVoteEntry?.[0];  // may differ from userName (old format)

  const allVals = Object.values(votes);
  const total = allVals.length;

  let modeVal = null;
  if (total > 0) {
    const counts = [1,2,3,4,5].map(v => ({ v, c: allVals.filter(x => x===v).length }));
    modeVal = counts.reduce((a,b) => b.c > a.c ? b : a).v;
  }
  const modeRating = modeVal ? getRating(modeVal) : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {total > 0 && (
        <div style={{ background:"#0d0d10", border:"1px solid #1e1e22", borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", gap:4, height:20, alignItems:"flex-end", marginBottom:3 }}>
              {[1,2,3,4,5].map(v => {
                const count = allVals.filter(x=>x===v).length;
                const r = getRating(v);
                const h = total > 0 ? Math.max(3, (count/total)*20) : 3;
                return <div key={v} style={{ flex:1, height:h, background:count>0?r.color:"#252528", borderRadius:2, transition:"height 0.3s" }} />;
              })}
            </div>
            <div style={{ display:"flex", gap:4 }}>
              {[1,2,3,4,5].map(v => <div key={v} style={{ flex:1, textAlign:"center", fontSize:9, color:"#444" }}>{v}</div>)}
            </div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            {modeRating && <div style={{ fontSize:13, fontWeight:800, color:modeRating.color, letterSpacing:"0.04em" }}>{modeRating.label}</div>}
            <div style={{ fontSize:10, color:"#555", marginBottom:4 }}>{total} vote{total!==1?"s":""}</div>
            {Object.entries(votes).map(([name, v]) => {
              const r = getRating(v);
              const isMe = name === myVoteKey;
              return <div key={name} style={{ fontSize:9, color:isMe?"#888":"#3a3a3e", letterSpacing:"0.04em" }}>{name.split(" ·")[0]} — {r?.label}</div>;
            })}
          </div>
        </div>
      )}
      <div>
        <div style={{ fontSize:9, fontWeight:700, color:"#444", letterSpacing:"0.1em", marginBottom:6 }}>YOUR VOTE</div>
        <div style={{ display:"flex", gap:6 }}>
          {REVIEW_RATINGS.map(r => {
            const active = myVote === r.value;
            return (
              <button key={r.value} className="rating-btn" onClick={() => {
                const newVotes = { ...votes };
                // Remove any old entry for this user (e.g. stored as "Name · Company")
                if (myVoteKey && myVoteKey !== userName) delete newVotes[myVoteKey];
                if (active) delete newVotes[userName]; else newVotes[userName] = r.value;
                onChange(newVotes);
              }} style={{ flex:1, height:44, borderRadius:8, border:`1.5px solid ${active?r.color:"#252528"}`, background:active?r.color+"22":"#131315", color:active?r.color:"#555", fontSize:11, fontWeight:600, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2 }}>
                <span style={{ fontSize:16, lineHeight:1 }}>{r.value}</span>
                <span style={{ fontSize:9, opacity:active?1:0.5, letterSpacing:"0.06em" }}>{r.label.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Comment thread ───────────────────────────────────────────────────────────

const taSt = (bg) => ({ width:"100%", background:bg, border:"1px solid #222", borderRadius:8, color:"#c8c4bf", fontSize:13, padding:"10px 12px", lineHeight:1.6, boxSizing:"border-box" });
const lbSt = { fontSize:10, fontWeight:600, color:"#555", letterSpacing:"0.1em", textTransform:"uppercase" };

function CommentThread({ entries = [], onSave, userName, placeholder, bgColor, isSupplier }) {
  const [draft, setDraft] = useState("");
  const myEntry = entries.find(e => e.author === userName);

  function handleChange(e) {
    const v = e.target.value;
    setDraft(v);
    let updated;
    if (myEntry) {
      updated = v.trim()
        ? entries.map(en => en.author===userName ? { ...en, text:v, ts:new Date().toISOString() } : en)
        : entries.filter(en => en.author !== userName);
    } else {
      updated = v.trim() ? [...entries, { text:v, author:userName, ts:new Date().toISOString() }] : entries;
    }
    onSave(updated);
  }

  function deleteEntry(index) { onSave(entries.filter((_, i) => i !== index)); }

  useEffect(() => { setDraft(myEntry?.text ?? ""); }, [myEntry?.text]);

  const othersWithIndex = entries.map((e,i) => ({...e,_i:i})).filter(e => e.author!==userName && e.text?.trim());

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {othersWithIndex.map(e => {
        const hue = (e.author??"anon").split("").reduce((a,c)=>a+c.charCodeAt(0),0) % 360;
        return (
          <div key={e._i} style={{ background:`hsl(${hue},30%,8%)`, border:`1px solid hsl(${hue},30%,15%)`, borderRadius:8, padding:"8px 10px", display:"flex", flexDirection:"column", gap:4 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:10, fontWeight:700, color:`hsl(${hue},55%,55%)`, letterSpacing:"0.06em" }}>
                {e.author??"Anonymous"}{e.ts ? ` · ${new Date(e.ts).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}` : ""}
              </div>
              {!isSupplier && (
                <button onClick={() => deleteEntry(e._i)} style={{ background:"none", border:"none", color:"#2a2a2e", fontSize:13, cursor:"pointer", padding:"0 2px", lineHeight:1, transition:"color 0.12s" }}
                  onMouseEnter={e=>e.currentTarget.style.color="#ef4444"} onMouseLeave={e=>e.currentTarget.style.color="#2a2a2e"} title="Delete comment">✕</button>
              )}
            </div>
            <div style={{ fontSize:13, color:"#b0aca8", lineHeight:1.5 }}>{e.text}</div>
          </div>
        );
      })}
      <textarea value={draft} onChange={handleChange} placeholder={placeholder} style={{ ...taSt(bgColor) }} />
      {draft.trim() && <div style={{ fontSize:10, color:"#444", letterSpacing:"0.05em" }}>Saving as <span style={{ color:"#666" }}>{userName}</span></div>}
    </div>
  );
}

// ─── Review section ───────────────────────────────────────────────────────────

function ReviewSection({ catName, data, onSave, saveKey, saveStatuses, onRemove, userName, isSupplier, nextYear, areaName, onAISuggestion, allReviewTags = [], onTagTap }) {
  const status = saveStatuses[saveKey] ?? "idle";
  const [open, setOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const aiTimer = useRef(null);

  const votes      = data?.votes ?? {};
  const wwEntries  = parseComments(data?.worked_well);
  const niEntries  = parseComments(data?.needs_improvement);
  const [no, setNo] = useState(data?.notes ?? "");
  const [localTags, setLocalTags] = useState(data?.tags ?? []);

  useEffect(() => { setNo(data?.notes ?? ""); }, [data]);
  useEffect(() => { setLocalTags(data?.tags ?? []); }, [data]);

  function buildPatch(newVotes, newWw, newNi, newNo, newTags) {
    return { votes:newVotes, worked_well:newWw, needs_improvement:newNi, notes:newNo, tags:newTags };
  }

  const debouncedSave = useDebounce((patch) => onSave(patch), 900);

  function triggerAI(newWw, newNi, newNo) {
    if (!nextYear || isSupplier) return;
    clearTimeout(aiTimer.current);
    aiTimer.current = setTimeout(async () => {
      const wwText = (Array.isArray(newWw) ? newWw.map(e=>e.text) : [newWw]).filter(Boolean).join(" ");
      const niText = (Array.isArray(newNi) ? newNi.map(e=>e.text) : [newNi]).filter(Boolean).join(" ");
      const text = [wwText, niText, newNo].filter(Boolean).join(" | ");
      if (text.trim().length < 15) return;
      setAiStatus("thinking");
      const suggestion = await getAISuggestion({ areaName, catName, workedWell:wwText, needsImprovement:niText, notes:newNo });
      if (suggestion) { onAISuggestion(suggestion); setAiStatus("done"); setTimeout(()=>setAiStatus(null),5000); }
      else setAiStatus(null);
    }, 2500);
  }

  function handleWW(newEntries) { const p=buildPatch(votes,newEntries,niEntries,no,localTags); debouncedSave(p); triggerAI(newEntries,niEntries,no); }
  function handleNI(newEntries) { const p=buildPatch(votes,wwEntries,newEntries,no,localTags); debouncedSave(p); triggerAI(wwEntries,newEntries,no); }
  function handleNo(v)          { setNo(v); const p=buildPatch(votes,wwEntries,niEntries,v,localTags); debouncedSave(p); triggerAI(wwEntries,niEntries,v); }
  function handleVotes(nv)      { onSave(buildPatch(nv,wwEntries,niEntries,no,localTags)); }
  function handleTags(newTags)  { setLocalTags(newTags); onSave(buildPatch(votes,wwEntries,niEntries,no,newTags)); }

  const allVals = Object.values(votes);
  const total   = allVals.length;
  let modeVal   = null;
  if (total > 0) modeVal = [1,2,3,4,5].map(v=>({v,c:allVals.filter(x=>x===v).length})).reduce((a,b)=>b.c>a.c?b:a).v;
  const modeRating = modeVal ? getRating(modeVal) : null;
  const hasContent = wwEntries.length || niEntries.length || no;

  return (
    <div style={{ background:"#111113", borderRadius:12, border:`1px solid ${open?"#2a2a30":"#1e1e22"}`, overflow:"hidden", transition:"border-color 0.2s" }}>
      <div style={{ display:"flex", alignItems:"stretch" }}>
        <button onClick={() => setOpen(!open)} style={{ flex:1, display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
          <div data-drag="true" title="Drag to reorder" style={{ cursor:"grab", color:"#2a2a2e", fontSize:14, flexShrink:0, lineHeight:1, padding:"0 2px", userSelect:"none" }}>⠿</div>
          <div style={{ width:10, height:10, borderRadius:"50%", flexShrink:0, background:modeRating?modeRating.color:"#252528", boxShadow:modeRating?`0 0 6px ${modeRating.color}66`:"none" }} />
          <span style={{ fontWeight:700, fontSize:13, letterSpacing:"0.05em", flex:1, color:modeRating||hasContent?"#e8e4df":"#555" }}>{catName.toUpperCase()}</span>
          {status==="saving" && <span style={{ fontSize:10, color:"#555" }}>SAVING…</span>}
          {status==="saved"  && <span className="save-pulse" style={{ fontSize:10, color:"#22c55e" }}>SAVED</span>}
          {total>0 && !open && modeRating && <span style={{ fontSize:10, fontWeight:700, color:modeRating.color, letterSpacing:"0.06em" }}>{modeRating.label.toUpperCase()} · {total}v</span>}
          {!total && hasContent && !open && <span style={{ fontSize:10, color:"#444", letterSpacing:"0.06em" }}>{[...new Set([...wwEntries,...niEntries].map(e=>e.author).filter(Boolean))].slice(0,3).join(", ") || "NOTES"}</span>}
          {localTags.length > 0 && !open && (
            <div style={{ display:"flex", gap:4, flexShrink:0 }}>
              {localTags.slice(0,3).map(t => <TagBadge key={t} tag={t} onTap={onTagTap ? () => onTagTap(t) : undefined} />)}
            </div>
          )}
          <span style={{ color:"#333", fontSize:12, transform:open?"rotate(180deg)":"none", transition:"transform 0.2s", display:"inline-block", marginLeft:4 }}>▼</span>
        </button>
        {!isSupplier && onRemove && (
          <button className="del-btn" onClick={onRemove} title="Remove section"
            style={{ background:"none", border:"none", borderLeft:"1px solid #1e1e22", color:"#2a2a2e", fontSize:14, cursor:"pointer", padding:"0 14px", flexShrink:0, transition:"color 0.12s, background 0.12s" }}>✕</button>
        )}
      </div>
      {open && (
        <div style={{ padding:"0 18px 18px", display:"flex", flexDirection:"column", gap:14, borderTop:"1px solid #1a1a1e" }}>
          <div style={{ paddingTop:16 }}>
            <VotingBar votes={votes} userName={userName} onChange={handleVotes} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={lbSt}>What worked well</label>
              <CommentThread entries={wwEntries} onSave={handleWW} userName={userName} placeholder="What went well..." bgColor="#0a1a12" isSupplier={isSupplier} />
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={lbSt}>Needs improvement</label>
              <CommentThread entries={niEntries} onSave={handleNI} userName={userName} placeholder="What to fix..." bgColor="#1a0e0e" isSupplier={isSupplier} />
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <label style={lbSt}>Notes, suppliers & ideas</label>
            <textarea value={no} onChange={e => handleNo(e.target.value)} placeholder="Contacts, costs, specs..." style={{ ...taSt("#0e0e1a"), minHeight:52 }} />
          </div>
          {!isSupplier && (
            <TagInput tags={localTags} onChange={handleTags} allTags={allReviewTags} />
          )}
          {isSupplier && localTags.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {localTags.map(t => <TagBadge key={t} tag={t} />)}
            </div>
          )}
          {aiStatus && (
            <div className="ai-pulse" style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, color:aiStatus==="done"?"#a78bfa":"#555", letterSpacing:"0.05em" }}>
              {aiStatus==="thinking" ? `Generating ${nextYear} tracker suggestion…` : `Suggestion added to ${nextYear} tracker ✓`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── Tracker Calendar ─────────────────────────────────────────────────────────

function TrackerCalendar({ areas, getAreaTasks, activeDept, activeFestival, activeYear, onTaskClick }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const tasksByDate = {};
  areas.forEach(areaName => {
    const tasks = getAreaTasks(activeDept, areaName, activeFestival, activeYear);
    tasks.forEach(task => {
      if (!task.due) return;
      const key = task.due.slice(0,10);
      if (!tasksByDate[key]) tasksByDate[key] = [];
      tasksByDate[key].push({ ...task, areaName });
    });
  });

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const startPad    = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const totalCells  = Math.ceil((startPad + daysInMonth) / 7) * 7;
  const monthNames  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dayNames    = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const todayKey    = today.toISOString().slice(0,10);

  function statusColor(status) {
    if (status==="done")        return "#22c55e";
    if (status==="in-progress") return "#eab308";
    if (status==="blocked")     return "#ef4444";
    return "#3a3a4a";
  }

  const overdue = [];
  Object.entries(tasksByDate).forEach(([key,tasks]) => {
    if (key < todayKey) tasks.forEach(t => { if (t.status!=="done") overdue.push({...t,dateKey:key}); });
  });

  const upcoming = [];
  for (let d=0; d<60; d++) {
    const dt = new Date(today); dt.setDate(today.getDate()+d);
    const key = dt.toISOString().slice(0,10);
    if (tasksByDate[key]) tasksByDate[key].forEach(t => { if (t.status!=="done") upcoming.push({...t,dateKey:key,date:dt}); });
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {overdue.length > 0 && (
        <div style={{ background:"#1a0808", border:"1px solid #3a1a1a", borderRadius:12, padding:"12px 16px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#ef4444", letterSpacing:"0.1em", marginBottom:8 }}>⚠ {overdue.length} OVERDUE TASK{overdue.length>1?"S":""}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {overdue.slice(0,5).map((t,i) => (
              <div key={i} onClick={()=>onTaskClick(t.areaName)} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"4px 6px", borderRadius:6 }}
                onMouseEnter={e=>e.currentTarget.style.background="#2a1010"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{ fontSize:10, color:"#ef4444", flexShrink:0, fontFamily:"monospace" }}>{new Date(t.dateKey+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span>
                <span style={{ fontSize:12, color:"#d0ccc8", flex:1 }}>{t.label}</span>
                <span style={{ fontSize:10, color:"#555" }}>{t.areaName}</span>
              </div>
            ))}
            {overdue.length>5 && <div style={{ fontSize:10, color:"#555", paddingLeft:6 }}>+{overdue.length-5} more</div>}
          </div>
        </div>
      )}

      <div style={{ background:"#111113", border:"1px solid #1e1e22", borderRadius:14, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"14px 16px", borderBottom:"1px solid #1a1a1e" }}>
          <button onClick={()=>setViewDate(new Date(year,month-1,1))} style={{ background:"none", border:"1px solid #252528", borderRadius:7, color:"#666", fontSize:16, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
          <span style={{ flex:1, textAlign:"center", fontWeight:700, fontSize:15, color:"#e8e4df", letterSpacing:"0.04em" }}>{monthNames[month]} {year}</span>
          <button onClick={()=>setViewDate(new Date(year,month+1,1))} style={{ background:"none", border:"1px solid #252528", borderRadius:7, color:"#666", fontSize:16, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
          {(month!==today.getMonth()||year!==today.getFullYear()) && (
            <button onClick={()=>setViewDate(new Date(today.getFullYear(),today.getMonth(),1))} style={{ background:"none", border:"1px solid #252528", borderRadius:7, color:"#555", fontSize:10, fontWeight:700, padding:"0 10px", height:32, cursor:"pointer", letterSpacing:"0.06em" }}>TODAY</button>
          )}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"1px solid #1a1a1e" }}>
          {dayNames.map(d => <div key={d} style={{ textAlign:"center", padding:"8px 0", fontSize:10, fontWeight:700, color:"#333", letterSpacing:"0.08em" }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
          {Array.from({length:totalCells}).map((_,i) => {
            const dayNum = i - startPad + 1;
            const isValid = dayNum>=1 && dayNum<=daysInMonth;
            const cellDate = isValid ? new Date(year,month,dayNum) : null;
            const dateKey  = cellDate ? cellDate.toISOString().slice(0,10) : null;
            const isToday  = dateKey===todayKey;
            const isPast   = cellDate && cellDate<today && !isToday;
            const dayTasks = dateKey ? (tasksByDate[dateKey]??[]) : [];
            return (
              <div key={i} style={{ minHeight:72, padding:"6px 4px 4px", borderRight:(i+1)%7===0?"none":"1px solid #161618", borderBottom:i<totalCells-7?"1px solid #161618":"none", background:isToday?"#0e0e18":"transparent" }}>
                {isValid && (
                  <>
                    <div style={{ fontSize:11, fontWeight:isToday?800:500, color:isToday?"#a78bfa":isPast?"#333":"#666", textAlign:"right", marginBottom:3 }}>
                      {isToday ? <span style={{ background:"#a78bfa", color:"#0a0a0a", borderRadius:"50%", width:18, height:18, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>{dayNum}</span> : dayNum}
                    </div>
                    {dayTasks.slice(0,3).map((t,ti) => {
                      const isOverdue = isPast && t.status!=="done";
                      const dotColor  = isOverdue ? "#ef4444" : statusColor(t.status);
                      return (
                        <div key={ti} onClick={()=>onTaskClick(t.areaName)} title={`${t.label} · ${t.areaName}`}
                          style={{ fontSize:10, lineHeight:1.3, color:isOverdue?"#ef4444":t.status==="done"?"#444":"#888", background:isOverdue?"#2a0a0a":"#1a1a1e", borderLeft:`2px solid ${dotColor}`, borderRadius:"0 4px 4px 0", padding:"2px 5px", marginBottom:2, cursor:"pointer", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", textDecoration:t.status==="done"?"line-through":"none", transition:"background 0.1s" }}
                          onMouseEnter={e=>e.currentTarget.style.background=isOverdue?"#3a1010":"#252528"}
                          onMouseLeave={e=>e.currentTarget.style.background=isOverdue?"#2a0a0a":"#1a1a1e"}>
                          {t.label}
                        </div>
                      );
                    })}
                    {dayTasks.length>3 && <div style={{ fontSize:9, color:"#444", paddingLeft:4, letterSpacing:"0.04em" }}>+{dayTasks.length-3} more</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {upcoming.length > 0 && (
        <div style={{ background:"#111113", border:"1px solid #1e1e22", borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:"1px solid #1a1a1e", fontSize:10, fontWeight:700, color:"#444", letterSpacing:"0.1em" }}>
            NEXT 60 DAYS — {upcoming.length} OPEN TASK{upcoming.length>1?"S":""}
          </div>
          <div style={{ display:"flex", flexDirection:"column" }}>
            {upcoming.map((t,i) => {
              const daysAway = Math.round((t.date-today)/86400000);
              const urgency  = daysAway<=7?"#f97316":daysAway<=14?"#eab308":"#555";
              return (
                <div key={i} onClick={()=>onTaskClick(t.areaName)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", borderBottom:i<upcoming.length-1?"1px solid #141416":"none", cursor:"pointer" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#151518"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ width:44, flexShrink:0 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:urgency, lineHeight:1 }}>{t.date.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</div>
                    <div style={{ fontSize:9, color:"#333", marginTop:1 }}>{daysAway===0?"today":daysAway===1?"tomorrow":`${daysAway}d`}</div>
                  </div>
                  <div style={{ width:3, height:28, borderRadius:2, background:statusColor(t.status), flexShrink:0 }} />
                  <div style={{ flex:1, overflow:"hidden" }}>
                    <div style={{ fontSize:13, color:"#d0ccc8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.label}</div>
                    <div style={{ fontSize:10, color:"#444", marginTop:1 }}>{t.areaName}</div>
                  </div>
                  {t.assignees?.length > 0 && (
                    <div style={{ display:"flex", gap:3, flexShrink:0 }}>
                      {t.assignees.slice(0,2).map(n => {
                        const hue = n.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360;
                        return <span key={n} title={n} style={{ width:20, height:20, borderRadius:"50%", background:`hsl(${hue},55%,25%)`, border:`1px solid hsl(${hue},55%,40%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:700, color:`hsl(${hue},55%,65%)` }}>{n[0].toUpperCase()}</span>;
                      })}
                    </div>
                  )}
                  <span style={{ fontSize:10, color:"#2a2a2e", flexShrink:0 }}>→</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {Object.keys(tasksByDate).length===0 && <div style={{ textAlign:"center", padding:"40px 0", color:"#333", fontSize:12, letterSpacing:"0.1em" }}>NO DUE DATES SET YET</div>}
    </div>
  );
}


// ─── SAG Deadline Dashboard ───────────────────────────────────────────────────
// NEW FEATURE: Pulls all council-licensing tasks with due dates into one sorted timeline.

function SAGDashboard({ festival, years, getDepts, getAreaTasks, allAreas, onClose, onNavigate }) {
  const today = new Date();
  const todayKey = today.toISOString().slice(0,10);

  // Collect all council-licensing tasks with due dates across all tracker years
  const allDeadlines = [];
  years.filter(y => isTrackerYear(y)).forEach(year => {
    const depts = getDepts(festival.id);
    const clDept = depts.find(d => d.id==="council-licensing");
    if (!clDept) return;
    const deptAreas = allAreas[keys.dept(festival.id, clDept.id)] ?? [];
    deptAreas.forEach(areaName => {
      const tasks = getAreaTasks(clDept.id, areaName, festival.id, year);
      tasks.forEach(task => {
        if (!task.due) return;
        allDeadlines.push({ ...task, areaName, year, dept: clDept.id });
      });
    });
  });

  allDeadlines.sort((a,b) => a.due.localeCompare(b.due));

  const overdue   = allDeadlines.filter(t => t.due < todayKey && t.status !== "done");
  const upcoming  = allDeadlines.filter(t => t.due >= todayKey && t.status !== "done");
  const completed = allDeadlines.filter(t => t.status === "done");

  function statusColor(status) {
    if (status==="done")        return "#22c55e";
    if (status==="in-progress") return "#eab308";
    if (status==="blocked")     return "#ef4444";
    return "#555";
  }

  function DeadlineRow({ t }) {
    const daysAway  = Math.round((new Date(t.due+"T12:00:00") - today) / 86400000);
    const isOverdue = t.due < todayKey && t.status !== "done";
    const urgency   = isOverdue ? "#ef4444" : daysAway<=7 ? "#f97316" : daysAway<=14 ? "#eab308" : "#555";
    return (
      <div onClick={() => onNavigate(t.year, "council-licensing", t.areaName)}
        style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:"1px solid #141416", cursor:"pointer" }}
        onMouseEnter={e => e.currentTarget.style.background="#151518"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
        <div style={{ width:52, flexShrink:0 }}>
          <div style={{ fontSize:11, fontWeight:700, color:urgency, lineHeight:1 }}>{new Date(t.due+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</div>
          <div style={{ fontSize:9, color:"#444", marginTop:1 }}>{t.year}</div>
        </div>
        <div style={{ width:3, height:32, borderRadius:2, background:statusColor(t.status), flexShrink:0 }} />
        <div style={{ flex:1, overflow:"hidden" }}>
          <div style={{ fontSize:13, color:t.status==="done"?"#444":"#d0ccc8", textDecoration:t.status==="done"?"line-through":"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.label}</div>
          <div style={{ fontSize:10, color:"#555", marginTop:1 }}>{t.areaName}</div>
        </div>
        {isOverdue && <Pill label="OVERDUE" color="#ef4444" />}
        {!isOverdue && t.status==="in-progress" && <Pill label="In Progress" color="#eab308" />}
        {!isOverdue && t.status==="blocked"     && <Pill label="Blocked"     color="#ef4444" />}
        <span style={{ fontSize:10, color:"#333" }}>→</span>
      </div>
    );
  }

  function Section({ title, items, color, emptyMsg }) {
    const [collapsed, setCollapsed] = useState(false);
    if (!items.length) return null;
    return (
      <div style={{ background:"#111113", border:`1px solid ${color}22`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
        <div onClick={() => setCollapsed(!collapsed)} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", cursor:"pointer", borderBottom:collapsed?"none":"1px solid #1a1a1e" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0 }} />
          <span style={{ flex:1, fontWeight:700, fontSize:12, color, letterSpacing:"0.08em" }}>{title} ({items.length})</span>
          <span style={{ color:"#333", fontSize:11, transform:collapsed?"none":"rotate(180deg)", transition:"transform 0.2s" }}>▼</span>
        </div>
        {!collapsed && items.map((t,i) => <DeadlineRow key={i} t={t} />)}
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a" }}>
      <PageHeader>
        <BackBtn onClick={onClose} />
        <FestivalLogo festival={festival} size={34} />
        <span style={{ color:"#2a2a2e", fontSize:14 }}>·</span>
        <span style={{ fontWeight:700, fontSize:13, color:"#888" }}>SAG & Licensing Deadlines</span>
        <div style={{ flex:1 }} />
      </PageHeader>
      <div style={{ maxWidth:700, margin:"0 auto", padding:"28px 20px 80px" }}>
        <div style={{ marginBottom:24 }}>
          <div style={{ fontWeight:800, fontSize:26, color:"#f0ede8", marginBottom:4 }}>Deadline Dashboard</div>
          <div style={{ fontSize:13, color:"#555" }}>All Council & Licensing tasks with due dates · {allDeadlines.length} total</div>
        </div>

        {allDeadlines.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px", color:"#333", fontSize:13 }}>No deadlines set yet. Add due dates to Council &amp; Licensing tasks to see them here.</div>
        ) : (
          <>
            <Section title="OVERDUE"  items={overdue}   color="#ef4444" />
            <Section title="UPCOMING" items={upcoming}  color="#eab308" />
            <Section title="COMPLETED" items={completed} color="#22c55e" />
          </>
        )}
      </div>
    </div>
  );
}


// ─── UploadedSiteMap ─────────────────────────────────────────────────────────
// Renders a user-uploaded SVG and overlays coloured status dots on area names
// found as text content within the SVG. Works for any festival.

function UploadedSiteMap({ svgText, areas, tracker, getAreaColor, onAreaTap }) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !svgText) return;
    const container = containerRef.current;
    container.innerHTML = svgText;
    const svg = container.querySelector("svg");
    if (!svg) return;

    // Make SVG responsive
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";

    // Walk all text elements looking for area name matches
    const textEls = svg.querySelectorAll("text, tspan");
    textEls.forEach(el => {
      const text = el.textContent?.trim() ?? "";
      const matched = areas.find(a => a.toLowerCase() === text.toLowerCase() ||
        text.toLowerCase().includes(a.toLowerCase()) ||
        a.toLowerCase().includes(text.toLowerCase()));
      if (!matched) return;

      const color = getAreaColor(matched);
      if (!color) return;

      // Style the text element
      el.style.cursor = "pointer";
      el.style.fill = color;
      el.style.fontWeight = "bold";
      el.addEventListener("click", () => onAreaTap(matched));

      // Try to add a small glow circle near the text
      try {
        const bbox = el.getBBox();
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", bbox.x + bbox.width + 6);
        circle.setAttribute("cy", bbox.y + bbox.height / 2);
        circle.setAttribute("r", "5");
        circle.setAttribute("fill", color);
        circle.setAttribute("opacity", "0.85");
        circle.style.cursor = "pointer";
        circle.addEventListener("click", () => onAreaTap(matched));
        el.parentNode.insertBefore(circle, el.nextSibling);
      } catch(e) {}
    });

    setReady(true);
  }, [svgText, areas, tracker]);

  return (
    <div style={{ background:"#111113", border:"1px solid #1e1e22", borderRadius:14, overflow:"hidden", padding:8 }}>
      {!ready && <div style={{ textAlign:"center", padding:40, color:"#444", fontSize:12 }}>Rendering map…</div>}
      <div ref={containerRef} style={{ display: ready ? "block" : "none" }} />
      <div style={{ padding:"8px 12px 4px", display:"flex", flexWrap:"wrap", gap:8 }}>
        {areas.filter(a => getAreaColor(a)).map(a => {
          const color = getAreaColor(a);
          return (
            <button key={a} onClick={() => onAreaTap(a)}
              style={{ background:"transparent", border:"none", display:"flex", alignItems:"center", gap:5, cursor:"pointer", padding:"2px 4px" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:color, flexShrink:0 }} />
              <span style={{ fontSize:10, color, fontWeight:600 }}>{a}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [supplierToken]       = useState(() => parseSupplierToken());
  const isSupplier             = !!supplierToken;

  // ── Global save-error toast ───────────────────────────────────────────────
  const saveErrTimer = useRef(null);
  const [saveErrMsg, setSaveErrMsg] = useState(null);
  function showSaveError(msg = "Save failed — check your connection") {
    clearTimeout(saveErrTimer.current);
    setSaveErrMsg(msg);
    saveErrTimer.current = setTimeout(() => setSaveErrMsg(null), 5000);
  }
  useEffect(() => {
    let el = document.getElementById("__gw-save-err__");
    if (!el) {
      el = document.createElement("div");
      el.id = "__gw-save-err__";
      el.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(12px);background:#1a0808;border:1px solid #ef4444;border-radius:10px;padding:10px 20px;color:#ef4444;font-size:12px;font-weight:700;letter-spacing:0.06em;z-index:99999;pointer-events:none;transition:opacity 0.25s,transform 0.25s;opacity:0;";
      document.body.appendChild(el);
    }
    if (saveErrMsg) {
      el.textContent = "⚠  " + saveErrMsg;
      el.style.opacity = "1";
      el.style.transform = "translateX(-50%) translateY(0)";
    } else {
      el.style.opacity = "0";
      el.style.transform = "translateX(-50%) translateY(12px)";
    }
  }, [saveErrMsg]);

  // ── Routing ──────────────────────────────────────────────────────────────
  const [screen, setScreen]         = useState("home");
  const [activeFestival, setActiveFestival] = useState(null);
  const [activeYear, setActiveYear] = useState(null);
  const [activeDept, setActiveDept] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);

  // ── Identity ──────────────────────────────────────────────────────────────
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("14twenty_user") ?? "null"); } catch(e) { return null; }
  });
  const [showIdentity, setShowIdentity] = useState(() => {
    try { return !JSON.parse(localStorage.getItem("14twenty_user") ?? "null") && !isSupplier; } catch(e) { return true; }
  });
  const [identityName, setIdentityName] = useState(() => {
    try { return JSON.parse(localStorage.getItem("14twenty_user") ?? "null")?.name ?? ""; } catch(e) { return ""; }
  });
  const [identityCompany, setIdentityCompany] = useState(() => {
    try { return JSON.parse(localStorage.getItem("14twenty_user") ?? "null")?.company ?? ""; } catch(e) { return ""; }
  });

  function saveIdentity() {
    const name    = identityName.trim() || "Team";
    const company = identityCompany.trim();
    const u = { name, company };
    setUser(u);
    localStorage.setItem("14twenty_user", JSON.stringify(u));
    setShowIdentity(false);
    // Auto-add to the current festival's roster if we're inside one
    if (activeFestival && name !== "Team") {
      // Small delay so roster state is ready
      setTimeout(() => ensureUserInRoster(name, activeFestival), 100);
    }
  }

  // userName used for task stamps — just first+last name (no company), so
  // it matches cleanly against roster names and other users' assignments.
  const userName = user?.name
    ? user.name
    : (isSupplier ? "Supplier" : "Team");

  // Display name shown in header (includes company)
  const displayName = user
    ? `${user.name}${user.company ? ` · ${user.company}` : ""}`
    : (isSupplier ? "Supplier" : "Set identity");

  // ── Password ──────────────────────────────────────────────────────────────
  const [unlockedFestivals, setUnlockedFestivals] = useState(() => lsGet("14twenty_unlocked", {}));
  const [passwordTarget, setPasswordTarget]       = useState(null);
  const [passwordInput, setPasswordInput]         = useState("");
  const [passwordError, setPasswordError]         = useState(false);

  function attemptUnlock(fid) {
    const fest = FESTIVALS.find(f => f.id === fid);
    if (!fest) return;
    if (passwordInput === fest.password) {
      const next = { ...lsGet("14twenty_unlocked", {}), [fid]: true };
      lsSet("14twenty_unlocked", next);
      setUnlockedFestivals(next);
      setPasswordTarget(null); setPasswordInput(""); setPasswordError(false);
      setActiveFestival(fid); setScreen("year");
      // Auto-add user to this festival's roster after a short delay (roster loads async)
      if (userName && userName !== "Team" && userName !== "Supplier") {
        setTimeout(() => ensureUserInRoster(userName, fid), 800);
      }
    } else {
      setPasswordError(true); setPasswordInput("");
    }
  }

  function selectFestival(fid) {
    if (unlockedFestivals[fid]) { setActiveFestival(fid); setScreen("year"); }
    else { setPasswordTarget(fid); setPasswordInput(""); setPasswordError(false); }
  }

  // ── Festival config (years + depts) ──────────────────────────────────────
  const [eventYears, setEventYears] = useState(() => lsGet("14twenty_event_years", DEFAULT_YEARS));
  const [eventDepts, setEventDepts] = useState(() => lsGet("14twenty_event_depts", {}));

  useEffect(() => { lsSet("14twenty_event_years", eventYears); }, [eventYears]);
  useEffect(() => { lsSet("14twenty_event_depts", eventDepts); }, [eventDepts]);

  // Load config from Supabase when festival opens
  useEffect(() => {
    if (!activeFestival) return;
    supabase.from("reviews").select("category_id,notes").eq("festival", activeFestival).eq("year", "__config__")
      .then(({ data }) => {
        if (!data) return;
        const yearsRow = data.find(r => r.category_id==="__years__");
        const deptsRow = data.find(r => r.category_id==="__depts__");
        if (yearsRow) { try { const y=JSON.parse(yearsRow.notes); if(Array.isArray(y)) setEventYears(p=>({...p,[activeFestival]:y})); } catch(e) {} }
        if (deptsRow) { try { const d=JSON.parse(deptsRow.notes); if(d && (Array.isArray(d) || typeof d==="object")) setEventDepts(p=>({...p,[activeFestival]:d})); } catch(e) {} }
      });
  }, [activeFestival]);

  // Poll config every 5s — ensures depts/years/roster stay in sync across
  // devices even when Supabase Realtime isn't enabled on the table.
  useEffect(() => {
    if (!activeFestival) return;
    const fid = activeFestival;
    function fetchConfig() {
      supabase.from("reviews").select("category_id,notes").eq("festival", fid).eq("year", "__config__")
        .then(({ data }) => {
          if (!data) return;
          const yearsRow  = data.find(r => r.category_id === "__years__");
          const deptsRow  = data.find(r => r.category_id === "__depts__");
          const rosterRow = data.find(r => r.category_id === "__roster__");
          if (yearsRow)  { try { const y=JSON.parse(yearsRow.notes);  if(Array.isArray(y)) setEventYears(p=>({...p,[fid]:y})); } catch(e) {} }
          if (deptsRow)  { try { const d=JSON.parse(deptsRow.notes);  if(d&&(Array.isArray(d)||typeof d==="object")) setEventDepts(p=>({...p,[fid]:d})); } catch(e) {} }
          if (rosterRow) { try { const r=JSON.parse(rosterRow.notes); if(Array.isArray(r)) setRosters(p=>({...p,[fid]:r})); } catch(e) {} }
        });
    }
    const id = setInterval(fetchConfig, 5000);
    return () => clearInterval(id);
  }, [activeFestival]);

  // Real-time subscription — all data for the active festival synced instantly
  useEffect(() => {
    if (!activeFestival) return;
    const fid = activeFestival;
    const channel = supabase
      .channel(`rt-${fid}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "reviews",
        filter: `festival=eq.${fid}`,
      }, payload => {
        const row = payload.new;
        if (!row) return;
        const { year, area_emoji: dept, area_id, category_id, notes, worked_well, needs_improvement } = row;

        // ── Config rows ──────────────────────────────────────────────────
        if (year === "__config__") {
          if (category_id === "__depts__") {
            try { const d = JSON.parse(notes); if (d && (Array.isArray(d) || typeof d === "object")) setEventDepts(p => ({...p, [fid]: d})); } catch(e) {}
          } else if (category_id === "__years__") {
            try { const y = JSON.parse(notes); if (Array.isArray(y)) setEventYears(p => ({...p, [fid]: y})); } catch(e) {}
          } else if (category_id === "__roster__") {
            try { const r = JSON.parse(notes); if (Array.isArray(r)) setRosters(p => ({...p, [fid]: r})); } catch(e) {}
          } else if (category_id === "__svgmap__") {
            setFestivalMaps(p => ({...p, [fid]: notes ?? null}));
          }
          return;
        }

        // ── Review / tracker rows ────────────────────────────────────────
        const rawAreaId = area_id.replace(`${dept}__`, "");
        const dk = keys.dept(fid, dept);

        if (category_id === "__areas__") {
          try { const a = JSON.parse(notes); if (Array.isArray(a)) setAreas(p => ({...p, [dk]: a})); } catch(e) {}
        } else if (category_id === "__tasks__") {
          try {
            const tasks = JSON.parse(notes ?? "[]");
            const k = keys.tracker(fid, year, dept, rawAreaId);
            setTrackerData(p => ({...p, [k]: tasks}));
          } catch(e) {}
        } else if (category_id === "__desc__") {
          const k = keys.desc(fid, year, dept, rawAreaId);
          setAreaDescriptions(p => ({...p, [k]: notes ?? ""}));
        } else if (category_id === "__cats__") {
          try {
            const cats = JSON.parse(notes ?? "null");
            if (Array.isArray(cats)) { const k = keys.cats(fid, dept, rawAreaId); setAreaCategories(p => ({...p, [k]: cats})); }
          } catch(e) {}
        } else if (category_id === "__available_cats__") {
          try {
            const cats = JSON.parse(notes ?? "null");
            if (Array.isArray(cats)) { const k = keys.cats(fid, dept, rawAreaId); setAreaAvailableCats(p => ({...p, [k]: cats})); }
          } catch(e) {}
        } else {
          // Review data (votes, ratings, comments, tags)
          let votes = {};
          try { if (worked_well?.startsWith("__votes__")) votes = JSON.parse(worked_well.slice(9)); } catch(e) {}
          const { tags: rowTags, text: rowNotes } = parseReviewNotes(notes);
          const k = keys.review(rawAreaId, category_id);
          setReviewData(p => ({...p, [k]: {
            votes,
            worked_well:       worked_well?.startsWith("__votes__") ? "" : worked_well?.startsWith("__comments__") ? JSON.parse(worked_well.slice(12)) : (worked_well ?? ""),
            needs_improvement: needs_improvement?.startsWith("__comments__") ? JSON.parse(needs_improvement.slice(12)) : (needs_improvement ?? ""),
            notes: rowNotes,
            tags: rowTags,
          }}));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeFestival]);

  async function saveYearsToDB(fid, years) {
    await upsertReview(fid, "__config__", "__years__", "__years__", "__config__", "__years__", { notes: JSON.stringify(years) });
  }
  async function saveDeptsToDB(fid, allYearDepts) {
    // allYearDepts is now { [year]: [...depts] } — persisted as a single config record
    await upsertReview(fid, "__config__", "__depts__", "__depts__", "__config__", "__depts__", { notes: JSON.stringify(allYearDepts) });
  }

  function getYears(fid) { return eventYears[fid] ?? DEFAULT_YEARS[fid] ?? [CURRENT_YEAR]; }
  // Departments are per-festival only (not per-year). Handles all legacy formats:
  // - undefined/null → DEFAULT_DEPTS
  // - plain array    → use directly
  // - year-keyed obj → flatten: take first non-null year's array
  function getDepts(fid) {
    const fidDepts = eventDepts[fid];
    if (!fidDepts) return DEFAULT_DEPTS;
    if (Array.isArray(fidDepts)) return fidDepts;
    // Legacy year-keyed format: pull out the array from whichever year has data
    const arr = Object.values(fidDepts).find(v => Array.isArray(v) && v.length >= 0);
    return arr ?? DEFAULT_DEPTS;
  }

  function setYearsFor(fid, fn) {
    let toSave;
    setEventYears(p => {
      const next = typeof fn === "function" ? fn(p[fid] ?? DEFAULT_YEARS[fid] ?? [CURRENT_YEAR]) : fn;
      toSave = next;
      return { ...p, [fid]: next };
    });
    if (toSave) saveYearsToDB(fid, toSave).catch(() => showSaveError());
  }
  function setDeptsFor(fid, fn) {
    let toSave;
    setEventDepts(p => {
      const current = p[fid];
      // Normalise any legacy format to a plain array
      let currentArr;
      if (!current) {
        currentArr = DEFAULT_DEPTS;
      } else if (Array.isArray(current)) {
        currentArr = current;
      } else {
        // Year-keyed legacy: flatten to the first array found
        currentArr = Object.values(current).find(v => Array.isArray(v)) ?? DEFAULT_DEPTS;
      }
      const next = typeof fn === "function" ? fn(currentArr) : fn;
      toSave = next;
      return { ...p, [fid]: next };
    });
    if (toSave) saveDeptsToDB(fid, toSave).catch(() => showSaveError());
  }

  const festival     = FESTIVALS.find(f => f.id === activeFestival);
  const activeYears  = activeFestival ? getYears(activeFestival) : [];
  const activeDepts  = activeFestival ? getDepts(activeFestival) : DEFAULT_DEPTS;
  const tracker      = isTrackerYear(activeYear);
  const deptKey      = keys.dept(activeFestival, activeDept);
  const dept         = activeDepts.find(d => d.id === activeDept);

  // ── Data state ────────────────────────────────────────────────────────────
  const [areas, setAreas]                     = useState({});
  const [areaCategories, setAreaCategories]   = useState({});
  const [areaAvailableCats, setAreaAvailableCats] = useState({});
  const [areaDescriptions, setAreaDescriptions]   = useState({});
  const [reviewData, setReviewData]           = useState({});
  const [saveStatuses, setSaveStatuses]       = useState({});
  const [trackerData, setTrackerData]         = useState({});
  const [taskSaving, setTaskSaving]           = useState({});
  const [loading, setLoading]                 = useState(false);
  const [dataRefreshKey, setDataRefreshKey]   = useState(0);
  const [editingCats, setEditingCats]         = useState(false);
  const [newCatName, setNewCatName]           = useState("");

  // ── Team roster ───────────────────────────────────────────────────────────
  // roster: [{ id, name, role, colorId }] — per festival, shared across years
  // Each festival (gottwood / peep / soysambu) has its own separate roster.
  const [rosters, setRosters] = useState({});  // keyed by festivalId

  const roster = (activeFestival ? rosters[activeFestival] : null) ?? [];

  // Load roster from Supabase whenever a festival is opened
  useEffect(() => {
    if (!activeFestival) return;
    if (rosters[activeFestival] !== undefined) return; // already loaded
    supabase.from("reviews")
      .select("notes")
      .eq("festival", activeFestival)
      .eq("year", "__config__")
      .eq("category_id", "__roster__")
      .single()
      .then(({ data }) => {
        try {
          const r = data?.notes ? JSON.parse(data.notes) : [];
          setRosters(p => ({ ...p, [activeFestival]: Array.isArray(r) ? r : [] }));
        } catch(e) { setRosters(p => ({ ...p, [activeFestival]: [] })); }
      });
  }, [activeFestival]);

  async function saveRosterToDB(fid, newRoster) {
    await upsertReview(fid, "__config__", "__roster__", "__roster__", "__config__", "__roster__", { notes: JSON.stringify(newRoster) });
  }

  function updateRoster(fn, fid = activeFestival) {
    if (!fid) return;
    let toSave;
    setRosters(p => {
      const current = p[fid] ?? [];
      const next = typeof fn === "function" ? fn(current) : fn;
      toSave = next;
      return { ...p, [fid]: next };
    });
    if (toSave) saveRosterToDB(fid, toSave).catch(() => showSaveError());
  }

  // Find the best-matching roster member for a given name.
  // Exact match first, then first-name match (e.g. "Angus" matches "Angus James").
  function findRosterMember(name, fid = activeFestival) {
    const r = fid ? (rosters[fid] ?? []) : [];
    if (!name) return null;
    const lower = name.toLowerCase().trim();
    // 1. Exact match
    const exact = r.find(m => m.name.toLowerCase() === lower);
    if (exact) return exact;
    // 2. First-name match: user typed "Angus", roster has "Angus James"
    const firstName = lower.split(/\s+/)[0];
    const firstMatch = r.find(m => m.name.toLowerCase().split(/\s+/)[0] === firstName);
    if (firstMatch) return firstMatch;
    // 3. Last-name match: user typed "James", roster has "Angus James"
    const lastName = lower.split(/\s+/).slice(-1)[0];
    if (lastName !== firstName) {
      const lastMatch = r.find(m => m.name.toLowerCase().split(/\s+/).slice(-1)[0] === lastName);
      if (lastMatch) return lastMatch;
    }
    return null;
  }

  function addRosterMember(name, role = "", fid = activeFestival) {
    const trimmed = name.trim();
    if (!trimmed || !fid) return;
    const current = rosters[fid] ?? [];
    // Don't add exact duplicates
    if (current.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) return;
    const color = pickNextColor(current);
    const member = { id: `m-${Date.now()}`, name: trimmed, role: role.trim(), colorId: color.id };
    updateRoster(prev => [...prev, member], fid);
    return member;
  }

  function removeRosterMember(id) {
    updateRoster(prev => prev.filter(m => m.id !== id));
  }

  function updateRosterMemberRole(id, role) {
    updateRoster(prev => prev.map(m => m.id === id ? { ...m, role } : m));
  }

  // Ref to hold a pending roster-add when roster hasn't loaded yet
  const pendingRosterAddRef = useRef(null);

  // When a user sets their identity, auto-add them to the current festival's roster.
  // Works immediately if roster is loaded, or queues until it loads.
  function ensureUserInRoster(name, fid = activeFestival) {
    if (!fid || !name || name === "Team" || name === "Supplier") return;
    // If roster not yet loaded, flag it and wait for load effect
    if (rosters[fid] === undefined) {
      pendingRosterAddRef.current = { name, fid };
      return;
    }
    const existing = findRosterMember(name, fid);
    if (existing) return; // already on roster (exact or fuzzy match)
    const current = rosters[fid] ?? [];
    const color = pickNextColor(current);
    const member = { id: `m-${Date.now()}`, name, role: "", colorId: color.id };
    updateRoster(prev => [...prev, member], fid);
  }

  // After roster loads, process any pending add
  useEffect(() => {
    const pending = pendingRosterAddRef.current;
    if (!pending) return;
    const { name, fid } = pending;
    if (rosters[fid] === undefined) return; // still not loaded
    pendingRosterAddRef.current = null;
    ensureUserInRoster(name, fid);
  }, [rosters]);

  // Auto-ensure user is in roster whenever they enter a festival that's loaded
  useEffect(() => {
    if (!activeFestival || !userName || userName === "Team" || userName === "Supplier") return;
    if (rosters[activeFestival] === undefined) return; // wait for load
    ensureUserInRoster(userName, activeFestival);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFestival, roster.length, activeFestival && rosters[activeFestival] !== undefined]);

  // ── View toggles ──────────────────────────────────────────────────────────
  const [mapView, setMapView]   = useState(false);
  const [calView, setCalView]   = useState(false);
  const [sagView, setSagView]   = useState(false);

  // ── SVG maps — one per festival, persisted to Supabase ───────────────────
  const [festivalMaps, setFestivalMaps] = useState({});
  const mapUploadRef = useRef(null);

  useEffect(() => {
    if (!activeFestival || festivalMaps[activeFestival] !== undefined) return;
    supabase.from("reviews")
      .select("notes")
      .eq("festival", activeFestival)
      .eq("year", "__config__")
      .eq("category_id", "__svgmap__")
      .single()
      .then(({ data }) => {
        setFestivalMaps(p => ({ ...p, [activeFestival]: data?.notes ?? null }));
      });
  }, [activeFestival]);

  async function saveFestivalMap(fid, svgText) {
    await upsertReview(fid, "__config__", "__svgmap__", "__svgmap__", "__config__", "__svgmap__", { notes: svgText });
  }

  // ── Area-level search (areas list screen) ─────────────────────────────────
  const [areaSearch, setAreaSearch] = useState("");

  // ── Team screen form state (must be at App level — Rules of Hooks) ────────
  const [teamNewName, setTeamNewName] = useState("");
  const [teamNewRole, setTeamNewRole] = useState("");
  // ── Task-level search (area-detail screen) ────────────────────────────────
  // ── Bulk select & task search ─────────────────────────────────────────────
  const [selectedTasks, setSelectedTasks]     = useState(new Set());
  const [taskSearch, setTaskSearch]           = useState("");
  const [bulkStatus, setBulkStatus]           = useState("done");

  function toggleSelectTask(taskId) {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  }

  function clearSelection() { setSelectedTasks(new Set()); }

  function applyBulkStatus(areaName, status) {
    if (!selectedTasks.size) return;
    const tasks = getAreaTasks(activeDept, areaName);
    const updated = tasks.map(t => selectedTasks.has(t.id) ? { ...t, status, updated_by: userName } : t);
    setAreaTasks(areaName, updated);
    clearSelection();
  }

  // ── Supplier auto-route ───────────────────────────────────────────────────
  const hasRoutedRef = useRef(false);
  useEffect(() => {
    if (!supplierToken || hasRoutedRef.current) return;
    hasRoutedRef.current = true;
    const { festivalId, year, dept } = supplierToken;
    setActiveFestival(festivalId);
    setUnlockedFestivals({ [festivalId]: true });
    if (year) setActiveYear(year);
    if (dept) setActiveDept(dept);
    if (year && dept) setScreen("areas");
    else if (year) setScreen("departments");
    else setScreen("year");
  }, []);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeFestival || !activeDept || !activeYear) return;
    if (dataRefreshKey === 0) setLoading(true); // spinner only on first load, not background polls
    supabase.from("reviews").select("*").eq("festival", activeFestival).eq("year", activeYear)
      .then(({ data, error }) => {
        if (!error && data) {
          const dd = data.filter(r => r.area_emoji === activeDept);

          // Canonical area list
          const areasRow = dd.find(r => r.category_id==="__areas__");
          let canonicalAreas;
          try { canonicalAreas = areasRow ? JSON.parse(areasRow.notes) : null; } catch(e) { canonicalAreas = null; }
          setAreas(p => ({...p, [deptKey]: canonicalAreas ?? DEFAULT_DEPT_AREAS[activeFestival]?.[activeDept] ?? []}));

          // Tasks
          dd.filter(r => r.category_id==="__tasks__").forEach(row => {
            try {
              const tasks = JSON.parse(row.notes??"[]");
              const aId   = row.area_id.replace(`${activeDept}__`,"");
              const k     = keys.tracker(activeFestival, activeYear, activeDept, aId);
              setTrackerData(p => p[k] ? p : {...p, [k]: tasks});
            } catch(e) {}
          });

          // Descriptions
          dd.filter(r => r.category_id==="__desc__").forEach(row => {
            const aId = row.area_id.replace(`${activeDept}__`,"");
            const k   = keys.desc(activeFestival, activeYear, activeDept, aId);
            setAreaDescriptions(p => p[k] ? p : {...p, [k]: row.notes??""});
          });

          // Category lists
          dd.filter(r => r.category_id==="__cats__").forEach(row => {
            try {
              const aId  = row.area_id.replace(`${activeDept}__`,"");
              const k    = keys.cats(activeFestival, activeDept, aId);
              const cats = JSON.parse(row.notes??"null");
              if (Array.isArray(cats)) setAreaCategories(p => ({...p, [k]: cats}));
            } catch(e) {}
          });

          // Available cat pools
          dd.filter(r => r.category_id==="__available_cats__").forEach(row => {
            try {
              const aId  = row.area_id.replace(`${activeDept}__`,"");
              const k    = keys.cats(activeFestival, activeDept, aId);
              const cats = JSON.parse(row.notes??"null");
              if (Array.isArray(cats)) setAreaAvailableCats(p => ({...p, [k]: cats}));
            } catch(e) {}
          });

          // Review data
          const map = {};
          dd.filter(r => !["__tasks__","__areas__","__cats__","__desc__","__available_cats__"].includes(r.category_id)).forEach(row => {
            const aId = row.area_id.replace(`${activeDept}__`,"");
            let votes = {};
            try { if (row.worked_well?.startsWith("__votes__")) votes = JSON.parse(row.worked_well.slice(9)); } catch(e) {}
            const { tags: rowTags, text: rowNotes } = parseReviewNotes(row.notes);
            map[keys.review(aId, row.category_id)] = {
              votes,
              worked_well:       row.worked_well?.startsWith("__votes__") ? "" : row.worked_well?.startsWith("__comments__") ? JSON.parse(row.worked_well.slice(12)) : (row.worked_well??""),
              needs_improvement: row.needs_improvement?.startsWith("__comments__") ? JSON.parse(row.needs_improvement.slice(12)) : (row.needs_improvement??""),
              notes: rowNotes,
              tags: rowTags,
            };
          });
          setReviewData(map);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [activeFestival, activeYear, activeDept, dataRefreshKey]);

  // Poll review/tracker data every 15s + re-fetch instantly when tab regains focus
  useEffect(() => {
    const bump = () => setDataRefreshKey(k => k + 1);
    const onVisible = () => { if (document.visibilityState === "visible") bump(); };
    const id = setInterval(bump, 15000);
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  // ── Area list ─────────────────────────────────────────────────────────────
  async function saveAreasToDB(newList) {
    await upsertReview(activeFestival, activeYear, activeDept, `__${activeDept}__areas__`, "__areas__", "__areas__", { notes: JSON.stringify(newList) });
  }

  function updateAreas(fn) {
    let toSave;
    setAreas(p => {
      const next = typeof fn === "function" ? fn(p[deptKey] ?? []) : fn;
      toSave = next;
      return { ...p, [deptKey]: next };
    });
    if (toSave !== undefined) saveAreasToDB(toSave).catch(() => showSaveError());
  }

  const rawAreas      = areas[deptKey] ?? [];
  const festivalAreas = isSupplier && supplierToken?.filter
    ? rawAreas.filter(a => slugify(a).includes(slugify(supplierToken.filter)))
    : rawAreas;

  // Filtered areas for the area-list search bar
  const filteredFestivalAreas = areaSearch.trim()
    ? festivalAreas.filter(a => a.toLowerCase().includes(areaSearch.toLowerCase()))
    : festivalAreas;

  // ── Tracker data ──────────────────────────────────────────────────────────
  function getAreaTasks(did, aName, fid = activeFestival, yr = activeYear) {
    return trackerData[keys.tracker(fid, yr, did, aName)] ?? getDefaultTasks(did, aName, fid);
  }

  const saveTasksDebounced = useDebounce(async (aName, tasks) => {
    const aId = slugify(aName);
    const k   = keys.dept(activeDept, aId);
    setTaskSaving(s => ({...s, [k]: true}));
    const { error } = await upsertReview(activeFestival, activeYear, activeDept, aId, aName, "__tasks__", { worked_well: userName, notes: JSON.stringify(tasks) });
    setTaskSaving(s => ({...s, [k]: false}));
    if (error) showSaveError();
  }, 1200);

  function setAreaTasks(aName, tasks) {
    const k = keys.tracker(activeFestival, activeYear, activeDept, aName);
    setTrackerData(p => ({...p, [k]: tasks}));
    saveTasksDebounced(aName, tasks);
  }

  const prevYear = activeYears.filter(y => y < activeYear).sort().reverse()[0];

  function hasPrevYearTasks(aName) {
    if (!prevYear) return false;
    return !!(trackerData[keys.tracker(activeFestival, prevYear, activeDept, aName)]?.length);
  }

  function copyTasksFromYear(fromYear, aName) {
    const src   = getAreaTasks(activeDept, aName, activeFestival, fromYear);
    const reset = src.map(t => ({ ...t, id:`task-${Date.now()}-${Math.random()}`, status:"not-started", notes:"", updated_by:"" }));
    setAreaTasks(aName, reset);
  }

  // NEW: Copy all tasks from previous year for entire department
  function copyAllTasksFromPrevYear() {
    if (!prevYear) return;
    festivalAreas.forEach(aName => {
      if (!getAreaTasks(activeDept, aName).length) {
        copyTasksFromYear(prevYear, aName);
      }
    });
  }

  // ── AI suggestions ────────────────────────────────────────────────────────
  const nextTrackerYear = activeYear
    ? (isTrackerYear(activeYear) ? activeYear : (activeYears.filter(y => isTrackerYear(y)).sort()[0] ?? null))
    : null;

  function addAISuggestion(aName, suggestion) {
    if (!nextTrackerYear || !suggestion) return;
    const k        = keys.tracker(activeFestival, nextTrackerYear, activeDept, aName);
    const existing = trackerData[k] ?? getDefaultTasks(activeDept, aName, activeFestival);
    if (existing.some(t => t.label === suggestion)) return;
    const newTask  = { ...makeTask(suggestion), notes: `AI suggestion from ${activeYear} review` };
    const updated  = [...existing, newTask];
    setTrackerData(p => ({...p, [k]: updated}));
    upsertReview(activeFestival, nextTrackerYear, activeDept, slugify(aName), aName, "__tasks__", { worked_well: userName, notes: JSON.stringify(updated) })
      .catch(() => showSaveError());
  }

  // ── Area descriptions ─────────────────────────────────────────────────────
  function getDesc(aName) { return areaDescriptions[keys.desc(activeFestival, activeYear, activeDept, aName)] ?? ""; }
  const saveDescDebounced = useDebounce(async (aName, text) => {
    const { error } = await upsertReview(activeFestival, activeYear, activeDept, slugify(aName), aName, "__desc__", { notes: text });
    if (error) showSaveError();
  }, 1000);
  function setDesc(aName, text) {
    setAreaDescriptions(p => ({...p, [keys.desc(activeFestival, activeYear, activeDept, aName)]: text}));
    saveDescDebounced(aName, text);
  }

  // ── Review helpers ────────────────────────────────────────────────────────
  function getCats(aName) {
    const saved = areaCategories[keys.cats(activeFestival, activeDept, aName)];
    if (saved !== undefined) return saved;
    const presetSlugs = (DEFAULT_DEPT_AREAS[activeFestival]?.[activeDept] ?? []).map(a => slugify(a));
    return presetSlugs.includes(slugify(aName)) ? (DEPT_REVIEW_CATS[activeDept] ?? []) : [];
  }

  function getAvailableCats(aName) {
    const saved = areaAvailableCats[keys.cats(activeFestival, activeDept, aName)];
    if (saved) return saved;
    const presetSlugs = (DEFAULT_DEPT_AREAS[activeFestival]?.[activeDept] ?? []).map(a => slugify(a));
    return presetSlugs.includes(slugify(aName)) ? (DEPT_REVIEW_CATS[activeDept] ?? []) : [];
  }

  function saveAvailableCats(aName, pool) {
    setAreaAvailableCats(p => ({...p, [keys.cats(activeFestival, activeDept, aName)]: pool}));
    if (!activeFestival || !activeYear || !activeDept) return;
    upsertReview(activeFestival, activeYear, activeDept, slugify(aName), aName, "__available_cats__", { notes: JSON.stringify(pool) })
      .catch(() => showSaveError());
  }

  function setCats(aName, newCats) {
    setAreaCategories(p => ({...p, [keys.cats(activeFestival, activeDept, aName)]: newCats}));
    if (!activeFestival || !activeYear || !activeDept) return;
    upsertReview(activeFestival, activeYear, activeDept, slugify(aName), aName, "__cats__", { notes: JSON.stringify(newCats) })
      .then(({ error }) => { if (error) showSaveError(); })
      .catch(() => showSaveError());
  }

  const handleSave = useCallback(async (aName, catName, patch) => {
    const k = keys.review(aName, catName);
    setSaveStatuses(s => ({...s, [k]:"saving"}));
    const voteVals    = Object.values(patch.votes ?? {});
    const modeRating  = voteVals.length > 0
      ? [1,2,3,4,5].map(v=>({v,c:voteVals.filter(x=>x===v).length})).reduce((a,b)=>b.c>a.c?b:a).v
      : null;
    const encodeField = (val) => Array.isArray(val) ? `__comments__${JSON.stringify(val)}` : (val ?? "");
    const wfField = Object.keys(patch.votes??{}).length > 0 ? `__votes__${JSON.stringify(patch.votes)}` : encodeField(patch.worked_well);
    const niField = encodeField(patch.needs_improvement);
    const notesField = (patch.tags?.length > 0)
      ? `__notesmeta__${JSON.stringify({ tags: patch.tags, text: patch.notes ?? "" })}`
      : (patch.notes ?? "");
    const { error } = await upsertReview(activeFestival, activeYear, activeDept, slugify(aName), aName, slugify(catName), {
      rating: modeRating, worked_well: wfField, needs_improvement: niField, notes: notesField,
    });
    setSaveStatuses(s => ({...s, [k]: error ? "error" : "saved"}));
    if (!error) setReviewData(p => ({...p, [k]: patch}));
    setTimeout(() => setSaveStatuses(s => ({...s, [k]:"idle"})), 2500);
  }, [activeFestival, activeYear, activeDept]);

  // ── Stats & colours ───────────────────────────────────────────────────────
  function areaTaskStats(aName, did=activeDept, fid=activeFestival, yr=activeYear) {
    const tasks = getAreaTasks(did, aName, fid, yr);
    return { total:tasks.length, done:tasks.filter(t=>t.status==="done").length, blocked:tasks.filter(t=>t.status==="blocked").length, inProgress:tasks.filter(t=>t.status==="in-progress").length };
  }

  function areaRAGColor(aName) {
    const { total, done, blocked, inProgress } = areaTaskStats(aName);
    if (!total) return null;
    if (blocked > 0)   return "#ef4444";
    if (done === total) return "#22c55e";
    if (inProgress > 0 || done > 0) return "#eab308";
    return null;
  }

  function areaReviewScore(aName) {
    const cats  = getCats(aName);
    const rated = cats.filter(c => Object.keys(reviewData[keys.review(aName,c)]?.votes??{}).length > 0);
    return { rated: rated.length, total: cats.length };
  }

  function areaReviewColor(aName) {
    const cats = getCats(aName);
    const vals = cats.flatMap(c => Object.values(reviewData[keys.review(aName,c)]?.votes ?? {}));
    if (!vals.length) return null;
    const avg = vals.reduce((a,b)=>a+b,0) / vals.length;
    return avg>=4?"#22c55e":avg>=3?"#eab308":"#f97316";
  }

  // All unique assignees across this dept/year
  const allAssigneeNames = [...new Set(
    Object.entries(trackerData)
      .filter(([k]) => k.startsWith(`${activeFestival}__${activeYear}__${activeDept}__`))
      .flatMap(([, tasks]) => tasks.flatMap(t => t.assignees?.length ? t.assignees : (t.owner ? [t.owner] : [])))
      .filter(Boolean)
  )];

  // All unique tags across this dept/year
  const allTagNames = [...new Set(
    Object.entries(trackerData)
      .filter(([k]) => k.startsWith(`${activeFestival}__${activeYear}__${activeDept}__`))
      .flatMap(([, tasks]) => tasks.flatMap(t => t.tags ?? []))
      .filter(Boolean)
  )];

  // All unique review tags across this dept/year
  const allReviewTagNames = [...new Set(
    Object.values(reviewData).flatMap(d => d?.tags ?? []).filter(Boolean)
  )];


  // ── Overlays ──────────────────────────────────────────────────────────────
  const identityOverlay = showIdentity && (
    <Overlay>
      {FOURTEEN_TWENTY_LOGO
        ? <img src={FOURTEEN_TWENTY_LOGO} style={{ height:36, objectFit:"contain", marginBottom:24, display:"block" }} alt="14twenty" />
        : <div style={{ fontSize:18, fontWeight:800, letterSpacing:"0.15em", color:"#f0ede8", marginBottom:24 }}>14TWENTY</div>
      }
      <div style={{ fontWeight:800, fontSize:20, marginBottom:6, color:"#f0ede8" }}>Who are you?</div>
      <div style={{ fontSize:13, color:"#555", marginBottom:24, lineHeight:1.5 }}>Your name stamps your votes and task changes so the team knows who made updates.</div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
        <input autoFocus value={identityName} onChange={e=>setIdentityName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveIdentity()} placeholder="Full name..." style={{ width:"100%", background:"#0a0a0a", border:"1px solid #2a2a2e", borderRadius:8, color:"#f0ede8", padding:"11px 14px", fontSize:14 }} />
        <input value={identityCompany} onChange={e=>setIdentityCompany(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveIdentity()} placeholder="Company (optional)..." style={{ width:"100%", background:"#0a0a0a", border:"1px solid #2a2a2e", borderRadius:8, color:"#f0ede8", padding:"11px 14px", fontSize:14 }} />
      </div>
      <button onClick={saveIdentity} style={{ width:"100%", background:"#f0ede8", color:"#0a0a0a", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:14, cursor:"pointer" }}>Continue</button>
    </Overlay>
  );

  const passwordOverlay = passwordTarget && (
    <Overlay>
      <div style={{ marginBottom:24, display:"flex", justifyContent:"center" }}><FestivalLogo festival={FESTIVALS.find(f=>f.id===passwordTarget)} size={48} /></div>
      <div style={{ fontWeight:800, fontSize:18, marginBottom:6, color:"#f0ede8", textAlign:"center" }}>Password required</div>
      <div style={{ fontSize:13, color:"#555", marginBottom:24, textAlign:"center" }}>Enter the password to access {FESTIVALS.find(f=>f.id===passwordTarget)?.name}.</div>
      <input autoFocus type="password" value={passwordInput} onChange={e=>{setPasswordInput(e.target.value);setPasswordError(false);}} onKeyDown={e=>e.key==="Enter"&&attemptUnlock(passwordTarget)} placeholder="Password..." style={{ width:"100%", background:"#0a0a0a", border:`1px solid ${passwordError?"#ef4444":"#2a2a2e"}`, borderRadius:8, color:"#f0ede8", padding:"11px 14px", fontSize:14, marginBottom:10 }} />
      {passwordError && <div style={{ fontSize:12, color:"#ef4444", marginBottom:12, textAlign:"center" }}>Incorrect password — try again.</div>}
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={()=>{setPasswordTarget(null);setPasswordInput("");setPasswordError(false);}} style={{ flex:1, background:"transparent", border:"1px solid #252528", borderRadius:10, color:"#555", padding:"12px", fontWeight:600, fontSize:13, cursor:"pointer" }}>Cancel</button>
        <button onClick={()=>attemptUnlock(passwordTarget)} style={{ flex:2, background:"#f0ede8", color:"#0a0a0a", border:"none", borderRadius:10, padding:"12px", fontWeight:700, fontSize:13, cursor:"pointer" }}>Unlock</button>
      </div>
    </Overlay>
  );

  // ── SAG Dashboard screen ──────────────────────────────────────────────────
  if (sagView) return (
    <>
      <style>{css}</style>
      <div className="screen">
        <SAGDashboard
          festival={festival}
          years={activeYears}
          getDepts={getDepts}
          getAreaTasks={getAreaTasks}
          allAreas={areas}
          onClose={() => setSagView(false)}
          onNavigate={(year, deptId, areaName) => {
            setActiveYear(year);
            setActiveDept(deptId);
            setSelectedArea(areaName);
            setSagView(false);
            setScreen("area-detail");
          }}
        />
      </div>
    </>
  );

  // ── SCREEN: Home ──────────────────────────────────────────────────────────
  if (screen === "home") return (
    <>
      <style>{css}</style>
      {identityOverlay}{passwordOverlay}
      <div className="screen" style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", flexDirection:"column" }}>
        <div style={{ borderBottom:"1px solid #1a1a1e", padding:"0 24px", flexShrink:0 }}>
          <div style={{ maxWidth:560, margin:"0 auto", height:60, display:"flex", alignItems:"center", gap:16 }}>
            {FOURTEEN_TWENTY_LOGO
              ? <img src={FOURTEEN_TWENTY_LOGO} style={{ height:28, objectFit:"contain" }} alt="14twenty" />
              : <span style={{ fontSize:16, fontWeight:800, letterSpacing:"0.15em", color:"#f0ede8" }}>14TWENTY</span>
            }
            <div style={{ flex:1 }} />
            <button onClick={()=>setShowIdentity(true)} style={{ background:"none", border:"1px solid #1e1e22", borderRadius:20, color:"#555", fontSize:11, fontWeight:600, padding:"4px 14px", cursor:"pointer", letterSpacing:"0.05em", maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {displayName} ▾
            </button>
          </div>
        </div>
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"64px 24px" }}>
          <div style={{ width:"100%", maxWidth:480 }}>
            <div style={{ textAlign:"center", marginBottom:48 }}>
              {FOURTEEN_TWENTY_LOGO
                ? <img src={FOURTEEN_TWENTY_LOGO} style={{ height:84, objectFit:"contain", display:"block", margin:"0 auto 40px" }} alt="14twenty" />
                : <div style={{ fontSize:32, fontWeight:800, letterSpacing:"0.15em", color:"#f0ede8", marginBottom:40 }}>14TWENTY</div>
              }
              <div style={{ fontWeight:700, fontSize:11, letterSpacing:"0.2em", color:"#333" }}>SELECT AN EVENT</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {FESTIVALS.map(f => {
                const unlocked = !!unlockedFestivals[f.id];
                return (
                  <button key={f.id} className="fest-card" onClick={()=>selectFestival(f.id)}
                    style={{ width:"100%", padding:"36px 32px", background:"#111113", border:"1px solid #1e1e22", borderRadius:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                    <FestivalLogo festival={f} size={52} />
                    <span style={{ position:"absolute", right:20, top:"50%", transform:"translateY(-50%)", fontSize:16, color:"#222" }}>{unlocked?"→":"–"}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop:48, display:"flex", justifyContent:"center", gap:6, flexWrap:"wrap" }}>
              {[["Manage Years","manage-years"],["Manage Departments","manage-depts"],["Team","team"]].map(([label, s]) => (
                <button key={s} onClick={()=>{
                  // Team screen needs a festival selected — prompt if not yet unlocked
                  if (s === "team" && !activeFestival) {
                    alert("Open a festival first to manage its team.");
                    return;
                  }
                  setScreen(s);
                }}
                  style={{ background:"#111113", border:"1px solid #1e1e22", borderRadius:8, color:"#555", fontSize:11, fontWeight:600, padding:"7px 14px", cursor:"pointer", letterSpacing:"0.05em", transition:"color 0.12s,border-color 0.12s" }}
                  onMouseEnter={e=>{e.currentTarget.style.color="#aaa";e.currentTarget.style.borderColor="#333";}}
                  onMouseLeave={e=>{e.currentTarget.style.color="#555";e.currentTarget.style.borderColor="#1e1e22";}}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ── Manage screens helper ─────────────────────────────────────────────────
  function ManageScreen({ title, onBack, children }) {
    return (
      <>
        <style>{css}</style>
        <div className="screen" style={{ minHeight:"100vh", background:"#0a0a0a" }}>
          <PageHeader><BackBtn onClick={onBack}/><span style={{ fontWeight:700, fontSize:15, color:"#888" }}>{title}</span></PageHeader>
          <div style={{ maxWidth:560, margin:"0 auto", padding:"28px 20px" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{children}</div>
          </div>
        </div>
      </>
    );
  }

  function ManageRow({ label, badge, onDelete }) {
    return (
      <div style={{ display:"flex", gap:8, alignItems:"center", background:"#111113", border:"1px solid #1e1e22", borderRadius:10, padding:"13px 18px" }}>
        <span style={{ flex:1, fontWeight:600, fontSize:14, color:"#d0ccc8" }}>{label}</span>
        {badge}
        <button className="del-btn" onClick={()=>{ if(window.confirm(`Remove "${label}"?`)) onDelete(); }} style={{ background:"none", border:"1px solid #1e1e22", borderRadius:8, color:"#333", cursor:"pointer", padding:"4px 10px", fontSize:13 }}>✕</button>
      </div>
    );
  }

  if (screen === "manage-years") {
    const fid = activeFestival, ys = fid ? getYears(fid) : [];
    return (
      <ManageScreen title={`Manage Years${festival?` — ${festival.name}`:""}`} onBack={()=>setScreen(fid?"year":"home")}>
        {fid ? (
          <>
            {[...ys].reverse().map(y => <ManageRow key={y} label={y} badge={<ModeBadge tracker={isTrackerYear(y)}/>} onDelete={()=>setYearsFor(fid,p=>p.filter(x=>x!==y))}/>)}
            <AddRow placeholder="e.g. 2027" onAdd={y=>{ if(!ys.includes(y)) setYearsFor(fid,p=>[...p,y].sort()); }}/>
          </>
        ) : <div style={{ textAlign:"center", padding:40, color:"#444", fontSize:13 }}>Open an event first to manage its years.</div>}
      </ManageScreen>
    );
  }

  if (screen === "manage-depts") {
    const fid = activeFestival, ds = fid ? getDepts(fid) : DEFAULT_DEPTS;
    return (
      <ManageScreen title={`Manage Departments${festival?` — ${festival.name}`:""}`} onBack={()=>setScreen(fid?"departments":"home")}>
        {fid ? (
          <>
            {ds.map(d => <ManageRow key={d.id} label={d.name} onDelete={()=>setDeptsFor(fid,p=>p.filter(x=>x.id!==d.id))}/>)}
            <AddRow placeholder="Department name..." onAdd={name=>setDeptsFor(fid,p=>[...p,{id:slugify(name),name}])}/>
          </>
        ) : <div style={{ textAlign:"center", padding:40, color:"#444", fontSize:13 }}>Open an event first to manage its departments.</div>}
      </ManageScreen>
    );
  }

  // ── SCREEN: Year ──────────────────────────────────────────────────────────
  if (screen === "year") return (
    <>
      <style>{css}</style>{passwordOverlay}
      <div className="screen" style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:"#0a0a0a" }}>
        <div style={{ paddingTop:56, paddingBottom:32, display:"flex", flexDirection:"column", alignItems:"center" }}>
          <FestivalLogo festival={festival} size={52} />
          <div style={{ fontWeight:700, fontSize:12, letterSpacing:"0.14em", color:"#444", marginTop:14 }}>SELECT A YEAR</div>
        </div>
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 24px 48px" }}>
          <div style={{ width:"100%", maxWidth:480 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[...activeYears].reverse().map(y => (
                <button key={y} className="row-btn" onClick={()=>{ setActiveYear(y); setScreen("departments"); }}
                  style={{ width:"100%", padding:"18px 24px", background:"#111113", border:"1px solid #1e1e22", borderRadius:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                  <span style={{ fontWeight:700, fontSize:22, color:"#f0ede8", letterSpacing:"0.04em" }}>{y}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}><ModeBadge tracker={isTrackerYear(y)}/><span style={{ color:"#2a2a2e", fontSize:16 }}>→</span></div>
                </button>
              ))}
            </div>
            <div style={{ marginTop:18, display:"flex", justifyContent:"center" }}>
              <button onClick={()=>setScreen("manage-years")} style={{ background:"none", border:"1px solid #1e1e22", borderRadius:8, color:"#444", fontSize:11, fontWeight:600, padding:"6px 14px", cursor:"pointer" }}>+ Manage Years</button>
            </div>
            {!isSupplier && <button className="back-link" onClick={()=>setScreen("home")} style={{ marginTop:20, background:"none", border:"none", cursor:"pointer", color:"#444", fontWeight:700, fontSize:11, letterSpacing:"0.1em", display:"flex", alignItems:"center", gap:6, padding:0 }}>← BACK</button>}
          </div>
        </div>
      </div>
    </>
  );

  // ── SCREEN: Team roster ───────────────────────────────────────────────────
  if (screen === "team") {
    const teamFestival = festival ?? FESTIVALS[0];

    return (
      <>
        <style>{css}</style>
        <div className="screen" style={{ minHeight:"100vh", background:"#0a0a0a" }}>
          <PageHeader>
            <BackBtn onClick={()=>setScreen("home")}/>
            {teamFestival && <FestivalLogo festival={teamFestival} size={34}/>}
            <span style={{ color:"#2a2a2e", fontSize:14 }}>·</span>
            <span style={{ fontWeight:700, fontSize:13, color:"#888" }}>Team</span>
            <div style={{ flex:1 }}/>
            {activeYear && <span style={{ fontWeight:700, fontSize:12, color:"#444", letterSpacing:"0.06em" }}>{activeYear}</span>}
          </PageHeader>

          <div style={{ maxWidth:600, margin:"0 auto", padding:"28px 20px 80px" }}>
            <div style={{ marginBottom:28 }}>
              <div style={{ fontWeight:800, fontSize:26, color:"#f0ede8", marginBottom:4 }}>Team Roster</div>
              <div style={{ fontSize:13, color:"#555" }}>
                {teamFestival?.name} · {teamYear} · {roster.length} member{roster.length!==1?"s":""}
                {activeYear && <span style={{ color:"#3a3a3e" }}> · This year only</span>}
              </div>
            </div>

            {/* Add member form */}
            <div style={{ background:"#111113", border:"1px solid #1e1e22", borderRadius:14, padding:20, marginBottom:24 }}>
              <div style={{ fontWeight:700, fontSize:11, color:"#555", letterSpacing:"0.1em", marginBottom:14 }}>ADD TEAM MEMBER</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <input
                  value={teamNewName}
                  onChange={e => setTeamNewName(e.target.value)}
                  onKeyDown={e => { if (e.key==="Enter" && teamNewName.trim()) { addRosterMember(teamNewName, teamNewRole); setTeamNewName(""); setTeamNewRole(""); } }}
                  placeholder="Full name…"
                  style={{ flex:2, minWidth:140, background:"#0a0a0a", border:"1px solid #252528", borderRadius:8, color:"#f0ede8", padding:"10px 12px", fontSize:13 }}
                />
                <input
                  value={teamNewRole}
                  onChange={e => setTeamNewRole(e.target.value)}
                  onKeyDown={e => { if (e.key==="Enter" && teamNewName.trim()) { addRosterMember(teamNewName, teamNewRole); setTeamNewName(""); setTeamNewRole(""); } }}
                  placeholder="Role (optional)…"
                  style={{ flex:2, minWidth:120, background:"#0a0a0a", border:"1px solid #252528", borderRadius:8, color:"#f0ede8", padding:"10px 12px", fontSize:13 }}
                />
                <button
                  onClick={() => { if (teamNewName.trim()) { addRosterMember(teamNewName, teamNewRole); setTeamNewName(""); setTeamNewRole(""); } }}
                  style={{ background:"#f0ede8", color:"#0a0a0a", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
                  Add
                </button>
              </div>
              {/* Preview of colour that will be assigned */}
              {teamNewName.trim() && (() => {
                const next = pickNextColor(roster);
                return (
                  <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8, fontSize:11, color:"#555" }}>
                    <span style={{ width:10, height:10, borderRadius:"50%", background:next.hex, boxShadow:`0 0 5px ${next.hex}88`, flexShrink:0 }} />
                    Will be assigned <span style={{ color:next.hex, fontWeight:600 }}>{next.id}</span>
                  </div>
                );
              })()}
            </div>

            {/* Roster list */}
            {roster.length === 0 ? (
              <div style={{ textAlign:"center", padding:"48px 0", color:"#333", fontSize:13, letterSpacing:"0.08em" }}>
                No team members yet — add one above.
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {roster.map(member => {
                  const tc = TEAM_COLORS.find(c => c.id === member.colorId) ?? TEAM_COLORS[0];
                  const initials = member.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
                  return (
                    <div key={member.id} style={{ background:"#111113", border:`1px solid ${tc.border}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
                      {/* Avatar with auto-assigned colour */}
                      <div style={{ width:38, height:38, borderRadius:"50%", background:tc.bg, border:`1.5px solid ${tc.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:tc.hex, flexShrink:0 }}>
                        {initials}
                      </div>

                      {/* Name + role */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:"#e8e4df", marginBottom:2 }}>{member.name}</div>
                        <input
                          value={member.role}
                          onChange={e => updateRosterMemberRole(member.id, e.target.value)}
                          placeholder="Role…"
                          style={{ background:"transparent", border:"none", outline:"none", color:"#555", fontSize:12, padding:0, width:"100%" }}
                        />
                      </div>

                      {/* Colour label — read only, auto-assigned */}
                      <span style={{ fontSize:10, fontWeight:700, color:tc.hex, background:tc.bg, border:`1px solid ${tc.border}`, borderRadius:20, padding:"3px 10px", letterSpacing:"0.06em", flexShrink:0 }}>
                        {tc.id.toUpperCase()}
                      </span>

                      {/* Remove */}
                      <button className="del-btn" onClick={() => { if (window.confirm(`Remove ${member.name} from the roster?`)) removeRosterMember(member.id); }}
                        style={{ background:"none", border:"none", color:"#2a2a2e", fontSize:15, cursor:"pointer", padding:"0 2px", flexShrink:0, transition:"color 0.12s" }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Colour legend */}
            {roster.length > 0 && (
              <div style={{ marginTop:28, padding:"16px 18px", background:"#0d0d10", border:"1px solid #1a1a1e", borderRadius:12 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#333", letterSpacing:"0.1em", marginBottom:12 }}>COLOUR LEGEND</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {roster.map(m => {
                    const tc = TEAM_COLORS.find(c => c.id === m.colorId) ?? TEAM_COLORS[0];
                    return (
                      <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ width:8, height:8, borderRadius:"50%", background:tc.hex, boxShadow:`0 0 4px ${tc.hex}88`, flexShrink:0 }} />
                        <span style={{ fontSize:12, color:tc.hex, fontWeight:600 }}>{m.name}</span>
                        {m.role && <span style={{ fontSize:11, color:"#444" }}>· {m.role}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── SCREEN: Departments ───────────────────────────────────────────────────
  if (screen === "departments") return (
    <>
      <style>{css}</style>
      <div className="screen" style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:"#0a0a0a" }}>
        <div style={{ paddingTop:56, paddingBottom:32, display:"flex", flexDirection:"column", alignItems:"center" }}>
          <FestivalLogo festival={festival} size={52} />
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:12 }}>
            <span style={{ fontWeight:700, fontSize:13, color:"#555" }}>{activeYear}</span><ModeBadge tracker={tracker}/>
          </div>
          <div style={{ fontWeight:700, fontSize:12, letterSpacing:"0.14em", color:"#444", marginTop:8 }}>SELECT A DEPARTMENT</div>
        </div>
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 24px 48px" }}>
          <div style={{ width:"100%", maxWidth:480 }}>
            {/* SAG Dashboard shortcut for council-licensing */}
            {!isSupplier && activeDepts.some(d=>d.id==="council-licensing") && (
              <button onClick={()=>setSagView(true)}
                style={{ width:"100%", padding:"14px 24px", background:"#0d0d14", border:"1px solid #22194444", borderRadius:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:16 }}
                onMouseEnter={e=>{e.currentTarget.style.background="#121220";e.currentTarget.style.borderColor="#333366";}}
                onMouseLeave={e=>{e.currentTarget.style.background="#0d0d14";e.currentTarget.style.borderColor="#22194444";}}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:16 }}>📋</span>
                  <span style={{ fontWeight:700, fontSize:13, color:"#a78bfa" }}>SAG & Licensing Deadlines</span>
                </div>
                <span style={{ fontSize:9, color:"#a78bfa", border:"1px solid #a78bfa44", borderRadius:20, padding:"2px 8px", letterSpacing:"0.08em" }}>DASHBOARD</span>
              </button>
            )}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {activeDepts.map(d => (
                <button key={d.id} className="row-btn" onClick={()=>{ setActiveDept(d.id); setScreen("areas"); }}
                  style={{ width:"100%", padding:"18px 24px", background:"#111113", border:"1px solid #1e1e22", borderRadius:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontWeight:700, fontSize:16, color:"#f0ede8" }}>{d.name}</span>
                  <span style={{ color:"#2a2a2e", fontSize:16 }}>→</span>
                </button>
              ))}
            </div>
            {!isSupplier && (
              <div style={{ marginTop:18, display:"flex", justifyContent:"center" }}>
                <button onClick={()=>setScreen("manage-depts")} style={{ background:"none", border:"1px solid #1e1e22", borderRadius:8, color:"#444", fontSize:11, fontWeight:600, padding:"6px 14px", cursor:"pointer" }}>+ Manage Departments</button>
              </div>
            )}
            <button className="back-link" onClick={()=>setScreen("year")} style={{ marginTop:20, background:"none", border:"none", cursor:"pointer", color:"#444", fontWeight:700, fontSize:11, letterSpacing:"0.1em", display:"flex", alignItems:"center", gap:6, padding:0 }}>← BACK</button>
          </div>
        </div>
      </div>
    </>
  );


  // ── SCREEN: Areas ─────────────────────────────────────────────────────────
  if (screen === "areas") return (
    <>
      <style>{css}</style>
      <div className="screen" style={{ minHeight:"100vh", background:"#0a0a0a" }}>
        <PageHeader>
          <BackBtn onClick={()=>setScreen("departments")}/>
          <FestivalLogo festival={festival} size={34}/>
          <div style={{ flex:1 }}/>
          <ModeBadge tracker={tracker}/>
          {isSupplier && <Pill label="Supplier View" color="#a78bfa"/>}
          <button onClick={()=>setScreen("departments")} style={{ background:"#1a1a1e", border:"1px solid #252528", borderRadius:8, color:"#aaa", fontWeight:700, fontSize:12, padding:"6px 12px", cursor:"pointer", letterSpacing:"0.06em" }}>{activeYear} ▾</button>
        </PageHeader>

        <div style={{ maxWidth:700, margin:"0 auto", padding:"28px 20px 60px" }}>
          <div style={{ marginBottom:20, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:26, color:"#f0ede8", marginBottom:4 }}>{dept?.name}</div>
              <div style={{ fontSize:13, color:"#555" }}>{festivalAreas.length} areas · {activeYear} · {tracker?"Progress Tracker":"Review"}{isSupplier&&supplierToken?.filter?` · ${supplierToken.filter}`:""}</div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:6, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
              {!isSupplier && tracker && allAssigneeNames.length > 0 && (
                <button onClick={()=>setScreen("person-tasks")}
                  style={{ background:"transparent", border:"1px solid #252528", borderRadius:8, color:"#555", fontSize:11, fontWeight:600, padding:"6px 14px", cursor:"pointer", letterSpacing:"0.06em", whiteSpace:"nowrap" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#444";e.currentTarget.style.color="#f0ede8";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#252528";e.currentTarget.style.color="#555";}}>
                  People
                </button>
              )}
              {!isSupplier && tracker && allTagNames.length > 0 && (
                <button onClick={()=>{ setSelectedTag(null); setScreen("tag-tasks"); }}
                  style={{ background:"transparent", border:"1px solid #252528", borderRadius:8, color:"#555", fontSize:11, fontWeight:600, padding:"6px 14px", cursor:"pointer", letterSpacing:"0.06em", whiteSpace:"nowrap" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#444";e.currentTarget.style.color="#f0ede8";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#252528";e.currentTarget.style.color="#555";}}>
                  Tags
                </button>
              )}
              {!isSupplier && !tracker && allReviewTagNames.length > 0 && (
                <button onClick={()=>{ setSelectedTag(null); setScreen("tag-reviews"); }}
                  style={{ background:"transparent", border:"1px solid #252528", borderRadius:8, color:"#555", fontSize:11, fontWeight:600, padding:"6px 14px", cursor:"pointer", letterSpacing:"0.06em", whiteSpace:"nowrap" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#444";e.currentTarget.style.color="#f0ede8";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#252528";e.currentTarget.style.color="#555";}}>
                  Tags
                </button>
              )}
              {!isSupplier && tracker && (
                <button onClick={()=>{ setCalView(v=>!v); setMapView(false); }}
                  style={{ background:calView?"#f0ede811":"transparent", border:`1px solid ${calView?"#888":"#252528"}`, borderRadius:8, color:calView?"#f0ede8":"#555", fontSize:11, fontWeight:700, padding:"6px 14px", cursor:"pointer", letterSpacing:"0.08em", whiteSpace:"nowrap", transition:"all 0.15s" }}>
                  {calView?"List":"Cal"}
                </button>
              )}
              {/* MAP button — available for all festivals, shows upload prompt if no map yet */}
              {!isSupplier && !calView && (
                <button onClick={()=>{
                  const hasMap = festivalMaps[activeFestival];
                  if (hasMap) {
                    setMapView(v=>!v);
                  } else {
                    // Trigger SVG upload
                    mapUploadRef.current?.click();
                  }
                }}
                  style={{ background:mapView?"#f0ede811":"transparent", border:`1px solid ${mapView?"#888":"#252528"}`, borderRadius:8, color:mapView?"#f0ede8":"#555", fontSize:11, fontWeight:700, padding:"6px 14px", cursor:"pointer", letterSpacing:"0.08em", whiteSpace:"nowrap", transition:"all 0.15s" }}>
                  {mapView ? "List" : festivalMaps[activeFestival] ? "Map" : "Map +"}
                </button>
              )}
              {/* Hidden SVG file input */}
              <input ref={mapUploadRef} type="file" accept=".svg,image/svg+xml" style={{ display:"none" }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => {
                    const svgText = ev.target.result;
                    setFestivalMaps(p => ({ ...p, [activeFestival]: svgText }));
                    saveFestivalMap(activeFestival, svgText).catch(() => showSaveError());
                    setMapView(true);
                  };
                  reader.readAsText(file);
                  e.target.value = ""; // reset so same file can be re-uploaded
                }}
              />
              {!isSupplier && !mapView && !calView && (
                <button onClick={()=>updateAreas(prev=>[...prev].sort((a,b)=>a.localeCompare(b)))}
                  style={{ background:"transparent", border:"1px solid #252528", borderRadius:8, color:"#555", fontSize:11, fontWeight:600, padding:"6px 14px", cursor:"pointer", letterSpacing:"0.06em", whiteSpace:"nowrap" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#444";e.currentTarget.style.color="#f0ede8";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#252528";e.currentTarget.style.color="#555";}}>
                  A → Z
                </button>
              )}
            </div>
          </div>

          {/* Area search bar */}
          {tracker && !calView && !mapView && (
            <div style={{ position:"relative", marginBottom:14 }}>
              <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#444", pointerEvents:"none" }}></span>
              <input value={areaSearch} onChange={e=>setAreaSearch(e.target.value)} placeholder={`Search ${festivalAreas.length} areas…`}
                style={{ width:"100%", background:"#111113", border:"1px solid #1e1e22", borderRadius:8, color:"#f0ede8", padding:"9px 10px", fontSize:13, boxSizing:"border-box" }} />
              {areaSearch && <button onClick={()=>setAreaSearch("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#444", cursor:"pointer", fontSize:14, padding:0 }}>✕</button>}
            </div>
          )}

          {/* Tracker summary bar */}
          {tracker && !isSupplier && (() => {
            let total=0,done=0,blocked=0;
            festivalAreas.forEach(a=>{ const s=areaTaskStats(a); total+=s.total; done+=s.done; blocked+=s.blocked; });
            const pct = total>0 ? Math.round((done/total)*100) : 0;
            const rc  = blocked>0?"#ef4444":pct===100?"#22c55e":pct>0?"#eab308":"#3a3a3e";
            return (
              <div style={{ marginBottom:18, padding:"14px 18px", background:"#111113", border:"1px solid #1e1e22", borderRadius:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ flex:1, height:4, background:"#1e1e22", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:rc, borderRadius:2, transition:"width 0.5s" }}/>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:"#555", whiteSpace:"nowrap" }}>{done}/{total} · {pct}%</span>
                  {blocked>0 && <Pill label={`${blocked} blocked`} color="#ef4444"/>}
                  {/* NEW: Copy all tasks from prev year */}
                  {prevYear && total===0 && (
                    <button onClick={copyAllTasksFromPrevYear}
                      style={{ background:"transparent", border:"1px solid #eab30855", borderRadius:8, color:"#eab308", fontSize:11, fontWeight:600, padding:"5px 12px", cursor:"pointer", whiteSpace:"nowrap" }}
                      onMouseEnter={e=>{e.currentTarget.style.background="#eab30811";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                      Copy from {prevYear}
                    </button>
                  )}
                  <button onClick={()=>exportTrackerPDF({festival,year:activeYear,depts:activeDepts,allAreas:areas,getAreaTasks:(d,a)=>getAreaTasks(d,a,activeFestival,activeYear)})}
                    style={{ background:"transparent", border:"1px solid #252528", borderRadius:8, color:"#555", fontSize:11, fontWeight:600, padding:"5px 12px", cursor:"pointer", whiteSpace:"nowrap" }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#444";e.currentTarget.style.color="#f0ede8";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#252528";e.currentTarget.style.color="#555";}}>↓ PDF</button>
                </div>
              </div>
            );
          })()}

          {calView && tracker && (
            <div style={{ marginBottom:16 }}>
              <TrackerCalendar areas={festivalAreas} getAreaTasks={getAreaTasks} activeDept={activeDept} activeFestival={activeFestival} activeYear={activeYear}
                onTaskClick={areaName=>{ setSelectedArea(areaName); setScreen("area-detail"); setEditingCats(false); }}/>
            </div>
          )}

          {mapView && festivalMaps[activeFestival] && (
            <div style={{ marginBottom:16 }}>
              <UploadedSiteMap
                svgText={festivalMaps[activeFestival]}
                areas={festivalAreas}
                tracker={tracker}
                getAreaColor={areaName => tracker ? areaRAGColor(areaName) : areaReviewColor(areaName)}
                onAreaTap={areaName => {
                  if (festivalAreas.includes(areaName)) { setSelectedArea(areaName); setScreen("area-detail"); setEditingCats(false); }
                }}
              />
              <div style={{ display:"flex", justifyContent:"center", marginTop:8 }}>
                <button onClick={()=>{ mapUploadRef.current?.click(); }}
                  style={{ background:"transparent", border:"1px solid #252528", borderRadius:8, color:"#555", fontSize:11, fontWeight:600, padding:"5px 12px", cursor:"pointer" }}
                  onMouseEnter={e=>{e.currentTarget.style.color="#f0ede8";e.currentTarget.style.borderColor="#444";}}
                  onMouseLeave={e=>{e.currentTarget.style.color="#555";e.currentTarget.style.borderColor="#252528";}}>
                  Replace map
                </button>
              </div>
            </div>
          )}

          {mapView && festival?.id==="gottwood" && !festivalMaps[activeFestival] && (
            <div style={{ marginBottom:16 }}>
              <SiteMap festival={festival} areas={festivalAreas} tracker={tracker}
                getAreaColor={areaName => tracker ? areaRAGColor(areaName) : areaReviewColor(areaName)}
                onAreaTap={areaName => {
                  if (festivalAreas.includes(areaName)) { setSelectedArea(areaName); setScreen("area-detail"); setEditingCats(false); }
                }}/>
            </div>
          )}

          {!calView && !mapView && (loading ? (
            <div style={{ textAlign:"center", padding:60, color:"#444", fontSize:12, letterSpacing:"0.1em" }}>LOADING…</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {areaSearch && filteredFestivalAreas.length === 0 && (
                <div style={{ textAlign:"center", padding:"30px 0", color:"#444", fontSize:13 }}>No areas match "{areaSearch}"</div>
              )}
              {filteredFestivalAreas.map(areaName => {
                const color      = tracker ? areaRAGColor(areaName) : areaReviewColor(areaName);
                const hasActivity = tracker
                  ? (()=>{ const s=areaTaskStats(areaName); return s.done>0||s.inProgress>0||s.blocked>0; })()
                  : areaReviewScore(areaName).rated > 0;
                return (
                  <div key={areaName} style={{ display:"flex", gap:6 }}>
                    <button className="row-btn" onClick={()=>{ setSelectedArea(areaName); setScreen("area-detail"); setEditingCats(false); clearSelection(); }}
                      style={{ flex:1, background:"#111113", border:"1px solid #1e1e22", borderRadius:12, cursor:"pointer", textAlign:"left", padding:"15px 18px", display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ width:9, height:9, borderRadius:"50%", flexShrink:0, background:hasActivity?(color??"#555"):"#252528", boxShadow:hasActivity&&color?`0 0 6px ${color}66`:"none" }}/>
                      <span style={{ fontWeight:700, fontSize:14, color:hasActivity?"#e8e4df":"#666", flex:1 }}>{areaName}</span>
                      {tracker ? (() => {
                        const { total, done, blocked } = areaTaskStats(areaName);
                        return (
                          <>
                            {blocked>0 && <Pill label={`${blocked} blocked`} color="#ef4444"/>}
                            <div style={{ width:70, height:3, background:"#1e1e22", borderRadius:2, overflow:"hidden", flexShrink:0 }}>
                              <div style={{ height:"100%", width:`${total>0?(done/total)*100:0}%`, background:color??"#333", borderRadius:2 }}/>
                            </div>
                            <span style={{ fontSize:10, fontWeight:600, color:hasActivity?(color??"#888"):"#2a2a2e", letterSpacing:"0.06em", minWidth:36, textAlign:"right" }}>{done}/{total}</span>
                          </>
                        );
                      })() : (() => {
                        const { rated, total } = areaReviewScore(areaName);
                        return (
                          <>
                            <div style={{ width:70, height:3, background:"#1e1e22", borderRadius:2, overflow:"hidden", flexShrink:0 }}>
                              <div style={{ height:"100%", width:`${total>0?(rated/total)*100:0}%`, background:color??"#333", borderRadius:2 }}/>
                            </div>
                            <span style={{ fontSize:10, fontWeight:600, color:hasActivity?(color??"#888"):"#2a2a2e", letterSpacing:"0.06em", minWidth:36, textAlign:"right" }}>{rated>0?`${rated}/${total}`:"—"}</span>
                          </>
                        );
                      })()}
                      <span style={{ color:"#2a2a2e", fontSize:14 }}>→</span>
                    </button>
                    {!isSupplier && (
                      <button className="del-btn" onClick={()=>{ if(window.confirm(`Remove "${areaName}"?`)) updateAreas(prev=>prev.filter(a=>a!==areaName)); }}
                        style={{ background:"#111113", border:"1px solid #1e1e22", borderRadius:12, color:"#333", cursor:"pointer", padding:"0 14px", fontSize:15, flexShrink:0 }}>✕</button>
                    )}
                  </div>
                );
              })}
              {!isSupplier && <AddRow placeholder="Area name..." onAdd={name => {
                updateAreas(prev => [...prev, name]);
                const aId = slugify(name);
                const presetSlugs = (DEFAULT_DEPT_AREAS[activeFestival]?.[activeDept]??[]).map(a=>slugify(a));
                const defaultCats = presetSlugs.includes(aId) ? (DEPT_REVIEW_CATS[activeDept]??[]) : [];
                upsertReview(activeFestival, activeYear, activeDept, aId, name, "__cats__", { notes: JSON.stringify(defaultCats) });
                upsertReview(activeFestival, activeYear, activeDept, aId, name, "__available_cats__", { notes: JSON.stringify(defaultCats) });
              }}/>}
            </div>
          ))}
        </div>
      </div>
    </>
  );


  // ── SCREEN: Person tasks ──────────────────────────────────────────────────
  if (screen === "person-tasks") {
    const personAreaGroups = festivalAreas
      .map(areaName => ({
        areaName,
        tasks: getAreaTasks(activeDept, areaName).filter(t => {
          const a = t.assignees?.length ? t.assignees : (t.owner ? [t.owner] : []);
          return !selectedPerson || a.includes(selectedPerson);
        })
      }))
      .filter(g => g.tasks.length > 0);

    const totalTasks   = personAreaGroups.reduce((s,g)=>s+g.tasks.length,0);
    const doneTasks    = personAreaGroups.reduce((s,g)=>s+g.tasks.filter(t=>t.status==="done").length,0);
    const blockedTasks = personAreaGroups.reduce((s,g)=>s+g.tasks.filter(t=>t.status==="blocked").length,0);
    const people       = ["All", ...allAssigneeNames];

    return (
      <>
        <style>{css}</style>
        <div className="screen" style={{ minHeight:"100vh", background:"#0a0a0a" }}>
          <PageHeader>
            <BackBtn onClick={()=>setScreen("areas")}/>
            <FestivalLogo festival={festival} size={34}/>
            <div style={{ flex:1 }}/>
            <ModeBadge tracker={tracker}/>
          </PageHeader>
          <div style={{ maxWidth:700, margin:"0 auto", padding:"28px 20px 80px" }}>
            <div style={{ marginBottom:22 }}>
              <div style={{ fontWeight:800, fontSize:24, color:"#f0ede8", marginBottom:4 }}>{selectedPerson ? selectedPerson : "All People"}</div>
              <div style={{ fontSize:13, color:"#555" }}>
                {dept?.name} · {activeYear} · {totalTasks} task{totalTasks!==1?"s":""}
                {doneTasks>0&&<span> · {doneTasks} done</span>}
                {blockedTasks>0&&<span style={{ color:"#ef4444" }}> · {blockedTasks} blocked</span>}
              </div>
            </div>

            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:22 }}>
              {people.map(p => {
                const isActive = p==="All" ? !selectedPerson : selectedPerson===p;
                const { hex, bg, border } = p==="All"
                  ? { hex:"#f0ede8", bg:"#1e1e22", border:"#444" }
                  : resolveColor(p, roster);
                return (
                  <button key={p} onClick={()=>setSelectedPerson(p==="All"?null:p)}
                    style={{ display:"flex", alignItems:"center", gap:6, background:isActive?bg:"transparent", border:`1px solid ${isActive?border:"#252528"}`, borderRadius:20, padding:"5px 12px 5px 8px", color:isActive?hex:"#555", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.15s" }}>
                    {p!=="All" && (
                      <span style={{ width:18, height:18, borderRadius:"50%", background:border, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:hex }}>
                        {p.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)}
                      </span>
                    )}
                    {p}
                  </button>
                );
              })}
            </div>

            {personAreaGroups.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 20px", color:"#333", fontSize:13 }}>
                {selectedPerson ? `No tasks assigned to ${selectedPerson}` : "No assigned tasks yet"}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                {personAreaGroups.map(({ areaName, tasks }) => {
                  const done    = tasks.filter(t=>t.status==="done").length;
                  const blocked = tasks.filter(t=>t.status==="blocked").length;
                  const pct     = tasks.length>0 ? Math.round(done/tasks.length*100) : 0;
                  const rc      = blocked>0?"#ef4444":pct===100?"#22c55e":pct>0?"#eab308":"#3a3a3e";
                  return (
                    <div key={areaName} style={{ background:"#111113", border:"1px solid #1e1e22", borderRadius:12, overflow:"hidden" }}>
                      <div style={{ padding:"12px 16px", borderBottom:"1px solid #1a1a1e", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
                        onClick={()=>{ setSelectedArea(areaName); setScreen("area-detail"); }}>
                        <span style={{ flex:1, fontWeight:700, fontSize:14, color:"#d0ccc8" }}>{areaName}</span>
                        <span style={{ fontSize:11, color:"#555" }}>{done}/{tasks.length}</span>
                        <div style={{ width:48, height:3, background:"#1e1e22", borderRadius:2, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:rc, borderRadius:2 }}/>
                        </div>
                        <span style={{ fontSize:11, color:"#333" }}>→</span>
                      </div>
                      <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:6 }}>
                        {tasks.map(task => {
                          const st       = TASK_STATUSES.find(s=>s.id===task.status)??TASK_STATUSES[0];
                          const assignees = task.assignees?.length ? task.assignees : (task.owner?[task.owner]:[]);
                          const ov        = task.due && new Date(task.due)<new Date() && task.status!=="done";
                          return (
                            <div key={task.id} onClick={()=>{ setSelectedArea(areaName); setScreen("area-detail"); }}
                              style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 10px", background:"#0d0d10", borderRadius:8, border:"1px solid #1a1a1e", cursor:"pointer" }}
                              onMouseEnter={e=>e.currentTarget.style.borderColor="#2a2a30"}
                              onMouseLeave={e=>e.currentTarget.style.borderColor="#1a1a1e"}>
                              <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0, background:st.color, boxShadow:task.status!=="not-started"?`0 0 5px ${st.color}66`:"none" }}/>
                              <span style={{ flex:1, fontSize:13, color:task.status==="done"?"#444":"#d0ccc8", textDecoration:task.status==="done"?"line-through":"none", lineHeight:1.4 }}>{task.label}</span>
                              {assignees.filter(n=>n!==selectedPerson).map(n=><AssigneeTag key={n} name={n} roster={roster} onTap={()=>setSelectedPerson(n)}/>)}
                              {task.due && <span style={{ fontSize:10, color:ov?"#ef4444":"#555", flexShrink:0, whiteSpace:"nowrap" }}>{new Date(task.due).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span>}
                              <StatusSelect value={task.status} onChange={v=>{
                                const updated = getAreaTasks(activeDept, areaName).map(t => t.id===task.id?{...t,status:v,updated_by:userName}:t);
                                setAreaTasks(areaName, updated);
                              }}/>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }


  // ── SCREEN: Tag tasks ─────────────────────────────────────────────────────
  if (screen === "tag-tasks") {
    const tagAreaGroups = festivalAreas
      .map(areaName => ({
        areaName,
        tasks: getAreaTasks(activeDept, areaName).filter(t =>
          !selectedTag || (t.tags ?? []).includes(selectedTag)
        )
      }))
      .filter(g => g.tasks.length > 0);

    const totalTasks   = tagAreaGroups.reduce((s,g)=>s+g.tasks.length,0);
    const doneTasks    = tagAreaGroups.reduce((s,g)=>s+g.tasks.filter(t=>t.status==="done").length,0);
    const blockedTasks = tagAreaGroups.reduce((s,g)=>s+g.tasks.filter(t=>t.status==="blocked").length,0);
    const tags         = ["All", ...allTagNames];

    return (
      <>
        <style>{css}</style>
        <div className="screen" style={{ minHeight:"100vh", background:"#0a0a0a" }}>
          <PageHeader>
            <BackBtn onClick={()=>setScreen("areas")}/>
            <FestivalLogo festival={festival} size={34}/>
            <div style={{ flex:1 }}/>
            <ModeBadge tracker={tracker}/>
          </PageHeader>
          <div style={{ maxWidth:700, margin:"0 auto", padding:"28px 20px 80px" }}>
            <div style={{ marginBottom:22 }}>
              <div style={{ fontWeight:800, fontSize:24, color:"#f0ede8", marginBottom:4 }}>
                {selectedTag ? (
                  <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
                    <TagBadge tag={selectedTag} />
                    <span>tasks</span>
                  </span>
                ) : "All Tags"}
              </div>
              <div style={{ fontSize:13, color:"#555" }}>
                {dept?.name} · {activeYear} · {totalTasks} task{totalTasks!==1?"s":""}
                {doneTasks>0&&<span> · {doneTasks} done</span>}
                {blockedTasks>0&&<span style={{ color:"#ef4444" }}> · {blockedTasks} blocked</span>}
              </div>
            </div>

            {/* Tag filter pills */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:22 }}>
              {tags.map(t => {
                const isActive = t==="All" ? !selectedTag : selectedTag===t;
                const c = t==="All" ? "#888" : tagColor(t);
                return (
                  <button key={t} onClick={()=>setSelectedTag(t==="All"?null:t)}
                    style={{ display:"flex", alignItems:"center", gap:5, background:isActive?c+"18":"transparent", border:`1px solid ${isActive?c+"66":"#252528"}`, borderRadius:20, padding:"5px 14px", color:isActive?c:"#555", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.15s", letterSpacing:"0.04em" }}>
                    {t !== "All" && <span style={{ width:8, height:8, borderRadius:"50%", background:c, flexShrink:0 }}/>}
                    {t}
                  </button>
                );
              })}
            </div>

            {tagAreaGroups.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 20px", color:"#333", fontSize:13 }}>
                {selectedTag ? `No tasks tagged "${selectedTag}"` : "No tagged tasks yet"}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                {tagAreaGroups.map(({ areaName, tasks }) => {
                  const done    = tasks.filter(t=>t.status==="done").length;
                  const blocked = tasks.filter(t=>t.status==="blocked").length;
                  const pct     = tasks.length>0 ? Math.round(done/tasks.length*100) : 0;
                  const rc      = blocked>0?"#ef4444":pct===100?"#22c55e":pct>0?"#eab308":"#3a3a3e";
                  return (
                    <div key={areaName} style={{ background:"#111113", border:"1px solid #1e1e22", borderRadius:12, overflow:"hidden" }}>
                      <div style={{ padding:"12px 16px", borderBottom:"1px solid #1a1a1e", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
                        onClick={()=>{ setSelectedArea(areaName); setScreen("area-detail"); }}>
                        <span style={{ flex:1, fontWeight:700, fontSize:14, color:"#d0ccc8" }}>{areaName}</span>
                        <span style={{ fontSize:11, color:"#555" }}>{done}/{tasks.length}</span>
                        <div style={{ width:48, height:3, background:"#1e1e22", borderRadius:2, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:rc, borderRadius:2 }}/>
                        </div>
                        <span style={{ fontSize:11, color:"#333" }}>→</span>
                      </div>
                      <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:6 }}>
                        {tasks.map(task => {
                          const st       = TASK_STATUSES.find(s=>s.id===task.status)??TASK_STATUSES[0];
                          const assignees = task.assignees?.length ? task.assignees : (task.owner?[task.owner]:[]);
                          const taskTags  = (task.tags ?? []).filter(t => t !== selectedTag);
                          const ov        = task.due && new Date(task.due)<new Date() && task.status!=="done";
                          return (
                            <div key={task.id} onClick={()=>{ setSelectedArea(areaName); setScreen("area-detail"); }}
                              style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 10px", background:"#0d0d10", borderRadius:8, border:"1px solid #1a1a1e", cursor:"pointer" }}
                              onMouseEnter={e=>e.currentTarget.style.borderColor="#2a2a30"}
                              onMouseLeave={e=>e.currentTarget.style.borderColor="#1a1a1e"}>
                              <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0, background:st.color, boxShadow:task.status!=="not-started"?`0 0 5px ${st.color}66`:"none" }}/>
                              <span style={{ flex:1, fontSize:13, color:task.status==="done"?"#444":"#d0ccc8", textDecoration:task.status==="done"?"line-through":"none", lineHeight:1.4 }}>{task.label}</span>
                              {taskTags.map(t=><TagBadge key={t} tag={t} onTap={()=>setSelectedTag(t)}/>)}
                              {assignees.map(n=><AssigneeTag key={n} name={n} roster={roster} onTap={()=>{ setSelectedPerson(n); setScreen("person-tasks"); }}/>)}
                              {task.due && <span style={{ fontSize:10, color:ov?"#ef4444":"#555", flexShrink:0, whiteSpace:"nowrap" }}>{new Date(task.due).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span>}
                              <StatusSelect value={task.status} onChange={v=>{
                                const updated = getAreaTasks(activeDept, areaName).map(t => t.id===task.id?{...t,status:v,updated_by:userName}:t);
                                setAreaTasks(areaName, updated);
                              }}/>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }


  // ── SCREEN: Tag reviews ───────────────────────────────────────────────────
  if (screen === "tag-reviews") {
    const reviewTags = ["All", ...allReviewTagNames];
    const tagAreaGroups = festivalAreas
      .map(areaName => ({
        areaName,
        sections: getCats(areaName).filter(cat => {
          const d = reviewData[keys.review(areaName, cat)];
          return !selectedTag || (d?.tags ?? []).includes(selectedTag);
        }).map(cat => ({ cat, data: reviewData[keys.review(areaName, cat)] }))
      }))
      .filter(g => g.sections.length > 0);

    const totalSections = tagAreaGroups.reduce((s,g)=>s+g.sections.length,0);

    return (
      <>
        <style>{css}</style>
        <div className="screen" style={{ minHeight:"100vh", background:"#0a0a0a" }}>
          <PageHeader>
            <BackBtn onClick={()=>setScreen("areas")}/>
            <FestivalLogo festival={festival} size={34}/>
            <div style={{ flex:1 }}/>
            <ModeBadge tracker={tracker}/>
          </PageHeader>
          <div style={{ maxWidth:700, margin:"0 auto", padding:"28px 20px 80px" }}>
            <div style={{ marginBottom:22, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:24, color:"#f0ede8", marginBottom:4 }}>
                  {selectedTag ? (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
                      <TagBadge tag={selectedTag} />
                      <span>reviews</span>
                    </span>
                  ) : "All Tags"}
                </div>
                <div style={{ fontSize:13, color:"#555" }}>
                  {dept?.name} · {activeYear} · {totalSections} section{totalSections!==1?"s":""}
                </div>
              </div>
              {selectedTag && totalSections > 0 && (
                <button onClick={()=>exportTagReviewPDF({ festival, year:activeYear, dept, tag:selectedTag, tagAreaGroups, reviewData })}
                  style={{ flexShrink:0, marginTop:4, background:"transparent", border:"1px solid #252528", borderRadius:8, color:"#555", fontSize:11, fontWeight:600, padding:"7px 14px", cursor:"pointer", letterSpacing:"0.06em", display:"flex", alignItems:"center", gap:6, transition:"all 0.15s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#444";e.currentTarget.style.color="#f0ede8";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#252528";e.currentTarget.style.color="#555";}}>
                  <span style={{ fontSize:14 }}>↓</span> PDF
                </button>
              )}
            </div>

            {/* Tag filter pills */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:22 }}>
              {reviewTags.map(t => {
                const isActive = t==="All" ? !selectedTag : selectedTag===t;
                const c = t==="All" ? "#888" : tagColor(t);
                return (
                  <button key={t} onClick={()=>setSelectedTag(t==="All"?null:t)}
                    style={{ display:"flex", alignItems:"center", gap:5, background:isActive?c+"18":"transparent", border:`1px solid ${isActive?c+"66":"#252528"}`, borderRadius:20, padding:"5px 14px", color:isActive?c:"#555", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.15s", letterSpacing:"0.04em" }}>
                    {t !== "All" && <span style={{ width:8, height:8, borderRadius:"50%", background:c, flexShrink:0 }}/>}
                    {t}
                  </button>
                );
              })}
            </div>

            {tagAreaGroups.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 20px", color:"#333", fontSize:13 }}>
                {selectedTag ? `No sections tagged "${selectedTag}"` : "No tagged sections yet"}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                {tagAreaGroups.map(({ areaName, sections }) => {
                  const { rated, total } = areaReviewScore(areaName);
                  const rc = areaReviewColor(areaName) ?? "#3a3a3e";
                  return (
                    <div key={areaName} style={{ background:"#111113", border:"1px solid #1e1e22", borderRadius:12, overflow:"hidden" }}>
                      <div style={{ padding:"12px 16px", borderBottom:"1px solid #1a1a1e", display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ flex:1, fontWeight:700, fontSize:14, color:"#d0ccc8" }}>{areaName}</span>
                        <span style={{ fontSize:11, color:"#555" }}>{rated}/{total} rated</span>
                        <div style={{ width:48, height:3, background:"#1e1e22", borderRadius:2, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${total>0?Math.round(rated/total*100):0}%`, background:rc, borderRadius:2 }}/>
                        </div>
                        <button onClick={()=>{ setSelectedArea(areaName); setScreen("area-detail"); }}
                          style={{ background:"none", border:"1px solid #252528", borderRadius:6, color:"#555", fontSize:10, fontWeight:600, padding:"4px 10px", cursor:"pointer", letterSpacing:"0.06em", flexShrink:0 }}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor="#444";e.currentTarget.style.color="#f0ede8";}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor="#252528";e.currentTarget.style.color="#555";}}>
                          FULL AREA →
                        </button>
                      </div>
                      <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:8 }}>
                        {sections.map(({ cat }) => {
                          const k = keys.review(areaName, cat);
                          return (
                            <ReviewSection key={k} catName={cat} data={reviewData[k]} saveKey={k} saveStatuses={saveStatuses}
                              userName={userName} isSupplier={isSupplier} nextYear={nextTrackerYear} areaName={areaName}
                              onSave={patch=>handleSave(areaName, cat, patch)}
                              onAISuggestion={suggestion=>addAISuggestion(areaName, suggestion)}
                              allReviewTags={allReviewTagNames}
                              onTagTap={tag=>setSelectedTag(tag)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── SCREEN: Area detail ───────────────────────────────────────────────────
  const cats      = getCats(selectedArea);
  const areaId    = slugify(selectedArea);
  const areaTasks = getAreaTasks(activeDept, selectedArea);
  const isSavingTasks = taskSaving[keys.dept(activeDept, areaId)];

  // Apply smart sort: in-progress → top, done → bottom.
  // If tasks have been manually drag-ordered (have _order), respect that ordering instead.
  const hasManualOrder = areaTasks.some(t => t._order !== undefined);
  const filteredTasks = hasManualOrder
    ? [...areaTasks].sort((a, b) => (a._order ?? 999) - (b._order ?? 999))
    : smartSortTasks(areaTasks);

  return (
    <>
      <style>{css}</style>
      <div className="screen" style={{ minHeight:"100vh", background:"#0a0a0a" }}>
        <PageHeader>
          <BackBtn onClick={()=>{ setScreen("areas"); clearSelection(); setTaskSearch(""); }}/>
          <FestivalLogo festival={festival} size={34}/>
          <span style={{ color:"#2a2a2e", fontSize:14 }}>·</span>
          <span style={{ fontWeight:700, fontSize:13, color:"#888" }}>{dept?.name}</span>
          <span style={{ color:"#2a2a2e", fontSize:14 }}>·</span>
          <span style={{ fontWeight:700, fontSize:13, color:"#555" }}>{activeYear}</span>
          <div style={{ flex:1 }}/>
          <ModeBadge tracker={tracker}/>
          {isSavingTasks && <span style={{ fontSize:10, color:"#555", letterSpacing:"0.06em" }}>SAVING…</span>}
          {!tracker && !isSupplier && (
            <button onClick={()=>setEditingCats(!editingCats)} style={{ background:editingCats?"#f0ede811":"transparent", border:`1px solid ${editingCats?"#555":"#252528"}`, borderRadius:8, color:editingCats?"#f0ede8":"#555", fontWeight:700, fontSize:10, letterSpacing:"0.08em", padding:"5px 12px", cursor:"pointer" }}>
              {editingCats?"DONE":"EDIT SECTIONS"}
            </button>
          )}
          {nextTrackerYear && !isSupplier && <span style={{ fontSize:9, color:"#a78bfa", letterSpacing:"0.06em", border:"1px solid #a78bfa33", borderRadius:20, padding:"2px 8px", whiteSpace:"nowrap" }}> AI {nextTrackerYear}</span>}
        </PageHeader>

        <div style={{ maxWidth:700, margin:"0 auto", padding:"28px 20px 80px" }}>
          <div style={{ marginBottom:28 }}>
            <div style={{ fontWeight:800, fontSize:30, color:"#f0ede8", lineHeight:1.1, marginBottom:8 }}>{selectedArea}</div>
            <AreaDescription value={getDesc(selectedArea)} onChange={v=>setDesc(selectedArea,v)} readOnly={isSupplier} />
            {tracker ? (() => {
              const { total, done, blocked, inProgress } = areaTaskStats(selectedArea);
              const color = areaRAGColor(selectedArea);
              return (
                <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                  <div style={{ flex:1, height:3, background:"#1e1e22", borderRadius:2, overflow:"hidden", minWidth:80 }}>
                    <div style={{ height:"100%", width:`${total>0?(done/total)*100:0}%`, background:color??"#333", transition:"width 0.4s", borderRadius:2 }}/>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:"#555", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{done}/{total} DONE</span>
                  {inProgress>0 && <Pill label={`${inProgress} in progress`} color="#eab308"/>}
                  {blocked>0    && <Pill label={`${blocked} blocked`}     color="#ef4444"/>}
                </div>
              );
            })() : (() => {
              const { rated, total } = areaReviewScore(selectedArea);
              const color = areaReviewColor(selectedArea);
              return (
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ flex:1, height:3, background:"#1e1e22", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${total>0?(rated/total)*100:0}%`, background:color??"#333", transition:"width 0.4s", borderRadius:2 }}/>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:"#555", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{rated}/{total} VOTED</span>
                </div>
              );
            })()}
          </div>

          {/* ── TRACKER ── */}
          {tracker && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {/* Copy from prev year prompt */}
              {areaTasks.length===0 && hasPrevYearTasks(selectedArea) && (
                <div style={{ background:"#111113", border:"1px solid #eab30844", borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"#e8e4df", marginBottom:3 }}>Copy tasks from {prevYear}?</div>
                    <div style={{ fontSize:12, color:"#666" }}>Start this year with last year's task list, reset to Not Started.</div>
                  </div>
                  <button onClick={()=>copyTasksFromYear(prevYear, selectedArea)} style={{ background:"#eab308", color:"#0a0a0a", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>Copy from {prevYear}</button>
                </div>
              )}

              {/* Bulk controls toolbar */}
              {!isSupplier && (
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <button onClick={()=>{ if(selectedTasks.size>0) clearSelection(); else setSelectedTasks(new Set(areaTasks.map(t=>t.id))); }}
                    style={{ background:selectedTasks.size>0?"#a78bfa22":"transparent", border:`1px solid ${selectedTasks.size>0?"#a78bfa":"#252528"}`, borderRadius:8, color:selectedTasks.size>0?"#a78bfa":"#555", fontSize:11, fontWeight:700, padding:"6px 14px", cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s" }}>
                    {selectedTasks.size>0 ? `${selectedTasks.size} selected` : "Select all"}
                  </button>
                  <button onClick={()=>setAreaTasks(selectedArea,[...areaTasks].sort((a,b)=>a.label.localeCompare(b.label)).map((t,i)=>({...t,_order:i})))}
                    style={{ background:"transparent", border:"1px solid #252528", borderRadius:8, color:"#555", fontSize:11, fontWeight:600, padding:"6px 12px", cursor:"pointer", letterSpacing:"0.05em" }}
                    onMouseEnter={e=>{e.currentTarget.style.color="#f0ede8";e.currentTarget.style.borderColor="#444";}}
                    onMouseLeave={e=>{e.currentTarget.style.color="#555";e.currentTarget.style.borderColor="#252528";}}>A → Z</button>
                  {hasManualOrder && (
                    <button onClick={()=>setAreaTasks(selectedArea, areaTasks.map(t=>{ const {_order,...rest}=t; return rest; }))}
                      style={{ background:"transparent", border:"1px solid #a78bfa44", borderRadius:8, color:"#a78bfa", fontSize:11, fontWeight:600, padding:"6px 12px", cursor:"pointer", letterSpacing:"0.05em" }}
                      onMouseEnter={e=>{e.currentTarget.style.background="#a78bfa11";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>Auto-sort</button>
                  )}
                  <div style={{ flex:1 }} />
                </div>
              )}

              {/* NEW: Bulk action bar */}
              {selectedTasks.size > 0 && !isSupplier && (
                <div style={{ background:"#1a1020", border:"1px solid #a78bfa44", borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                  <span style={{ fontSize:12, color:"#a78bfa", fontWeight:700 }}>{selectedTasks.size} task{selectedTasks.size!==1?"s":""} selected</span>
                  <div style={{ flex:1 }} />
                  <span style={{ fontSize:11, color:"#666" }}>Mark as:</span>
                  {TASK_STATUSES.map(s => (
                    <button key={s.id} onClick={()=>applyBulkStatus(selectedArea, s.id)}
                      style={{ background:`${s.color}18`, border:`1px solid ${s.color}55`, borderRadius:6, color:s.color, fontSize:11, fontWeight:700, padding:"5px 12px", cursor:"pointer", letterSpacing:"0.04em" }}
                      onMouseEnter={e=>{e.currentTarget.style.background=`${s.color}30`;}}
                      onMouseLeave={e=>{e.currentTarget.style.background=`${s.color}18`;}}>
                      {s.label}
                    </button>
                  ))}
                  <button onClick={clearSelection} style={{ background:"transparent", border:"1px solid #333", borderRadius:6, color:"#555", fontSize:11, padding:"5px 10px", cursor:"pointer" }}>Cancel</button>
                </div>
              )}

              <DragList
                items={filteredTasks}
                onReorder={newTasks => {
                  // Manual drag reorder — store with _manualOrder flag to skip auto-sort
                  setAreaTasks(selectedArea, newTasks.map((t, i) => ({ ...t, _order: i })));
                }}
                gap={5}
                renderItem={(task) => {
                  const st = TASK_STATUSES.find(s => s.id===task.status);
                  return (
                    <div>
                      <div style={{ fontSize:9, fontWeight:700, color:st?.color??"#3a3a3e", letterSpacing:"0.1em", marginBottom:3, paddingLeft:2, opacity:0.7 }}>{st?.label?.toUpperCase()}</div>
                      <TaskRow
                        task={task}
                        userName={userName}
                        allNames={allAssigneeNames}
                        roster={roster}
                        allTags={allTagNames}
                        selected={selectedTasks.has(task.id)}
                        onSelect={!isSupplier ? ()=>toggleSelectTask(task.id) : undefined}
                        onPersonTap={(name) => { setSelectedPerson(name); setScreen("person-tasks"); }}
                        onTagTap={(tag) => { setSelectedTag(tag); setScreen("tag-tasks"); }}
                        onChange={updated => setAreaTasks(selectedArea, areaTasks.map(t => t.id===task.id ? {...updated, updated_by:userName} : t))}
                        onDelete={() => setAreaTasks(selectedArea, areaTasks.filter(t => t.id!==task.id))}
                      />
                    </div>
                  );
                }}
              />
              {!isSupplier && <AddRow placeholder="Add a task..." onAdd={label=>setAreaTasks(selectedArea,[...areaTasks,makeTask(label)])}/>}
            </div>
          )}

          {/* ── REVIEW ── */}
          {!tracker && (
            <>
              {editingCats && !isSupplier && (
                <div style={{ background:"#111113", border:"1px solid #1e1e22", borderRadius:14, padding:20, marginBottom:20 }}>
                  <div style={{ fontWeight:800, fontSize:12, color:"#555", letterSpacing:"0.1em", marginBottom:14 }}>SECTIONS FOR THIS AREA</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
                    {getAvailableCats(selectedArea).map(cat => {
                      const active = cats.includes(cat);
                      return (
                        <button key={cat} onClick={()=>active?setCats(selectedArea,cats.filter(c=>c!==cat)):setCats(selectedArea,[...cats,cat])}
                          style={{ padding:"7px 14px", borderRadius:20, border:`1px solid ${active?"#f0ede8":"#252528"}`, background:active?"#f0ede811":"transparent", color:active?"#f0ede8":"#555", fontWeight:600, fontSize:12, cursor:"pointer" }}>
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <input value={newCatName} onChange={e=>setNewCatName(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter"&&newCatName.trim()){const n=newCatName.trim();const pool=getAvailableCats(selectedArea);if(!pool.includes(n))saveAvailableCats(selectedArea,[...pool,n]);setCats(selectedArea,[...cats,n]);setNewCatName("");}}}
                      placeholder="Add custom section..." style={{ flex:1, background:"#0a0a0a", border:"1px solid #252528", borderRadius:8, color:"#f0ede8", padding:"8px 12px", fontSize:13 }}/>
                    <button onClick={()=>{ if(newCatName.trim()){const n=newCatName.trim();const pool=getAvailableCats(selectedArea);if(!pool.includes(n))saveAvailableCats(selectedArea,[...pool,n]);setCats(selectedArea,[...cats,n]);setNewCatName("");}}}
                      style={{ background:"#f0ede8", color:"#0a0a0a", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:12, cursor:"pointer" }}>ADD</button>
                  </div>
                </div>
              )}

              {cats.length === 0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ textAlign:"center", padding:"40px 0 20px", color:"#444", fontSize:12, letterSpacing:"0.1em" }}>NO SECTIONS YET</div>
                  {!isSupplier && <AddRow placeholder="Add a section..." onAdd={n=>{
                    const pool=getAvailableCats(selectedArea);
                    if(!pool.includes(n)) saveAvailableCats(selectedArea,[...pool,n]);
                    setCats(selectedArea,[...cats,n]);
                  }}/>}
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {!isSupplier && (
                    <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:2 }}>
                      <button onClick={()=>setCats(selectedArea,[...cats].sort((a,b)=>a.localeCompare(b)))}
                        style={{ background:"transparent", border:"1px solid #252528", borderRadius:7, color:"#555", fontSize:11, fontWeight:600, padding:"5px 12px", cursor:"pointer", letterSpacing:"0.05em" }}
                        onMouseEnter={e=>{e.currentTarget.style.color="#f0ede8";e.currentTarget.style.borderColor="#444";}}
                        onMouseLeave={e=>{e.currentTarget.style.color="#555";e.currentTarget.style.borderColor="#252528";}}>A → Z</button>
                    </div>
                  )}
                  <DragList
                    items={cats.map(c=>({id:c,name:c}))}
                    onReorder={reordered=>setCats(selectedArea,reordered.map(x=>x.name))}
                    gap={10}
                    renderItem={({name:cat}) => {
                      const k = keys.review(selectedArea, cat);
                      return (
                        <ReviewSection key={k} catName={cat} data={reviewData[k]} saveKey={k} saveStatuses={saveStatuses}
                          userName={userName} isSupplier={isSupplier} nextYear={nextTrackerYear} areaName={selectedArea}
                          onSave={patch=>handleSave(selectedArea,cat,patch)}
                          onRemove={()=>setCats(selectedArea,cats.filter(c=>c!==cat))}
                          onAISuggestion={suggestion=>addAISuggestion(selectedArea,suggestion)}
                          allReviewTags={allReviewTagNames}
                          onTagTap={tag=>{ setSelectedTag(tag); setScreen("tag-reviews"); }}
                        />
                      );
                    }}
                  />
                  {!isSupplier && <AddRow placeholder="Add a section..." onAdd={n=>{
                    const pool=getAvailableCats(selectedArea);
                    if(!pool.includes(n)) saveAvailableCats(selectedArea,[...pool,n]);
                    setCats(selectedArea,[...cats,n]);
                  }}/>}
                </div>
              )}

              {!isSupplier && (
                <div style={{ marginTop:32, paddingTop:24, borderTop:"1px solid #1a1a1e" }}>
                  <button onClick={()=>exportReviewPDF({festival,year:activeYear,areas:festivalAreas,reviewData,getCats})}
                    style={{ width:"100%", padding:"15px 24px", background:"#111113", border:"1px solid #252528", borderRadius:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, fontWeight:600, fontSize:13, color:"#888", letterSpacing:"0.04em", transition:"all 0.15s" }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#444";e.currentTarget.style.color="#f0ede8";e.currentTarget.style.background="#161618";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#252528";e.currentTarget.style.color="#888";e.currentTarget.style.background="#111113";}}>
                    <span style={{ fontSize:16 }}>↓</span> EXPORT ALL AREAS TO PDF — {activeYear}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
