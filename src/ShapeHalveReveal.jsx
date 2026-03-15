// src/ShapeHalveReveal.jsx
// Suspense reveal animation for the Shape Halving minigame.
// Exports: ShapeHalveReveal (single-player), ShapeHalveRevealSequence (P1→P2→winner)

import { useState, useEffect, useRef } from "react";

// ── CSS injection ─────────────────────────────────────────────────────────────
function ensureCSS() {
  if (typeof document === "undefined" || document.getElementById("sh-reveal-css")) return;
  const s = document.createElement("style");
  s.id = "sh-reveal-css";
  s.textContent = `
@keyframes shFadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes shFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`;
  document.head.appendChild(s);
}

// ── Polygon clip points for one half of the shape ────────────────────────────
function makeSideClipPoints(line, side) {
  const far = 1200;
  const dx = line.x2 - line.x1, dy = line.y2 - line.y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ex1x = line.x1 - (dx / len) * far, ex1y = line.y1 - (dy / len) * far;
  const ex2x = line.x2 + (dx / len) * far, ex2y = line.y2 + (dy / len) * far;
  const sign = side === "left" ? 1 : -1;
  const nx = sign * (-dy / len) * far, ny = sign * (dx / len) * far;
  return [
    [ex1x, ex1y], [ex2x, ex2y],
    [ex2x + nx, ex2y + ny], [ex1x + nx, ex1y + ny],
  ];
}

// SVG polygon points string (for clipPath use)
function makeSideClip(line, side) {
  return makeSideClipPoints(line, side).map(([x, y]) => `${x},${y}`).join(" ");
}

// ── Pre-render one shape half to a data URL ───────────────────────────────────
// Returns { dataURL, pixelCount } so callers can determine which half is bigger.
function renderHalf(svgPath, line, side, thumbSize = 140) {
  if (typeof document === "undefined") return { dataURL: null, pixelCount: 0 };
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = thumbSize;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, thumbSize, thumbSize);
  const S = thumbSize / 400;
  ctx.save();
  ctx.scale(S, S);
  const pts = makeSideClipPoints(line, side);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#1a4e1a";
  ctx.fill(new Path2D(svgPath));
  ctx.strokeStyle = "#3a7a3a";
  ctx.lineWidth = 2 / S;
  ctx.stroke(new Path2D(svgPath));
  ctx.restore();
  // Count non-transparent pixels to determine which half is physically larger
  const data = ctx.getImageData(0, 0, thumbSize, thumbSize).data;
  let pixelCount = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) pixelCount++;
  return { dataURL: canvas.toDataURL("image/png"), pixelCount };
}

