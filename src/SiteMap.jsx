import { useState, useRef, useCallback, useEffect } from "react";

// Full SVG viewBox
const VB_W = 1869.52;
const VB_H = 3220.29;

// Crop to the full grid extent (with padding)
const CROP = { x: 260, y: 0, w: 1560, h: 1960 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 10;

// Master lookup: maps every possible area name (and common variations)
// to its SVG layer ID and precise centre coordinates.
// The app uses this to automatically match areas to hotspots —
// no manual wiring needed when areas are added, as long as the SVG layer exists.
const SVG_AREA_LOOKUP = [
  // Stages / Venues
  { svgId: "TREEHOUSE_STAGE",      names: ["treehouse stage", "treehouse"],          cx: 983.2,  cy: 686.8  },
  { svgId: "THE_BARN",             names: ["the barn", "barn"],                      cx: 975.4,  cy: 808.8  },
  { svgId: "WALLED_GARDEN",        names: ["walled garden"],                         cx: 866.8,  cy: 758.7  },
  { svgId: "TRIGON",               names: ["trigon"],                                cx: 794.0,  cy: 969.7  },
  { svgId: "THE_NEST",             names: ["the nest", "nest"],                      cx: 1036.9, cy: 938.9  },
  { svgId: "THR_LIGHTHOUSE",       names: ["the lighthouse", "lighthouse"],          cx: 974.0,  cy: 1007.0 },
  { svgId: "NEW_CURVE",            names: ["the curve", "new curve", "cocktail bar (old curve)", "curve"], cx: 1202.5, cy: 1035.2 },
  { svgId: "LAWN_STAGE",           names: ["the lawn", "lawn stage", "lawn"],        cx: 941.2,  cy: 913.8  },
  { svgId: "RICKY_S_DISCO_TIPI_s", names: ["rickies disco", "ricky's disco", "disco tipi"], cx: 949.8, cy: 1083.5 },
  { svgId: "TRADERS-2",            names: ["woods traders", "traders", "top woods"], cx: 1038.9, cy: 652.3  },
  { svgId: "POND_LIFE",            names: ["pond life", "pond"],                     cx: 1171.4, cy: 629.3  },
  // Infrastructure
  { svgId: "CREW_CATERING",        names: ["crew catering", "catering"],             cx: 832.5,  cy: 885.8  },
  { svgId: "MEDICAL",              names: ["medical", "first aid"],                  cx: 922.1,  cy: 869.1  },
  { svgId: "OFFICE_STORAGE",       names: ["site office", "office", "event office"], cx: 852.5,  cy: 809.1  },
  { svgId: "BOXFORD_MASK",         names: ["boxford", "boxford stage"],              cx: 912.6,  cy: 842.5  },
  { svgId: "WATER_SANITATION",     names: ["water", "water & sanitation", "water sanitation"], cx: 940.0, cy: 1050.0 },
  { svgId: "SHOWERS_4_BAY",        names: ["showers", "shower block"],              cx: 880.0,  cy: 950.0  },
  { svgId: "CAMPSITE_MEDICAL",     names: ["campsite medical", "campsite first aid"], cx: 922.1, cy: 869.1  },
  { svgId: "GEODESIC_DOME",        names: ["geodesic dome", "dome"],                 cx: 941.2,  cy: 913.8  },
  { svgId: "GATES",                names: ["main gate", "gates", "entrance", "gate"], cx: 1109.8, cy: 1815.4 },
  { svgId: "STRETCH_TENT",         names: ["stretch tent"],                          cx: 639.3,  cy: 511.1  },
];

// Normalise an area name for matching
function norm(s) { return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim(); }

// Given an area name, find a matching hotspot entry
function findHotspot(areaName) {
  const n = norm(areaName);
  return SVG_AREA_LOOKUP.find(h => h.names.some(alias => norm(alias) === n));
}

export default function SiteMap({ festival, areas, getAreaColor, onAreaTap, tracker }) {
  const [svgContent, setSvgContent] = useState(null);
  const [zoom, setZoom]             = useState(1);
  const [pan, setPan]               = useState({ x: 0, y: 0 });
  const [hovered, setHovered]       = useState(null);
  const containerRef                = useRef(null);
  const dragging                    = useRef(false);
  const lastMouse                   = useRef(null);
  const lastTouch                   = useRef(null);
  const lastPinchDist               = useRef(null);

  useEffect(() => {
    fetch("/gottwood-site-plan.svg")
      .then(r => r.text())
      .then(text => {
        const inner = text
          .replace(/<\?xml[^>]*\?>\s*/i, "")
          .replace(/<svg[^>]*>/, "")
          .replace(/<\/svg>\s*$/, "");
        setSvgContent(inner);
      });
  }, []);

  if (festival?.id !== "gottwood") return null;

  function clamp(p, z) {
    const mx = (CROP.w - CROP.w / z) / 2;
    const my = (CROP.h - CROP.h / z) / 2;
    return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
  }

  function applyZoom(delta) {
    setZoom(z => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta));
      setPan(p => clamp(p, next));
      return next;
    });
  }

  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }); }

  const handleWheel = useCallback(e => {
    e.preventDefault();
    applyZoom(e.deltaY < 0 ? 0.5 : -0.5);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  function onMouseDown(e) {
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }
  function onMouseMove(e) {
    if (!dragging.current || !lastMouse.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = -(e.clientX - lastMouse.current.x) * (CROP.w / zoom) / rect.width;
    const dy = -(e.clientY - lastMouse.current.y) * (CROP.h / zoom) / rect.height;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan(p => clamp({ x: p.x + dx, y: p.y + dy }, zoom));
  }
  function onMouseUp() { dragging.current = false; }

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPinchDist.current = null;
    } else if (e.touches.length === 2) {
      lastTouch.current = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }
  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && lastTouch.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dx = -(e.touches[0].clientX - lastTouch.current.x) * (CROP.w / zoom) / rect.width;
      const dy = -(e.touches[0].clientY - lastTouch.current.y) * (CROP.h / zoom) / rect.height;
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setPan(p => clamp({ x: p.x + dx, y: p.y + dy }, zoom));
    } else if (e.touches.length === 2 && lastPinchDist.current != null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      applyZoom((dist - lastPinchDist.current) * 0.02);
      lastPinchDist.current = dist;
    }
  }
  function onTouchEnd() { lastTouch.current = null; lastPinchDist.current = null; }

  // Dynamic viewBox
  const cropW = CROP.w / zoom;
  const cropH = CROP.h / zoom;
  const cropX = CROP.x + CROP.w / 2 - cropW / 2 + pan.x;
  const cropY = CROP.y + CROP.h / 2 - cropH / 2 + pan.y;

  // Automatically match each area to a hotspot entry
  const colorMap = {};
  areas.forEach(a => { const c = getAreaColor(a); if (c) colorMap[a] = c; });

  const hotspots = areas
    .map(areaName => {
      const match = findHotspot(areaName);
      if (!match) return null;
      return { ...match, area: areaName };
    })
    .filter(Boolean)
    // Deduplicate by svgId (same SVG layer, different area names)
    .filter((h, i, arr) => arr.findIndex(x => x.svgId === h.svgId) === i);

  const hs = 1 / zoom;
  const R  = 38; // base hotspot radius in SVG units

  const btnStyle = (disabled) => ({
    width: 34, height: 34, background: "#fff", border: "1px solid #ddd",
    borderRadius: 8, fontSize: 20, fontWeight: 300,
    color: disabled ? "#ccc" : "#444", cursor: disabled ? "default" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)", userSelect: "none",
  });

  return (
    <div style={{ position: "relative", width: "100%", borderRadius: 14, overflow: "hidden", background: "#fff", border: "1px solid #ddd" }}>
      <div
        ref={containerRef}
        style={{ position: "relative", width: "100%", paddingBottom: `${(CROP.h / CROP.w) * 100}%`, cursor: "grab", userSelect: "none" }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      >
        <svg
          viewBox={`${cropX} ${cropY} ${cropW} ${cropH}`}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "#fff" }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Inline map — crisp vectors at any zoom */}
          {svgContent && <g dangerouslySetInnerHTML={{ __html: svgContent }} />}

          {/* Auto-matched hotspots */}
          {hotspots.map(spot => {
            const color    = colorMap[spot.area] ?? "#aaaacc";
            const isActive = !!colorMap[spot.area];
            const isHov    = hovered === spot.area;
            const r        = R * hs;

            return (
              <g key={`${spot.svgId}-${spot.area}`}
                onClick={() => onAreaTap(spot.area)}
                onMouseEnter={() => setHovered(spot.area)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                {isActive && (
                  <circle cx={spot.cx} cy={spot.cy} r={r + 14 * hs}
                    fill="none" stroke={color}
                    strokeWidth={isHov ? 2.5 * hs : 1.5 * hs}
                    opacity={isHov ? 0.55 : 0.18}
                    style={{ transition: "all 0.15s" }}
                  />
                )}
                <circle cx={spot.cx} cy={spot.cy} r={r}
                  fill={isActive ? color : "#e8e8f0"}
                  fillOpacity={isActive ? (isHov ? 0.5 : 0.22) : 0.1}
                  stroke={isActive ? color : "#aaaacc"}
                  strokeWidth={(isHov ? 2.5 : isActive ? 1.8 : 0.8) * hs}
                  strokeOpacity={isHov ? 1 : isActive ? 0.7 : 0.25}
                  style={{ transition: "all 0.15s" }}
                />
                <text
                  x={spot.cx} y={spot.cy}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={isActive ? color : "#aaa"}
                  fontSize={10 * hs} fontWeight="700"
                  fontFamily="system-ui, sans-serif"
                  style={{ pointerEvents: "none" }}
                >
                  {spot.area.split(" ").map((word, i, arr) => (
                    <tspan key={i} x={spot.cx} dy={i === 0 ? -(arr.length - 1) * 5.5 * hs : 11 * hs}>
                      {word}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>

        {!svgContent && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: 12, letterSpacing: "0.1em" }}>
            LOADING MAP…
          </div>
        )}

        <div style={{ position: "absolute", top: 10, right: 10, display: "flex", flexDirection: "column", gap: 4, zIndex: 10 }}>
          <button style={btnStyle(zoom >= MAX_ZOOM)} onClick={() => applyZoom(0.75)}>+</button>
          <button style={btnStyle(zoom <= MIN_ZOOM)} onClick={() => applyZoom(-0.75)}>−</button>
          {zoom > 1 && (
            <button style={{ ...btnStyle(false), fontSize: 10, fontWeight: 700, color: "#888" }} onClick={resetView}>
              FIT
            </button>
          )}
        </div>

        {zoom > 1 && (
          <div style={{ position: "absolute", bottom: 8, right: 10, background: "rgba(255,255,255,0.9)", border: "1px solid #eee", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700, color: "#aaa" }}>
            {zoom.toFixed(1)}×
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 14, borderTop: "1px solid #eee", flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: "0.1em" }}>
          {tracker ? "TRACKER STATUS" : "REVIEW STATUS"}
        </span>
        {[
          { color: "#22c55e", label: tracker ? "Complete"    : "Strong"     },
          { color: "#eab308", label: tracker ? "In Progress" : "Average"    },
          { color: "#ef4444", label: tracker ? "Blocked"     : "Needs Work" },
          { color: "#aaaacc", label: "No data" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: 10, color: "#aaa" }}>{label}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "#ccc", letterSpacing: "0.05em" }}>DRAG · PINCH · SCROLL</span>
      </div>
    </div>
  );
}
