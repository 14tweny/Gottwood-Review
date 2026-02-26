import { useState, useRef, useCallback, useEffect } from "react";

// Full SVG viewBox
const VB_W = 1869.52;
const VB_H = 3220.29;

// Default crop — the main festival area
const DEFAULT_CROP = { x: 680, y: 580, w: 640, h: 650 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

const GOTTWOOD_HOTSPOTS = [
  { svgId: "TREEHOUSE_STAGE",      area: "Treehouse Stage", cx: 983.2,  cy: 686.8,  r: 55 },
  { svgId: "THE_BARN",             area: "The Barn",        cx: 975.4,  cy: 808.8,  r: 52 },
  { svgId: "WALLED_GARDEN",        area: "Walled Garden",   cx: 866.8,  cy: 758.7,  r: 55 },
  { svgId: "TRIGON",               area: "Trigon",          cx: 794.0,  cy: 969.7,  r: 48 },
  { svgId: "THE_NEST",             area: "The Nest",        cx: 1036.9, cy: 938.9,  r: 44 },
  { svgId: "THR_LIGHTHOUSE",       area: "The Lighthouse",  cx: 975.0,  cy: 1010.0, r: 44 },
  { svgId: "NEW_CURVE",            area: "The Curve",       cx: 1202.5, cy: 1035.2, r: 50 },
  { svgId: "LAWN_STAGE",           area: "The Lawn",        cx: 941.2,  cy: 913.8,  r: 52 },
  { svgId: "RICKY_S_DISCO_TIPI_s", area: "Rickies Disco",   cx: 949.8,  cy: 1083.5, r: 44 },
  { svgId: "CREW_CATERING",        area: "Crew Catering",   cx: 832.5,  cy: 885.8,  r: 40 },
];

export default function SiteMap({ festival, areas, getAreaColor, onAreaTap, tracker }) {
  const [zoom, setZoom]       = useState(1);
  const [pan, setPan]         = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(null);
  const containerRef          = useRef(null);
  const dragging              = useRef(false);
  const lastMouse             = useRef(null);
  const lastPinchDist         = useRef(null);
  const lastTouch             = useRef(null);

  if (festival?.id !== "gottwood") return null;

  function clampedPan(p, z) {
    const maxOff = { x: (DEFAULT_CROP.w - DEFAULT_CROP.w / z) / 2, y: (DEFAULT_CROP.h - DEFAULT_CROP.h / z) / 2 };
    return { x: Math.max(-maxOff.x, Math.min(maxOff.x, p.x)), y: Math.max(-maxOff.y, Math.min(maxOff.y, p.y)) };
  }

  function applyZoom(delta) {
    setZoom(z => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta));
      setPan(p => clampedPan(p, next));
      return next;
    });
  }

  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }); }

  // Mouse wheel
  const handleWheel = useCallback(e => {
    e.preventDefault();
    applyZoom(e.deltaY < 0 ? 0.4 : -0.4);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Mouse drag
  function onMouseDown(e) { dragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; }
  function onMouseMove(e) {
    if (!dragging.current || !lastMouse.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const sx = (DEFAULT_CROP.w / zoom) / rect.width;
    const sy = (DEFAULT_CROP.h / zoom) / rect.height;
    const dx = -(e.clientX - lastMouse.current.x) * sx;
    const dy = -(e.clientY - lastMouse.current.y) * sy;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan(p => clampedPan({ x: p.x + dx, y: p.y + dy }, zoom));
  }
  function onMouseUp() { dragging.current = false; lastMouse.current = null; }

  // Touch drag + pinch
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
      const sx = (DEFAULT_CROP.w / zoom) / rect.width;
      const sy = (DEFAULT_CROP.h / zoom) / rect.height;
      const dx = -(e.touches[0].clientX - lastTouch.current.x) * sx;
      const dy = -(e.touches[0].clientY - lastTouch.current.y) * sy;
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setPan(p => clampedPan({ x: p.x + dx, y: p.y + dy }, zoom));
    } else if (e.touches.length === 2 && lastPinchDist.current != null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      applyZoom((dist - lastPinchDist.current) * 0.018);
      lastPinchDist.current = dist;
    }
  }
  function onTouchEnd() { lastTouch.current = null; lastPinchDist.current = null; }

  // Current viewBox
  const cropW = DEFAULT_CROP.w / zoom;
  const cropH = DEFAULT_CROP.h / zoom;
  const cropX = DEFAULT_CROP.x + DEFAULT_CROP.w / 2 - cropW / 2 + pan.x;
  const cropY = DEFAULT_CROP.y + DEFAULT_CROP.h / 2 - cropH / 2 + pan.y;

  const colorMap = {};
  areas.forEach(a => { const c = getAreaColor(a); if (c) colorMap[a] = c; });
  const activeHotspots = GOTTWOOD_HOTSPOTS.filter(h => areas.some(a => a === h.area));
  const hs = 1 / zoom; // hotspot scale

  const btn = (disabled) => ({
    width: 36, height: 36, background: "#fff", border: "1px solid #ddd", borderRadius: 8,
    fontSize: 22, fontWeight: 300, color: disabled ? "#ccc" : "#444",
    cursor: disabled ? "default" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)", userSelect: "none", transition: "all 0.1s",
  });

  return (
    <div style={{ position: "relative", width: "100%", borderRadius: 14, overflow: "hidden", background: "#fff", border: "1px solid #ddd" }}>

      {/* Map */}
      <div
        ref={containerRef}
        style={{ position: "relative", width: "100%", paddingBottom: `${(DEFAULT_CROP.h / DEFAULT_CROP.w) * 100}%`, cursor: "grab", userSelect: "none" }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      >
        <svg
          viewBox={`${cropX} ${cropY} ${cropW} ${cropH}`}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
          preserveAspectRatio="xMidYMid meet"
        >
          <image href="/gottwood-site-plan.svg" x="0" y="0" width={VB_W} height={VB_H} />

          {activeHotspots.map(spot => {
            const color    = colorMap[spot.area] ?? "#aaaacc";
            const isActive = !!colorMap[spot.area];
            const isHov    = hovered === spot.area;
            const r        = spot.r * hs;

            return (
              <g key={spot.svgId}
                onClick={() => onAreaTap(spot.area)}
                onMouseEnter={() => setHovered(spot.area)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                {isActive && (
                  <circle cx={spot.cx} cy={spot.cy} r={r + 10 * hs}
                    fill="none" stroke={color}
                    strokeWidth={isHov ? 2 * hs : 1 * hs}
                    opacity={isHov ? 0.6 : 0.25}
                    style={{ transition: "all 0.15s" }}
                  />
                )}
                <circle cx={spot.cx} cy={spot.cy} r={r}
                  fill={isActive ? color : "#e8e8f4"}
                  fillOpacity={isActive ? (isHov ? 0.55 : 0.3) : 0.15}
                  stroke={color}
                  strokeWidth={(isHov ? 2 : isActive ? 1.5 : 0.8) * hs}
                  strokeOpacity={isHov ? 1 : isActive ? 0.75 : 0.35}
                  style={{ transition: "all 0.15s" }}
                />
                <text
                  x={spot.cx} y={spot.cy}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={isActive ? color : "#999"}
                  fontSize={11 * hs} fontWeight="700"
                  fontFamily="system-ui, sans-serif"
                  style={{ pointerEvents: "none" }}
                >
                  {spot.area.split(" ").map((word, i, arr) => (
                    <tspan key={i} x={spot.cx} dy={i === 0 ? `${-(arr.length - 1) * 6 * hs}` : `${12 * hs}`}>
                      {word}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>

        {/* +/- controls */}
        <div style={{ position: "absolute", top: 10, right: 10, display: "flex", flexDirection: "column", gap: 4, zIndex: 10 }}>
          <button style={btn(zoom >= MAX_ZOOM)} onClick={() => applyZoom(0.5)} disabled={zoom >= MAX_ZOOM}>+</button>
          <button style={btn(zoom <= MIN_ZOOM)} onClick={() => applyZoom(-0.5)} disabled={zoom <= MIN_ZOOM}>−</button>
          {zoom > 1 && (
            <button
              style={{ ...btn(false), fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: "0.04em" }}
              onClick={resetView}
            >FIT</button>
          )}
        </div>

        {/* Zoom level badge */}
        {zoom > 1 && (
          <div style={{ position: "absolute", bottom: 8, right: 10, background: "rgba(255,255,255,0.88)", border: "1px solid #eee", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700, color: "#999" }}>
            {zoom.toFixed(1)}×
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 14, borderTop: "1px solid #eee", flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.1em" }}>
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
            <span style={{ fontSize: 10, color: "#999" }}>{label}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "#ccc", letterSpacing: "0.05em" }}>DRAG · PINCH · SCROLL</span>
      </div>
    </div>
  );
}
