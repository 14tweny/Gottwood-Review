import { useState, useRef, useEffect } from "react";

// SVG viewBox dimensions
const VB_W = 1869.52;
const VB_H = 3220.29;

// Hotspot definitions — cx/cy in SVG coordinate space, r = tap radius
// Centred on the actual drawn shapes in the SVG
const GOTTWOOD_HOTSPOTS = [
  { svgId: "TREEHOUSE_STAGE", area: "Treehouse Stage", cx: 983.2,  cy: 686.8,  r: 55, shape: "circle" },
  { svgId: "THE_BARN",        area: "The Barn",        cx: 975.4,  cy: 808.8,  r: 52, shape: "circle" },
  { svgId: "WALLED_GARDEN",   area: "Walled Garden",   cx: 866.8,  cy: 758.7,  r: 55, shape: "circle" },
  { svgId: "TRIGON",          area: "Trigon",          cx: 794.0,  cy: 969.7,  r: 48, shape: "circle" },
  { svgId: "THE_NEST",        area: "The Nest",        cx: 1036.9, cy: 938.9,  r: 44, shape: "circle" },
  { svgId: "THR_LIGHTHOUSE",  area: "The Lighthouse",  cx: 975.0,  cy: 1010.0, r: 44, shape: "circle" },
  { svgId: "NEW_CURVE",       area: "The Curve",       cx: 1202.5, cy: 1035.2, r: 50, shape: "circle" },
  { svgId: "LAWN_STAGE",      area: "The Lawn",        cx: 941.2,  cy: 913.8,  r: 52, shape: "circle" },
  { svgId: "RICKY_S_DISCO_TIPI_s", area: "Rickies Disco", cx: 949.8, cy: 1083.5, r: 44, shape: "circle" },
  { svgId: "CREW_CATERING",   area: "Crew Catering",   cx: 832.5,  cy: 885.8,  r: 40, shape: "circle" },
];

const RATING_COLORS = {
  excellent:   "#22c55e",
  good:        "#84cc16",
  average:     "#eab308",
  needsWork:   "#f97316",
  poor:        "#ef4444",
  inProgress:  "#eab308",
  blocked:     "#ef4444",
  done:        "#22c55e",
  untouched:   null,
};

export default function SiteMap({ festival, areas, getAreaColor, onAreaTap, tracker }) {
  const [hovered, setHovered]   = useState(null);
  const [tooltip, setTooltip]   = useState(null); // { area, x, y }
  const svgRef                  = useRef(null);
  const containerRef            = useRef(null);

  // Only show for Gottwood for now
  if (festival?.id !== "gottwood") return null;

  // Build map from area name → color
  const colorMap = {};
  areas.forEach(aName => {
    const c = getAreaColor(aName);
    if (c) colorMap[aName] = c;
  });

  function handleHotspotClick(spot) {
    onAreaTap(spot.area);
  }

  function handleHotspotEnter(spot, e) {
    setHovered(spot.area);
    setTooltip({ area: spot.area, color: colorMap[spot.area] });
  }

  function handleHotspotLeave() {
    setHovered(null);
    setTooltip(null);
  }

  // Filter to only hotspots that exist in our area list
  const activeHotspots = GOTTWOOD_HOTSPOTS.filter(h =>
    areas.some(a => a === h.area)
  );

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", borderRadius: 14, overflow: "hidden", background: "#0d0d10", border: "1px solid #1e1e22" }}>
      {/* SVG map as image background */}
      <div style={{ position: "relative", width: "100%", paddingBottom: `${(VB_H / VB_W) * 100}%` }}>
        <img
          src="/gottwood-site-plan.svg"
          alt="Gottwood Site Plan"
          style={{
            position: "absolute", top: 0, left: 0,
            width: "100%", height: "100%",
            objectFit: "fill",
            filter: "invert(1) brightness(0.18) contrast(1.2)",
          }}
        />

        {/* Overlay SVG for hotspots */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="glow-green">
              <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-amber">
              <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-red">
              <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {activeHotspots.map(spot => {
            const color     = colorMap[spot.area] ?? "#3a3a4a";
            const isActive  = !!colorMap[spot.area];
            const isHovered = hovered === spot.area;
            const pulseR    = spot.r + (isHovered ? 12 : 0);

            return (
              <g key={spot.svgId}
                onClick={() => handleHotspotClick(spot)}
                onMouseEnter={e => handleHotspotEnter(spot, e)}
                onMouseLeave={handleHotspotLeave}
                style={{ cursor: "pointer" }}
              >
                {/* Outer glow ring — only when has data */}
                {isActive && (
                  <circle
                    cx={spot.cx} cy={spot.cy}
                    r={pulseR + 10}
                    fill="none"
                    stroke={color}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    opacity={isHovered ? 0.6 : 0.25}
                    style={{ transition: "all 0.2s" }}
                  />
                )}
                {/* Main hotspot circle */}
                <circle
                  cx={spot.cx} cy={spot.cy}
                  r={pulseR}
                  fill={isActive ? color : "#1a1a2a"}
                  fillOpacity={isActive ? (isHovered ? 0.55 : 0.35) : (isHovered ? 0.3 : 0.15)}
                  stroke={color}
                  strokeWidth={isHovered ? 2.5 : isActive ? 1.5 : 1}
                  strokeOpacity={isHovered ? 1 : isActive ? 0.7 : 0.3}
                  style={{ transition: "all 0.2s" }}
                />
                {/* Label */}
                <text
                  x={spot.cx} y={spot.cy + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isActive ? color : "#555"}
                  fontSize={isHovered ? 14 : 12}
                  fontWeight="700"
                  fontFamily="'Geist', sans-serif"
                  letterSpacing="0.04em"
                  style={{ transition: "all 0.2s", pointerEvents: "none", textShadow: "0 1px 4px #000" }}
                >
                  {spot.area.split(" ").map((word, i) => (
                    <tspan key={i} x={spot.cx} dy={i === 0 ? `-${(spot.area.split(" ").length - 1) * 6}` : "13"}>
                      {word}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 16, borderTop: "1px solid #1a1a1e", flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#333", letterSpacing: "0.1em" }}>
          {tracker ? "TRACKER STATUS" : "REVIEW STATUS"}
        </span>
        {[
          { color: "#22c55e", label: tracker ? "Complete" : "Strong" },
          { color: "#eab308", label: tracker ? "In Progress" : "Average" },
          { color: "#ef4444", label: tracker ? "Blocked" : "Needs Work" },
          { color: "#3a3a4a", label: "No data" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: color !== "#3a3a4a" ? `0 0 4px ${color}88` : "none" }} />
            <span style={{ fontSize: 10, color: "#555" }}>{label}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "#2a2a2e", letterSpacing: "0.06em" }}>TAP AREA TO OPEN</span>
      </div>
    </div>
  );
}