// ── Seesaw ─────────────────────────────────────────────────────────────────────
// A plank resting on a triangle fulcrum. Animated with a damped spring via RAF.
// ratio = |fraction − 0.5|; the heavier (larger) half is always on the left side.
// Spring: angle(t) = finalAngle + A0·e^(−ζωt)·cos(ωd·t)
//   → starts at finalAngle + A0, wobbles 2–3 times, eases into finalAngle.
function Seesaw({ ratio, color, size = 260, leftImg, rightImg, leftBigger = true }) {
  const plankRef = useRef(null);
  const rafRef = useRef(null);

  // Seesaw geometry
  const cx      = size / 2;
  const apexY   = size * 0.50;           // triangle apex (pivot point)
  const fulcBase = size * 0.74;          // triangle base y
  const triW    = size * 0.14;           // triangle base half-width
  const plankH  = Math.max(7, size * 0.045);
  const plankW  = size * 0.88;
  const pieceSize = plankW * 0.30;       // thumbnail display size
  const endInset  = plankW * 0.07;      // inset from plank end to piece center

  // SVG rotate(+θ) = clockwise = left end goes UP, right end goes DOWN.
  // So: negative angle → left drops (left is heavier), positive → right drops.
  const finalAngle = (leftBigger ? -1 : 1) * Math.min(ratio * 70, 24);

  // Spring-damped animation — runs once when seesaw mounts
  useEffect(() => {
    const A0     = 20;                           // initial overshoot (degrees)
    const omega  = 2 * Math.PI * 1.24;          // natural frequency ~1.24 Hz (2× faster)
    const zeta   = 0.20;                         // damping ratio → 2–3 visible wobbles
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    let startTime = null;

    const animate = (ts) => {
      if (!startTime) startTime = ts;
      const t = (ts - startTime) / 1000;
      const amplitude = A0 * Math.exp(-zeta * omega * t);
      const angle = finalAngle + amplitude * Math.cos(omegaD * t);

      if (plankRef.current) {
        plankRef.current.setAttribute("transform", `rotate(${angle}, ${cx}, ${apexY})`);
      }

      // Keep animating until amplitude is negligible
      if (amplitude > 0.15) {
        rafRef.current = requestAnimationFrame(animate);
      } else if (plankRef.current) {
        plankRef.current.setAttribute("transform", `rotate(${finalAngle}, ${cx}, ${apexY})`);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [finalAngle, cx, apexY]); // eslint-disable-line react-hooks/exhaustive-deps

  // Piece positions in the pre-rotation frame (move with plank)
  const leftPieceX  = cx - plankW / 2 + endInset;
  const rightPieceX = cx + plankW / 2 - endInset - pieceSize;
  const pieceY      = apexY - plankH - pieceSize * 0.92; // sit on top of plank

  return (
    <svg
      width={size} height={size * 0.88}
      viewBox={`0 0 ${size} ${size * 0.88}`}
      style={{ overflow: "visible", animation: "shFadeIn 225ms ease forwards" }}
    >
      {/* Ground line */}
      <line
        x1={cx - size * 0.24} y1={fulcBase + 2}
        x2={cx + size * 0.24} y2={fulcBase + 2}
        stroke="#2a5a2a" strokeWidth={3} strokeLinecap="round"
      />
      {/* Triangle fulcrum */}
      <polygon
        points={`${cx},${apexY} ${cx - triW / 2},${fulcBase} ${cx + triW / 2},${fulcBase}`}
        fill="#162e16" stroke="#3a6a3a" strokeWidth={1.5} strokeLinejoin="round"
      />

      {/* Plank group — rotated by RAF around apex */}
      <g ref={plankRef}>
        {/* Plank board */}
        <rect
          x={cx - plankW / 2} y={apexY - plankH}
          width={plankW} height={plankH}
          fill="#173317" stroke={color} strokeWidth={2} rx={3}
        />
        {/* Left end cap */}
        <rect
          x={cx - plankW / 2 - 2} y={apexY - plankH - 5}
          width={5} height={plankH + 5}
          fill={color} rx={2}
        />
        {/* Right end cap */}
        <rect
          x={cx + plankW / 2 - 3} y={apexY - plankH - 5}
          width={5} height={plankH + 5}
          fill={color} rx={2}
        />
        {/* Left shape piece (larger half) */}
        {leftImg && (
          <image
            href={leftImg}
            x={leftPieceX} y={pieceY}
            width={pieceSize} height={pieceSize}
            preserveAspectRatio="xMidYMid meet"
          />
        )}
        {/* Right shape piece (smaller half) */}
        {rightImg && (
          <image
            href={rightImg}
            x={rightPieceX} y={pieceY}
            width={pieceSize} height={pieceSize}
            preserveAspectRatio="xMidYMid meet"
          />
        )}
      </g>
    </svg>
  );
}

// ── ShapeHalveReveal — single-player reveal ───────────────────────────────────
// Stages:
//   0 (0ms)    — shape + cut line visible
//   1 (300ms)  — pieces start separating
//   2 (900ms)  — seesaw fades in; spring animation runs automatically
//   3 (3400ms) — percentages fade up
//   onComplete (4100ms)
export function ShapeHalveReveal({ svgPath, line, ratio, color, name, onComplete, uid = "sh", compact = false }) {
  ensureCSS();

  const shapeSize = compact ? 160 : 240;
  const seesawSize = compact ? 200 : 270;
  const sep = compact ? 35 : 55;

  const [stage, setStage] = useState(0);
  const [halfImgs, setHalfImgs] = useState(null);

  // Pre-render shape halves for the seesaw thumbnails + pixel counts for tilt direction
  useEffect(() => {
    if (!svgPath || !line) return;
    setHalfImgs({
      left:  renderHalf(svgPath, line, "left"),
      right: renderHalf(svgPath, line, "right"),
    });
  }, [svgPath, line]);

  useEffect(() => {
    setStage(0);
    const T = [
      setTimeout(() => setStage(1),    300),
      setTimeout(() => setStage(2),    900),
      setTimeout(() => setStage(3),   3400),
      setTimeout(() => onComplete?.(), 4100),
    ];
    return () => T.forEach(clearTimeout);
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Perpendicular to cut line for piece separation
  const dx = line.x2 - line.x1, dy = line.y2 - line.y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len, ny = dx / len;

  const diff = (ratio * 100).toFixed(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: 11, letterSpacing: 4, color, fontFamily: "'PT Mono', monospace" }}>
        {name.toUpperCase()}
      </div>

      {/* Splitting shape (stages 0–1) */}
      {stage < 2 && (
        <div style={{ position: "relative", width: shapeSize, height: shapeSize, flexShrink: 0 }}>
          {["left", "right"].map(side => {
            const sign = side === "left" ? 1 : -1;
            const tx = (sign * nx * sep).toFixed(1);
            const ty = (sign * ny * sep).toFixed(1);
            const rot = sign * 5;
            return (
              <div key={side} style={{
                position: "absolute", inset: 0, overflow: "visible",
                transition: "transform 550ms cubic-bezier(.4,0,.2,1)",
                transform: stage >= 1 ? `translate(${tx}px,${ty}px) rotate(${rot}deg)` : "none",
                transformOrigin: "50% 50%",
              }}>
                <svg width={shapeSize} height={shapeSize} viewBox="0 0 400 400" overflow="visible">
                  <defs>
                    <clipPath id={`${uid}-${side}`}>
                      <polygon points={makeSideClip(line, side)} />
                    </clipPath>
                  </defs>
                  <path
                    d={svgPath}
                    clipPath={`url(#${uid}-${side})`}
                    fill={side === "left" ? "#0f2e0f" : "#0d280d"}
                    stroke="#2a4a2a" strokeWidth={2}
                  />
                </svg>
              </div>
            );
          })}
          {/* Cut line (stage 0 only) */}
          {stage === 0 && (
            <svg
              width={shapeSize} height={shapeSize} viewBox="0 0 400 400"
              style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
            >
              <line
                x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                stroke={color} strokeWidth={3} strokeLinecap="round"
              />
            </svg>
          )}
        </div>
      )}

      {/* Seesaw (stage 2+) — mounts once; spring animation fires on mount */}
      {stage >= 2 && (
        <Seesaw
          ratio={ratio}
          color={color}
          size={seesawSize}
          leftImg={halfImgs?.left?.dataURL}
          rightImg={halfImgs?.right?.dataURL}
          leftBigger={(halfImgs?.left?.pixelCount ?? 0) >= (halfImgs?.right?.pixelCount ?? 0)}
        />
      )}

      {/* Percentages (stage 3) */}
      {stage >= 3 && (
        <div style={{
          animation: "shFadeUp 350ms ease forwards",
          fontFamily: "'PT Mono', monospace", textAlign: "center",
        }}>
          <div style={{ fontSize: compact ? 16 : 20, color: "#c8f55a", letterSpacing: 2 }}>
            {diff}% off center
          </div>
        </div>
      )}
    </div>
  );
}

// ── Winner reveal ─────────────────────────────────────────────────────────────
function WinnerReveal({ sh, p1Name, p2Name, p1Color, p2Color, winnerName, preMatch, compact, p1Option, p2Option }) {
  const fmt = r => r == null ? "—" : `${(r * 100).toFixed(1)}% off center`;
  const w1 = sh.winner === "p1";
  const players = [
    { name: p1Name, color: p1Color, ratio: sh.ratio1, win: w1, option: p1Option },
    { name: p2Name, color: p2Color, ratio: sh.ratio2, win: !w1, option: p2Option },
  ];
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 18,
      padding: compact ? "16px" : "24px",
      animation: "shFadeUp 450ms ease forwards",
    }}>
      {/* What's at stake */}
      {(p1Option || p2Option) && !preMatch && (
        <div style={{
          display: "flex", alignItems: "center", gap: compact ? 8 : 12,
          fontFamily: "'PT Mono', monospace", fontSize: compact ? 9 : 11,
          letterSpacing: 2, flexWrap: "wrap", justifyContent: "center",
        }}>
          <span style={{ color: p1Color }}>{p1Option}</span>
          <span style={{ color: "#2a4a2a" }}>vs</span>
          <span style={{ color: p2Color }}>{p2Option}</span>
        </div>
      )}

      {/* Winner headline */}
      <div style={{
        fontSize: compact ? 18 : 26, fontWeight: "bold",
        letterSpacing: compact ? 3 : 6, color: "#c8f55a",
        textAlign: "center", textShadow: "0 0 30px #c8f55a77",
      }}>
        {preMatch ? `${winnerName}'s VOTE COUNTS DOUBLE!` : `${winnerName} WINS!`}
      </div>

      {/* Player cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {players.map(({ name, color, ratio, win, option }, i) => (
          <div key={i} style={{
            padding: "10px 16px", background: "#0f1f0f",
            border: `1px solid ${win ? color : "#1a2e1a"}`,
            boxShadow: win ? `0 0 16px ${color}44` : "none",
            textAlign: "center", fontFamily: "'PT Mono', monospace",
            minWidth: compact ? 100 : 120,
          }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: win ? color : "#4a6a4a", marginBottom: 2 }}>
              {name.toUpperCase()}
            </div>
            {option && (
              <div style={{
                fontSize: compact ? 11 : 13, fontWeight: "bold",
                color: win ? "#c8f55a" : "#5a7a5a", marginBottom: 4,
                maxWidth: compact ? 90 : 130, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {option}
              </div>
            )}
            <div style={{ fontSize: compact ? 10 : 11, color: win ? "#8abf5a" : "#4a5a4a" }}>
              {fmt(ratio)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ShapeHalveRevealSequence — P1 reveal → P2 reveal → winner ─────────────────
export function ShapeHalveRevealSequence({ sh, p1Name, p2Name, p1Color, p2Color, winnerName, preMatch, compact = false, p1Option, p2Option }) {
  const [shape, setShape] = useState(null);
  const [step, setStep] = useState("p1"); // "p1" | "p2" | "winner"

  useEffect(() => {
    import("./shapeHalveUtils.js").then(m => setShape(m.generateShape(sh.seed)));
  }, [sh.seed]);

  if (!shape) {
    return (
      <div style={{ color: "#5a7a5a", textAlign: "center", padding: 40, fontFamily: "'PT Mono', monospace" }}>
        Loading…
      </div>
    );
  }

  if (step === "winner") {
    return (
      <WinnerReveal
        sh={sh} p1Name={p1Name} p2Name={p2Name}
        p1Color={p1Color} p2Color={p2Color}
        winnerName={winnerName} preMatch={preMatch} compact={compact}
        p1Option={p1Option} p2Option={p2Option}
      />
    );
  }

  const isP1 = step === "p1";
  const line  = isP1 ? sh.line1  : sh.line2;
  const ratio = isP1 ? (sh.ratio1 ?? 0) : (sh.ratio2 ?? 0);
  const color = isP1 ? p1Color : p2Color;
  const name  = isP1 ? p1Name  : p2Name;
  const uid   = isP1 ? "shrev-p1" : "shrev-p2";
  const next  = isP1 ? "p2" : "winner";

  return (
    <ShapeHalveReveal
      key={uid}
      svgPath={shape.svgPath}
      line={line}
      ratio={ratio}
      color={color}
      name={name}
      onComplete={() => setStep(next)}
      uid={uid}
      compact={compact}
    />
  );
}
